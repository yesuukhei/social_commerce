const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");

/**
 * GET /api/stats
 * Get dashboard statistics
 */
router.get("/", statsController.getStats);

module.exports = router;
