/**
 * middlewares/paymentsDisabled.js
 *
 * PURPOSE:
 *   Hard kill-switch for every endpoint that can grant a premium entitlement
 *   (subscribe, resume, free-trial, parent momo payment). No payment gateway is
 *   integrated yet, so nobody may obtain premium. Remove these middlewares from
 *   the routes when a real gateway (Stripe/Paystack/momo…) is wired in.
 *
 * USAGE:
 *   router.post('/subscribe', paymentsDisabled, …)
 */

const GATEWAY_NOTICE =
  'Payment gateway not added yet. Premium cannot be purchased at this time — please contact the authority.';

function paymentsDisabled(req, res, next) {
  if (res.headersSent) return next();
  return res.status(503).json({
    error: GATEWAY_NOTICE,
    code: 'PAYMENTS_DISABLED'
  });
}

module.exports = { paymentsDisabled, GATEWAY_NOTICE };
