// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'local_db.dart';

// ignore_for_file: type=lint
class $DownloadedLessonsTable extends DownloadedLessons
    with TableInfo<$DownloadedLessonsTable, DownloadedLesson> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $DownloadedLessonsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _lessonIdMeta = const VerificationMeta(
    'lessonId',
  );
  @override
  late final GeneratedColumn<String> lessonId = GeneratedColumn<String>(
    'lesson_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _courseIdMeta = const VerificationMeta(
    'courseId',
  );
  @override
  late final GeneratedColumn<String> courseId = GeneratedColumn<String>(
    'course_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sortIndexMeta = const VerificationMeta(
    'sortIndex',
  );
  @override
  late final GeneratedColumn<int> sortIndex = GeneratedColumn<int>(
    'sort_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descriptionMeta = const VerificationMeta(
    'description',
  );
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
    'description',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant(''),
  );
  static const VerificationMeta _contentMdMeta = const VerificationMeta(
    'contentMd',
  );
  @override
  late final GeneratedColumn<String> contentMd = GeneratedColumn<String>(
    'content_md',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant(''),
  );
  static const VerificationMeta _quizJsonMeta = const VerificationMeta(
    'quizJson',
  );
  @override
  late final GeneratedColumn<String> quizJson = GeneratedColumn<String>(
    'quiz_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _downloadedAtMeta = const VerificationMeta(
    'downloadedAt',
  );
  @override
  late final GeneratedColumn<DateTime> downloadedAt = GeneratedColumn<DateTime>(
    'downloaded_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    lessonId,
    courseId,
    sortIndex,
    title,
    description,
    contentMd,
    quizJson,
    downloadedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'downloaded_lessons';
  @override
  VerificationContext validateIntegrity(
    Insertable<DownloadedLesson> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('lesson_id')) {
      context.handle(
        _lessonIdMeta,
        lessonId.isAcceptableOrUnknown(data['lesson_id']!, _lessonIdMeta),
      );
    } else if (isInserting) {
      context.missing(_lessonIdMeta);
    }
    if (data.containsKey('course_id')) {
      context.handle(
        _courseIdMeta,
        courseId.isAcceptableOrUnknown(data['course_id']!, _courseIdMeta),
      );
    } else if (isInserting) {
      context.missing(_courseIdMeta);
    }
    if (data.containsKey('sort_index')) {
      context.handle(
        _sortIndexMeta,
        sortIndex.isAcceptableOrUnknown(data['sort_index']!, _sortIndexMeta),
      );
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
        _descriptionMeta,
        description.isAcceptableOrUnknown(
          data['description']!,
          _descriptionMeta,
        ),
      );
    }
    if (data.containsKey('content_md')) {
      context.handle(
        _contentMdMeta,
        contentMd.isAcceptableOrUnknown(data['content_md']!, _contentMdMeta),
      );
    }
    if (data.containsKey('quiz_json')) {
      context.handle(
        _quizJsonMeta,
        quizJson.isAcceptableOrUnknown(data['quiz_json']!, _quizJsonMeta),
      );
    }
    if (data.containsKey('downloaded_at')) {
      context.handle(
        _downloadedAtMeta,
        downloadedAt.isAcceptableOrUnknown(
          data['downloaded_at']!,
          _downloadedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_downloadedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {lessonId};
  @override
  DownloadedLesson map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DownloadedLesson(
      lessonId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}lesson_id'],
      )!,
      courseId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}course_id'],
      )!,
      sortIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}sort_index'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      description: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}description'],
      )!,
      contentMd: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}content_md'],
      )!,
      quizJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}quiz_json'],
      ),
      downloadedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}downloaded_at'],
      )!,
    );
  }

  @override
  $DownloadedLessonsTable createAlias(String alias) {
    return $DownloadedLessonsTable(attachedDatabase, alias);
  }
}

