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

final coursesProvider =
    AsyncNotifierProvider<CoursesNotifier, List<Course>>(CoursesNotifier.new);

class CoursesNotifier extends AsyncNotifier<List<Course>> {
  @override
  FutureOr<List<Course>> build() async {
    return ref.read(offlineRepoProvider).apiForScreen().getCourses();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      state = AsyncValue.data(
          await ref.read(offlineRepoProvider).apiForScreen().getCourses());
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}

final downloadedCoursesProvider =
    FutureProvider.autoDispose<Set<String>>((ref) async {
  final info = await ref.read(offlineRepoProvider).manageInfo();
  return info.courses.map((c) => c.courseId).toSet();
});

final _levelFilters = ['All', 'Beginner', 'DSA', 'Web'];

/// Keyword-based secondary filters (the courses table has no category
/// column yet - see delivery notes for the missing field).
const _dsaKeywords = ['dsa', 'data structure', 'algorithm', 'python', 'interview'];
const _webKeywords = ['web', 'html', 'css', 'javascript', 'react', 'frontend', 'git', 'github'];

class LearnScreen extends ConsumerStatefulWidget {
  const LearnScreen({super.key});
  @override
  ConsumerState<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends ConsumerState<LearnScreen> {
  String _filter = 'All';
  String _query = '';
  final _search = TextEditingController();

  List<Course> _filtered(List<Course> courses) {
    Iterable<Course> out = courses;
    if (_query.isNotEmpty) {
      out = out.where((c) =>
          c.title.toLowerCase().contains(_query.toLowerCase()) ||
          c.description.toLowerCase().contains(_query.toLowerCase()));
    }
    switch (_filter) {
      case 'Beginner':
        out = out.where((c) => c.level == 'beginner');
      case 'DSA':
        out = out.where((c) => _dsaKeywords
            .any((k) => (c.title + ' ' + c.description + ' ' + c.slug).toLowerCase().contains(k)));
      case 'Web':
        out = out.where((c) => _webKeywords
            .any((k) => (c.title + ' ' + c.description + ' ' + c.slug).toLowerCase().contains(k)));
    }
    return out.toList();
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(coursesProvider);
    final saved = ref.watch(downloadedCoursesProvider).value ?? const <String>{};
  
    return Scaffold(
      appBar: AppBar(title: const Text('Learn')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: TextField(
            controller: _search,
            onChanged: (v) => setState(() => _query = v),
            decoration: InputDecoration(
              hintText: 'Search courses',
              prefixIcon: const Icon(Icons.search, size: 20, color: T.muted),
              isDense: true,
            ),
          ),
        ),
        SizedBox(
          height: 44,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemBuilder: (c, i) {
              final label = _levelFilters[i];
              final active = _filter == label;
              return FilterChip(
                label: Text(label.toUpperCase(),
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11, letterSpacing: 1.0, fontWeight: FontWeight.w600,
                        color: active ? Colors.white : T.muted)),
                selected: active,
                onSelected: (_) => setState(() => _filter = label),
                showCheckmark: false,
                backgroundColor: Colors.white,
                selectedColor: T.strong,
                side: BorderSide(color: active ? T.strong : T.border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              );
            },
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemCount: _levelFilters.length,
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            color: T.strong,
            onRefresh: () => ref.read(coursesProvider.notifier).refresh(),
            child: data.when(
              data: (courses) {
                final list = _filtered(courses);
                if (list.isEmpty) {
                  return ListView(children: const [
                    SizedBox(height: 120),
                    EmptyState(title: 'NO COURSES FOUND',
                        subtitle: 'Try another search or filter.'),
                  ]);
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (c, i) => CourseCard(course: list[i], saved: saved.contains(list[i].id)),
                );
              },
              loading: () => ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  SkeletonCard(height: 128),
                  SizedBox(height: 12),
                  SkeletonCard(height: 128),
                  SizedBox(height: 12),
                  SkeletonCard(height: 128),
                ],
              ),
              error: (e, st) => ListView(children: [SizedBox(
                height: MediaQuery.of(context).size.height * 0.6,
                child: ErrorRetry(message: ApiClient.friendly(e),
                    onRetry: () => ref.read(coursesProvider.notifier).refresh()),
              )]),
            ),
          ),
        ),
      ]),
    );
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }
}

