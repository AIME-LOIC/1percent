import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/ui.dart';
import '../data/models.dart';
import '../offline/offline_repo.dart';
import '../providers.dart';
import 'home.dart';
import '../widgets/lesson_markdown.dart';

class LessonArgs {
  LessonArgs({required this.lessonId, required this.courseSlug});
  final String lessonId;
  final String courseSlug;

  // Riverpod family arguments must have value equality. The screen creates
  // LessonArgs during each build; identity equality would recreate providers
  // repeatedly and can leave lesson content stuck loading.
  @override
  bool operator ==(Object other) =>
      other is LessonArgs &&
      other.lessonId == lessonId &&
      other.courseSlug == courseSlug;

  @override
  int get hashCode => Object.hash(lessonId, courseSlug);
}

class LessonScreenState {
  LessonScreenState({
    required this.course,
    required this.index,
    required this.total,
    required this.pack,
  });
  final Course course;
  final int index; // 1-based
  final int total;
  final LessonPack pack;
}

/// Fast route data: course shell + lesson meta only (no content).
final lessonProvider = FutureProvider.autoDispose
    .family<LessonScreenState, LessonArgs>((ref, args) async {
  final repo = ref.watch(offlineRepoProvider);
  final course = await repo.courseForLesson(args.courseSlug).timeout(ds);
  final idx = course.lessons.indexWhere((l) => l.id == args.lessonId);
  if (idx < 0) throw StateError('Lesson not found in this course.');
  final lesson = course.lessons[idx];
  final hasLocal = await repo.hasLessonLocal(lesson.id);
  return LessonScreenState(
      course: course,
      index: idx + 1,
      total: course.lessons.length,
      pack: LessonPack(
          lesson: lesson, contentMd: '', quiz: null, fromLocal: hasLocal));
});

const Duration ds = Duration(seconds: 20);

class LessonContent {
  LessonContent({required this.md, required this.saved});
  final String md;
  final bool saved;
}

/// Lesson markdown (local-first; streams from the network otherwise).
final lessonContentProvider = FutureProvider.autoDispose
    .family<LessonContent, LessonArgs>((ref, args) async {
  final repo = ref.watch(offlineRepoProvider);
  final shell = await ref.watch(lessonProvider(args).future);
  final md = await repo.lessonContent(shell.pack.lesson);
  return LessonContent(md: md, saved: shell.pack.fromLocal);
});

class LessonScreen extends ConsumerStatefulWidget {
  const LessonScreen(
      {super.key, required this.lessonId, required this.courseSlug});
  final String lessonId;
  final String courseSlug;

  @override
  ConsumerState<LessonScreen> createState() => _LessonScreenStateState();
}

class _LessonScreenStateState extends ConsumerState<LessonScreen> {
  Timer? _studyTimer;
  int _studySeconds = 0;
  bool _completing = false;
  bool _completed = false;

  LessonArgs get _args =>
      LessonArgs(lessonId: widget.lessonId, courseSlug: widget.courseSlug);

