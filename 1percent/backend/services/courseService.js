/* ============================================================
   Course Service
   ============================================================
   Handles course CRUD, enrollment, progress tracking,
   and roadmap data from the static roadmap file.
   ============================================================ */

const { adminClient } = require('../config/database');
const { ROADMAP, getPhaseById, getTrackById, getTotalLessons, getTotalDuration } = require('../data/roadmap');

class CourseService {
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
      .eq('slug', slug)
      .eq('is_published', true);

    if (cError) throw cError;
    if (!courses || courses.length === 0) return null;
    const course = courses[0];

    // Fetch lessons for this course
    const { data: lessons } = await adminClient
      .from('lessons')
      .select('id, title, description, content_md, lesson_type, duration_min, sort_order')
      .eq('course_id', course.id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    return { ...course, lessons: lessons || [] };
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
  async completeLesson(userId, lessonId) {
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
      .select('lesson_id, completed, completed_at')
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
        completed_at: progressMap[l.id]?.completed_at || null
      }))
    };
  }

  async getOverallProgress(userId) {
    const enrollments = await this.getUserEnrollments(userId);
    let totalLessons = 0;
    let completedLessons = 0;

    for (const enrollment of enrollments) {
      try {
        const progress = await this.getCourseProgress(userId, enrollment.course_id);
        totalLessons += progress.total_lessons;
        completedLessons += progress.completed_lessons;
      } catch {
        // Skip courses where enrollment check fails
      }
    }

    return {
      total_courses: enrollments.length,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    };
  }
}

module.exports = new CourseService();