class CourseCard extends StatelessWidget {
  const CourseCard({super.key, required this.course, required this.saved});
  final Course course;
  final bool saved;

  @override
  Widget build(BuildContext context) {
    return CardX(
      onTap: () => context.push('/course/${course.slug}'),
      child: Row(children: [
        Container(
          width: 60, height: 60,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: _levelColors(course.level),
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(color: Color(0x335CB85C), blurRadius: 14, offset: Offset(0, 6)),
            ],
          ),
          alignment: Alignment.center,
          child: Icon(_courseIcon(course.icon, course.title), size: 30, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(course.title, maxLines: 2, overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(course.description, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: T.muted)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
            ChipPill(course.level,
                color: _levelColors(course.level)[0].withValues(alpha: 0.16),
                textColor: _levelColors(course.level)[1]),
            Text('${course.lessons.length} lessons',
                style: GoogleFonts.jetBrainsMono(fontSize: 11, color: T.muted)),
            if (course.durationWeeks > 0)
              Text('${course.durationWeeks}w',
                  style: GoogleFonts.jetBrainsMono(fontSize: 11, color: T.muted)),
            if (saved)
              Row(mainAxisSize: MainAxisSize.min, children: const [
                Icon(Icons.download_done, size: 14, color: T.progress),
                SizedBox(width: 3),
                Text('SAVED OFFLINE',
                    style: TextStyle(
                        fontSize: 10, color: T.progress, fontFamily: 'JetBrains Mono',
                        fontWeight: FontWeight.w600, letterSpacing: 0.8)),
              ]),
          ]),
        ])),
      ]),
    );
  }
}

List<Color> _levelColors(String level) {
  switch (level) {
    case 'intermediate':
      return [const Color(0xFFCBE8B9), const Color(0xFF2E7D32)];
    case 'advanced':
      return [const Color(0xFFE4D7B8), const Color(0xFF8A6A21)];
    default:
      return [const Color(0xFFD9EFCE), const Color(0xFF2E7D32)];
  }
}


/// Convert the course icon identifier returned by the API into a Material icon.
/// Unknown identifiers fall back to a stable book icon instead of a missing glyph.
IconData _courseIcon(String rawIcon, String title) {
  final key = rawIcon.trim().toLowerCase().replaceAll('_', '-');
  final text = '$key ${title.toLowerCase()}';
  if (text.contains('python')) return Icons.code;
  if (text.contains('javascript') || text.contains('typescript') || text.contains('web')) return Icons.web;
  if (text.contains('html') || text.contains('css')) return Icons.language;
  if (text.contains('database') || text.contains('sql')) return Icons.storage;
  if (text.contains('data-structure') || text.contains('algorithm') || text.contains('dsa')) return Icons.account_tree;
  if (text.contains('machine-learning') || text.contains('artificial-intelligence') || text.contains('ai')) return Icons.psychology;
  if (text.contains('cyber') || text.contains('security') || text.contains('hacking')) return Icons.shield_outlined;
  if (text.contains('design') || text.contains('figma') || text.contains('ui')) return Icons.draw_outlined;
  if (text.contains('mobile') || text.contains('flutter') || text.contains('android') || text.contains('ios')) return Icons.phone_iphone;
  if (text.contains('cloud') || text.contains('devops')) return Icons.cloud_outlined;
  if (text.contains('git') || text.contains('version-control')) return Icons.account_tree_outlined;
  if (text.contains('terminal') || text.contains('linux') || text.contains('command')) return Icons.terminal;
  if (text.contains('book') || text.contains('lesson') || text.contains('course')) return Icons.menu_book;
  return Icons.menu_book;
}
