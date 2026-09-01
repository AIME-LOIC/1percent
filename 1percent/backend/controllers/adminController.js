/* ============================================================
   Admin Controller
   ============================================================
   CRUD for courses, lessons, quizzes. All routes require admin.
   ============================================================ */

const { adminClient } = require('../config/database');

class AdminController {
  /* ---- COURSES ---- */

  async createCourse(req, res) {
    try {
      const { slug, title, description, level, duration_weeks, icon, thumbnail_url } = req.body;
      const { data, error } = await adminClient
        .from('courses')
        .insert({ slug, title, description, level: level || 'beginner', duration_weeks: duration_weeks || 8, icon, thumbnail_url })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ success: true, course: data });
    } catch (err) {
      console.error('[ADMIN] Create course error:', err.message);
      res.status(500).json({ error: 'Failed to create course.' });
    }
  }

  async updateCourse(req, res) {
    try {
      const { title, description, level, duration_weeks, icon, thumbnail_url, is_published, sort_order } = req.body;
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (level !== undefined) updates.level = level;
      if (duration_weeks !== undefined) updates.duration_weeks = duration_weeks;
      if (icon !== undefined) updates.icon = icon;
      if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
      if (is_published !== undefined) updates.is_published = is_published;
      if (sort_order !== undefined) updates.sort_order = sort_order;

      const { data, error } = await adminClient
        .from('courses')
        .update(updates)
        .eq('id', req.params.courseId)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, course: data });
    } catch (err) {
      console.error('[ADMIN] Update course error:', err.message);
      res.status(500).json({ error: 'Failed to update course.' });
    }
  }

  async deleteCourse(req, res) {
    try {
      const { error } = await adminClient.from('courses').delete().eq('id', req.params.courseId);
      if (error) throw error;
      res.json({ success: true, message: 'Course deleted.' });
    } catch (err) {
      console.error('[ADMIN] Delete course error:', err.message);
      res.status(500).json({ error: 'Failed to delete course.' });
    }
  }

  async getAllCourses(req, res) {
    try {
      const { data, error } = await adminClient
        .from('courses')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      res.json({ success: true, courses: data });
    } catch (err) {
      console.error('[ADMIN] List courses error:', err.message);
      res.status(500).json({ error: 'Failed to load courses.' });
    }
  }

  /* ---- LESSONS ---- */

  async createLesson(req, res) {
    try {
      const { title, description, content_md, lesson_type, duration_min, sort_order } = req.body;
      const { data, error } = await adminClient
        .from('lessons')
        .insert({
          course_id: req.params.courseId,
          title,
          description: description || '',
          content_md: content_md || '',
          lesson_type: lesson_type || 'video',
          duration_min: duration_min || 30,
          sort_order: sort_order || 0
        })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ success: true, lesson: data });
    } catch (err) {
      console.error('[ADMIN] Create lesson error:', err.message);
      res.status(500).json({ error: 'Failed to create lesson.' });
    }
  }

  async updateLesson(req, res) {
    try {
      const { title, description, content_md, lesson_type, duration_min, sort_order, is_published } = req.body;
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (content_md !== undefined) updates.content_md = content_md;
      if (lesson_type !== undefined) updates.lesson_type = lesson_type;
      if (duration_min !== undefined) updates.duration_min = duration_min;
      if (sort_order !== undefined) updates.sort_order = sort_order;
      if (is_published !== undefined) updates.is_published = is_published;

      const { data, error } = await adminClient
        .from('lessons')
        .update(updates)
        .eq('id', req.params.lessonId)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, lesson: data });
    } catch (err) {
      console.error('[ADMIN] Update lesson error:', err.message);
      res.status(500).json({ error: 'Failed to update lesson.' });
    }
  }

  async deleteLesson(req, res) {
    try {
      const { error } = await adminClient.from('lessons').delete().eq('id', req.params.lessonId);
      if (error) throw error;
      res.json({ success: true, message: 'Lesson deleted.' });
    } catch (err) {
      console.error('[ADMIN] Delete lesson error:', err.message);
      res.status(500).json({ error: 'Failed to delete lesson.' });
    }
  }

  async getLessonsForCourse(req, res) {
    try {
      const { data, error } = await adminClient
        .from('lessons')
        .select('*')
        .eq('course_id', req.params.courseId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      res.json({ success: true, lessons: data });
    } catch (err) {
      console.error('[ADMIN] List lessons error:', err.message);
      res.status(500).json({ error: 'Failed to load lessons.' });
    }
  }

  /* ---- ENROLLMENTS ---- */

  async getAllEnrollments(req, res) {
    try {
      const { data, error } = await adminClient
        .from('enrollments')
        .select('*, profiles(full_name), courses(title, slug)')
        .order('enrolled_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      res.json({ success: true, enrollments: data });
    } catch (err) {
      console.error('[ADMIN] Enrollments error:', err.message);
      res.status(500).json({ error: 'Failed to load enrollments.' });
    }
  }
}

module.exports = new AdminController();
