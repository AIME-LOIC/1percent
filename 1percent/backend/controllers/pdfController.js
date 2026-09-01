const pdfService = require('../services/pdfService');
const premiumService = require('../services/premiumService');

class PdfController {
  /**
   * GET /api/pdf/lesson/:lessonId
   * Download a single lesson as PDF (requires enrollment + download quota)
   */
  async downloadLesson(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user.id;

      // Get lesson info
      const { lesson, course } = await pdfService.generateLessonPdf(userId, lessonId);

      // Check enrollment
      const { adminClient } = require('../config/database');
      const { data: enrollment } = await adminClient
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', lesson.course_id)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'Enroll in this course to download lesson materials.' });
      }

      // Check download quota
      const tierStatus = await premiumService.getUserTier(userId);
      if (!tierStatus.can_download) {
        return res.status(403).json({
          error: 'Daily download limit reached.',
          limit: tierStatus.daily_limit,
          used: tierStatus.downloads_today,
          tier: tierStatus.tier.slug,
          upgrade: true
        });
      }

      // Log the download
      await premiumService.logDownload(userId, 'lesson', lessonId);

      // Generate PDF
      const pdfBuffer = await pdfService.buildPdf({ lesson, course }, 'lesson');

      // Send as download
      const filename = `${course.slug}-${lesson.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('[PDF] Lesson download error:', err.message);
      if (err.message.includes('not found') || err.message.includes('Enrollment')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(500).json({ error: 'Failed to generate PDF.' });
    }
  }

  /**
   * GET /api/pdf/course/:courseId
   * Download entire course as PDF (requires enrollment + full_course_download tier)
   */
  async downloadCourse(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;

      // Get course info
      const { course, lessons } = await pdfService.generateCoursePdf(userId, courseId);

      // Check enrollment
      const { adminClient } = require('../config/database');
      const { data: enrollment } = await adminClient
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'Enroll in this course to download.' });
      }

      // Check if tier allows full course download
      const tierStatus = await premiumService.getUserTier(userId);
      if (!tierStatus.can_download_course) {
        return res.status(403).json({
          error: 'Full course download requires Pro or Unlimited tier.',
          tier: tierStatus.tier.slug,
          upgrade: true
        });
      }

      // Check download quota
      if (!tierStatus.can_download) {
        return res.status(403).json({
          error: 'Daily download limit reached.',
          limit: tierStatus.daily_limit,
          used: tierStatus.downloads_today,
          tier: tierStatus.tier.slug,
          upgrade: true
        });
      }

      // Log the download
      await premiumService.logDownload(userId, 'course', courseId);

      // Generate PDF
      const pdfBuffer = await pdfService.buildPdf({ course, lessons }, 'course');

      // Send as download
      const filename = `${course.slug}-complete-course.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('[PDF] Course download error:', err.message);
      if (err.message.includes('Enrollment')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(500).json({ error: 'Failed to generate PDF.' });
    }
  }

  /**
   * GET /api/pdf/certificate/:courseId
   * Download certificate as PDF with signature
   */
  async downloadCertificate(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;
      const { adminClient } = require('../config/database');

      // Get certificate
      const { data: cert } = await adminClient
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (!cert) {
        return res.status(404).json({ error: 'Certificate not found. Complete the course first.' });
      }

      // Get course details
      const { data: course } = await adminClient
        .from('courses')
        .select('title, slug, description')
        .eq('id', courseId)
        .single();

      // Get user signature
      let signatureUrl = null;
      const { data: sig } = await adminClient
        .from('signatures')
        .select('signature_url')
        .eq('user_id', userId)
        .single();
      if (sig) signatureUrl = sig.signature_url;

      // Generate certificate PDF
      const pdfBuffer = await pdfService.buildCertificatePdf(cert, course, signatureUrl);

      const filename = `certificate-${cert.certificate_number}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('[PDF] Certificate download error:', err.message);
      res.status(500).json({ error: 'Failed to generate certificate PDF.' });
    }
  }
}

module.exports = new PdfController();
