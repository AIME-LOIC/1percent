/* ============================================================
   Course Service
   ============================================================
   Handles course CRUD, enrollment, progress tracking,
   and roadmap data from the static roadmap file.
   ============================================================ */

const { adminClient } = require('../config/database');
const { ROADMAP, getPhaseById, getTrackById, getTotalLessons, getTotalDuration } = require('../data/roadmap');

class CourseService {
  /* Minimum study time (seconds) required before a lesson can be completed */
  static MIN_LESSON_SECONDS = 10 * 60;

  /* ----------------------------------------------------------
     ROADMAP (static data from roadmap.js)
     ---------------------------------------------------------- */
  getRoadmap() {
    return {
      ...ROADMAP,
      total_lessons: getTotalLessons(),
      total_duration_minutes: getTotalDuration()
    };
  }

  getPhase(phaseId) {
    return getPhaseById(phaseId);
  }

  getTrack(phaseId, trackId) {
    return getTrackById(phaseId, trackId);
  }

  /* ----------------------------------------------------------
     COURSES (from Supabase database)
     ---------------------------------------------------------- */
  async getCourses() {
    const { data, error } = await adminClient
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getCourseBySlug(slug) {
    const { data: courses, error: cError } = await adminClient
      .from('courses')
      .select('*')
      .eq('slug', slug);

    if (cError) throw cError;
    if (!courses || courses.length === 0) return null;
    const course = courses[0];

    // Fetch lesson metadata only — no content_md (loaded on demand)
    const { data: lessons } = await adminClient
      .from('lessons')
      .select('id, title, description, lesson_type, duration_min, sort_order, is_free_preview')
      .eq('course_id', course.id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    return { ...course, lessons: lessons || [] };
  }

  async getLessonContent(lessonId) {
    const { data, error } = await adminClient
      .from('lessons')
      .select('id, course_id, content_md, description')
      .eq('id', lessonId)
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Record when a learner first opens a lesson (used to enforce the
   * 10-minute minimum study time server-side, independent of the client).
   */
  async markLessonStarted(userId, lessonId) {
    try {
      const { data: existing } = await adminClient
        .from('lesson_progress')
        .select('id, started_at')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();
      if (existing) {
        if (!existing.started_at) {
          await adminClient
            .from('lesson_progress')
            .update({ started_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
        return;
      }
      await adminClient
        .from('lesson_progress')
        .insert({ user_id: userId, lesson_id: lessonId, started_at: new Date().toISOString() });
    } catch (e) {
      // Non-fatal: if the column/table isn't migrated yet, don't block reading
      console.warn('[COURSE] markLessonStarted skipped:', e.message);
    }
  }

  /* ----------------------------------------------------------
     ENROLLMENTS
     ---------------------------------------------------------- */
  async enroll(userId, courseId) {
    const { data, error } = await adminClient
      .from('enrollments')
      .insert({ user_id: userId, course_id: courseId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Already enrolled in this course');
      throw error;
    }
    return data;
  }

  async getUserEnrollments(userId) {
    const { data, error } = await adminClient
      .from('enrollments')
      .select('*, courses(*)')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async isEnrolled(userId, courseId) {
    const { data, error } = await adminClient
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    return !error && !!data;
  }

  /* ----------------------------------------------------------
     LESSON PROGRESS
     ---------------------------------------------------------- */
  /**
   * Return the previous published lesson (by sort_order) for a lesson.
   * Used to enforce sequential lesson completion.
   */
  async _getPreviousLesson(lessonId) {
    const { data: lesson } = await adminClient
      .from('lessons')
      .select('id, course_id, sort_order')
      .eq('id', lessonId)
      .single();
    if (!lesson) return { lesson: null, prevLesson: null };

    const { data: lessons } = await adminClient
      .from('lessons')
      .select('id, sort_order')
      .eq('course_id', lesson.course_id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    const list = lessons || [];
    const idx = list.findIndex(l => l.id === lessonId);
    const prevLesson = idx > 0 ? list[idx - 1] : null;
    return { lesson, prevLesson };
  }

  async completeLesson(userId, lessonId, studySeconds = null) {
    const { lesson, prevLesson } = await this._getPreviousLesson(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    /* ── Sequential completion — lesson N requires lesson N-1 done ──
       The client also gates this, but the server is the source of truth.
       Already-completed lessons are always allowed through (revisit). */
    if (prevLesson) {
      const { data: prevRow } = await adminClient
        .from('lesson_progress')
        .select('completed')
        .eq('user_id', userId)
        .eq('lesson_id', prevLesson.id)
        .single();
      if (!prevRow?.completed) {
        const err = new Error('Complete the previous lesson before this one.');
        err.status = 409; err.code = 'PREVIOUS_LESSON_INCOMPLETE';
        throw err;
      }
    }

    /* ── Study-time gate — minimum 10 minutes per lesson ──
       The client streams elapsed seconds; the server also checks elapsed
       wall-clock time since the lesson content was first opened. */
    const minSeconds = CourseService.MIN_LESSON_SECONDS;
    let alreadyDone = false;
    let elapsed = 0;
    try {
      const { data: existing } = await adminClient
        .from('lesson_progress')
        .select('completed, started_at')
      .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();
      alreadyDone = !!existing?.completed;
      elapsed = existing?.started_at
        ? Math.floor((Date.now() - new Date(existing.started_at).getTime()) / 1000)
        : 0;
    } catch { /* no row yet */ }

    if (!alreadyDone) {
      const studied = Math.max(Number(studySeconds) || 0, elapsed);
      if (studied < minSeconds) {
        const err = new Error(`Study for at least 10 minutes before completing this lesson.`);
        err.status = 422; err.code = 'STUDY_TIME_REQUIRED';
        err.required = minSeconds; err.elapsed = studied;
        throw err;
      }
    }

    const { data, error } = await adminClient
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) throw error;

    // Update streak + award coins
    try {
      const streakService = require('./streakService');
      await streakService.updateStreak(userId);
    } catch (e) {
      console.warn('[STREAK] Could not update streak:', e.message);
    }

    // Award 5 coins for lesson completion
    try {
      const coinsService = require('./coinsService');
      await coinsService.addCoins(userId, 5, 'Lesson completed', lessonId);
    } catch (e) {
      console.warn('[COINS] Could not award coins:', e.message);
    }

    // Emit WebSocket event so other tabs/devices update live
    try {
      const { getIo } = require('../config/socket');
      const io = getIo();
      if (io) {
        io.to(userId).emit('lesson-completed', {
          lessonId,
          completed_at: data.completed_at
        });
      }
    } catch (e) {
      // Socket not initialized (e.g. during tests) — ignore
    }

    return data;
  }

  async getCourseProgress(userId, courseId) {
    // IDOR protection: verify user is enrolled
    const enrolled = await this.isEnrolled(userId, courseId);
    if (!enrolled) throw new Error('Not enrolled in this course');

    const { data: lessons, error: lError } = await adminClient
      .from('lessons')
      .select('id, title, lesson_type, duration_min, sort_order')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (lError) throw lError;

    const lessonIds = lessons.map(l => l.id);
    const { data: progress } = await adminClient
      .from('lesson_progress')
      .select('lesson_id, completed, completed_at, time_spent_seconds')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds);

    const progressMap = {};
    (progress || []).forEach(p => { progressMap[p.lesson_id] = p; });

    const total = lessons.length;
    const completed = lessons.filter(l => progressMap[l.id]?.completed).length;

    return {
      total_lessons: total,
      completed_lessons: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      lessons: lessons.map(l => ({
        ...l,
        completed: progressMap[l.id]?.completed || false,
        completed_at: progressMap[l.id]?.completed_at || null,
        time_spent_seconds: progressMap[l.id]?.time_spent_seconds || 0
      }))
    };
  }

  async getOverallProgress(userId) {
    const enrollments = await this.getUserEnrollments(userId);
    let totalLessons = 0;
    let completedLessons = 0;
    const courses = [];

    await Promise.all(enrollments.map(async (enrollment) => {
      try {
        const progress = await this.getCourseProgress(userId, enrollment.course_id);
        totalLessons += progress.total_lessons;
        completedLessons += progress.completed_lessons;
        courses.push({ course_id: enrollment.course_id, percentage: progress.percentage });
      } catch {
        courses.push({ course_id: enrollment.course_id, percentage: 0 });
      }
    }));

    return {
      total_courses: enrollments.length,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      courses
    };
  }
}

module.exports = new CourseService();