class DownloadedLesson extends DataClass
    implements Insertable<DownloadedLesson> {
  final String lessonId;
  final String courseId;
  final int sortIndex;
  final String title;
  final String description;
  final String contentMd;
  final String? quizJson;
  final DateTime downloadedAt;
  const DownloadedLesson({
    required this.lessonId,
    required this.courseId,
    required this.sortIndex,
    required this.title,
    required this.description,
    required this.contentMd,
    this.quizJson,
    required this.downloadedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['lesson_id'] = Variable<String>(lessonId);
    map['course_id'] = Variable<String>(courseId);
    map['sort_index'] = Variable<int>(sortIndex);
    map['title'] = Variable<String>(title);
    map['description'] = Variable<String>(description);
    map['content_md'] = Variable<String>(contentMd);
    if (!nullToAbsent || quizJson != null) {
      map['quiz_json'] = Variable<String>(quizJson);
    }
    map['downloaded_at'] = Variable<DateTime>(downloadedAt);
    return map;
  }

  DownloadedLessonsCompanion toCompanion(bool nullToAbsent) {
    return DownloadedLessonsCompanion(
      lessonId: Value(lessonId),
      courseId: Value(courseId),
      sortIndex: Value(sortIndex),
      title: Value(title),
      description: Value(description),
      contentMd: Value(contentMd),
      quizJson: quizJson == null && nullToAbsent
          ? const Value.absent()
          : Value(quizJson),
      downloadedAt: Value(downloadedAt),
    );
  }

  factory DownloadedLesson.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DownloadedLesson(
      lessonId: serializer.fromJson<String>(json['lessonId']),
      courseId: serializer.fromJson<String>(json['courseId']),
      sortIndex: serializer.fromJson<int>(json['sortIndex']),
      title: serializer.fromJson<String>(json['title']),
      description: serializer.fromJson<String>(json['description']),
      contentMd: serializer.fromJson<String>(json['contentMd']),
      quizJson: serializer.fromJson<String?>(json['quizJson']),
      downloadedAt: serializer.fromJson<DateTime>(json['downloadedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'lessonId': serializer.toJson<String>(lessonId),
      'courseId': serializer.toJson<String>(courseId),
      'sortIndex': serializer.toJson<int>(sortIndex),
      'title': serializer.toJson<String>(title),
      'description': serializer.toJson<String>(description),
      'contentMd': serializer.toJson<String>(contentMd),
      'quizJson': serializer.toJson<String?>(quizJson),
      'downloadedAt': serializer.toJson<DateTime>(downloadedAt),
    };
  }

  DownloadedLesson copyWith({
    String? lessonId,
    String? courseId,
    int? sortIndex,
    String? title,
    String? description,
    String? contentMd,
    Value<String?> quizJson = const Value.absent(),
    DateTime? downloadedAt,
  }) => DownloadedLesson(
    lessonId: lessonId ?? this.lessonId,
    courseId: courseId ?? this.courseId,
    sortIndex: sortIndex ?? this.sortIndex,
    title: title ?? this.title,
    description: description ?? this.description,
    contentMd: contentMd ?? this.contentMd,
    quizJson: quizJson.present ? quizJson.value : this.quizJson,
    downloadedAt: downloadedAt ?? this.downloadedAt,
  );
  DownloadedLesson copyWithCompanion(DownloadedLessonsCompanion data) {
    return DownloadedLesson(
      lessonId: data.lessonId.present ? data.lessonId.value : this.lessonId,
      courseId: data.courseId.present ? data.courseId.value : this.courseId,
      sortIndex: data.sortIndex.present ? data.sortIndex.value : this.sortIndex,
      title: data.title.present ? data.title.value : this.title,
      description: data.description.present
          ? data.description.value
          : this.description,
      contentMd: data.contentMd.present ? data.contentMd.value : this.contentMd,
      quizJson: data.quizJson.present ? data.quizJson.value : this.quizJson,
      downloadedAt: data.downloadedAt.present
          ? data.downloadedAt.value
          : this.downloadedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DownloadedLesson(')
          ..write('lessonId: $lessonId, ')
          ..write('courseId: $courseId, ')
          ..write('sortIndex: $sortIndex, ')
          ..write('title: $title, ')
          ..write('description: $description, ')
          ..write('contentMd: $contentMd, ')
          ..write('quizJson: $quizJson, ')
          ..write('downloadedAt: $downloadedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    lessonId,
    courseId,
    sortIndex,
    title,
    description,
    contentMd,
    quizJson,
    downloadedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DownloadedLesson &&
          other.lessonId == this.lessonId &&
          other.courseId == this.courseId &&
          other.sortIndex == this.sortIndex &&
          other.title == this.title &&
          other.description == this.description &&
          other.contentMd == this.contentMd &&
          other.quizJson == this.quizJson &&
          other.downloadedAt == this.downloadedAt);
}

class DownloadedLessonsCompanion extends UpdateCompanion<DownloadedLesson> {
  final Value<String> lessonId;
  final Value<String> courseId;
  final Value<int> sortIndex;
  final Value<String> title;
  final Value<String> description;
  final Value<String> contentMd;
  final Value<String?> quizJson;
  final Value<DateTime> downloadedAt;
  final Value<int> rowid;
  const DownloadedLessonsCompanion({
    this.lessonId = const Value.absent(),
    this.courseId = const Value.absent(),
    this.sortIndex = const Value.absent(),
    this.title = const Value.absent(),
    this.description = const Value.absent(),
    this.contentMd = const Value.absent(),
    this.quizJson = const Value.absent(),
    this.downloadedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  DownloadedLessonsCompanion.insert({
    required String lessonId,
    required String courseId,
    this.sortIndex = const Value.absent(),
    required String title,
    this.description = const Value.absent(),
    this.contentMd = const Value.absent(),
    this.quizJson = const Value.absent(),
    required DateTime downloadedAt,
    this.rowid = const Value.absent(),
  }) : lessonId = Value(lessonId),
       courseId = Value(courseId),
       title = Value(title),
       downloadedAt = Value(downloadedAt);
  static Insertable<DownloadedLesson> custom({
    Expression<String>? lessonId,
    Expression<String>? courseId,
    Expression<int>? sortIndex,
    Expression<String>? title,
    Expression<String>? description,
    Expression<String>? contentMd,
    Expression<String>? quizJson,
    Expression<DateTime>? downloadedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (lessonId != null) 'lesson_id': lessonId,
      if (courseId != null) 'course_id': courseId,
      if (sortIndex != null) 'sort_index': sortIndex,
      if (title != null) 'title': title,
      if (description != null) 'description': description,
      if (contentMd != null) 'content_md': contentMd,
      if (quizJson != null) 'quiz_json': quizJson,
      if (downloadedAt != null) 'downloaded_at': downloadedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  DownloadedLessonsCompanion copyWith({
    Value<String>? lessonId,
    Value<String>? courseId,
    Value<int>? sortIndex,
    Value<String>? title,
    Value<String>? description,
    Value<String>? contentMd,
    Value<String?>? quizJson,
    Value<DateTime>? downloadedAt,
    Value<int>? rowid,
  }) {
    return DownloadedLessonsCompanion(
      lessonId: lessonId ?? this.lessonId,
      courseId: courseId ?? this.courseId,
      sortIndex: sortIndex ?? this.sortIndex,
      title: title ?? this.title,
      description: description ?? this.description,
      contentMd: contentMd ?? this.contentMd,
      quizJson: quizJson ?? this.quizJson,
      downloadedAt: downloadedAt ?? this.downloadedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (lessonId.present) {
      map['lesson_id'] = Variable<String>(lessonId.value);
    }
    if (courseId.present) {
      map['course_id'] = Variable<String>(courseId.value);
    }
    if (sortIndex.present) {
      map['sort_index'] = Variable<int>(sortIndex.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (contentMd.present) {
      map['content_md'] = Variable<String>(contentMd.value);
    }
    if (quizJson.present) {
      map['quiz_json'] = Variable<String>(quizJson.value);
    }
    if (downloadedAt.present) {
      map['downloaded_at'] = Variable<DateTime>(downloadedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('DownloadedLessonsCompanion(')
          ..write('lessonId: $lessonId, ')
          ..write('courseId: $courseId, ')
          ..write('sortIndex: $sortIndex, ')
          ..write('title: $title, ')
          ..write('description: $description, ')
          ..write('contentMd: $contentMd, ')
          ..write('quizJson: $quizJson, ')
          ..write('downloadedAt: $downloadedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $DownloadedCoursesTable extends DownloadedCourses
    with TableInfo<$DownloadedCoursesTable, DownloadedCourse> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $DownloadedCoursesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _courseIdMeta = const VerificationMeta(
    'courseId',
  );
  @override
  late final GeneratedColumn<String> courseId = GeneratedColumn<String>(
    'course_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _courseJsonMeta = const VerificationMeta(
    'courseJson',
  );
  @override
  late final GeneratedColumn<String> courseJson = GeneratedColumn<String>(
    'course_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _downloadedAtMeta = const VerificationMeta(
    'downloadedAt',
  );
  @override
  late final GeneratedColumn<DateTime> downloadedAt = GeneratedColumn<DateTime>(
    'downloaded_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [courseId, courseJson, downloadedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'downloaded_courses';
  @override
  VerificationContext validateIntegrity(
    Insertable<DownloadedCourse> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('course_id')) {
      context.handle(
        _courseIdMeta,
        courseId.isAcceptableOrUnknown(data['course_id']!, _courseIdMeta),
      );
    } else if (isInserting) {
      context.missing(_courseIdMeta);
    }
    if (data.containsKey('course_json')) {
      context.handle(
        _courseJsonMeta,
        courseJson.isAcceptableOrUnknown(data['course_json']!, _courseJsonMeta),
      );
    } else if (isInserting) {
      context.missing(_courseJsonMeta);
    }
    if (data.containsKey('downloaded_at')) {
      context.handle(
        _downloadedAtMeta,
        downloadedAt.isAcceptableOrUnknown(
          data['downloaded_at']!,
          _downloadedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_downloadedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {courseId};
  @override
  DownloadedCourse map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DownloadedCourse(
      courseId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}course_id'],
      )!,
      courseJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}course_json'],
      )!,
      downloadedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}downloaded_at'],
      )!,
    );
  }

  @override
  $DownloadedCoursesTable createAlias(String alias) {
    return $DownloadedCoursesTable(attachedDatabase, alias);
  }
}

class DownloadedCourse extends DataClass
    implements Insertable<DownloadedCourse> {
  final String courseId;
  final String courseJson;
  final DateTime downloadedAt;
  const DownloadedCourse({
    required this.courseId,
    required this.courseJson,
    required this.downloadedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['course_id'] = Variable<String>(courseId);
    map['course_json'] = Variable<String>(courseJson);
    map['downloaded_at'] = Variable<DateTime>(downloadedAt);
    return map;
  }

  DownloadedCoursesCompanion toCompanion(bool nullToAbsent) {
    return DownloadedCoursesCompanion(
      courseId: Value(courseId),
      courseJson: Value(courseJson),
      downloadedAt: Value(downloadedAt),
    );
  }

  factory DownloadedCourse.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DownloadedCourse(
      courseId: serializer.fromJson<String>(json['courseId']),
      courseJson: serializer.fromJson<String>(json['courseJson']),
      downloadedAt: serializer.fromJson<DateTime>(json['downloadedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'courseId': serializer.toJson<String>(courseId),
      'courseJson': serializer.toJson<String>(courseJson),
      'downloadedAt': serializer.toJson<DateTime>(downloadedAt),
    };
  }

  DownloadedCourse copyWith({
    String? courseId,
    String? courseJson,
    DateTime? downloadedAt,
  }) => DownloadedCourse(
    courseId: courseId ?? this.courseId,
    courseJson: courseJson ?? this.courseJson,
    downloadedAt: downloadedAt ?? this.downloadedAt,
  );
  DownloadedCourse copyWithCompanion(DownloadedCoursesCompanion data) {
    return DownloadedCourse(
      courseId: data.courseId.present ? data.courseId.value : this.courseId,
      courseJson: data.courseJson.present
          ? data.courseJson.value
          : this.courseJson,
      downloadedAt: data.downloadedAt.present
          ? data.downloadedAt.value
          : this.downloadedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DownloadedCourse(')
          ..write('courseId: $courseId, ')
          ..write('courseJson: $courseJson, ')
          ..write('downloadedAt: $downloadedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(courseId, courseJson, downloadedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DownloadedCourse &&
          other.courseId == this.courseId &&
          other.courseJson == this.courseJson &&
          other.downloadedAt == this.downloadedAt);
}

class DownloadedCoursesCompanion extends UpdateCompanion<DownloadedCourse> {
  final Value<String> courseId;
  final Value<String> courseJson;
  final Value<DateTime> downloadedAt;
  final Value<int> rowid;
  const DownloadedCoursesCompanion({
    this.courseId = const Value.absent(),
    this.courseJson = const Value.absent(),
    this.downloadedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  DownloadedCoursesCompanion.insert({
    required String courseId,
    required String courseJson,
    required DateTime downloadedAt,
    this.rowid = const Value.absent(),
  }) : courseId = Value(courseId),
       courseJson = Value(courseJson),
       downloadedAt = Value(downloadedAt);
  static Insertable<DownloadedCourse> custom({
    Expression<String>? courseId,
    Expression<String>? courseJson,
    Expression<DateTime>? downloadedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (courseId != null) 'course_id': courseId,
      if (courseJson != null) 'course_json': courseJson,
      if (downloadedAt != null) 'downloaded_at': downloadedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  DownloadedCoursesCompanion copyWith({
    Value<String>? courseId,
    Value<String>? courseJson,
    Value<DateTime>? downloadedAt,
    Value<int>? rowid,
  }) {
    return DownloadedCoursesCompanion(
      courseId: courseId ?? this.courseId,
      courseJson: courseJson ?? this.courseJson,
      downloadedAt: downloadedAt ?? this.downloadedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (courseId.present) {
      map['course_id'] = Variable<String>(courseId.value);
    }
    if (courseJson.present) {
      map['course_json'] = Variable<String>(courseJson.value);
    }
    if (downloadedAt.present) {
      map['downloaded_at'] = Variable<DateTime>(downloadedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('DownloadedCoursesCompanion(')
          ..write('courseId: $courseId, ')
          ..write('courseJson: $courseJson, ')
          ..write('downloadedAt: $downloadedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $PendingOpsTable extends PendingOps
    with TableInfo<$PendingOpsTable, PendingOp> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingOpsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _kindMeta = const VerificationMeta('kind');
  @override
  late final GeneratedColumn<String> kind = GeneratedColumn<String>(
    'kind',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _lessonIdMeta = const VerificationMeta(
    'lessonId',
  );
  @override
  late final GeneratedColumn<String> lessonId = GeneratedColumn<String>(
    'lesson_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    kind,
    lessonId,
    payload,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_ops';
  @override
  VerificationContext validateIntegrity(
    Insertable<PendingOp> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('kind')) {
      context.handle(
        _kindMeta,
        kind.isAcceptableOrUnknown(data['kind']!, _kindMeta),
      );
    } else if (isInserting) {
      context.missing(_kindMeta);
    }
    if (data.containsKey('lesson_id')) {
      context.handle(
        _lessonIdMeta,
        lessonId.isAcceptableOrUnknown(data['lesson_id']!, _lessonIdMeta),
      );
    } else if (isInserting) {
      context.missing(_lessonIdMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PendingOp map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingOp(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      kind: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}kind'],
      )!,
      lessonId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}lesson_id'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $PendingOpsTable createAlias(String alias) {
    return $PendingOpsTable(attachedDatabase, alias);
  }
}

class PendingOp extends DataClass implements Insertable<PendingOp> {
  final int id;
  final String kind;
  final String lessonId;
  final String payload;
  final DateTime createdAt;
  const PendingOp({
    required this.id,
    required this.kind,
    required this.lessonId,
    required this.payload,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['kind'] = Variable<String>(kind);
    map['lesson_id'] = Variable<String>(lessonId);
    map['payload'] = Variable<String>(payload);
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  PendingOpsCompanion toCompanion(bool nullToAbsent) {
    return PendingOpsCompanion(
      id: Value(id),
      kind: Value(kind),
      lessonId: Value(lessonId),
      payload: Value(payload),
      createdAt: Value(createdAt),
    );
  }

  factory PendingOp.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingOp(
      id: serializer.fromJson<int>(json['id']),
      kind: serializer.fromJson<String>(json['kind']),
      lessonId: serializer.fromJson<String>(json['lessonId']),
      payload: serializer.fromJson<String>(json['payload']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'kind': serializer.toJson<String>(kind),
      'lessonId': serializer.toJson<String>(lessonId),
      'payload': serializer.toJson<String>(payload),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  PendingOp copyWith({
    int? id,
    String? kind,
    String? lessonId,
    String? payload,
    DateTime? createdAt,
  }) => PendingOp(
    id: id ?? this.id,
    kind: kind ?? this.kind,
    lessonId: lessonId ?? this.lessonId,
    payload: payload ?? this.payload,
    createdAt: createdAt ?? this.createdAt,
  );
  PendingOp copyWithCompanion(PendingOpsCompanion data) {
    return PendingOp(
      id: data.id.present ? data.id.value : this.id,
      kind: data.kind.present ? data.kind.value : this.kind,
      lessonId: data.lessonId.present ? data.lessonId.value : this.lessonId,
      payload: data.payload.present ? data.payload.value : this.payload,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingOp(')
          ..write('id: $id, ')
          ..write('kind: $kind, ')
          ..write('lessonId: $lessonId, ')
          ..write('payload: $payload, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, kind, lessonId, payload, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingOp &&
          other.id == this.id &&
          other.kind == this.kind &&
          other.lessonId == this.lessonId &&
          other.payload == this.payload &&
          other.createdAt == this.createdAt);
}

class PendingOpsCompanion extends UpdateCompanion<PendingOp> {
  final Value<int> id;
  final Value<String> kind;
  final Value<String> lessonId;
  final Value<String> payload;
  final Value<DateTime> createdAt;
  const PendingOpsCompanion({
    this.id = const Value.absent(),
    this.kind = const Value.absent(),
    this.lessonId = const Value.absent(),
    this.payload = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  PendingOpsCompanion.insert({
    this.id = const Value.absent(),
    required String kind,
    required String lessonId,
    required String payload,
    this.createdAt = const Value.absent(),
  }) : kind = Value(kind),
       lessonId = Value(lessonId),
       payload = Value(payload);
  static Insertable<PendingOp> custom({
    Expression<int>? id,
    Expression<String>? kind,
    Expression<String>? lessonId,
    Expression<String>? payload,
    Expression<DateTime>? createdAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (kind != null) 'kind': kind,
      if (lessonId != null) 'lesson_id': lessonId,
      if (payload != null) 'payload': payload,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  PendingOpsCompanion copyWith({
    Value<int>? id,
    Value<String>? kind,
    Value<String>? lessonId,
    Value<String>? payload,
    Value<DateTime>? createdAt,
  }) {
    return PendingOpsCompanion(
      id: id ?? this.id,
      kind: kind ?? this.kind,
      lessonId: lessonId ?? this.lessonId,
      payload: payload ?? this.payload,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (kind.present) {
      map['kind'] = Variable<String>(kind.value);
    }
    if (lessonId.present) {
      map['lesson_id'] = Variable<String>(lessonId.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingOpsCompanion(')
          ..write('id: $id, ')
          ..write('kind: $kind, ')
          ..write('lessonId: $lessonId, ')
          ..write('payload: $payload, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDb extends GeneratedDatabase {
  _$AppDb(QueryExecutor e) : super(e);
  $AppDbManager get managers => $AppDbManager(this);
  late final $DownloadedLessonsTable downloadedLessons =
      $DownloadedLessonsTable(this);
  late final $DownloadedCoursesTable downloadedCourses =
      $DownloadedCoursesTable(this);
  late final $PendingOpsTable pendingOps = $PendingOpsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    downloadedLessons,
    downloadedCourses,
    pendingOps,
  ];
}

typedef $$DownloadedLessonsTableCreateCompanionBuilder =
    DownloadedLessonsCompanion Function({
      required String lessonId,
      required String courseId,
      Value<int> sortIndex,
      required String title,
      Value<String> description,
      Value<String> contentMd,
      Value<String?> quizJson,
      required DateTime downloadedAt,
      Value<int> rowid,
    });
typedef $$DownloadedLessonsTableUpdateCompanionBuilder =
    DownloadedLessonsCompanion Function({
      Value<String> lessonId,
      Value<String> courseId,
      Value<int> sortIndex,
      Value<String> title,
      Value<String> description,
      Value<String> contentMd,
      Value<String?> quizJson,
      Value<DateTime> downloadedAt,
      Value<int> rowid,
    });

class $$DownloadedLessonsTableFilterComposer
    extends Composer<_$AppDb, $DownloadedLessonsTable> {
  $$DownloadedLessonsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get lessonId => $composableBuilder(
    column: $table.lessonId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get courseId => $composableBuilder(
    column: $table.courseId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get contentMd => $composableBuilder(
    column: $table.contentMd,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get quizJson => $composableBuilder(
    column: $table.quizJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get downloadedAt => $composableBuilder(
    column: $table.downloadedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$DownloadedLessonsTableOrderingComposer
    extends Composer<_$AppDb, $DownloadedLessonsTable> {
  $$DownloadedLessonsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get lessonId => $composableBuilder(
    column: $table.lessonId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get courseId => $composableBuilder(
    column: $table.courseId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sortIndex => $composableBuilder(
    column: $table.sortIndex,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get contentMd => $composableBuilder(
    column: $table.contentMd,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get quizJson => $composableBuilder(
    column: $table.quizJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get downloadedAt => $composableBuilder(
    column: $table.downloadedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$DownloadedLessonsTableAnnotationComposer
    extends Composer<_$AppDb, $DownloadedLessonsTable> {
  $$DownloadedLessonsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get lessonId =>
      $composableBuilder(column: $table.lessonId, builder: (column) => column);

  GeneratedColumn<String> get courseId =>
      $composableBuilder(column: $table.courseId, builder: (column) => column);

  GeneratedColumn<int> get sortIndex =>
      $composableBuilder(column: $table.sortIndex, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => column,
  );

  GeneratedColumn<String> get contentMd =>
      $composableBuilder(column: $table.contentMd, builder: (column) => column);

  GeneratedColumn<String> get quizJson =>
      $composableBuilder(column: $table.quizJson, builder: (column) => column);

  GeneratedColumn<DateTime> get downloadedAt => $composableBuilder(
    column: $table.downloadedAt,
    builder: (column) => column,
  );
}

class $$DownloadedLessonsTableTableManager
    extends
        RootTableManager<
          _$AppDb,
          $DownloadedLessonsTable,
          DownloadedLesson,
          $$DownloadedLessonsTableFilterComposer,
          $$DownloadedLessonsTableOrderingComposer,
          $$DownloadedLessonsTableAnnotationComposer,
          $$DownloadedLessonsTableCreateCompanionBuilder,
          $$DownloadedLessonsTableUpdateCompanionBuilder,
          (
            DownloadedLesson,
            BaseReferences<_$AppDb, $DownloadedLessonsTable, DownloadedLesson>,
          ),
          DownloadedLesson,
          PrefetchHooks Function()
        > {
  $$DownloadedLessonsTableTableManager(
    _$AppDb db,
    $DownloadedLessonsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$DownloadedLessonsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$DownloadedLessonsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$DownloadedLessonsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> lessonId = const Value.absent(),
                Value<String> courseId = const Value.absent(),
                Value<int> sortIndex = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String> description = const Value.absent(),
                Value<String> contentMd = const Value.absent(),
                Value<String?> quizJson = const Value.absent(),
                Value<DateTime> downloadedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => DownloadedLessonsCompanion(
                lessonId: lessonId,
                courseId: courseId,
                sortIndex: sortIndex,
                title: title,
                description: description,
                contentMd: contentMd,
                quizJson: quizJson,
                downloadedAt: downloadedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String lessonId,
                required String courseId,
                Value<int> sortIndex = const Value.absent(),
                required String title,
                Value<String> description = const Value.absent(),
                Value<String> contentMd = const Value.absent(),
                Value<String?> quizJson = const Value.absent(),
                required DateTime downloadedAt,
                Value<int> rowid = const Value.absent(),
              }) => DownloadedLessonsCompanion.insert(
                lessonId: lessonId,
                courseId: courseId,
                sortIndex: sortIndex,
                title: title,
                description: description,
                contentMd: contentMd,
                quizJson: quizJson,
                downloadedAt: downloadedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$DownloadedLessonsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDb,
      $DownloadedLessonsTable,
      DownloadedLesson,
      $$DownloadedLessonsTableFilterComposer,
      $$DownloadedLessonsTableOrderingComposer,
      $$DownloadedLessonsTableAnnotationComposer,
      $$DownloadedLessonsTableCreateCompanionBuilder,
      $$DownloadedLessonsTableUpdateCompanionBuilder,
      (
        DownloadedLesson,
        BaseReferences<_$AppDb, $DownloadedLessonsTable, DownloadedLesson>,
      ),
      DownloadedLesson,
      PrefetchHooks Function()
    >;
typedef $$DownloadedCoursesTableCreateCompanionBuilder =
    DownloadedCoursesCompanion Function({
      required String courseId,
      required String courseJson,
      required DateTime downloadedAt,
      Value<int> rowid,
    });
typedef $$DownloadedCoursesTableUpdateCompanionBuilder =
    DownloadedCoursesCompanion Function({
      Value<String> courseId,
      Value<String> courseJson,
      Value<DateTime> downloadedAt,
      Value<int> rowid,
    });

class $$DownloadedCoursesTableFilterComposer
    extends Composer<_$AppDb, $DownloadedCoursesTable> {
  $$DownloadedCoursesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get courseId => $composableBuilder(
    column: $table.courseId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get courseJson => $composableBuilder(
    column: $table.courseJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get downloadedAt => $composableBuilder(
    column: $table.downloadedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$DownloadedCoursesTableOrderingComposer
    extends Composer<_$AppDb, $DownloadedCoursesTable> {
  $$DownloadedCoursesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get courseId => $composableBuilder(
    column: $table.courseId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get courseJson => $composableBuilder(
    column: $table.courseJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get downloadedAt => $composableBuilder(
    column: $table.downloadedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$DownloadedCoursesTableAnnotationComposer
    extends Composer<_$AppDb, $DownloadedCoursesTable> {
  $$DownloadedCoursesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get courseId =>
      $composableBuilder(column: $table.courseId, builder: (column) => column);

  GeneratedColumn<String> get courseJson => $composableBuilder(
    column: $table.courseJson,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get downloadedAt => $composableBuilder(
    column: $table.downloadedAt,
    builder: (column) => column,
  );
}

class $$DownloadedCoursesTableTableManager
    extends
        RootTableManager<
          _$AppDb,
          $DownloadedCoursesTable,
          DownloadedCourse,
          $$DownloadedCoursesTableFilterComposer,
          $$DownloadedCoursesTableOrderingComposer,
          $$DownloadedCoursesTableAnnotationComposer,
          $$DownloadedCoursesTableCreateCompanionBuilder,
          $$DownloadedCoursesTableUpdateCompanionBuilder,
          (
            DownloadedCourse,
            BaseReferences<_$AppDb, $DownloadedCoursesTable, DownloadedCourse>,
          ),
          DownloadedCourse,
          PrefetchHooks Function()
        > {
  $$DownloadedCoursesTableTableManager(
    _$AppDb db,
    $DownloadedCoursesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$DownloadedCoursesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$DownloadedCoursesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$DownloadedCoursesTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> courseId = const Value.absent(),
                Value<String> courseJson = const Value.absent(),
                Value<DateTime> downloadedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => DownloadedCoursesCompanion(
                courseId: courseId,
                courseJson: courseJson,
                downloadedAt: downloadedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String courseId,
                required String courseJson,
                required DateTime downloadedAt,
                Value<int> rowid = const Value.absent(),
              }) => DownloadedCoursesCompanion.insert(
                courseId: courseId,
                courseJson: courseJson,
                downloadedAt: downloadedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$DownloadedCoursesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDb,
      $DownloadedCoursesTable,
      DownloadedCourse,
      $$DownloadedCoursesTableFilterComposer,
      $$DownloadedCoursesTableOrderingComposer,
      $$DownloadedCoursesTableAnnotationComposer,
      $$DownloadedCoursesTableCreateCompanionBuilder,
      $$DownloadedCoursesTableUpdateCompanionBuilder,
      (
        DownloadedCourse,
        BaseReferences<_$AppDb, $DownloadedCoursesTable, DownloadedCourse>,
      ),
      DownloadedCourse,
      PrefetchHooks Function()
    >;
typedef $$PendingOpsTableCreateCompanionBuilder =
    PendingOpsCompanion Function({
      Value<int> id,
      required String kind,
      required String lessonId,
      required String payload,
      Value<DateTime> createdAt,
    });
typedef $$PendingOpsTableUpdateCompanionBuilder =
    PendingOpsCompanion Function({
      Value<int> id,
      Value<String> kind,
      Value<String> lessonId,
      Value<String> payload,
      Value<DateTime> createdAt,
    });

class $$PendingOpsTableFilterComposer
    extends Composer<_$AppDb, $PendingOpsTable> {
  $$PendingOpsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get kind => $composableBuilder(
    column: $table.kind,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lessonId => $composableBuilder(
    column: $table.lessonId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PendingOpsTableOrderingComposer
    extends Composer<_$AppDb, $PendingOpsTable> {
  $$PendingOpsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get kind => $composableBuilder(
    column: $table.kind,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lessonId => $composableBuilder(
    column: $table.lessonId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PendingOpsTableAnnotationComposer
    extends Composer<_$AppDb, $PendingOpsTable> {
  $$PendingOpsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get kind =>
      $composableBuilder(column: $table.kind, builder: (column) => column);

  GeneratedColumn<String> get lessonId =>
      $composableBuilder(column: $table.lessonId, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$PendingOpsTableTableManager
    extends
        RootTableManager<
          _$AppDb,
          $PendingOpsTable,
          PendingOp,
          $$PendingOpsTableFilterComposer,
          $$PendingOpsTableOrderingComposer,
          $$PendingOpsTableAnnotationComposer,
          $$PendingOpsTableCreateCompanionBuilder,
          $$PendingOpsTableUpdateCompanionBuilder,
          (PendingOp, BaseReferences<_$AppDb, $PendingOpsTable, PendingOp>),
          PendingOp,
          PrefetchHooks Function()
        > {
  $$PendingOpsTableTableManager(_$AppDb db, $PendingOpsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingOpsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingOpsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingOpsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> kind = const Value.absent(),
                Value<String> lessonId = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => PendingOpsCompanion(
                id: id,
                kind: kind,
                lessonId: lessonId,
                payload: payload,
                createdAt: createdAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String kind,
                required String lessonId,
                required String payload,
                Value<DateTime> createdAt = const Value.absent(),
              }) => PendingOpsCompanion.insert(
                id: id,
                kind: kind,
                lessonId: lessonId,
                payload: payload,
                createdAt: createdAt,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PendingOpsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDb,
      $PendingOpsTable,
      PendingOp,
      $$PendingOpsTableFilterComposer,
      $$PendingOpsTableOrderingComposer,
      $$PendingOpsTableAnnotationComposer,
      $$PendingOpsTableCreateCompanionBuilder,
      $$PendingOpsTableUpdateCompanionBuilder,
      (PendingOp, BaseReferences<_$AppDb, $PendingOpsTable, PendingOp>),
      PendingOp,
      PrefetchHooks Function()
    >;

class $AppDbManager {
  final _$AppDb _db;
  $AppDbManager(this._db);
  $$DownloadedLessonsTableTableManager get downloadedLessons =>
      $$DownloadedLessonsTableTableManager(_db, _db.downloadedLessons);
  $$DownloadedCoursesTableTableManager get downloadedCourses =>
      $$DownloadedCoursesTableTableManager(_db, _db.downloadedCourses);
  $$PendingOpsTableTableManager get pendingOps =>
      $$PendingOpsTableTableManager(_db, _db.pendingOps);
}
