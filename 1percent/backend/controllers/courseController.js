/* ============================================================
   Course Controller
   ============================================================
   Handles roadmap, courses, enrollment, and progress endpoints.
   ============================================================ */

const courseService = require('../services/courseService');

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
   * POST /api/courses/progress/:moduleId/complete
   * Mark a module as completed
   */
  async completeLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const progress = await courseService.completeLesson(req.user.id, lessonId);

      res.json({
        success: true,
        message: 'Lesson marked as completed.',
        progress
      });
    } catch (err) {
      console.error('[COURSE] Complete error:', err.message);
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
   * POST /api/courses/:courseId/certificate
   * Request certificate (delegated to certificateController)
   */
}

module.exports = new CourseController();
