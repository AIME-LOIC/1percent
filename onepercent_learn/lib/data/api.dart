import 'package:dio/dio.dart';

import '../core/api_client.dart';
import 'models.dart';

/// Thin typed wrapper over the EXISTING 1percent REST endpoints.
/// No endpoint is invented here; anything absent is listed in the
/// delivery notes, not faked.
class Api {
  Api(this.dio);
  final Dio dio;

  Map<String, dynamic> _map(Response res) =>
      Map<String, dynamic>.from(res.data as Map);

  // ---------------------------------------------------------------- AUTH
  Future<(UserProfile, String, String)> login(String email, String password) async {
    final res = await dio.post('/auth/login', data: {'email': email, 'password': password});
    final j = _map(res);
    final user = UserProfile.fromJson(Map<String, dynamic>.from(j['user'] as Map));
    final session = Map<String, dynamic>.from(j['session'] as Map);
    return (user, session['access_token'] as String, session['refresh_token'] as String);
  }

  Future<(UserProfile, String, String)> signup(
      String email, String password, String fullName) async {
    final res = await dio.post('/auth/signup', data: {
      'email': email,
      'password': password,
      'full_name': fullName,
    });
    final j = _map(res);
    if (j['email_confirmation_required'] == true) {
      throw ApiMessage('Account created. Confirm your email, then sign in.');
    }
    final user = UserProfile.fromJson(Map<String, dynamic>.from(j['user'] as Map));
    final session = Map<String, dynamic>.from(j['session'] as Map);
    return (user, session['access_token'] as String, session['refresh_token'] as String);
  }

  Future<void> resetPassword(String email) =>
      dio.post('/auth/reset-password', data: {'email': email});

  Future<void> logout() => dio.post('/auth/logout');

  Future<UserProfile> me() async {
    final res = await dio.get('/auth/me');
    return UserProfile.fromJson(Map<String, dynamic>.from(_map(res)['user'] as Map));
  }

  Future<void> updateProfile({String? fullName, String? avatarUrl, String? country}) {
    return dio.put('/auth/profile', data: {
      if (fullName != null) 'full_name': fullName,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (country != null) 'country': country,
    });
  }

