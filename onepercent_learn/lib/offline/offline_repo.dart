import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart' as drift;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../data/api.dart';
import '../data/models.dart';
import 'local_db.dart';

final dbProvider = Provider<AppDb>((_) => AppDb());
final tokenStoreProvider = Provider<TokenStore>((_) => TokenStore());
final apiClientProvider = Provider<ApiClient>((ref) {
  final t = ref.watch(tokenStoreProvider);
  return ApiClient(t);
});
final apiProvider = Provider<Api>((ref) => Api(ref.watch(apiClientProvider).dio));

final connectivityStreamProvider =
    StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

final offlineRepoProvider = Provider<OfflineRepo>((ref) {
  final repo = OfflineRepo(
      ref.watch(dbProvider), ref.watch(apiProvider), Connectivity());
  // Auto-sync queued offline ops whenever connectivity improves.
  try {
    ref.listen(connectivityStreamProvider, (prev, next) {
      final online = !((next.value ?? []).contains(ConnectivityResult.none));
      if (online) repo.syncPending();
    });
  } catch (_) {}
  return repo;
});

class OfflineRepo {
  OfflineRepo(this._db, this._api, this._connectivity);

  final AppDb _db;
  final Api _api;
  final Connectivity _connectivity;

  /// Public accessor for screens that need direct API calls.
  Api apiForScreen() => _api;

  /// Whether this lesson body exists in the local database.
  Future<bool> hasLessonLocal(String lessonId) async =>
      (await _db.lesson(lessonId)) != null;

  /// Number of pending offline ops (shown on Home).
  Future<int> queuedOpsCount() async => (await _db.allOps()).length;

  // ------------------------------------------------------------- DOWNLOADS
  final _progressCtrl =
      StreamController<Map<String, DownloadProgress>>.broadcast();
  Stream<Map<String, DownloadProgress>> get progressStream =>
      _progressCtrl.stream;

  final Map<String, DownloadProgress> _state = {};

  DownloadProgress? savedProgress(String courseId) => _state[courseId];

  void _emit(String courseId, DownloadProgress p) {
    _state[courseId] = p;
    _progressCtrl.add(Map.of(_state));
  }

  static Future<bool> online() async {
    final r = await Connectivity().checkConnectivity();
    return !r.contains(ConnectivityResult.none);
  }

  Future<void> downloadCourse(Course course,
      {List<LessonMeta> onlyLessons = const []}) async {
    final lessons = onlyLessons.isNotEmpty ? onlyLessons : course.lessons;
    final p = DownloadProgress(
        courseId: course.id,
        total: lessons.length,
        done: 0,
        failed: [],
        state: DownloadState.running);
    _emit(course.id, p);

    // Shell first so the course appears in Manage even mid-download.
    await _db.upsertCourse(DownloadedCoursesCompanion(
      courseId: drift.Value(course.id),
      courseJson: drift.Value(jsonEncode(course.toJson())),
      downloadedAt: drift.Value(DateTime.now()),
    ));

    for (final lesson in lessons) {
      try {
        try {
          await _api.enroll(course.id);
        } catch (_) {/* 409 already enrolled is fine */}
        final md =
            await _api.getLessonContent(lesson.id).timeout(_netTimeout);
        final quiz =
            await _api.getQuickQuiz(lesson.id).timeout(_netTimeout);
        await _db.upsertLesson(DownloadedLessonsCompanion(
          lessonId: drift.Value(lesson.id),
          courseId: drift.Value(course.id),
          title: drift.Value(lesson.title),
          contentMd: drift.Value(md),
          sortIndex: drift.Value(lesson.sortOrder),
          description: drift.Value(lesson.description),
          quizJson: drift.Value(quiz == null
              ? null
              : jsonEncode({
                  'quiz_id': quiz.quizId,
                  'lesson_id': quiz.lessonId,
                  'lesson_title': quiz.lessonTitle,
                  'passing_score': quiz.passingScore,
                  'questions': quiz.questions
                      .map((q) => {
                            'id': q.id,
                            'question': q.question,
                            'points': q.points,
                            'review': q.review,
                            'options': q.options
                                .map((o) => {'id': o.id, 'text': o.text})
                                .toList(),
                          })
                      .toList(),
                })),
          downloadedAt: drift.Value(DateTime.now()),
        ));
        p.done = p.done + 1;
        _emit(course.id, p.clone());
      } catch (e) {
        _state[course.id]!.addFailure(lesson.id);
        _emit(course.id, p.clone());
      }
    }
    final last = _state[course.id]!;
    last.state = last.failed.isEmpty
        ? DownloadState.done
        : DownloadState.failed;
    _emit(course.id, last.clone());
  }

