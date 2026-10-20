import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'local_db.g.dart';

/// One lesson body (markdown) + its quiz, fetched and stored on download.
class DownloadedLessons extends Table {
  TextColumn get lessonId => text()();
  TextColumn get courseId => text()();
  IntColumn get sortIndex => integer().withDefault(const Constant(0))();
  TextColumn get title => text()();
  TextColumn get description => text().withDefault(const Constant(''))();
  TextColumn get contentMd => text().withDefault(const Constant(''))();
  // Quiz JSON as stored from the API (questions without correct answers).
  TextColumn get quizJson => text().nullable()();
  DateTimeColumn get downloadedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {lessonId};
}

/// Course shell so offline browsable courses can be listed.
class DownloadedCourses extends Table {
  TextColumn get courseId => text()();
  TextColumn get courseJson => text()();
  DateTimeColumn get downloadedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {courseId};
}

/// Offline completions and quiz passes queued for sync.
class PendingOps extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get kind => text()(); // 'quiz' | 'complete'
  TextColumn get lessonId => text()();
  TextColumn get payload => text()(); // JSON payload for the API call
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

@DriftDatabase(tables: [DownloadedLessons, DownloadedCourses, PendingOps])
class AppDb extends _$AppDb {
  AppDb() : super(driftDatabase(name: 'onepercent_learn'));

  @override
  int get schemaVersion => 1;

  // ------- lessons
  Future<void> upsertLesson(DownloadedLessonsCompanion e) =>
      into(downloadedLessons).insertOnConflictUpdate(e);

  Future<List<DownloadedLesson>> lessonsForCourse(String courseId) =>
      (select(downloadedLessons)
            ..where((t) => t.courseId.equals(courseId))
            ..orderBy([(t) => OrderingTerm.asc(t.sortIndex)]))
          .get();

  Future<DownloadedLesson?> lesson(String lessonId) =>
      (select(downloadedLessons)..where((t) => t.lessonId.equals(lessonId)))
          .getSingleOrNull();

  Future<int> deleteLessonsForCourse(String courseId) =>
      (delete(downloadedLessons)..where((t) => t.courseId.equals(courseId)))
          .go();

  // ------- courses
  Future<void> upsertCourse(DownloadedCoursesCompanion e) =>
      into(downloadedCourses).insertOnConflictUpdate(e);

  Future<List<DownloadedCourse>> courses() =>
      (select(downloadedCourses)
            ..orderBy([(t) => OrderingTerm.desc(t.downloadedAt)]))
          .get();

  Future<int> deleteCourse(String courseId) =>
      (delete(downloadedCourses)..where((t) => t.courseId.equals(courseId)))
          .go();

  // ------- pending ops
  Future<void> addOp(PendingOpsCompanion e) => into(pendingOps).insert(e);

  Future<List<PendingOp>> allOps() =>
      (select(pendingOps)..orderBy([(t) => OrderingTerm.asc(t.id)])).get();

  Future<void> removeOp(int id) =>
      (delete(pendingOps)..where((t) => t.id.equals(id))).go();

  // ------- storage size (bytes), for the Profile offline-storage card
  Future<int> storedBytes() async {
    final a = await customSelect(
        'SELECT IFNULL(SUM(LENGTH(content_md)), 0) AS s FROM downloaded_lessons',
        readsFrom: {downloadedLessons}).getSingle();
    final b = await customSelect(
        'SELECT IFNULL(SUM(LENGTH(course_json)), 0) AS s FROM downloaded_courses',
        readsFrom: {downloadedCourses}).getSingle();
    return (a.data['s'] as int? ?? 0) + (b.data['s'] as int? ?? 0);
  }
}
