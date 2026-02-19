const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");

/**
 * POST /api/stores/:id/configure-sheet
 * Set Google Sheet URL for a specific store
 */
router.post("/:id/configure-sheet", storeController.configureSheet);

module.exports = router;
