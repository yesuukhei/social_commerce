const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

/**
 * GET /api/webhook
 * Webhook verification endpoint
 * Facebook will call this to verify your webhook URL
 */
router.get('/', webhookController.verifyWebhook);

/**
 * POST /api/webhook
 * Webhook event handler
 * Facebook will send messages and events to this endpoint
 */
router.post('/', webhookController.handleWebhook);

module.exports = router;
