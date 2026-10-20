/// Plain models matching the existing REST payloads. Parsing is defensive:
/// the web client tolerates optional fields, so does the app.

class UserProfile {
  UserProfile({
    this.id,
    this.email,
    this.fullName,
    this.avatarUrl,
    this.country,
    this.role,
  });

  final String? id;
  final String? email;
  final String? fullName;
  final String? avatarUrl;
  final String? country;
  final String? role;

  static UserProfile fromJson(Map<String, dynamic> j) => UserProfile(
        id: (j['id'] ?? j['user_id']) as String?,
        email: j['email'] as String?,
        fullName: (j['full_name'] ?? j['name']) as String?,
        avatarUrl: (j['avatar_url'] ?? j['avatar']) as String?,
        country: j['country'] as String?,
        role: (j['role'] ?? 'student') as String?,
      );

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        if (email != null) 'email': email,
        if (fullName != null) 'full_name': fullName,
        if (avatarUrl != null) 'avatar_url': avatarUrl,
        if (country != null) 'country': country,
        if (role != null) 'role': role,
      };

  String get displayName =>
      (fullName?.trim().isNotEmpty ?? false) ? fullName!.trim() : (email ?? 'Learner');

  String get initials {
    final parts = displayName.trim().split(RegExp(r'\s+'));
    final a = parts.isNotEmpty ? parts.first[0] : '';
    final b = parts.length > 1 ? parts.last[0] : '';
    return (a + b).toUpperCase();
  }
}

class LessonMeta {
  LessonMeta({
    required this.id,
    required this.title,
    this.description = '',
    this.lessonType = 'lesson',
    this.durationMin = 0,
    this.sortOrder = 0,
    this.isFreePreview = false,
    this.completed = false,
  });

  final String id;
  final String title;
  final String description;
  final String lessonType;
  final int durationMin;
  final int sortOrder;
  final bool isFreePreview;
  final bool completed;

  static LessonMeta fromJson(Map<String, dynamic> j) => LessonMeta(
        id: (j['id'] ?? j['lesson_id'] ?? '') as String,
        title: (j['title'] ?? 'Untitled lesson') as String,
        description: (j['description'] ?? '') as String,
        lessonType: (j['lesson_type'] ?? 'lesson') as String,
        durationMin: (j['duration_min'] ?? 0) as int,
        sortOrder: (j['sort_order'] ?? 0) as int,
        isFreePreview: (j['is_free_preview'] ?? false) as bool,
        completed: (j['completed'] ?? false) as bool,
      );
}

class Course {
  Course({
    required this.id,
    required this.slug,
    required this.title,
    this.description = '',
    this.level = 'beginner',
    this.icon = 'book-open',
    this.durationWeeks = 0,
    this.lessons = const [],
  });

  final String id;
  final String slug;
  final String title;
  final String description;
  final String level;
  final String icon;
  final int durationWeeks;
  final List<LessonMeta> lessons;