  @override
  void initState() {
    super.initState();
    _studyTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) _studySeconds += 5;
    });
  }

  @override
  void dispose() {
    _studyTimer?.cancel();
    super.dispose();
  }

  Future<void> _markComplete() async {
    final s = ref.read(lessonProvider(_args)).value;
    if (s == null || _completing) return;
    setState(() => _completing = true);
    try {
      final repo = ref.read(offlineRepoProvider);
      final progress =
          await repo.markComplete(s.pack.lesson, studySeconds: _studySeconds);
      if (!mounted) return;
      if (progress == null) {
        showSnack(context,
            'You are offline - completion is queued and syncs when you reconnect.');
      } else {
        _completed = true;
        showSnack(context, 'Lesson marked complete.');
      }
      await ref.read(homeProvider.notifier).refresh();
    } catch (e) {
      if (mounted) showSnack(context, ApiClient.friendly(e), error: true);
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  void _goNext(LessonScreenState s) {
    if (s.index >= s.total) return;
    final next = s.course.lessons[s.index];
    context.pushReplacement('/lesson/${next.id}?course=${s.course.slug}');
  }

  @override
  Widget build(BuildContext context) {
    final lesson = ref.watch(lessonProvider(_args));
    return lesson.when(
      loading: () => const Scaffold(
          body: Center(child: CircularProgressIndicator(color: T.strong))),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(
          child: ErrorRetry(
            message: ApiClient.friendly(e),
            onRetry: () => ref.invalidate(lessonProvider(_args)),
          ),
        ),
      ),
      data: (s) => _build(context, s),
    );
  }

  Widget _buildData(BuildContext context, LessonScreenState s) => _build(context, s);

  Widget _build(BuildContext context, LessonScreenState s) {
    final progress = s.total > 0 ? s.index / s.total : 0.0;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              // Deep links and restored lesson routes may have no back stack.
              context.go('/learn');
            }
          },
          icon: const Icon(Icons.arrow_back),
        ),
        titleSpacing: 16,
        title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('LESSON ${s.index} OF ${s.total}',
                  style: GoogleFonts.jetBrainsMono(
                      fontSize: 11, letterSpacing: 1.2, color: T.muted)),
              const SizedBox(height: 4),
              ProgressBar(value: progress, height: 4),
            ]),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          Text(s.pack.lesson.title,
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          Row(children: [
            if (s.pack.fromLocal) ...[
              const ChipPill('SAVED', icon: Icons.download_done),
              const SizedBox(width: 8),
            ],
            MonoLabel(s.pack.lesson.durationMin > 0
                ? '${s.pack.lesson.durationMin} MIN'
                : 'STUDY ${(_studySeconds / 60).floor()} MIN'),
          ]),
          const SizedBox(height: 16),
            _LessonContentBlock(args: _args),
          const SizedBox(height: 8),
          Text('MISTAKES ARE TUITION. STUDY BEFORE MARKING COMPLETE.',
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 10, color: T.border, letterSpacing: 1.0)),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: T.border)),
          ),
          child: Row(children: [
            Expanded(
              child: OutlineButton48(
                onPressed: _openQuiz,
                child: const FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text('Quick Quiz: prove it and continue'),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: PrimaryButton(
                onPressed: _completed || _completing ? null : _markComplete,
                child: _completing
                    ? const SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: T.ink))
                    : Text(_completed ? 'Completed' : 'Mark complete'),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  void _openQuiz() {
    final shell = ref.read(lessonProvider(_args)).value;
    if (shell == null) return;
    if (shell.pack.quiz != null) {
      QuizSheet.show(context, shell, _goNext);
      return;
    }
    // Quiz fetch is lazy (server can take seconds): tiny in-sheet loader.
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _QuizLoaderScreen(args: _args, shell: shell, onFinish: _goNext),
    );
  }
}

class _QuizLoaderScreen extends ConsumerWidget {
  const _QuizLoaderScreen(
      {required this.args, required this.shell, required this.onFinish});
  final LessonArgs args;
  final LessonScreenState shell;
  final void Function(LessonScreenState) onFinish;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(offlineRepoProvider);
    final future = repo.quizLesson(shell.pack.lesson).timeout(
          const Duration(seconds: 20),
          onTimeout: () => null,
        );
    return FutureBuilder<QuickQuiz?>(
      future: future,
      builder: (context, snap) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: snap.connectionState != ConnectionState.done
              ? const Padding(
                  padding: EdgeInsets.all(32),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    MonoLabel('PREPARING QUICK QUIZ'),
                    SizedBox(height: 14),
                    CircularProgressIndicator(color: T.strong, strokeWidth: 2),
                    SizedBox(height: 10),
                    Text('Grading questions load from the server. '
                        'Downloaded courses open instantly.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: T.muted)),
                  ]),
                )
              : Builder(builder: (context) {
                  final quiz = snap.data;
                  if (quiz == null) {
                    return Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Icon(Icons.quiz_outlined, size: 28,
                                color: T.muted),
                            const SizedBox(height: 12),
                            const Text(
                                'No quick quiz is available for this lesson yet',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 12),
                            OutlineButton48(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Read the lesson instead'),
                            ),
                          ]),
                    );
                  }
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (context.mounted) {
                      // Replace the loader with the real quiz sheet.
                      Navigator.of(context).pop();
                      final qstate = LessonScreenState(
                        course: shell.course,
                        index: shell.index,
                        total: shell.total,
                        pack: LessonPack(
                            lesson: shell.pack.lesson,
                            contentMd: shell.pack.contentMd,
                            quiz: quiz,
                            fromLocal: shell.pack.fromLocal),
                      );
                      QuizSheet.show(context, qstate, onFinish);
                    }
                  });
                  return const SizedBox.shrink();
                }),
        );
      },
    );
  }
}

