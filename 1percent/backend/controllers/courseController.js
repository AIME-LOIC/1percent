/**
 * controllers/courseController.js
 *
 * PURPOSE:
 *   HTTP layer for courses/lessons: catalog browsing, enrollment, progress updates with study-time
 *   enforcement.
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const courseService = require('../services/courseService');
const premiumService = require('../services/premiumService');
const quizService = require('../services/quizService');
const { adminClient } = require('../config/database');

class CourseController {
  /**
   * GET /api/roadmap
   * Get the full learning roadmap (public)
   */
  async getRoadmap(req, res) {
    try {
      const roadmap = courseService.getRoadmap();
      res.json({ success: true, roadmap });
    } catch (err) {
      console.error('[COURSE] Roadmap error:', err.message);
      res.status(500).json({ error: 'Failed to load roadmap.' });
    }
  }

  /**
   * GET /api/roadmap/:phaseId
   * Get a specific phase (public)
   */
  async getPhase(req, res) {
    try {
      const phase = courseService.getPhase(req.params.phaseId);
      if (!phase) {
        return res.status(404).json({ error: 'Phase not found.' });
      }
      res.json({ success: true, phase });
    } catch (err) {
      console.error('[COURSE] Phase error:', err.message);
      res.status(500).json({ error: 'Failed to load phase.' });
    }
  }

  /**
   * GET /api/roadmap/:phaseId/:trackId
   * Get a specific track (public)
   */
  async getTrack(req, res) {
    try {
      const track = courseService.getTrack(req.params.phaseId, req.params.trackId);
      if (!track) {
        return res.status(404).json({ error: 'Track not found.' });
      }
      res.json({ success: true, track });
    } catch (err) {
      console.error('[COURSE] Track error:', err.message);
      res.status(500).json({ error: 'Failed to load track.' });
    }
  }

  /**
   * GET /api/courses
   * Get all published courses (public)
   */
  async getCourses(req, res) {
    try {
      const courses = await courseService.getCourses();
      res.json({ success: true, courses });
    } catch (err) {
      console.error('[COURSE] List error:', err.message);
      res.status(500).json({ error: 'Failed to load courses.' });
    }
  }

  /**
   * GET /api/courses/:slug
   * Get a single course with modules (public)
   */
  async getCourse(req, res) {
    try {
      const course = await courseService.getCourseBySlug(req.params.slug);
      if (!course) {
        return res.status(404).json({ error: 'Course not found.' });
      }
      res.json({ success: true, course });
    } catch (err) {
      console.error('[COURSE] Get error:', err.message);
      res.status(500).json({ error: 'Failed to load course.' });
    }
  }

  /**
   * POST /api/courses/:courseId/enroll
   * Enroll the authenticated user in a course
   */
  async enroll(req, res) {
    try {
      const { courseId } = req.params;
      const enrollment = await courseService.enroll(req.user.id, courseId);

      res.status(201).json({
        success: true,
        message: 'Successfully enrolled.',
        enrollment
      });
    } catch (err) {
      console.error('[COURSE] Enroll error:', err.message);

      if (err.message?.includes('Already enrolled')) {
        return res.status(409).json({ error: 'Already enrolled in this course.' });
      }

      res.status(500).json({ error: 'Failed to enroll. Please try again.' });
    }
  }

  /**
   * GET /api/courses/enrollments
   * Get current user's enrollments
   */
  async getMyEnrollments(req, res) {
    try {
      const enrollments = await courseService.getUserEnrollments(req.user.id);
      res.json({ success: true, enrollments });
    } catch (err) {
      console.error('[COURSE] Enrollments error:', err.message);
      res.status(500).json({ error: 'Failed to load enrollments.' });
    }
  }

  /**
   * GET /api/courses/progress/:lessonId/quick-quiz
   * Per-lesson fast-track quiz (questions only — no answers).
   * Lets a fast learner prove mastery instead of waiting out the
   * 10-minute study gate. Must be declared BEFORE /:courseId routes.
   */
  async getQuickQuiz(req, res) {
    try {
      const quiz = await quizService.getLessonQuickQuiz(req.params.lessonId);
      if (!quiz) {
        return res.json({ success: true, quiz: null });
      }
      res.json({ success: true, quiz });
    } catch (err) {
      console.error('[COURSE] Quick quiz error:', err.message);
      res.status(500).json({ error: 'Failed to load quick quiz.' });
    }
  }

  /**
   * POST /api/courses/progress/:lessonId/quick-quiz
   * Grade the quick quiz server-side. A pass (≥ max(course passing_score, 80))
   * is recorded and waives the study-time gate for this lesson.
   */
  async submitQuickQuiz(req, res) {
    try {
      const { answers, meta } = req.body || {};
      const result = await quizService.submitLessonQuickQuiz(
        req.user.id,
        req.params.lessonId,
        (answers && typeof answers === 'object') ? answers : {},
        {
          flags: Array.isArray(meta?.flags) ? meta.flags : [],
          time_spent_sec: Number(meta?.time_spent_sec) || 0
        }
      );
      res.json({ success: true, result });
    } catch (err) {
      console.error('[COURSE] Quick quiz submit error:', err.message);
      if (err.code === 'NO_QUIZ') {
        return res.status(404).json({ error: err.message, code: err.code });
      }
      res.status(500).json({ error: 'Failed to submit quick quiz.' });
    }
  }

  /**
   * POST /api/courses/progress/:moduleId/complete
   * Mark a module as completed (requires sequential order + 10 min study time)
   */
  async completeLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const studySeconds = Number(req.body?.study_seconds) || null;
      const progress = await courseService.completeLesson(req.user.id, lessonId, studySeconds);

      res.json({
        success: true,
        message: 'Lesson marked as completed.',
        progress
      });
    } catch (err) {
      console.error('[COURSE] Complete error:', err.message);
      if (err.status === 409) {
        return res.status(409).json({
          error: err.message,
          code: err.code || 'PREVIOUS_LESSON_INCOMPLETE'
        });
      }
      if (err.status === 422) {
        return res.status(422).json({
          error: err.message,
          code: err.code || 'STUDY_TIME_REQUIRED',
          required_seconds: err.required || 600,
          elapsed_seconds: err.elapsed || 0
        });
      }
      if (err.message?.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      res.status(500).json({ error: 'Failed to update progress.' });
    }
  }

  /**
   * GET /api/courses/:courseId/progress
   * Get progress for a specific course
   */
  async getCourseProgress(req, res) {
    try {
      const { courseId } = req.params;
      const progress = await courseService.getCourseProgress(req.user.id, courseId);
      res.json({ success: true, progress });
    } catch (err) {
      console.error('[COURSE] Progress error:', err.message);
      res.status(500).json({ error: 'Failed to load progress.' });
    }
  }

  /**
   * GET /api/courses/progress/overall
   * Get overall progress across all courses
   */
  async getOverallProgress(req, res) {
    try {
      const progress = await courseService.getOverallProgress(req.user.id);
      res.json({ success: true, progress });
    } catch (err) {
      console.error('[COURSE] Overall progress error:', err.message);
      res.status(500).json({ error: 'Failed to load progress.' });
    }
  }

  /**
   * GET /api/courses/lessons/:lessonId/content
   * Fetch lesson content_md on demand
   */
  async getLessonContent(req, res) {
    try {
      const lesson = await courseService.getLessonContent(req.params.lessonId);
      if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

      /* ── Premium / tier enforcement (server-side) ─────────────
         Free users may only read lessons flagged is_free_preview
         inside a premium course. Resolving the parent course lets
         us know whether this lesson belongs to a premium course. */
      const { data: parentCourse } = await adminClient
        .from('courses')
        .select('id, is_premium')
        .eq('id', lesson.course_id)
        .single();

      /* Record when this learner first opened the lesson — the study-time
         gate uses it server-side. Never blocks the read. */
      if (req.user?.id) {
        try { await courseService.markLessonStarted(req.user.id, lesson.id); } catch {}
      }

      if (parentCourse?.is_premium) {
        const { data: lessonMeta } = await adminClient
          .from('lessons')
          .select('is_free_preview')
          .eq('id', req.params.lessonId)
          .single();

        const isPreview = lessonMeta?.is_free_preview === true;
        if (!isPreview) {
          let tier = 'free';
          if (req.user?.id) {
            try {
              const status = await premiumService.getUserTier(req.user.id);
              tier = status?.tier?.slug || 'free';
            } catch { /* default free */ }
          }
          if (tier === 'free') {
            return res.status(403).json({
              error: 'Premium required',
              code: 'PREMIUM_REQUIRED',
              message: 'This lesson is part of a premium course. Upgrade your plan to continue.'
            });
          }
        }
      }

      res.json({ success: true, content_md: lesson.content_md || lesson.description || '' });
    } catch (err) {
      console.error('[COURSE] Lesson content error:', err.message);
      res.status(500).json({ error: 'Failed to load lesson content.' });
    }
  }

  /**
   * POST /api/courses/:courseId/certificate
   * Request certificate (delegated to certificateController)
   */
}

module.exports = new CourseController();
