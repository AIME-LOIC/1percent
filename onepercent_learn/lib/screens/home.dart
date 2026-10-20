import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:google_fonts/google_fonts.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/ui.dart';
import '../data/api.dart';
import '../data/models.dart';
import '../offline/offline_repo.dart';
import '../providers.dart';

class HomeData {
  HomeData({
    required this.coins,
    required this.streak,
    required this.history,
    required this.daily,
    required this.dailyDone,
    required this.enrollments,
    required this.progressByCourse,
    required this.coursesById,
    this.unread = 0,
    this.queued = 0,
  });
  final int coins;
  final StreakInfo streak;
  final List<StreakDay> history;
  final Challenge? daily;
  final bool dailyDone;
  final List<String> enrollments;
  final Map<String, CourseProgress> progressByCourse;
  final Map<String, Course> coursesById;
  final int unread;
  final int queued;
}

final homeProvider =
    AsyncNotifierProvider<HomeNotifier, HomeData?>(HomeNotifier.new);

class HomeNotifier extends AsyncNotifier<HomeData?> {
  @override
  FutureOr<HomeData?> build() async {
    final api = ref.read(offlineRepoProvider).apiForScreen();
    final repo = ref.read(offlineRepoProvider);

    // Everything in flight at once: one round-trip latency total.
    final results = await Future.wait<Object?>(
      [
        api.getCoinsBalance(),
        api.getStreak(),
        api.getStreakHistory(days: 7),
        api.getDailyChallenge(),
        _unread(api),
        api.getEnrollmentCourseIds().catchError((_) => <String>[]),
        api.getCourses().catchError((_) => <Course>[]),
      ],
    ).timeout(const Duration(seconds: 25));

    final coins = results[0] as int? ?? 0;
    final streak = results[1] as StreakInfo? ?? StreakInfo(count: 0);
    final history = results[2] as List<StreakDay>? ?? const <StreakDay>[];
    final dailyPair = results[3] as (Challenge?, bool)?;
    final daily = dailyPair?.$1;
    final dailyDone = dailyPair?.$2 ?? false;
    final unreadCount = results[4] as int? ?? 0;
    final enrollments = results[5] as List<String>? ?? const [];
    final coursesById = <String, Course>{};
    for (final c in results[6] as List<Course>? ?? const <Course>[]) {
      coursesById[c.id] = c;
    }

    // Course progress: up to 6 in parallel.
    final progress = <String, CourseProgress>{};
    await Future.wait<Object?>(
      enrollments.take(6).map((c) async {
        try {
          progress[c] = await api.getCourseProgress(c);
        } catch (_) {}
      }),
    );

    final queued = await repo.queuedOpsCount();
    return HomeData(
      coins: coins,
      streak: streak,
      history: history,
      daily: daily,
      dailyDone: dailyDone,
      enrollments: enrollments,
      progressByCourse: progress,
      coursesById: coursesById,
      unread: unreadCount,
      queued: queued,
    );
  }

