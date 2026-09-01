/* ============================================================
   Quiz Service
   ============================================================
   Handles quiz CRUD, attempt submission, and scoring.
   ============================================================ */

const { adminClient } = require('../config/database');

class QuizService {
  /**
   * Get quiz by ID with questions (admin use)
   */
  async getQuizById(quizId) {
    const { data, error } = await adminClient
      .from('quizzes')
      .select('*, quiz_questions(*)')
      .eq('id', quizId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get quiz for a course (public — no correct answers)
   */
  async getQuizForCourse(courseId) {
    const { data, error } = await adminClient
      .from('quizzes')
      .select('id, title, description, passing_score, time_limit_min, course_id')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get quiz questions (without correct answers — for taking the quiz)
   */
  async getQuizQuestions(quizId) {
    const { data, error } = await adminClient
      .from('quiz_questions')
      .select('id, question, options, sort_order, points')
      .eq('quiz_id', quizId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Submit a quiz attempt and calculate score
   */
  async submitAttempt(userId, quizId, answers) {
    // Get questions with correct answers
    const { data: questions, error: qError } = await adminClient
      .from('quiz_questions')
      .select('id, correct_answer, points')
      .eq('quiz_id', quizId)
      .order('sort_order', { ascending: true });

    if (qError) throw qError;

    // Get quiz passing score
    const { data: quiz, error: quizError } = await adminClient
      .from('quizzes')
      .select('passing_score')
      .eq('id', quizId)
      .single();

    if (quizError) throw quizError;

    // Calculate score
    let score = 0;
    let maxScore = 0;
    for (const q of questions) {
      maxScore += q.points;
      if (answers[q.id] === q.correct_answer) {
        score += q.points;
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= quiz.passing_score;

    // Save attempt
    const { data, error } = await adminClient
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        answers,
        score,
        max_score: maxScore,
        percentage,
        passed,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      attempt_id: data.id,
      score,
      max_score: maxScore,
      percentage,
      passed,
      passing_score: quiz.passing_score
    };
  }

  /**
   * Get user's attempts for a quiz
   */
  async getUserAttempts(userId, quizId) {
    const { data, error } = await adminClient
      .from('quiz_attempts')
      .select('id, score, max_score, percentage, passed, completed_at')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Create a quiz (admin)
   */
  async createQuiz({ course_id, title, description, passing_score, time_limit_min }) {
    const { data, error } = await adminClient
      .from('quizzes')
      .insert({ course_id, title, description, passing_score: passing_score || 70, time_limit_min })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Add a question to a quiz (admin)
   */
  async addQuestion(quizId, { question, options, correct_answer, sort_order, points }) {
    const { data, error } = await adminClient
      .from('quiz_questions')
      .insert({
        quiz_id: quizId,
        question,
        options,
        correct_answer,
        sort_order: sort_order || 0,
        points: points || 1
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a quiz (admin)
   */
  async deleteQuiz(quizId) {
    const { error } = await adminClient
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;
  }
}

module.exports = new QuizService();