  // -------------------------------------------------------------- COURSES
  Future<List<Course>> getCourses() async {
    final res = await dio.get('/courses');
    final list = (_map(res)['courses'] as List? ?? const []);
    return list
        .whereType<Map<String, dynamic>>()
        .map((j) => Course.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  Future<Course> getCourse(String slug) async {
    final res = await dio.get('/courses/$slug');
    return Course.fromJson(Map<String, dynamic>.from(_map(res)['course'] as Map));
  }

  Future<void> enroll(String courseId) =>
      dio.post('/courses/$courseId/enroll');

  Future<List<String>> getEnrollmentCourseIds() async {
    final res = await dio.get('/courses/enrollments');
    final list = (_map(res)['enrollments'] as List? ?? const []);
    return list
        .whereType<Map<String, dynamic>>()
        .map((j) => (j['course_id'] ?? (j['courses'] is Map ? (j['courses'] as Map)['id'] : null))?.toString() ?? '')
        .where((s) => s.isNotEmpty)
        .toList();
  }

  Future<CourseProgress> getCourseProgress(String courseId) async {
    final res = await dio.get('/courses/$courseId/progress');
    return CourseProgress.fromJson(Map<String, dynamic>.from(_map(res)['progress'] as Map));
  }

  Future<CourseProgress> getOverallProgress() async {
    final res = await dio.get('/courses/progress/overall');
    return CourseProgress.fromJson(Map<String, dynamic>.from(_map(res)['progress'] as Map));
  }

  Future<String> getLessonContent(String lessonId) async {
    final res = await dio.get('/courses/lessons/$lessonId/content');
    return (_map(res)['content_md'] ?? '') as String;
  }

  Future<QuickQuiz?> getQuickQuiz(String lessonId) async {
    final res = await dio.get('/courses/progress/$lessonId/quick-quiz');
    final quiz = _map(res)['quiz'];
    if (quiz == null) return null;
    return QuickQuiz.tryFromJson(Map<String, dynamic>.from(quiz as Map));
  }

  Future<QuickQuizResult> submitQuickQuiz(
      String lessonId, Map<String, String> answers, int timeSpentSec) async {
    final res = await dio.post('/courses/progress/$lessonId/quick-quiz', data: {
      'answers': answers,
      'meta': {'flags': [], 'time_spent_sec': timeSpentSec},
    });
    return QuickQuizResult.fromJson(Map<String, dynamic>.from(_map(res)['result'] as Map));
  }

  /// Returns null when OK; returns (code, required, elapsed) on 409/422.
  Future<CompleteOutcome> completeLesson(String lessonId, int? studySeconds) async {
    try {
      final res = await dio.post('/courses/progress/$lessonId/complete',
          data: {'study_seconds': studySeconds});
      final p = Map<String, dynamic>.from(_map(res)['progress'] as Map);
      return CompleteOutcome(done: true, progress: CourseProgress.fromJson(p));
    } on DioException catch (e) {
      final code = (e.response?.data is Map) ? e.response!.data['code'] : null;
      if (e.response?.statusCode == 409) {
        return CompleteOutcome(done: false, blocked: 'Complete the previous lesson first.');
      }
      if (e.response?.statusCode == 422) {
        final required = e.response?.data['required_seconds'] as int? ?? 600;
        final elapsed = e.response?.data['elapsed_seconds'] as int? ?? 0;
        final secs = (required - elapsed).clamp(1, required);
        if (code == 'STUDY_TIME_REQUIRED') {
          return CompleteOutcome(
              done: false,
              blocked: 'Study a bit longer first: ${(secs / 60).ceil()} minute(s) left.',
              studyTimeNeeded: true, requiredSeconds: required, elapsedSeconds: elapsed);
        }
        return CompleteOutcome(done: false, blocked: 'Cannot complete yet. Try the quick quiz.');
      }
      rethrow;
    }
  }

  // ---------------------------------------------------------------- COINS
  Future<int> getCoinsBalance() async {
    final res = await dio.get('/coins/balance');
    return (_map(res)['coins'] ?? 0) as int;
  }

  Future<(Challenge?, bool)> getDailyChallenge() async {
    final res = await dio.get('/coins/challenges/daily');
    final j = _map(res);
    if (j['success'] != true || j['daily'] == null) return (null, false);
    final c = Challenge.fromJson(Map<String, dynamic>.from(j['daily'] as Map), daily: true);
    return (c, (j['completed'] ?? false) as bool);
  }

  Future<List<Challenge>> getAllChallenges() async {
    final res = await dio.get('/coins/challenges/all');
    final list = (_map(res)['challenges'] as List? ?? const []);
    return list
        .whereType<Map<String, dynamic>>()
        .map((j) => Challenge.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }

  Future<SubmitOutcome> submitChallenge(String challengeId, String code,
      {bool isDaily = false}) async {
    final res = await dio.post('/coins/challenges/$challengeId/submit',
        data: {'code': code, 'is_daily': isDaily});
    final j = _map(res);
    return SubmitOutcome(
      passed: (j['passed'] ?? false) as bool,
      coins: (j['coins'] ?? 0) as int,
      total: (j['total'] ?? 0) as int,
      reason: j['reason'] as String?,
    );
  }

  // --------------------------------------------------------------- STREAK
  Future<StreakInfo> getStreak() async {
    final res = await dio.get('/streak');
    return StreakInfo.fromJson(Map<String, dynamic>.from(_map(res)['streak'] as Map));
  }

  Future<List<StreakDay>> getStreakHistory({int days = 7}) async {
    final res = await dio.get('/streak/history', queryParameters: {'days': days});
    final j = _map(res);
    final raw = (j['history'] ?? j['days'] ?? j['activity'] ?? j['buckets'] ?? const []) as List;
    return raw.whereType<Map<String, dynamic>>().map(StreakDay.fromJson).toList();
  }

  // -------------------------------------------------------- NOTIFICATIONS
  Future<(List<NotificationItem>, int)> getNotifications({int limit = 50}) async {
    final res = await dio.get('/notifications', queryParameters: {'limit': limit});
    final j = _map(res);
    final list = (j['notifications'] as List? ?? const []);
    return (
      list.whereType<Map<String, dynamic>>().map(NotificationItem.fromJson).toList(),
      (j['unreadCount'] ?? j['unread_count'] ?? 0) as int
    );
  }

  Future<void> markRead(String id) => dio.put('/notifications/$id/read');
  Future<void> markAllRead() => dio.put('/notifications/read-all');

  // ---------------------------------------------------------- CERTIFICATES
  Future<List<CertificateItem>> getCertificates() async {
    final res = await dio.get('/certificates/mine');
    final list = (_map(res)['certificates'] as List? ?? const []);
    return list
        .whereType<Map<String, dynamic>>()
        .map((j) => CertificateItem.fromJson(Map<String, dynamic>.from(j)))
        .toList();
  }
}

class ApiMessage implements Exception {
  ApiMessage(this.message);
  final String message;
  @override
  String toString() => message;
}

class SubmitOutcome {
  SubmitOutcome({required this.passed, required this.coins, required this.total, this.reason});
  final bool passed;
  final int coins;
  final int total;
  final String? reason;
}

class CompleteOutcome {
  CompleteOutcome({required this.done, this.blocked, this.studyTimeNeeded = false,
      this.requiredSeconds = 0, this.elapsedSeconds = 0, this.progress});
  final bool done;
  final String? blocked;
  final bool studyTimeNeeded;
  final int requiredSeconds;
  final int elapsedSeconds;
  final CourseProgress? progress;
}