  static Course fromJson(Map<String, dynamic> j) => Course(
        id: (j['id'] ?? j['course_id'] ?? '') as String,
        slug: (j['slug'] ?? '') as String,
        title: (j['title'] ?? 'Untitled course') as String,
        description: (j['description'] ?? '') as String,
        level: (j['level'] ?? 'beginner') as String,
        icon: (j['icon'] ?? 'book-open') as String,
        durationWeeks: (j['duration_weeks'] ?? j['duration'] ?? 0) as int,
        lessons: ((j['lessons'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(LessonMeta.fromJson)
            .toList(),
      );
}

class LessonProgressEntry {
  LessonProgressEntry({required this.lessonId, required this.completed, this.completedAt});
  final String lessonId;
  final bool completed;
  final DateTime? completedAt;

  static LessonProgressEntry fromJson(Map<String, dynamic> j) => LessonProgressEntry(
        lessonId: (j['lesson_id'] ?? j['id'] ?? '') as String,
        completed: (j['completed'] ?? false) as bool,
        completedAt: j['completed_at'] is String && (j['completed_at'] as String).isNotEmpty
            ? DateTime.tryParse(j['completed_at'] as String)
            : null,
      );
}

class CourseProgress {
  CourseProgress({
    required this.totalLessons,
    required this.completedLessons,
    required this.percentage,
    required this.lessons,
  });

  final int totalLessons;
  final int completedLessons;
  final int percentage;
  final List<LessonProgressEntry> lessons;

  static CourseProgress fromJson(Map<String, dynamic> j) => CourseProgress(
        totalLessons: (j['total_lessons'] ?? 0) as int,
        completedLessons: (j['completed_lessons'] ?? 0) as int,
        percentage: (j['percentage'] ?? 0) as int,
        lessons: ((j['lessons'] ?? j['entries'] ?? []) as List)
            .whereType<Map<String, dynamic>>()
            .map(LessonProgressEntry.fromJson)
            .toList(),
      );
}

class QuizQuestion {
  QuizQuestion({
    required this.id,
    required this.question,
    required this.options,
    this.points = 1,
    this.review = false,
  });

  final String id;
  final String question;
  final List<QuizOption> options;
  final int points;
  final bool review;

  static QuizQuestion fromJson(Map<String, dynamic> j) => QuizQuestion(
        id: (j['id'] ?? '') as String,
        question: (j['question'] ?? '') as String,
        points: (j['points'] ?? 1) as int,
        review: (j['review'] ?? false) as bool,
        options: ((j['options'] as List?) ?? const [])
            .map((o) => QuizOption.fromJson(Map<String, dynamic>.from(o as Map)))
            .toList(),
      );
}

class QuizOption {
  QuizOption({required this.id, required this.text});
  final String id;
  final String text;

  static QuizOption fromJson(Map<String, dynamic> j) => QuizOption(
        id: (j['id'] ?? '').toString(),
        text: (j['text'] ?? j['label'] ?? '').toString(),
      );
}

/// Offline answer check needs the correct option id, so we store it
/// per question when available (never shipped to the UI otherwise).
class QuizQuestionOffline extends QuizQuestion {
  QuizQuestionOffline({
    required super.id,
    required super.question,
    required super.options,
    super.points,
    super.review,
    required this.correctOptionId,
  });
  final String correctOptionId;

  bool isCorrect(String optionId) => optionId == correctOptionId;
}

class QuickQuiz {
  QuickQuiz({
    required this.quizId,
    required this.lessonId,
    required this.lessonTitle,
    required this.passingScore,
    required this.questions,
  });

  final String quizId;
  final String lessonId;
  final String lessonTitle;
  final int passingScore;
  final List<QuizQuestion> questions;

  static QuickQuiz? tryFromJson(Map<String, dynamic> j) {
    final questions = (j['questions'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(QuizQuestion.fromJson)
        .toList();
    if (questions.isEmpty) return null;
    return QuickQuiz(
      quizId: (j['quiz_id'] ?? j['id'] ?? '') as String,
      lessonId: (j['lesson_id'] ?? '') as String,
      lessonTitle: (j['lesson_title'] ?? '') as String,
      passingScore: (j['passing_score'] ?? 80) as int,
      questions: questions,
    );
  }
}

class QuickQuizResult {
  QuickQuizResult({
    required this.percentage,
    required this.passed,
    required this.passingScore,
    this.score = 0,
    this.maxScore = 0,
    this.attemptsRemaining,
  });

  final int percentage;
  final bool passed;
  final int passingScore;
  final int score;
  final int maxScore;
  final int? attemptsRemaining;

  static QuickQuizResult fromJson(Map<String, dynamic> j) => QuickQuizResult(
        percentage: (j['percentage'] ?? 0) as int,
        passed: (j['passed'] ?? false) as bool,
        passingScore: (j['passing_score'] ?? 80) as int,
        score: (j['score'] ?? 0) as int,
        maxScore: (j['max_score'] ?? 0) as int,
        attemptsRemaining: j['attempts_remaining'] is int ? j['attempts_remaining'] as int : null,
      );
}

/// Submission progress used by the Download flow / offline sync queue.
enum DownloadState { idle, running, done, failed }

class Challenge {
  Challenge({
    required this.id,
    required this.title,
    this.description = '',
    this.difficulty = '',
    this.coinsReward = 0,
    this.challengeType = 'javascript',
    this.starterCode = '',
    this.expectedOutput = '',
    this.isDaily = false,
  });

  final String id;
  final String title;
  final String description;
  final String difficulty;
  final int coinsReward;
  final String challengeType;
  final String starterCode;
  final String expectedOutput;
  final bool isDaily;

  static Challenge fromJson(Map<String, dynamic> j, {bool daily = false}) => Challenge(
        id: (j['id'] ?? '').toString(),
        title: (j['title'] ?? 'Challenge') as String,
        description: (j['description'] ?? '') as String,
        difficulty: (j['difficulty'] ?? '') as String,
        coinsReward: (j['coins_reward'] ?? 0) as int,
        challengeType: (j['challenge_type'] ?? 'javascript') as String,
        starterCode: (j['starter_code'] ?? '') as String,
        expectedOutput: (j['expected_output'] ?? '') as String,
        isDaily: daily,
      );
}

class StreakInfo {
  StreakInfo({required this.count, this.isActiveToday = false, this.lastActive});
  final int count;
  final bool isActiveToday;
  final DateTime? lastActive;

  static StreakInfo fromJson(Map<String, dynamic> j) => StreakInfo(
        count: (j['streak'] ?? j['streak_count'] ?? 0) as int,
        isActiveToday: (j['is_active_today'] ?? false) as bool,
        lastActive: j['last_active'] is String && (j['last_active'] as String).isNotEmpty
            ? DateTime.tryParse(j['last_active'] as String)
            : null,
      );
}

class StreakDay {
  StreakDay(this.date, this.count, this.active);
  final DateTime date;
  final int count;
  final bool active;

  static StreakDay fromJson(Map<String, dynamic> j) {
    final c = (j['count'] ?? j['total'] ?? j['completions'] ?? j['lessons'] ?? 0) as int? ?? 0;
    final d = (j['date'] ?? j['day'] ?? '') as String;
    return StreakDay(DateTime.tryParse(d) ?? DateTime.now(), c, c > 0);
  }
}

class NotificationItem {
  NotificationItem({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
  });

  final String id;
  final String kind;
  final String title;
  final String body;
  final bool read;
  final DateTime createdAt;

  static NotificationItem fromJson(Map<String, dynamic> j) => NotificationItem(
        id: (j['id'] ?? '').toString(),
        kind: (j['type'] ?? j['kind'] ?? 'info') as String,
        title: (j['title'] ?? _defaultTitle(j)) as String,
        body: (j['message'] ?? j['body'] ?? j['description'] ?? '') as String,
        read: (j['is_read'] ?? j['read'] ?? false) as bool,
        createdAt:
            DateTime.tryParse((j['created_at'] ?? '') as String) ?? DateTime.now(),
      );

  static String _defaultTitle(Map<String, dynamic> j) {
    final t = (j['type'] ?? '') as String;
    switch (t) {
      case 'streak_reminder':
        return 'Streak reminder';
      case 'new_lesson':
        return 'New lesson';
      case 'certificate':
        return 'Certificate';
      case 'mentor_reply':
        return 'Mentor reply';
      default:
        return 'Notification';
    }
  }
}

class CertificateItem {
  CertificateItem({
    required this.id,
    required this.number,
    required this.courseTitle,
    this.courseLevel = '',
    this.issuedAt,
    this.learnerName,
  });

  final String id;
  final String number;
  final String courseTitle;
  final String courseLevel;
  final DateTime? issuedAt;
  final String? learnerName;

  static CertificateItem fromJson(Map<String, dynamic> j) => CertificateItem(
        id: (j['id'] ?? '').toString(),
        number: (j['certificate_number'] ?? j['number'] ?? '') as String,
        courseTitle: (j['course_title'] ?? j['title'] ?? 'Course') as String,
        courseLevel: (j['course_level'] ?? j['level'] ?? '') as String,
        issuedAt: j['issued_at'] is String ? DateTime.tryParse(j['issued_at'] as String) : null,
        learnerName: (j['learner_name'] ?? '') as String,
      );
}