/// Quick quiz bottom sheet (screen 9).
class QuizSheet extends ConsumerStatefulWidget {
  const QuizSheet({super.key, required this.state, required this.onFinish});
  final LessonScreenState state;
  final void Function(LessonScreenState) onFinish;

  static void show(BuildContext context, LessonScreenState state,
      void Function(LessonScreenState) onFinish) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => QuizSheet(state: state, onFinish: onFinish),
    );
  }

  @override
  ConsumerState<QuizSheet> createState() => _QuizSheetState();
}

class _QuizSheetState extends ConsumerState<QuizSheet> {
  final Map<String, String> _answers = {};
  int _current = 0;
  bool _submitting = false;
  QuickQuizResult? _result;
  String? _error;
  bool _queued = false;
  final DateTime _startTime = DateTime.now();

  QuickQuiz get quiz => widget.state.pack.quiz!;

  Future<void> _onCheck() async {
    if (_submitting) return;
    final q = quiz.questions[_current];
    if (_answers[q.id] == null) {
      setState(() => _error = 'Choose an answer first.');
      return;
    }
    setState(() => _error = null);
    if (_current < quiz.questions.length - 1) {
      setState(() => _current++);
      return;
    }
    setState(() => _submitting = true);
    try {
      final repo = ref.read(offlineRepoProvider);
      final timeSpent = DateTime.now().difference(_startTime).inSeconds;
      final res = await repo.submitQuiz(
          widget.state.pack.lesson, quiz, Map.of(_answers), timeSpent);
      if (!mounted) return;
      if (res == null) {
        setState(() {
          _queued = true;
          _submitting = false;
        });
        return;
      }
      if (res.passed) {
        try {
          await repo.markComplete(widget.state.pack.lesson, studySeconds: null);
        } catch (_) {/* Mark-complete stays available */}
      }
      setState(() {
        _result = res;
        _submitting = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = ApiClient.friendly(e);
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = quiz.questions[_current];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.88),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: T.border, borderRadius: BorderRadius.circular(4)),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Row(children: [
                MonoLabel(
                    'QUESTION ${_current + 1} OF ${quiz.questions.length}'),
                const Spacer(),
                Text('PASS >= ${quiz.passingScore}%',
                    style: GoogleFonts.jetBrainsMono(
                        fontSize: 11, color: T.muted)),
              ]),
              const SizedBox(height: 14),
              Text(q.question,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              if (q.review) ...[
                const SizedBox(height: 4),
                MonoLabel('REVIEW QUESTION FROM THIS COURSE'),
              ],
            ]),
          ),
          Flexible(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              shrinkWrap: true,
              children: [
                for (final opt in q.options)
                  _OptionTile(
                    text: opt.text,
                    selected: _answers[q.id] == opt.id,
                    onTap: () => setState(() {
                      _answers[q.id] = opt.id;
                      _error = null;
                    }),
                  ),
                if (_error != null) ...[
                  const SizedBox(height: 6),
                  Text(_error!,
                      style: const TextStyle(
                          color: Color(0xFFB3261E), fontSize: 13)),
                ],
                if (_result != null)
                  _ResultCards(
                      result: _result!,
                      onFinish: () {
                        Navigator.of(context).pop();
                        widget.onFinish(widget.state);
                      })
                else if (_queued)
                  _QueuedCards(onFinish: () {
                    Navigator.of(context).pop();
                    widget.onFinish(widget.state);
                  }),
                const SizedBox(height: 12),
              ],
            ),
          ),
          if (_result == null && !_queued)
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  PrimaryButton(
                    onPressed: _submitting ? null : _onCheck,
                    child: _submitting
                        ? const SizedBox(
                            width: 18, height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: T.ink))
                        : Text(_current < quiz.questions.length - 1
                            ? 'Check answer'
                            : 'Check answers and finish'),
                  ),
                  const SizedBox(height: 6),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Read the lesson instead'),
                  ),
                ]),
              ),
            ),
        ]),
      ),
    );
  }
}

