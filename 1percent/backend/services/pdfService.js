const PDFDocument = require('pdfkit');
const { adminClient } = require('../config/database');

class PdfService {
  /**
   * Generate a PDF for a single lesson
   * Premium feature: only enrolled users can download
   */
  async generateLessonPdf(userId, lessonId) {
    // Get lesson with course info
    const { data: lesson, error: lErr } = await adminClient
      .from('lessons')
      .select('id, title, description, content_md, lesson_type, duration_min, course_id')
      .eq('id', lessonId)
      .single();

    if (lErr || !lesson) throw new Error('Lesson not found');

    // Get course info
    const { data: course } = await adminClient
      .from('courses')
      .select('id, title, slug')
      .eq('id', lesson.course_id)
      .single();

    return { lesson, course };
  }

  /**
   * Generate all lessons PDF for a course
   */
  async generateCoursePdf(userId, courseId) {
    // Verify enrollment
    const { data: enrollment } = await adminClient
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (!enrollment) throw new Error('Enrollment required to download course materials');

    // Get course
    const { data: course } = await adminClient
      .from('courses')
      .select('id, title, slug, description')
      .eq('id', courseId)
      .single();

    if (!course) throw new Error('Course not found');

    // Get all lessons
    const { data: lessons } = await adminClient
      .from('lessons')
      .select('id, title, description, content_md, lesson_type, duration_min, sort_order')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    return { course, lessons: lessons || [] };
  }

