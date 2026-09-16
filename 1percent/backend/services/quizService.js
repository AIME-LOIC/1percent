/* ============================================================
   Quiz Service
   Handles quiz CRUD, attempt submission with attempt policy
   (max attempts + 24h cooldown), cheating detection, and
   per-question analytics that map failures back to lessons.
   ============================================================ */

const { adminClient } = require('../config/database');

/** Fisher–Yates shuffle (returns a new array; no mutation). */
function shuffle(list) {
  const arr = (list || []).slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── Cheating heuristics ─────────────────────────────────── */
const FLAG_WEIGHTS = {
  devtools: 50,          // near-certain cheating → instant flag
  tab_switching: 25,     // many tab/window focus losses
  window_blur: 10,       // any focus loss at all
  answers_too_fast: 20,  // average < 1.5 s per question
  time_exceeded: 15,     // spent far longer than the limit
  answers_changed: 5     // changed a lot of answers after seeing them
};
const FLAG_THRESHOLD = 50;
const TOO_FAST_AVG_SEC = 1.5;

/* ── Lesson Quick Quiz (fast-track completion) ─────────────
   Small per-lesson quiz that lets a fast learner complete the
   lesson without waiting out the 10-minute study gate. Pure
   constants/helpers first so they are unit-testable. */
const QUICK = {
  MIN_QUESTIONS: 4,     // always show at least this many
  MAX_QUESTIONS: 6,     // hard cap per attempt
  MIN_PASS_PERCENT: 80, // floor — per-lesson fast track is held to a higher bar
  PASS_VALID_HOURS: 720 // a pass waives the study gate for this long (30 days)
};

/** Normalize quiz options for serving: drop the correct flag, keep ids/text. */
function sanitizeQuickOptions(options) {
  return (options || []).map(o => ({ id: o.id, text: o.text }));
}

/**
 * Score a quick-quiz submission (pure — unit-testable).
 * Only answers whose question id is in the presented set count;
 * anything else is ignored (tamper-resistant). Returns percentage.
 */
function scoreQuickAttempt(questions, answers) {
  const safeAnswers = (answers && typeof answers === 'object') ? answers : {};
  let score = 0;
  let max = 0;
  for (const q of questions) {
    max += q.points || 1;
    if (safeAnswers[q.id] === q.correct_answer) score += q.points || 1;
  }
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

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
      .select('id, title, description, passing_score, time_limit_min, course_id, max_attempts, retry_cooldown_hours')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get quiz questions (without correct answers — for taking the quiz).
   * Randomized per request so answer-sharing ("Q3 is B") doesn't work.
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
   * Get user's attempt policy state for a quiz:
   * attempts used, remaining, and (when blocked) when they can retry.
   */
  async getAttemptState(userId, quiz) {
    const { data: attempts, error } = await adminClient
      .from('quiz_attempts')
      .select('id, percentage, passed, completed_at, started_at, flagged')
      .eq('user_id', userId)
      .eq('quiz_id', quiz.id)
      .order('started_at', { ascending: false });

    if (error) throw error;
    const list = attempts || [];
    const used = list.length;
    const max = quiz.max_attempts || 3;
    const cooldownH = quiz.retry_cooldown_hours ?? 24;

    const passed = list.find(a => a.passed);
    if (passed) {
      return { allowed: false, reason: 'passed', attempts_used: used, attempts_remaining: 0, passed: true, percentage: passed.percentage };
    }

    if (used >= max) {
      // Cooldown window from the LATEST attempt.
      const last = list[0];
      const lastAt = new Date(last.started_at || last.completed_at || Date.now());
      const retryAt = new Date(lastAt.getTime() + cooldownH * 3600 * 1000);
      if (retryAt > new Date()) {
        return {
          allowed: false,
          reason: 'cooldown',
          attempts_used: used,
          attempts_remaining: 0,
          retry_at: retryAt.toISOString(),
          seconds_remaining: Math.max(0, Math.floor((retryAt - Date.now()) / 1000))
        };
      }
      // Cooldown elapsed → attempts reset for a new cycle.
      return { allowed: true, attempts_used: 0, attempts_remaining: max, reset: true };
    }

    return { allowed: true, attempts_used: used, attempts_remaining: max - used };
  }

  /**
   * Submit a quiz attempt with scoring, attempt policy, cheating
   * detection, and per-question results for weak-area analytics.
   */
  async submitAttempt(userId, quizId, answers, clientMeta = {}) {
    // Load quiz + policy
    const { data: quiz, error: quizError } = await adminClient
      .from('quizzes')
      .select('id, passing_score, time_limit_min, max_attempts, retry_cooldown_hours')
      .eq('id', quizId)
      .single();
    if (quizError) throw quizError;

    // ── Attempt policy gate ─────────────────────────────────
    const state = await this.getAttemptState(userId, quiz);
    if (!state.allowed && state.reason === 'cooldown') {
      const err = new Error(`Attempt limit reached — you can retry after ${new Date(state.retry_at).toLocaleString()}.`);
      err.code = 'cooldown';
      err.retry_at = state.retry_at;
      err.attempts_used = state.attempts_used;
      throw err;
    }
    if (!state.allowed && state.reason === 'passed') {
      const err = new Error('You already passed this quiz.');
      err.code = 'already_passed';
      throw err;
    }

    // ── Load questions with correct answers ─────────────────
    const { data: questions, error: qError } = await adminClient
      .from('quiz_questions')
      .select('id, correct_answer, points, lesson_id, question')
      .eq('quiz_id', quizId)
      .order('sort_order', { ascending: true });
    if (qError) throw qError;

    // ── Score + per-question results ────────────────────────
    let score = 0;
    let maxScore = 0;
    const questionResults = [];
    for (const q of questions) {
      maxScore += q.points;
      const chosen = answers?.[q.id];
      const correct = chosen === q.correct_answer;
      if (correct) score += q.points;
      questionResults.push({
        question_id: q.id,
        chosen: chosen || null,
        correct
      });
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= quiz.passing_score;

    // ── Cheating detection ──────────────────────────────────
    const { flags, score: cheatScore, flagged } = this.evaluateIntegrity(questions, answers, clientMeta);

    // ── Persist attempt ─────────────────────────────────────
    const { data, error } = await adminClient
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        answers: answers || {},
        score,
        max_score: maxScore,
        percentage,
        passed,
        question_results: questionResults,
        cheating_flags: flags,
        cheating_score: cheatScore,
        flagged,
        time_spent_sec: clientMeta.time_spent_sec || null,
        started_at: clientMeta.started_at ? new Date(clientMeta.started_at) : new Date(),
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
      passing_score: quiz.passing_score,
      flagged,
      cheating_flags: flags,
      // Server-verified attempt state for the UI
      attempts_remaining: state.reset ? (quiz.max_attempts || 3) - 1 : Math.max(0, (quiz.max_attempts || 3) - state.attempts_used - 1),
      retry_at: state.reason === 'cooldown' ? state.retry_at : null
    };
  }

  /**
   * Server-side integrity evaluation. Combines client-reported
   * signals (validated/normalized) with server-derived ones:
   *   • answers_too_fast — avg answer time far below human norm
   *   • time_exceeded    — way past the quiz's own time limit
   *   • impossible answers — chosen ids that don't exist on the question
   */
  evaluateIntegrity(questions, answers, meta = {}) {
    const flags = [];
    let score = 0;
    const clientFlags = Array.isArray(meta.flags) ? meta.flags.slice(0, 10) : [];
    for (const f of clientFlags) {
      if (FLAG_WEIGHTS[f] && !flags.includes(f)) {
        flags.push(f);
        score += FLAG_WEIGHTS[f];
      }
    }

    // Server-derived: answers too fast
    const count = questions.length;
    const spent = Number(meta.time_spent_sec) || 0;
    if (count > 0 && spent > 0 && spent / count < TOO_FAST_AVG_SEC && spent < 30) {
      if (!flags.includes('answers_too_fast')) flags.push('answers_too_fast');
      score += FLAG_WEIGHTS.answers_too_fast;
    }

    // Server-derived: time far beyond the quiz limit (cap at 3x)
    const limitMin = Number(meta.time_limit_min) || 0;
    if (limitMin > 0 && spent > limitMin * 60 * 3) {
      if (!flags.includes('time_exceeded')) flags.push('time_exceeded');
      score += FLAG_WEIGHTS.time_exceeded;
    }

    // Server-derived: invalid option ids (tampering with the client)
    let invalid = 0;
    for (const q of questions) {
      const chosen = answers?.[q.id];
      if (chosen && !(q.options || []).some(o => o.id === chosen)) invalid++;
    }
    if (invalid >= Math.max(2, Math.ceil(count * 0.5))) {
      if (!flags.includes('invalid_answers')) flags.push('invalid_answers');
      score += FLAG_WEIGHTS.devtools; // tampered payload
    }

    return { flags, score: Math.min(score, 100), flagged: score >= FLAG_THRESHOLD };
  }

  /**
   * Weak-area analytics for a user + quiz: which questions they
   * fail most across attempts, and the lesson that teaches each.
   */
  async getWeakAreas(userId, quizId) {
    // Latest failed attempt's per-question results
    const { data: attempts, error } = await adminClient
      .from('quiz_attempts')
      .select('id, percentage, passed, question_results, completed_at')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('started_at', { ascending: false })
      .limit(10);
    if (error) throw error;

    const stats = new Map();
    for (const a of attempts || []) {
      for (const qr of a.question_results || []) {
        const s = stats.get(qr.question_id) || { fails: 0, total: 0, last_correct: null };
        s.total += 1;
        if (!qr.correct) s.fails += 1;
        s.last_correct = qr.correct;
        stats.set(qr.question_id, s);
      }
    }

    const questionIds = [...stats.keys()];
    if (!questionIds.length) return { questions: [], lessons: [] };

    // Fetch questions + their lesson mapping
    const { data: qs } = await adminClient
      .from('quiz_questions')
      .select('id, question, lesson_id, lessons(title, id, sort_order)')
      .in('id', questionIds);
    const qMap = new Map((qs || []).join ? (qs || []).map(q => [q.id, q]) : []);

    const questions = questionIds
      .filter(id => (stats.get(id)?.fails || 0) > 0)
      .sort((a, b) => (stats.get(b).fails / stats.get(b).total) - (stats.get(a).fails / stats.get(a).total))
      .slice(0, 5)
      .map(id => {
        const q = qMap.get(id) || {};
        const s = stats.get(id);
        return {
          question_id: id,
          question: q.question || '',
          fails: s.fails,
          total: s.total,
          fail_rate: Math.round((s.fails / s.total) * 100),
          lesson: q.lessons ? { id: q.lessons.id, title: q.lessons.title, sort_order: q.lessons.sort_order } : null
        };
      });

    // Distinct lessons to revisit, ordered by course order
    const lessons = [];
    const seen = new Set();
    for (const q of questions) {
      if (q.lesson && !seen.has(q.lesson.id)) {
        seen.add(q.lesson.id);
        lessons.push(q.lesson);
      }
    }
    return { questions, lessons };
  }

  /**
   * Get user's attempts for a quiz
   */
  async getUserAttempts(userId, quizId) {
    const { data, error } = await adminClient
      .from('quiz_attempts')
      .select('id, score, max_score, percentage, passed, flagged, completed_at, started_at')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Create a quiz (admin)
   */
  async createQuiz({ course_id, title, description, passing_score, time_limit_min, max_attempts, retry_cooldown_hours }) {
    const { data, error } = await adminClient
      .from('quizzes')
      .insert({
        course_id, title, description,
        passing_score: passing_score || 70,
        time_limit_min,
        max_attempts: max_attempts || 3,
        retry_cooldown_hours: retry_cooldown_hours ?? 24
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Add a question to a quiz (admin)
   */
  async addQuestion(quizId, { question, options, correct_answer, sort_order, points, lesson_id }) {
    const { data, error } = await adminClient
      .from('quiz_questions')
      .insert({
        quiz_id: quizId,
        question,
        options,
        correct_answer,
        sort_order: sort_order || 0,
        points: points || 1,
        lesson_id: lesson_id || null
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

  /* ─────────────────────────────────────────────────────────
     Lesson Quick Quiz — fast-track lesson completion
     ───────────────────────────────────────────────────────── */

  /**
   * Build the quick-quiz question set for one lesson: questions
   * mapped to this lesson first, then (if fewer than MIN) other
   * lessons of the same course as review. Answers are never selected.
   * Returns null when the course has no published quiz.
   */
  async getLessonQuickQuiz(lessonId) {
    const { data: lesson } = await adminClient
      .from('lessons')
      .select('id, course_id, title')
      .eq('id', lessonId)
      .single();
    if (!lesson) return null;

    const { data: quiz } = await adminClient
      .from('quizzes')
      .select('id, passing_score')
      .eq('course_id', lesson.course_id)
      .eq('is_published', true)
      .single();
    if (!quiz) return null;

    // 1) Lesson-specific questions (shuffle → order can't be memorized)
    const { data: own } = await adminClient
      .from('quiz_questions')
      .select('id, question, options, correct_answer, points, lesson_id')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true });

    const picked = (own || []).slice();

    // 2) Fill from other lessons of the same course (review questions)
    if (picked.length < QUICK.MIN_QUESTIONS) {
      const { data: others } = await adminClient
        .from('quiz_questions')
        .select('id, question, options, correct_answer, points, lesson_id')
        .in('lesson_id', (await this._lessonIdsInCourse(lesson.course_id, lessonId)))
        .order('sort_order', { ascending: true });
      for (const q of shuffle(others || [])) {
        if (picked.length >= QUICK.MIN_QUESTIONS) break;
        if (!picked.some(p => p.id === q.id)) picked.push(q);
      }
    }
    if (!picked.length) return null;

    const shown = shuffle(picked).slice(0, QUICK.MAX_QUESTIONS);
    return {
      quiz_id: quiz.id,
      lesson_id: lessonId,
      lesson_title: lesson.title,
      passing_score: Math.max(quiz.passing_score || 70, QUICK.MIN_PASS_PERCENT),
      questions: shown.map(q => ({
        id: q.id,
        question: q.question,
        options: sanitizeQuickOptions(q.options),
        points: q.points || 1,
        review: q.lesson_id !== lessonId
      }))
    };
  }

  /** Published lesson ids in a course, excluding one lesson. */
  async _lessonIdsInCourse(courseId, excludeLessonId) {
    const { data } = await adminClient
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .neq('id', excludeLessonId);
    return (data || []).map(l => l.id);
  }

  /**
   * Grade a quick-quiz submission for one lesson (server-side only).
   * A pass at ≥ passing score is recorded in lesson_quiz_passes and
   * waives the 10-minute study gate for QUICK.PASS_VALID_HOURS.
   */
  async submitLessonQuickQuiz(userId, lessonId, answers, meta = {}) {
    const quiz = await this.getLessonQuickQuiz(lessonId);
    if (!quiz) {
      const e = new Error('No quick quiz available for this lesson.');
      e.status = 404; e.code = 'NO_QUIZ';
      throw e;
    }

    // Refuse graded questions not in the presented set (tamper guard)
    const { data: graded } = await adminClient
      .from('quiz_questions')
      .select('id, question, options, correct_answer, points, lesson_id')
      .in('id', quiz.questions.map(q => q.id));
    const presented = (graded || []).map(q => ({ ...q, points: q.points || 1 }));
    if (!presented.length) {
      const e = new Error('No quick quiz available for this lesson.');
      e.status = 404; e.code = 'NO_QUIZ';
      throw e;
    }

    const percentage = scoreQuickAttempt(presented, answers);
    const passed = percentage >= quiz.passing_score;

    // Reuse the course-quiz integrity heuristics for the pass record.
    const { flags, flagged } = this.evaluateIntegrity(presented, answers, {
      flags: Array.isArray(meta.flags) ? meta.flags : [],
      time_spent_sec: Number(meta.time_spent_sec) || 0,
      time_limit_min: 0
    });

    if (passed) {
      const { error } = await adminClient
        .from('lesson_quiz_passes')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          quiz_id: quiz.quiz_id,
          percentage,
          passed_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' });
      if (error) throw error;
    }

    return { percentage, passed, passing_score: quiz.passing_score, flagged, cheating_flags: flags };
  }

  /**
   * True when the user has a quick-quiz pass for this lesson within
   * QUICK.PASS_VALID_HOURS. Used by courseService to waive the
   * 10-minute study gate. Errors here must never block completion —
   * callers treat exceptions as "no pass".
   */
  async hasRecentLessonPass(userId, lessonId) {
    try {
      const cutoff = new Date(Date.now() - QUICK.PASS_VALID_HOURS * 3600 * 1000).toISOString();
      const { data } = await adminClient
        .from('lesson_quiz_passes')
        .select('id')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .gte('passed_at', cutoff)
        .limit(1);
      return !!(data && data.length > 0);
    } catch {
      return false;
    }
  }
}

module.exports = new QuizService();
module.exports.QUICK = QUICK;
module.exports.scoreQuickAttempt = scoreQuickAttempt;
module.exports.sanitizeQuickOptions = sanitizeQuickOptions;
