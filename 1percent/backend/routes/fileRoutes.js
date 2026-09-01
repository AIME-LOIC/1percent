/* ============================================================
   File Routes — Lab File Storage
   ============================================================
   GET    /api/files         — Get all user files + usage
   GET    /api/files/usage   — Get usage/limits only
   GET    /api/files/:id     — Get a single file
   POST   /api/files         — Save a file
   PUT    /api/files/:id     — Update file content
   DELETE /api/files/:id     — Delete a file
   ============================================================ */

const { Router } = require('express');
const s3Service = require('../services/s3Service');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/files/usage
 * Get user's file usage and limits
 */
router.get('/usage', async (req, res) => {
  try {
    const usage = await s3Service.getUserUsage(req.user.id);
    res.json({ success: true, usage });
  } catch (err) {
    console.error('[FILES] Usage error:', err.message);
    res.status(500).json({ error: 'Failed to get usage.' });
  }
});

/**
 * GET /api/files
 * Get all user files
 */
router.get('/', async (req, res) => {
  try {
    const result = await s3Service.getUserFiles(req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[FILES] List error:', err.message);
    res.status(500).json({ error: 'Failed to load files.' });
  }
});

/**
 * GET /api/files/:id
 * Get a single file
 */
router.get('/:id', async (req, res) => {
  try {
    const file = await s3Service.getFile(req.user.id, req.params.id);
    res.json({ success: true, file });
  } catch (err) {
    console.error('[FILES] Get error:', err.message);
    res.status(404).json({ error: 'File not found.' });
  }
});

/**
 * POST /api/files
 * Save a new file
 */
router.post('/', async (req, res) => {
  try {
    const { file_name, content, language } = req.body;
    if (!file_name) return res.status(422).json({ error: 'file_name is required' });

    const result = await s3Service.saveFile(req.user.id, file_name, content || '', language);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[FILES] Save error:', err.message);
    if (err.message.includes('limit reached') || err.message.includes('too large')) {
      return res.status(403).json({ error: err.message, upgrade: true });
    }
    res.status(500).json({ error: 'Failed to save file.' });
  }
});

/**
 * PUT /api/files/:id
 * Update file content
 */
router.put('/:id', async (req, res) => {
  try {
    const { content } = req.body;
    const result = await s3Service.updateFile(req.user.id, req.params.id, content || '');
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[FILES] Update error:', err.message);
    res.status(500).json({ error: 'Failed to update file.' });
  }
});

/**
 * DELETE /api/files/:id
 * Delete a file
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await s3Service.deleteFile(req.user.id, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[FILES] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
});

module.exports = router;
