/* ============================================================
   Parent Payment Routes
   ============================================================
   /api/parent-payments/*
   ============================================================ */

const { Router } = require('express');
const parentPaymentController = require('../controllers/parentPaymentController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Authenticated routes (student)
router.post('/create', authenticate, (req, res, next) => parentPaymentController.createRequest(req, res, next));
router.get('/my', authenticate, (req, res, next) => parentPaymentController.getMyRequests(req, res, next));
router.delete('/:id/cancel', authenticate, (req, res, next) => parentPaymentController.cancelRequest(req, res, next));

// Public routes (parent payment page)
router.get('/:token', (req, res, next) => parentPaymentController.getByToken(req, res, next));
router.post('/:token/pay', (req, res, next) => parentPaymentController.processPayment(req, res, next));

module.exports = router;
