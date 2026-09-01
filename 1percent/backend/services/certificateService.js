/* ============================================================
   Certificate Service
   ============================================================
   Issues certificates when a course reaches 100% completion.
   ============================================================ */

const { adminClient } = require('../config/database');
const crypto = require('crypto');

class CertificateService {
  /**
   * Generate a unique certificate number
   */
  _generateNumber() {
    const year = new Date().getFullYear();
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `1PCT-${year}-${rand}`;
  }

  /**
   * Check if user already has a certificate for a course
   */
  async hasCertificate(userId, courseId) {
    const { data, error } = await adminClient
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    return !error && !!data;
  }

  /**
   * Issue a certificate if course is 100% complete
   */
  async issueIfComplete(userId, courseId) {
    // Check if already has certificate
    const has = await this.hasCertificate(userId, courseId);
    if (has) {
      const { data } = await adminClient
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();
      return { certificate: data, already_issued: true };
    }

    // Get course progress
    const { data: lessons } = await adminClient
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    if (!lessons || lessons.length === 0) {
      throw new Error('Course has no lessons');
    }

    const lessonIds = lessons.map(l => l.id);
    const { data: progress } = await adminClient
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('lesson_id', lessonIds);

    const completedCount = progress?.length || 0;
    const totalCount = lessons.length;

    if (completedCount < totalCount) {
      return { certificate: null, progress: Math.round((completedCount / totalCount) * 100) };
    }

    // Also check quiz if one exists
    const { data: quiz } = await adminClient
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .single();

    if (quiz) {
      const { data: bestAttempt } = await adminClient
        .from('quiz_attempts')
        .select('passed')
        .eq('user_id', userId)
        .eq('quiz_id', quiz.id)
        .eq('passed', true)
        .limit(1)
        .single();

      if (!bestAttempt) {
        return { certificate: null, progress: 100, quiz_required: true, quiz_passed: false };
      }
    }

    // Get learner profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Get course details for snapshot
    const { data: courseDetails } = await adminClient
      .from('courses')
      .select('title, level, duration_weeks')
      .eq('id', courseId)
      .single();

    // Issue certificate with full details
    const certNumber = this._generateNumber();
    const insertData = {
      user_id: userId,
      course_id: courseId,
      certificate_number: certNumber,
      learner_name: profile?.full_name || 'Student',
      course_title: courseDetails?.title || course?.title || 'Course',
      course_level: courseDetails?.level || 'beginner',
      duration_weeks: courseDetails?.duration_weeks || 0
    };
    // Try adding completed_at if column exists
    try {
      insertData.completed_at = new Date().toISOString();
    } catch {}

    const { data: cert, error } = await adminClient
      .from('certificates')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // Mark enrollment as completed
    try {
      await adminClient
        .from('enrollments')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_id', courseId);
    } catch {}

    return { certificate: cert, already_issued: false };
  }

  /**
   * Verify a certificate by number (public)
   */
  async verify(certNumber) {
    const { data, error } = await adminClient
      .from('certificates')
      .select('certificate_number, issued_at, profiles(full_name), courses(title)')
      .eq('certificate_number', certNumber)
      .single();

    if (error || !data) {
      return { valid: false };
    }

    return {
      valid: true,
      certificate_number: data.certificate_number,
      student_name: data.profiles?.full_name || 'Unknown',
      course_title: data.courses?.title || 'Unknown',
      issued_at: data.issued_at
    };
  }

  /**
   * Get all certificates for a user
   */
  async getUserCertificates(userId) {
    const { data, error } = await adminClient
      .from('certificates')
      .select('id, certificate_number, issued_at, learner_name, course_title, course_level, duration_weeks, courses(title, slug)')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      completed_at: c.issued_at // Use issued_at as fallback
    }));
  }
}

module.exports = new CertificateService();
