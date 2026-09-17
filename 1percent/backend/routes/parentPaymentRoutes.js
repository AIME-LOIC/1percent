/**
 * routes/parentPaymentRoutes.js
 *
 * PURPOSE:
 *   Parent payment routes: create link (student), public token view, payment webhook.
 *
 * ENDPOINTS:
 *   POST /create
 *   GET /my
 *   DELETE /:id/cancel
 *   GET /:token
 *   POST /:token/pay
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const parentPaymentController = require('../controllers/parentPaymentController');
const { authenticate } = require('../middlewares/auth');
const { authRateLimit } = require('../middlewares/rateLimit');

const router = Router();

// Authenticated routes (student)
router.post('/create', authenticate, (req, res, next) => parentPaymentController.createRequest(req, res, next));
router.get('/my', authenticate, (req, res, next) => parentPaymentController.getMyRequests(req, res, next));
router.delete('/:id/cancel', authenticate, (req, res, next) => parentPaymentController.cancelRequest(req, res, next));

// Public routes (parent payment page) — rate limited so the 128-bit
// token can't be probed at speed and the pay endpoint can't be spammed.
router.get('/:token', authRateLimit, (req, res, next) => parentPaymentController.getByToken(req, res, next));
router.post('/:token/pay', authRateLimit, (req, res, next) => parentPaymentController.processPayment(req, res, next));

module.exports = router;
