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

class CourseDetailScreen extends ConsumerStatefulWidget {
  const CourseDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends ConsumerState<CourseDetailScreen> {
  bool _loaded = false;
  String? _error;
  Course? _course;
  CourseProgress? _progress;
  Set<String> _savedLessons = const {};
  Map<String, DownloadProgress> _dlState = const {};
  StreamSubscription<Map<String, DownloadProgress>>? _sub;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = ref.read(offlineRepoProvider).progressStream.listen((s) {
      if (mounted) setState(() => _dlState = s);
    });
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loaded = false;
        _error = null;
      });
    }
    final api = ref.read(offlineRepoProvider).apiForScreen();
    try {
      // Render the course immediately; enrichment streams in after.
      final course = await api.getCourse(widget.slug).timeout(_t);
      if (!mounted) return;
      setState(() {
        _course = course;
        _loaded = true;
      });
      // Silent enrichment: enrollment, progress, local saved set.
      try {
        await api.enroll(course.id).timeout(_t);
      } catch (_) {/* 409 already enrolled is fine */}
      try {
        final p = await api.getCourseProgress(course.id).timeout(_t);
        if (mounted) setState(() => _progress = p);
      } catch (_) {}
      try {
        final saved =
            await ref.read(offlineRepoProvider).savedLessonIds(course.id);
        if (mounted) setState(() => _savedLessons = saved);
      } catch (_) {}
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = ApiClient.friendly(e));
    }
  }

  static const _t = Duration(seconds: 20);

  Future<void> _downloadAll() async {
    final course = _course;
    if (course == null) return;
    await ref.read(offlineRepoProvider).downloadCourse(course);
  }
  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final course = _course;
    return Scaffold(
      appBar: AppBar(
        leading: Semantics(
          label: 'Back',
          button: true,
          child: IconButton(
              onPressed: () {\n                if (context.canPop()) {\n                  context.pop();\n                } else {\n                  context.go('/learn');\n                }\n              },
              icon: const Icon(Icons.arrow_back)),
        ),
        title: Text(course?.title ?? 'Course'),
      ),
      body: !_loaded
          ? (_error != null
              ? Center(
                  child: ErrorRetry(message: _error!, onRetry: _load))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: const [
                    SkeletonCard(height: 120),
                    SizedBox(height: 16),
                    SkeletonCard(height: 64),
                  ],
                ))
          : _buildBody(context, course!),
    );
  }

  Widget _buildBody(BuildContext context, Course course) {
    final p = _progress;
    final ratio = (p != null && p.totalLessons > 0)
        ? p.completedLessons / p.totalLessons
        : 0.0;
    final dl = _dlState[course.id];

    return RefreshIndicator(
      color: T.strong,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Gradient title banner
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: const [
                  Color(0xFFEAF6E2),
                  Color(0xFFF7FCF2),
                ],
              ),
              borderRadius: BorderRadius.circular(T.cardRadius),
              border: Border.all(color: T.border),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(course.title,
                      style: Theme.of(context).textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(course.description,
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: T.muted)),
                ]),
          ),
          const SizedBox(height: 12),
          Row(children: [
            ChipPill(course.level),
            const SizedBox(width: 8),
            Text('${course.lessons.length} lessons',
                style: GoogleFonts.jetBrainsMono(fontSize: 11, color: T.muted)),
            const Spacer(),
            Text('${p?.percentage ?? 0}%',
                style: GoogleFonts.jetBrainsMono(
                    fontSize: 13, fontWeight: FontWeight.w700, color: T.strong)),
          ]),
          const SizedBox(height: 8),
          ProgressBar(value: ratio),
          const SizedBox(height: 16),

          // ---- Download for offline card
          CardX(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              MonoLabel('DOWNLOAD FOR OFFLINE'),
              const SizedBox(height: 10),
              if (dl != null && dl.state == DownloadState.running) ...[
                ProgressBar(value: dl.total == 0 ? 0 : dl.done / dl.total),
                const SizedBox(height: 6),
                Text('Downloading ${dl.done} of ${dl.total} lessons...',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11, color: T.muted)),
                if (dl.failed.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text('${dl.failed.length} failed. Retry to fill the gaps.',
                      style: GoogleFonts.jetBrainsMono(
                          fontSize: 11, color: const Color(0xFFB3261E))),
                ],
              ] else if (dl != null && dl.state == DownloadState.failed) ...[
                Text('Some downloads failed.',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11, color: const Color(0xFFB3261E))),
                const SizedBox(height: 10),
                PrimaryButton(onPressed: _downloadAll,
                    child: const Text('Retry download')),
              ] else
                PrimaryButton(
                  onPressed: _downloadAll,
                  child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center, children: [
                        Icon(Icons.download, size: 18),
                        SizedBox(width: 8),
                        Text('Download for offline'),
                      ]),
                ),
            ]),
          ),
          const SizedBox(height: 16),
          MonoLabel('LESSONS'),
          const SizedBox(height: 8),
          for (var i = 0; i < course.lessons.length; i++)
            _LessonRow(
              lesson: course.lessons[i],
              done: p?.lessons
                      .any((x) => x.lessonId == course.lessons[i].id && x.completed) ??
                  false,
              saved: _savedLessons.contains(course.lessons[i].id),
              saving: dl != null && dl.failed.contains(course.lessons[i].id),
              onSave: () => ref
                  .read(offlineRepoProvider)
                  .downloadCourse(course, onlyLessons: [course.lessons[i]]),
              onOpen: () => context
                  .push('/lesson/${course.lessons[i].id}?course=${course.slug}'),
            ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({
    required this.lesson,
    required this.done,
    required this.saved,
    required this.saving,
    required this.onSave,
    required this.onOpen,
  });

  final LessonMeta lesson;
  final bool done;
  final bool saved;
  final bool saving;
  final VoidCallback onSave;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    Widget? status;
    if (done) {
      status = const ChipPill('DONE', icon: Icons.check);
    } else if (saved) {
      status = const ChipPill('SAVED', textColor: T.progress);
    }

    return CardX(
      padding: EdgeInsets.zero,
      onTap: onOpen,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(lesson.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .bodyLarge
                      ?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(lesson.durationMin > 0 ? '${lesson.durationMin} min' : 'Lesson',
                  style: GoogleFonts.jetBrainsMono(fontSize: 11, color: T.muted)),
            ]),
          ),
          const SizedBox(width: 8),
          if (status != null)
            status
          else
            SizedBox(
              height: T.minTouch,
              child: TextButton(
                onPressed: saving ? null : onSave,
                child: Text('SAVE',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11,
                        letterSpacing: 1.2,
                        color: T.strong,
                        fontWeight: FontWeight.w700)),
              ),
            ),
        ]),
      ),
    );
  }
}
