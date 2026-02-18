const express = require("express");
const router = express.Router();
const syncController = require("../controllers/syncController");

/**
 * POST /api/sync/products
 * Manually trigger product synchronization from Google Sheets
 */
router.post("/products", syncController.syncProducts);

module.exports = router;
