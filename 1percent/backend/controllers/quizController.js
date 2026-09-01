/* ============================================================
   Quiz Controller
   ============================================================ */

const quizService = require('../services/quizService');

class QuizController {
  /**
   * GET /api/quizzes/course/:courseId
   * Get quiz for a course (public — no answers)
   */
  async getByCourse(req, res) {
    try {
      const quiz = await quizService.getQuizForCourse(req.params.courseId);
      res.json({ success: true, quiz });
    } catch {
      res.json({ success: true, quiz: null }); // No quiz for this course
    }
  }

  /**
   * GET /api/quizzes/:quizId/questions
   * Get questions for taking a quiz (auth required)
   */
  async getQuestions(req, res) {
    try {
      const questions = await quizService.getQuizQuestions(req.params.quizId);
      res.json({ success: true, questions });
    } catch (err) {
      console.error('[QUIZ] Questions error:', err.message);
      res.status(500).json({ error: 'Failed to load questions.' });
    }
  }

  /**
   * POST /api/quizzes/:quizId/submit
   * Submit quiz answers (auth required)
   */
  async submit(req, res) {
    try {
      const { answers } = req.body;
      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: 'Answers object required.' });
      }

      const result = await quizService.submitAttempt(req.user.id, req.params.quizId, answers);
      res.json({ success: true, result });
    } catch (err) {
      console.error('[QUIZ] Submit error:', err.message);
      res.status(500).json({ error: 'Failed to submit quiz.' });
    }
  }

  /**
   * GET /api/quizzes/:quizId/attempts
   * Get user's attempts for a quiz (auth required)
   */
  async getAttempts(req, res) {
    try {
      const attempts = await quizService.getUserAttempts(req.user.id, req.params.quizId);
      res.json({ success: true, attempts });
    } catch (err) {
      console.error('[QUIZ] Attempts error:', err.message);
      res.status(500).json({ error: 'Failed to load attempts.' });
    }
  }

  /**
   * POST /api/admin/quizzes
   * Create a quiz (admin only)
   */
  async create(req, res) {
    try {
      const quiz = await quizService.createQuiz(req.body);
      res.status(201).json({ success: true, quiz });
    } catch (err) {
      console.error('[QUIZ] Create error:', err.message);
      res.status(500).json({ error: 'Failed to create quiz.' });
    }
  }

  /**
   * POST /api/admin/quizzes/:quizId/questions
   * Add a question (admin only)
   */
  async addQuestion(req, res) {
    try {
      const question = await quizService.addQuestion(req.params.quizId, req.body);
      res.status(201).json({ success: true, question });
    } catch (err) {
      console.error('[QUIZ] Add question error:', err.message);
      res.status(500).json({ error: 'Failed to add question.' });
    }
  }

  /**
   * DELETE /api/admin/quizzes/:quizId
   * Delete a quiz (admin only)
   */
  async delete(req, res) {
    try {
      await quizService.deleteQuiz(req.params.quizId);
      res.json({ success: true, message: 'Quiz deleted.' });
    } catch (err) {
      console.error('[QUIZ] Delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete quiz.' });
    }
  }
}

module.exports = new QuizController();
