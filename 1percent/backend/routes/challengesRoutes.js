/**
 * routes/challengesRoutes.js
 *
 * PURPOSE:
 *   Challenge routes: catalog + submit (behind submitLimiter, payload capped).
 *
 * ENDPOINTS:
 *   GET /
 *   POST /:id/submit
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const controller = require('../controllers/challengesController');

const router = Router();

router.get('/', authenticate, (req, res, next) => controller.list(req, res, next));
router.post('/:id/submit', authenticate, (req, res, next) => controller.submit(req, res, next));

module.exports = router;