  Future<int> _unread(Api api) async {
    try {
      final (_, unread) = await api.getNotifications(limit: 1);
      return unread;
    } catch (_) {
      return 0;
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      state = AsyncValue.data(await _reload());
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<HomeData?> _reload() async {
    final d = await build();
    return d;
  }
}

String _greeting(DateTime now) {
  if (now.hour < 12) return 'Good morning';
  if (now.hour < 18) return 'Good afternoon';
  return 'Good evening';
}

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final data = ref.watch(homeProvider);
    final user = auth.value;
    final d = data.value;

    final days = (d?.history ?? []).take(7).map((e) => e.active).toList();
    while (days.length < 7) days.add(false);
    // history oldest-first: reverse for rendering L->R.

    return Scaffold(
      appBar: AppBar(
        title: Text('${_greeting(DateTime.now())}${user == null ? '' : ', ${_firstName(user)}'}',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 20)),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            child: ChipPill('${d?.coins ?? 0} COINS',
                icon: Icons.circle, textColor: T.strong),
          ),
          Stack(children: [
            IconButton(
              tooltip: 'Notifications',
              onPressed: () => context.go('/notifications'),
              icon: const Icon(Icons.notifications_outlined),
            ),
            if ((d?.unread ?? 0) > 0)
              Positioned(
                right: 10, top: 10,
                child: Container(
                  width: 9, height: 9,
                  decoration: const BoxDecoration(color: T.progress, shape: BoxShape.circle),
                ),
              ),
          ]),
        ],
      ),
      body: RefreshIndicator(
        color: T.strong,
        onRefresh: () => ref.read(homeProvider.notifier).refresh(),
        child: data.when(
          data: (d) => d == null
              ? const Center(child: Text('Not signed in.'))
              : _Body(d: d, bars: days.reversed.toList()),
          loading: () => ListView(
            padding: const EdgeInsets.all(16),
            children: const [
              SkeletonCard(height: 116),
              SizedBox(height: 16),
              SkeletonCard(height: 108),
              SizedBox(height: 16),
              SkeletonCard(height: 108),
            ],
          ),
          error: (e, _) => ListView(
            children: [SizedBox(
              height: MediaQuery.of(context).size.height * 0.6,
              child: ErrorRetry(message: ApiClient.friendly(e),
                  onRetry: () => ref.read(homeProvider.notifier).refresh()),
            )],
          ),
        ),
      ),
    );
  }

  String _firstName(UserProfile u) {
    final parts = u.displayName.split(' ');
    return parts.first;
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.d, required this.bars});
  final HomeData d;
  final List<bool> bars;

  @override
  Widget build(BuildContext context) {
    // Pick resume target: first enrolled course with progress < 100.
    String? resumeCourseId;
    CourseProgress? resumeProgress;
    for (final entry in d.progressByCourse.entries) {
      final p = entry.value;
      if (p.totalLessons > 0 && p.percentage < 100) {
        resumeCourseId = entry.key;
        resumeProgress = p;
        break;
      }
    }
    final resumeCourse = resumeCourseId == null ? null : d.coursesById[resumeCourseId];
    final dailyBonus = d.daily == null ? 0 : (d.daily!.coinsReward * 1.5).ceil();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const HomeQueuedBanner(),
        const SizedBox(height: 8),
        // Streak card
        CardX(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            MonoLabel('DAILY STREAK'),
            const SizedBox(height: 8),
            Row(children: [
              MonoNumber('${d.streak.count}', size: 44),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Text('day${d.streak.count == 1 ? '' : 's'}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.muted)),
              ),
            ]),
            const SizedBox(height: 12),
            StreakBars(days: bars),
          ]),
        ),
        const SizedBox(height: 16),
        // Resume card
        CardX(
          onTap: resumeCourseId == null ? null : () => _openResume(context, d, resumeCourseId!),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.play_circle_fill, size: 16, color: T.progress),
              const SizedBox(width: 6),
              MonoLabel('RESUME LEARNING'),
            ]),
            const SizedBox(height: 8),
            resumeCourseId == null
                ? Text('Enroll in a course to start.', style: Theme.of(context)
                    .textTheme
                    .bodyLarge
                    ?.copyWith(color: T.muted))
                : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(resumeCourse?.title ?? 'Continue learning',
                        maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text(
                      'Lesson ${_lessonDone(resumeProgress!) + 1} of ${resumeProgress.totalLessons}',
                      style: GoogleFonts.jetBrainsMono(fontSize: 12, color: T.muted),
                    ),
                    const SizedBox(height: 10),
                    ProgressBar(value: resumeProgress.percentage / 100),
                    const SizedBox(height: 10),
                    Row(children: [
                      const Spacer(),
                      Text('RESUME', style: Theme.of(context).textTheme.labelLarge
                          ?.copyWith(color: T.strong, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
                    ]),
                  ]),
          ]),
        ),
        const SizedBox(height: 16),
        // Daily challenge
        CardX(
          onTap: () => context.go('/code'),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.local_fire_department, size: 16, color: T.strong),
              const SizedBox(width: 6),
              MonoLabel('DAILY CHALLENGE'),
              const Spacer(),
              if (d.dailyDone) const ChipPill('DONE', icon: Icons.check),
              Icon(Icons.chevron_right, size: 20, color: T.border),
            ]),
            const SizedBox(height: 8),
            Text(d.daily?.title ?? 'No challenge available right now.',
                maxLines: 2, overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Row(children: [
              MonoLabel('+$dailyBonus COINS', color: T.strong),
              const Spacer(),
              Row(children: [
                Text('CODE',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: T.strong,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2)),
                Icon(Icons.arrow_forward, size: 14, color: T.strong),
              ]),
            ]),
          ]),
        ),
        const SizedBox(height: 16),
        // Quick quiz teaser
        CardX(
          onTap: resumeProgress == null ? null : () => _openQuizTeaser(context, d, resumeCourseId!),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.quiz_outlined, size: 16, color: T.progress),
              const SizedBox(width: 6),
              MonoLabel('QUICK QUIZ'),
              const Spacer(),
              Icon(Icons.chevron_right, size: 20, color: T.border),
            ]),
            const SizedBox(height: 8),
            Text('Prove mastery and finish lessons faster.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.muted)),
            const SizedBox(height: 6),
            Text('Next: ${_nextUncompletedLesson(d, resumeCourseId ?? "") ?? "finish the current lesson first"}',
                maxLines: 2, overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          ]),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  int _lessonDone(CourseProgress p) => p.completedLessons;

  String _resumeTitle_UNUSED(HomeData d, String courseId) => '';

  void _openResume(BuildContext context, HomeData d, String courseId) {
    final slug = d.coursesById[courseId]?.slug ?? '';
    final p = d.progressByCourse[courseId];
    LessonProgressEntry? next;
    for (final l in (p?.lessons ?? const <LessonProgressEntry>[])) {
      if (!l.completed) {
        next = l;
        break;
      }
    }
    next = next ?? ((p != null && p.lessons.isNotEmpty) ? p.lessons.first : null);
    if (next == null || next.lessonId.isEmpty) return;
    final suffix = slug.isEmpty ? '' : '?course=$slug';
    context.go('/lesson/${next.lessonId}$suffix');
  }

  void _openQuizTeaser(BuildContext context, HomeData d, String courseId) {
    final slug = d.coursesById[courseId]?.slug ?? '';
    final p = d.progressByCourse[courseId];
    if (p == null) return;
    for (final l in p.lessons) {
      if (!l.completed) {
        context.go('/lesson/${l.lessonId}${slug.isEmpty ? '' : '?course=$slug'}');
        return;
      }
    }
  }

  String? _nextUncompletedLesson(HomeData d, String courseId) {
    final p = d.progressByCourse[courseId];
    if (p == null) return null;
    for (final l in p.lessons) {
      if (!l.completed) return 'a quick quiz for your next lesson';
    }
    return null;
  }

  String _resumeTitle(HomeData d, String courseId) => 'Continue learning';
}

class HomeQueuedBanner extends StatelessWidget {
  const HomeQueuedBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return CardX(
      padding: const EdgeInsets.all(12),
      child: Row(children: [
        const Icon(Icons.cloud_upload_outlined, size: 18, color: T.strong),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            'Offline work syncs automatically when you reconnect.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: T.muted),
          ),
        ),
      ]),
    );
  }
}