  static const _netTimeout = Duration(seconds: 25);

  // ------------------------------------------------------------- DELETE
  Future<void> deleteCourseDownloads(String courseId) async {
    await _db.deleteLessonsForCourse(courseId);
    await _db.deleteCourse(courseId);
  }

  // --------------------------------------------------------------- READ
  Future<LessonPack> lessonPack(LessonMeta lesson) async {
    final row = await _db.lesson(lesson.id);
    if (row != null) {
      QuickQuiz? quiz;
      if (row.quizJson != null) {
        quiz =
            QuickQuiz.tryFromJson(Map<String, dynamic>.from(jsonDecode(row.quizJson!) as Map));
      }
      return LessonPack(
        lesson: LessonMeta(
            id: row.lessonId,
            title: row.title,
            description: row.description ?? ''),
        contentMd: row.contentMd,
        quiz: quiz,
        fromLocal: true,
      );
    }
    final md = await _api.getLessonContent(lesson.id);
    return LessonPack(lesson: lesson, contentMd: md, quiz: await _safeQuiz(lesson.id));
  }

  /// Course shell for a lesson route. Online: API. Offline: stored course
  /// shell so lessons keep working in airplane mode.
  Future<Course> courseForLesson(String slug) async {
    if (slug.isNotEmpty && await online()) {
      try {
        return await _api.getCourse(slug);
      } on DioException catch (e) {
        final t = e.type;
        if (t == DioExceptionType.connectionError ||
            t == DioExceptionType.connectionTimeout ||
            t == DioExceptionType.sendTimeout ||
            t == DioExceptionType.receiveTimeout ||
            t == DioExceptionType.unknown) {
          // fall through to local copy
        } else {
          rethrow;
        }
      }
    }
    final cs = await _db.courses();
    for (final row in cs) {
      try {
        final c = Course.fromJson(
            Map<String, dynamic>.from(jsonDecode(row.courseJson) as Map));
        if (c.slug == slug) return c;
      } catch (_) {}
    }
    if (slug.isEmpty) throw StateError('Missing course for this lesson.');
    throw StateError('Course not downloaded. Connect once to open it.');
  }