class _ResultCards extends StatelessWidget {
  const _ResultCards({required this.result, required this.onFinish});
  final QuickQuizResult result;
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context) {
    final passed = result.passed;
    final color = passed ? T.strong : const Color(0xFFB3261E);
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: T.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: T.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(passed ? Icons.verified : Icons.close, size: 20, color: color),
          const SizedBox(width: 8),
          Text(passed ? 'PASSED - LESSON COMPLETED' : 'NOT PASSED YET',
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 12, fontWeight: FontWeight.w700, color: color)),
        ]),
        const SizedBox(height: 6),
        Text('Score ${result.percentage}% (passing ${result.passingScore}%)',
            style: GoogleFonts.jetBrainsMono(fontSize: 12, color: T.muted)),
        if (result.attemptsRemaining != null)
          Text('${result.attemptsRemaining} attempt(s) left',
              style: GoogleFonts.jetBrainsMono(fontSize: 12, color: T.muted)),
        const SizedBox(height: 12),
        PrimaryButton(onPressed: onFinish, child: const Text('Continue')),
      ]),
    );
  }
}

class _QueuedCards extends StatelessWidget {
  const _QueuedCards({required this.onFinish});
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: T.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: T.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.cloud_upload_outlined, size: 20, color: T.strong),
          const SizedBox(width: 8),
          Text('QUEUED - VERIFIED WHEN ONLINE',
              style: GoogleFonts.jetBrainsMono(
                  fontSize: 12, fontWeight: FontWeight.w700, color: T.strong)),
        ]),
        const SizedBox(height: 6),
        Text(
            'You are offline. Answers and completion are queued; the server '
            'grades and awards coins when the connection returns.',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: T.muted)),
        const SizedBox(height: 12),
        PrimaryButton(onPressed: onFinish, child: const Text('Continue')),
      ]),
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile(
      {required this.text, required this.selected, required this.onTap});
  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(T.btnRadius),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 56),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: selected ? T.surface : Colors.white,
            borderRadius: BorderRadius.circular(T.btnRadius),
            border: Border.all(
                color: selected ? T.strong : T.border, width: selected ? 2 : 1),
          ),
          alignment: Alignment.centerLeft,
          child: Text(text,
              style: Theme.of(context)
                  .textTheme
                  .bodyLarge
                  ?.copyWith(fontWeight: selected ? FontWeight.w600 : FontWeight.w400)),
        ),
      ),
    );
  }
}


class _LessonContentBlock extends ConsumerWidget {
  const _LessonContentBlock({required this.args});
  final LessonArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final content = ref.watch(lessonContentProvider(args));
    return content.when(
      loading: () => Column(
        children: const [
          SkeletonBox(height: 14),
          SizedBox(height: 10),
          SkeletonBox(height: 14),
          SizedBox(height: 10),
          SkeletonBox(height: 14, width: 220),
          SizedBox(height: 10),
          SkeletonBox(height: 90),
          SizedBox(height: 14),
          MonoLabel('LESSON STREAMS FROM THE SERVER - USUALLY 5 TO 10 SECONDS'),
        ],
      ),
      error: (e, _) => Column(children: [
        MonoLabel('COULD NOT LOAD THIS LESSON', color: const Color(0xFFB3261E)),
        const SizedBox(height: 8),
        Text(ApiClient.friendly(e),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: T.muted)),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => ref.invalidate(lessonContentProvider(args)),
          child: const Text('Try again'),
        ),
      ]),
      data: (c) => c.md.isEmpty
          ? Text('This lesson has no content yet.',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: T.muted))
          : LessonMarkdown(data: c.md),
    );
  }
}
