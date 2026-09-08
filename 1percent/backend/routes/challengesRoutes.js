/* ============================================================
   Challenges Routes
   ============================================================
   GET  /api/challenges          — List active challenges (auth)
   POST /api/challenges/:id/submit — Submit solution (auth)
   ============================================================ */

const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const controller = require('../controllers/challengesController');

const router = Router();

router.get('/', authenticate, (req, res, next) => controller.list(req, res, next));
router.post('/:id/submit', authenticate, (req, res, next) => controller.submit(req, res, next));

module.exports = router;