  Future<QuickQuiz?> _safeQuiz(String lessonId) async {
    try {
      return await _api.getQuickQuiz(lessonId);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Markdown only (local first, then network). Kept separate from the
  /// quiz so the lesson text can stream in while the quiz stays lazy.
  Future<String> lessonContent(LessonMeta lesson) async {
    final row = await _db.lesson(lesson.id);
    if (row != null) return row.contentMd;
    try {
      return await _api.getLessonContent(lesson.id).timeout(_netTimeout);
    } on DioException catch (e) {
      final t = e.type;
      if (t == DioExceptionType.connectionError || t == DioExceptionType.connectionTimeout ||
          t == DioExceptionType.receiveTimeout || t == DioExceptionType.unknown) {
        rethrow;
      }
      rethrow;
    }
  }

  /// Quiz for the quiz sheet, fetched lazily on demand.
  Future<QuickQuiz?> quizLesson(LessonMeta lesson) async {
    final row = await _db.lesson(lesson.id);
    if (row != null && row.quizJson != null) {
      return QuickQuiz.tryFromJson(
          Map<String, dynamic>.from(jsonDecode(row.quizJson!) as Map));
    }
    return _safeQuiz(lesson.id);
  }

  Future<Set<String>> savedLessonIds(String courseId) async =>
      (await _db.lessonsForCourse(courseId)).map((r) => r.lessonId).toSet();

  // ---------------------------------------------------------- WRITE/QUEUE
  /// Quick quiz answers. Online = grade now; offline queue verified later.
  Future<QuickQuizResult?> submitQuiz(LessonMeta lesson, QuickQuiz quiz,
      Map<String, String> answers, int timeSpentSec) async {
    if (await online()) {
      return _api.submitQuickQuiz(lesson.id, answers, timeSpentSec);
    }
    await _db.addOp(PendingOpsCompanion.insert(
      kind: 'quiz',
      lessonId: lesson.id,
      payload: jsonEncode({
        'answers': answers,
        'time_spent_sec': timeSpentSec,
        'quiz_id': quiz.quizId,
      }),
    ));
    return null; // caller renders the QUEUED state
  }

  Future<CourseProgress?> markComplete(LessonMeta lesson,
      {int? studySeconds}) async {
    if (await online()) {
      final out = await _api.completeLesson(lesson.id, studySeconds);
      return out.done ? out.progress : null;
    }
    await _db.addOp(PendingOpsCompanion.insert(
      kind: 'complete',
      lessonId: lesson.id,
      payload: jsonEncode({'study_seconds': studySeconds}),
    ));
    return null; // queued
  }

  /// Replays queued ops when the connection returns.
  Future<void> syncPending() async {
    if (!await online()) return;
    final ops = await _db.allOps();
    for (final op in ops) {
      try {
        if (op.kind == 'quiz') {
          final p = jsonDecode(op.payload) as Map<String, dynamic>;
          final answers = (p['answers'] as Map).cast<String, String>();
          final res = await _api.submitQuickQuiz(
              op.lessonId, answers, (p['time_spent_sec'] ?? 0) as int);
          if (res.passed) {
            try {
              await _api.completeLesson(op.lessonId, null);
            } on DioException catch (e) {
              final code =
                  e.response?.data is Map ? e.response!.data['code'] : null;
              if (code != 'STUDY_TIME_REQUIRED') rethrow;
            }
          }
        } else {
          final p = jsonDecode(op.payload) as Map<String, dynamic>;
          await _api.completeLesson(op.lessonId, p['study_seconds'] as int?);
        }
        await _db.removeOp(op.id);
      } catch (_) {
        // Keep the op queued; a later sync attempt retries it.
      }
    }
  }

  /// Stored course rows for the Manage sheet.
  Future<List<DownloadedCourse>> downloadRows() => _db.courses();

  Future<ManageInfo> manageInfo() async {
    final cs = await _db.courses();
    final bytes = await _db.storedBytes();
    return ManageInfo(courses: cs, bytes: bytes);
  }

  Future<int> storedBytes() => _db.storedBytes();
}

class DownloadProgress {
  DownloadProgress({
    required this.courseId,
    required this.total,
    required this.done,
    required this.failed,
    required this.state,
  });

  final String courseId;
  final int total;
  int done;
  final List<String> failed;
  DownloadState state;

  void addFailure(String id) => failed.add(id);

  DownloadProgress clone() => DownloadProgress(
      courseId: courseId,
      total: total,
      done: done,
      failed: [...failed],
      state: state)
    ..done = done;
}

extension on Course {
  Map<String, dynamic> toJson() => {
        'id': id, 'slug': slug, 'title': title, 'description': description,
        'level': level, 'icon': icon, 'duration_weeks': durationWeeks,
        'lessons': lessons.map((l) => {
              'id': l.id, 'title': l.title, 'description': l.description,
              'lesson_type': l.lessonType, 'duration_min': l.durationMin,
              'sort_order': l.sortOrder, 'is_free_preview': l.isFreePreview,
              'completed': l.completed,
            }).toList(),
      };
}

/// Lesson pack = lesson metadata + markdown + quiz (offline-first read).
class LessonPack {
  LessonPack(
      {required this.lesson, this.contentMd = '', this.quiz, this.fromLocal = false});
  final LessonMeta lesson;
  final String contentMd;
  final QuickQuiz? quiz;
  final bool fromLocal;
}

class ManageInfo {
  ManageInfo({required this.courses, required this.bytes});
  final List<DownloadedCourse> courses;
  final int bytes;

  double get mb => bytes / (1024 * 1024);
}
