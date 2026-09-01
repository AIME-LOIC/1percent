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

          // Split into chunks that fit on a page
          const lineHeight = 12;
          const padding = 12;
          const maxLinesPerPage = Math.floor((750 - doc.y - padding * 2) / lineHeight);
          const chunks = [];
          for (let c = 0; c < codeLines.length; c += maxLinesPerPage) {
            chunks.push(codeLines.slice(c, c + maxLinesPerPage));
          }

          chunks.forEach((chunk, chunkIdx) => {
            if (chunkIdx > 0) doc.addPage();
            const startY = doc.y;
            const codeHeight = chunk.length * lineHeight + padding * 2;

            // Code background
            doc.save();
            doc.roundedRect(50, startY, 510, codeHeight, 4)
              .fillColor('#f4f4f5').fill();

            // Left accent bar
            doc.rect(50, startY, 3, codeHeight)
              .fillColor('#6366f1').fill();

            // Code text
            doc.fontSize(9).fillColor('#333').font('Courier');
            chunk.forEach((codeLine, idx) => {
              const truncated = codeLine.length > 80 ? codeLine.slice(0, 77) + '...' : codeLine;
              doc.text(truncated || ' ', 64, startY + padding + (idx * lineHeight), {
                width: 490,
                lineBreak: false
              });
            });

            doc.y = startY + codeHeight + 6;
            doc.restore();
          });
          doc.moveDown(0.2);
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

        // Render table with borders
        const colWidth = Math.floor(490 / headers.length);
        const tableX = 60;
        const rowHeight = 18;

        // Header row background
        doc.save();
        doc.rect(tableX, doc.y - 2, 490, rowHeight + 4).fillColor('#f1f3f5').fill();
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
        let x = tableX;
        headers.forEach(h => {
          doc.text(h, x + 4, doc.y, { width: colWidth - 8, continued: false });
          x += colWidth;
        });
        doc.y += rowHeight;

        // Divider
        doc.moveTo(tableX, doc.y).lineTo(tableX + 490, doc.y).lineWidth(1).strokeColor('#dee2e6').stroke();
        doc.moveDown(0.2);

        // Data rows
        doc.font('Helvetica').fillColor('#444').fontSize(9);
        rows.forEach((row, ri) => {
          if (doc.y > 720) doc.addPage();
          // Zebra striping
          if (ri % 2 === 0) {
            doc.save();
            doc.rect(tableX, doc.y - 2, 490, rowHeight).fillColor('#f8f9fa').fill();
            doc.restore();
          }
          x = tableX;
          row.forEach(cell => {
            doc.text(cell, x + 4, doc.y, { width: colWidth - 8, continued: false });
            x += colWidth;
          });
          doc.y += rowHeight;
        });
        doc.moveDown(0.3);
        continue;
      }

      // List item
      if (line.trim().startsWith('- ')) {
        const text = line.trim().replace(/^-\s*/, '');
        doc.fontSize(10).fillColor('#333').font('Helvetica')
          .text(`\u2022  ${text}`, 75, doc.y, { width: 470 });
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
        doc.rect(60, doc.y, 3, 14).fillColor('#6366f1').fill();
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
        doc.moveTo(60, doc.y).lineTo(555, doc.y).strokeColor('#dee2e6').lineWidth(0.5).stroke();
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

      // Regular paragraph — render inline formatting
      // PDFKit doesn't support inline style changes easily, so we render
      // bold/italic text as normal but with emphasis via font choice where possible
      const text = line
        .replace(/`([^`]+)`/g, '$1')       // strip inline code backticks
        .replace(/\*\*([^*]+)\*\*/g, '$1') // strip bold markers
        .replace(/\*([^*]+)\*/g, '$1');     // strip italic markers

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
        margin: 0,
        info: {
          Title: `Certificate - ${cert.certificate_number}`,
          Author: '1% Digital Solutions',
          Subject: 'Course Completion Certificate'
        }
      });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const w = doc.page.width;
      const h = doc.page.height;

      // Subtle background gradient (top-left lighter)
      doc.rect(0, 0, w, h).fill('#fffef9');

      // ── Decorative Borders ──────────────────────────────
      // Outer border (dark green)
      doc.rect(24, 24, w - 48, h - 48)
        .lineWidth(3)
        .strokeColor('#0d6e3f')
        .stroke();

      // Inner border (lighter green)
      doc.rect(32, 32, w - 64, h - 64)
        .lineWidth(1)
        .strokeColor('rgba(13,110,63,0.3)')
        .stroke();

      // Gold accent lines (top and bottom)
      doc.moveTo(40, 40).lineTo(w - 40, 40)
        .lineWidth(2).strokeColor('#d4a843').stroke();
      doc.moveTo(40, h - 40).lineTo(w - 40, h - 40)
        .lineWidth(2).strokeColor('#d4a843').stroke();

      // Corner ornaments (L-shapes)
      const ornLen = 35;
      const ornW = 3;
      // Top-left
      doc.rect(30, 30, ornLen, ornW).fill('#0d6e3f');
      doc.rect(30, 30, ornW, ornLen).fill('#0d6e3f');
      // Top-right
      doc.rect(w - 30 - ornLen, 30, ornLen, ornW).fill('#0d6e3f');
      doc.rect(w - 30 - ornW, 30, ornW, ornLen).fill('#0d6e3f');
      // Bottom-left
      doc.rect(30, h - 30 - ornW, ornLen, ornW).fill('#0d6e3f');
      doc.rect(30, h - 30 - ornLen, ornW, ornLen).fill('#0d6e3f');
      // Bottom-right
      doc.rect(w - 30 - ornLen, h - 30 - ornW, ornLen, ornW).fill('#0d6e3f');
      doc.rect(w - 30 - ornW, h - 30 - ornLen, ornW, ornLen).fill('#0d6e3f');

      // ── Watermark ──────────────────────────────────────
      doc.save();
      doc.translate(w / 2, h / 2).rotate(-30);
      doc.fontSize(100).fillColor('rgba(13,110,63,0.025)').font('Helvetica-Bold')
        .text('1% DIGITAL', -200, -40, { width: 400, align: 'center' });
      doc.restore();

      // ── Header ─────────────────────────────────────────
      doc.fontSize(11).fillColor('#0d6e3f').font('Helvetica-Bold')
        .text('1% DIGITAL SOLUTIONS', 0, 60, { align: 'center', width: w });
      doc.fontSize(9).fillColor('#9ca3af').font('Helvetica')
        .text('Kigali, Rwanda', 0, 76, { align: 'center', width: w });

      // ── Certificate Title ──────────────────────────────
      doc.moveDown(2.0);
      doc.fontSize(34).fillColor('#1a1a2e').font('Helvetica-Bold')
        .text('Certificate of Completion', 0, doc.y, { align: 'center', width: w });

      // Decorative divider with diamond
      doc.moveDown(0.6);
      const divY = doc.y;
      const divW = 80;
      doc.moveTo(w / 2 - divW, divY).lineTo(w / 2 - 6, divY)
        .lineWidth(1).strokeColor('#0d6e3f').stroke();
      doc.moveTo(w / 2 + 6, divY).lineTo(w / 2 + divW, divY)
        .lineWidth(1).strokeColor('#0d6e3f').stroke();
      // Diamond
      doc.save();
      doc.translate(w / 2, divY).rotate(45);
      doc.rect(-4, -4, 8, 8).fill('#d4a843');
      doc.restore();

      // ── "This is to certify that" ──────────────────────
      doc.moveDown(1.0);
      doc.fontSize(11).fillColor('#9ca3af').font('Helvetica')
        .text('This is to certify that', 0, doc.y, { align: 'center', width: w, characterSpacing: 3 });

      // ── Student Name ──────────────────────────────────
      doc.moveDown(0.4);
      const nameFontSize = Math.min(30, Math.max(20, 300 / (cert.learner_name || 'Student').length));
      doc.fontSize(nameFontSize).fillColor('#1a1a2e').font('Helvetica-Bold')
        .text(cert.learner_name || 'Student', 0, doc.y, { align: 'center', width: w });

      // Name underline
      const nameLineY = doc.y + 3;
      doc.moveTo(w / 2 - 130, nameLineY).lineTo(w / 2 + 130, nameLineY)
        .lineWidth(1).strokeColor('#d1d5db').stroke();

      // ── Course completion text ─────────────────────────
      doc.moveDown(0.8);
      doc.fontSize(11).fillColor('#9ca3af').font('Helvetica')
        .text('has successfully completed the course', 0, doc.y, { align: 'center', width: w, characterSpacing: 0.5 });

      // ── Course Title ──────────────────────────────────
      doc.moveDown(0.3);
      const courseFontSize = Math.min(22, Math.max(16, 400 / (cert.course_title || course?.title || 'Course').length));
      doc.fontSize(courseFontSize).fillColor('#0d6e3f').font('Helvetica-Bold')
        .text(cert.course_title || course?.title || 'Course', 0, doc.y, { align: 'center', width: w });

      // ── Course Details ────────────────────────────────
      doc.moveDown(0.3);
      const dateStr = cert.completed_at
        ? new Date(cert.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : cert.issued_at
          ? new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : '';
      doc.fontSize(9).fillColor('#9ca3af').font('Helvetica')
        .text(
          `Level: ${cert.course_level || 'Beginner'}  |  Duration: ${cert.duration_weeks || 0} weeks${dateStr ? '  |  ' + dateStr : ''}`,
          0, doc.y, { align: 'center', width: w, characterSpacing: 0.5 }
        );

      // ── Verified Seal (bottom right area) ─────────────
      const sealX = w - 110;
      const sealY = h - 130;
      const sealR = 35;
      // Outer circle
      doc.circle(sealX, sealY, sealR)
        .lineWidth(2.5).strokeColor('#d4a843').stroke();
      // Inner circle
      doc.circle(sealX, sealY, sealR - 5)
        .lineWidth(1).strokeColor('rgba(212,168,67,0.4)').stroke();
      // "VERIFIED" text
      doc.fontSize(6).fillColor('#d4a843').font('Helvetica-Bold')
        .text('VERIFIED', sealX - 20, sealY - 14, { width: 40, align: 'center', characterSpacing: 2 });
      // Checkmark icon (simple circle with check)
      doc.fontSize(14).fillColor('#d4a843').font('Helvetica-Bold')
        .text('✓', sealX - 5, sealY - 4, { width: 10, align: 'center' });
      // "1% EXPERT" text
      doc.fontSize(5.5).fillColor('#d4a843').font('Helvetica-Bold')
        .text('1% EXPERT', sealX - 20, sealY + 8, { width: 40, align: 'center', characterSpacing: 2 });

      // ── Bottom Section ────────────────────────────────
      const bottomY = h - 80;
      const colW = 180;

      // Left: Date Issued
      doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
        .text('DATE ISSUED', 60, bottomY, { width: colW, align: 'center', characterSpacing: 1.5 });
      doc.fontSize(10).fillColor('#374151').font('Helvetica-Bold')
        .text(cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '', 60, bottomY + 12, { width: colW, align: 'center' });

      // Center: Certificate Number
      doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
        .text('CERTIFICATE NUMBER', w / 2 - colW / 2, bottomY, { width: colW, align: 'center', characterSpacing: 1.5 });
      doc.fontSize(10).fillColor('#374151').font('Courier-Bold')
        .text(cert.certificate_number, w / 2 - colW / 2, bottomY + 12, { width: colW, align: 'center' });

      // Right: Signature
      const sigX = w - 60 - colW;
      doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
        .text('AUTHORIZED SIGNATURE', sigX, bottomY, { width: colW, align: 'center', characterSpacing: 1.5 });

      // Signature image or placeholder line
      if (signatureUrl) {
        try {
          let sigBuffer = null;
          if (signatureUrl.startsWith('data:image')) {
            const base64Data = signatureUrl.replace(/^data:image\/\w+;base64,/, '');
            sigBuffer = Buffer.from(base64Data, 'base64');
          } else if (signatureUrl.startsWith('http')) {
            // Download remote signature image
            sigBuffer = await this._fetchImageBuffer(signatureUrl);
          }
          if (sigBuffer) {
            doc.image(sigBuffer, sigX + colW / 2 - 55, bottomY + 12, { width: 110, height: 30, fit: [110, 30] });
          } else {
            this._drawSigLine(doc, sigX, bottomY + 25, colW);
          }
        } catch (e) {
          console.warn('[PDF] Signature image failed, drawing line:', e.message);
          this._drawSigLine(doc, sigX, bottomY + 25, colW);
        }
      } else {
        this._drawSigLine(doc, sigX, bottomY + 25, colW);
      }

      // ── Footer ────────────────────────────────────────
      doc.fontSize(7).fillColor('#c4c8cf').font('Helvetica')
        .text('Verify at: 1percentrwanda.com/learn  |  1% Digital Solutions  |  Kigali, Rwanda', 0, h - 32, { align: 'center', width: w, characterSpacing: 1 });

      doc.end();
    });
  }

  /**
   * Draw a placeholder signature line
   */
  _drawSigLine(doc, x, y, width) {
    doc.moveTo(x + 10, y).lineTo(x + width - 10, y)
      .lineWidth(1).strokeColor('#374151').stroke();
  }

  /**
   * Fetch an image from a URL and return as Buffer
   */
  _fetchImageBuffer(url) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const http = require('http');
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this._fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
}

module.exports = new PdfService();