  /**
   * Build the PDF document as a buffer
   */
  buildPdf(data, type = 'lesson') {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 60,
        info: {
          Title: type === 'lesson' ? data.lesson.title : data.course.title,
          Author: '1% Digital Solutions',
          Subject: 'Course Material',
          Keywords: 'education, programming, 1percent'
        }
      });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (type === 'lesson') {
        this._buildLessonPdf(doc, data.lesson, data.course);
      } else {
        this._buildCoursePdf(doc, data.course, data.lessons);
      }

      doc.end();
    });
  }

  _buildLessonPdf(doc, lesson, course) {
    // Header
    doc.fontSize(10).fillColor('#888')
      .text(`${course.title}  ·  1% Digital Solutions`, { align: 'left' });
    doc.moveDown(0.3);

    // Divider
    doc.moveTo(60, doc.y).lineTo(555, doc.y).strokeColor('#e0e0e0').stroke();
    doc.moveDown(0.5);

    // Lesson type badge
    doc.fontSize(9).fillColor('#6366f1')
      .text(lesson.lesson_type.toUpperCase(), { continued: true });
    doc.fillColor('#888')
      .text(`  ·  ${lesson.duration_min} min read`, { align: 'left' });
    doc.moveDown(0.3);

    // Title
    doc.fontSize(22).fillColor('#111').font('Helvetica-Bold')
      .text(lesson.title);
    doc.moveDown(0.3);

    // Description
    if (lesson.description) {
      doc.fontSize(11).fillColor('#666').font('Helvetica')
        .text(lesson.description);
      doc.moveDown(0.5);
    }

    // Divider
    doc.moveTo(60, doc.y).lineTo(555, doc.y).strokeColor('#e0e0e0').stroke();
    doc.moveDown(0.8);

    // Content
    if (lesson.content_md) {
      this._renderMarkdownToPdf(doc, lesson.content_md);
    } else {
      doc.fontSize(12).fillColor('#999')
        .text('Lesson content will be available soon.');
    }

    // Footer
    this._addFooter(doc);
  }

  _buildCoursePdf(doc, course, lessons) {
    // Cover page
    doc.fontSize(10).fillColor('#888')
      .text('1% Digital Solutions  ·  Kigali, Rwanda', { align: 'center' });
    doc.moveDown(4);

    doc.fontSize(28).fillColor('#111').font('Helvetica-Bold')
      .text(course.title, { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(12).fillColor('#666').font('Helvetica')
      .text(course.description || '', { align: 'center', width: 400 });
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#888')
      .text(`${lessons.length} lessons  ·  Premium Content`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#aaa')
      .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });

    // Divider
    doc.moveDown(2);
    doc.moveTo(60, doc.y).lineTo(555, doc.y).strokeColor('#e0e0e0').stroke();
    doc.moveDown(1);

    // Table of contents
    doc.fontSize(16).fillColor('#111').font('Helvetica-Bold')
      .text('Table of Contents');
    doc.moveDown(0.5);

    lessons.forEach((l, i) => {
      doc.fontSize(11).fillColor('#333').font('Helvetica')
        .text(`${i + 1}. ${l.title}`, { indent: 20 });
    });

    doc.addPage();

    // Each lesson
    lessons.forEach((l, i) => {
      if (i > 0) doc.addPage();

      // Lesson header
      doc.fontSize(9).fillColor('#6366f1')
        .text(`LESSON ${i + 1} OF ${lessons.length}  ·  ${l.lesson_type.toUpperCase()}`);
      doc.moveDown(0.2);

      doc.fontSize(18).fillColor('#111').font('Helvetica-Bold')
        .text(l.title);
      doc.moveDown(0.2);

      if (l.description) {
        doc.fontSize(10).fillColor('#666').font('Helvetica')
          .text(l.description);
      }

      doc.moveDown(0.3);
      doc.moveTo(60, doc.y).lineTo(555, doc.y).strokeColor('#e0e0e0').stroke();
      doc.moveDown(0.5);

      // Content
      if (l.content_md) {
        this._renderMarkdownToPdf(doc, l.content_md);
      } else {
        doc.fontSize(11).fillColor('#999')
          .text('Content coming soon.');
      }

      this._addFooter(doc);
    });
  }

  _renderMarkdownToPdf(doc, md) {
    const lines = md.split('\n');
    let i = 0;

    while (i < lines.length) {
      // Check if we need a new page
      if (doc.y > 720) {
        doc.addPage();
      }

      const line = lines[i];

      // Code block
      if (line.trim().startsWith('```')) {
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```

        if (codeLines.length > 0) {
          doc.moveDown(0.3);
          const startY = doc.y;
          const maxCodeHeight = Math.min(codeLines.length * 13 + 16, 400);

          // Code background
          doc.save();
          doc.roundedRect(55, startY, 500, maxCodeHeight, 4)
            .fillColor('#f8f8f8').fill();

          // Left border accent
          doc.rect(55, startY, 3, maxCodeHeight)
            .fillColor('#6366f1').fill();

          // Code text with proper line spacing
          doc.fontSize(9).fillColor('#333').font('Courier');
          codeLines.forEach((codeLine, idx) => {
            doc.text(codeLine || ' ', 68, startY + 8 + (idx * 13), {
              width: 480,
              lineBreak: false
            });
          });
          doc.y = startY + maxCodeHeight + 8;
          doc.moveDown(0.3);
          doc.restore();
        }
        continue;
      }

      // Heading
      if (line.startsWith('## ')) {
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#111').font('Helvetica-Bold')
          .text(line.replace(/^##\s*/, ''));
        doc.moveDown(0.2);
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        doc.moveDown(0.3);
        doc.fontSize(12).fillColor('#222').font('Helvetica-Bold')
          .text(line.replace(/^###\s*/, ''));
        doc.moveDown(0.2);
        i++;
        continue;
      }

      // Table
      if (line.includes('|') && lines[i + 1]?.includes('---')) {
        const headers = line.split('|').filter(Boolean).map(h => h.trim());
        i += 2; // skip header + separator
        const rows = [];
        while (i < lines.length && lines[i].includes('|')) {
          rows.push(lines[i].split('|').filter(Boolean).map(d => d.trim()));
          i++;
        }

        // Render table
        const colWidth = Math.floor(490 / headers.length);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
        let x = 60;
        headers.forEach(h => {
          doc.text(h, x, doc.y, { width: colWidth, continued: true });
          x += colWidth;
        });
        doc.moveDown(0.3);

        doc.font('Helvetica').fillColor('#444');
        rows.forEach(row => {
          x = 60;
          row.forEach(cell => {
            doc.text(cell, x, doc.y, { width: colWidth, continued: true });
            x += colWidth;
          });
          doc.moveDown(0.2);
        });
        doc.moveDown(0.3);
        continue;
      }

      // List item
      if (line.trim().startsWith('- ')) {
        doc.fontSize(10).fillColor('#333').font('Helvetica')
          .text(`•  ${line.trim().replace(/^-\s*/, '')}`, 75, doc.y, { width: 470 });
        doc.moveDown(0.1);
        i++;
        continue;
      }

      // Ordered list
      if (/^\d+\.\s/.test(line.trim())) {
        const text = line.trim().replace(/^\d+\.\s*/, '');
        const num = line.trim().match(/^(\d+)\./)[1];
        doc.fontSize(10).fillColor('#333').font('Helvetica')
          .text(`${num}.  ${text}`, 75, doc.y, { width: 470 });
        doc.moveDown(0.1);
        i++;
        continue;
      }

      // Blockquote
      if (line.trim().startsWith('> ')) {
        const text = line.trim().replace(/^>\s*/, '');
        doc.save();
        doc.rect(60, doc.y, 3, 16).fillColor('#6366f1').fill();
        doc.fontSize(10).fillColor('#555').font('Helvetica-Oblique')
          .text(text, 72, doc.y, { width: 460 });
        doc.restore();
        doc.moveDown(0.3);
        i++;
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        doc.moveDown(0.5);
        doc.moveTo(60, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
        doc.moveDown(0.5);
        i++;
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        doc.moveDown(0.3);
        i++;
        continue;
      }

      // Regular paragraph
      const text = line
        .replace(/\*\*(.+?)\*\*/g, '$1')  // bold (PDFKit doesn't support inline bold easily)
        .replace(/\*(.+?)\*/g, '$1')       // italic
        .replace(/`([^`]+)`/g, '$1');       // inline code

      if (text.trim()) {
        doc.fontSize(10).fillColor('#333').font('Helvetica')
          .text(text, { width: 490 });
        doc.moveDown(0.15);
      }
      i++;
    }
  }

  _addFooter(doc) {
    const pageHeight = doc.page.height;
    doc.fontSize(8).fillColor('#bbb')
      .text(
        '1% Digital Solutions  ·  Premium Content  ·  Do not redistribute',
        60, pageHeight - 40,
        { align: 'center', width: 490 }
      );
  }

  /**
   * Build a certificate PDF with signature
   */
  async buildCertificatePdf(cert, course, signatureUrl) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
        info: {
          Title: `Certificate - ${cert.certificate_number}`,
          Author: '1% Digital Solutions',
          Subject: 'Course Completion Certificate'
        }
      });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const width = doc.page.width;
      const height = doc.page.height;

      // Outer border
      doc.rect(30, 30, width - 60, height - 60)
        .lineWidth(2)
        .strokeColor('#1a1a2e')
        .stroke();

      // Inner border
      doc.rect(40, 40, width - 80, height - 80)
        .lineWidth(1)
        .strokeColor('#6366f1')
        .stroke();

      // Corner accents
      const cornerSize = 20;
      [[50, 50], [width - 50 - cornerSize, 50], [50, height - 50 - cornerSize], [width - 50 - cornerSize, height - 50 - cornerSize]].forEach(([x, y]) => {
        doc.rect(x, y, cornerSize, cornerSize)
          .fillColor('#6366f1')
          .fill();
      });

      // Header: Company name
      doc.fontSize(12)
        .fillColor('#6366f1')
        .font('Helvetica-Bold')
        .text('1% DIGITAL SOLUTIONS', 0, 70, { align: 'center', width });

      doc.fontSize(10)
        .fillColor('#888')
        .font('Helvetica')
        .text('Kigali, Rwanda', 0, 88, { align: 'center', width });

      // Certificate of Completion title
      doc.moveDown(1.5);
      doc.fontSize(36)
        .fillColor('#1a1a2e')
        .font('Helvetica-Bold')
        .text('Certificate of Completion', 0, doc.y, { align: 'center', width });

      // Decorative line
      doc.moveDown(0.5);
      const lineY = doc.y;
      doc.moveTo(width / 2 - 100, lineY)
        .lineTo(width / 2 + 100, lineY)
        .lineWidth(2)
        .strokeColor('#6366f1')
        .stroke();

      // Awarded to
      doc.moveDown(1);
      doc.fontSize(12)
        .fillColor('#888')
        .font('Helvetica')
        .text('This is to certify that', 0, doc.y, { align: 'center', width });

      // Student name
      doc.moveDown(0.3);
      doc.fontSize(28)
        .fillColor('#1a1a2e')
        .font('Helvetica-Bold')
        .text(cert.learner_name || 'Student', 0, doc.y, { align: 'center', width });

      // Decorative underline
      const nameY = doc.y + 2;
      doc.moveTo(width / 2 - 120, nameY)
        .lineTo(width / 2 + 120, nameY)
        .lineWidth(1)
        .strokeColor('#ddd')
        .stroke();

      // Has successfully completed
      doc.moveDown(0.8);
      doc.fontSize(12)
        .fillColor('#888')
        .font('Helvetica')
        .text('has successfully completed the course', 0, doc.y, { align: 'center', width });

      // Course title
      doc.moveDown(0.3);
      doc.fontSize(20)
        .fillColor('#6366f1')
        .font('Helvetica-Bold')
        .text(cert.course_title || course?.title || 'Course', 0, doc.y, { align: 'center', width });

      // Course details
      doc.moveDown(0.4);
      doc.fontSize(10)
        .fillColor('#888')
        .font('Helvetica')
        .text(
          `Level: ${cert.course_level || 'Beginner'}  |  Duration: ${cert.duration_weeks || 0} weeks  |  ${cert.completed_at ? new Date(cert.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}`,
          0, doc.y, { align: 'center', width }
        );

      // Signature and certificate number section
      const bottomY = height - 120;

      // Left side: date
      doc.fontSize(9)
        .fillColor('#888')
        .font('Helvetica')
        .text('Date Issued', 80, bottomY, { align: 'center', width: 180 });
      doc.fontSize(10)
        .fillColor('#333')
        .font('Helvetica-Bold')
        .text(cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '', 80, bottomY + 14, { align: 'center', width: 180 });

      // Center: certificate number
      doc.fontSize(9)
        .fillColor('#888')
        .font('Helvetica')
        .text('Certificate Number', 0, bottomY, { align: 'center', width: 200, offset: (width - 200) / 2 });
      doc.fontSize(10)
        .fillColor('#333')
        .font('Courier-Bold')
        .text(cert.certificate_number, 0, bottomY + 14, { align: 'center', width: 200, offset: (width - 200) / 2 });

      // Right side: signature
      if (signatureUrl && signatureUrl.startsWith('data:image')) {
        try {
          const base64Data = signatureUrl.replace(/^data:image\/\w+;base64,/, '');
          const sigBuffer = Buffer.from(base64Data, 'base64');
          doc.image(sigBuffer, width - 260, bottomY - 10, { width: 120, height: 40 });
        } catch (e) {
          // Fallback: draw line for signature
          doc.moveTo(width - 260, bottomY + 10)
            .lineTo(width - 140, bottomY + 10)
            .lineWidth(1)
            .strokeColor('#ccc')
            .stroke();
        }
      } else {
        // No signature — draw placeholder line
        doc.moveTo(width - 260, bottomY + 10)
          .lineTo(width - 140, bottomY + 10)
          .lineWidth(1)
          .strokeColor('#ccc')
          .stroke();
      }

      doc.fontSize(9)
        .fillColor('#888')
        .font('Helvetica')
        .text('Authorized Signature', width - 260, bottomY + 30, { width: 120, align: 'center' });

      // Footer
      doc.fontSize(7)
        .fillColor('#bbb')
        .font('Helvetica')
        .text('Verify at: 1percentrwanda.com/learn  |  1% Digital Solutions  |  Kigali, Rwanda', 0, height - 45, { align: 'center', width });

      doc.end();
    });
  }
}

module.exports = new PdfService();
