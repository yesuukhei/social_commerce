const googleSheetsService = require("../services/googleSheetsService");
const { Store } = require("../models");

/**
 * Configure Google Sheet for a store
 * POST /api/stores/:id/configure-sheet
 */
exports.configureSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { sheetUrl } = req.body;

    if (!sheetUrl) {
      return res
        .status(400)
        .json({ success: false, message: "URL шаардлагатай" });
    }

    // 1. Extract and Verify
    const sheetId = googleSheetsService.extractSheetId(sheetUrl);
    console.log(`🔍 Verifying access for Sheet ID: ${sheetId}`);

    const verification = await googleSheetsService.verifySheetAccess(sheetId);

    if (!verification.success) {
      return res.status(400).json(verification);
    }

    // 2. Update Store
    const store = await Store.findByIdAndUpdate(
      id,
      { googleSheetId: sheetId },
      { new: true },
    );

    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Дэлгүүр олдсонгүй" });
    }

    // 3. Initial Sync (Optional but recommended for UX)
    console.log(
      `✅ Sheet configured for ${store.name}. Triggering initial sync...`,
    );
    googleSheetsService
      .syncProductsFromSheet(store._id, sheetId)
      .catch((err) => {
        console.error("Initial sync failed:", err.message);
      });

    return res.status(200).json({
      success: true,
      message: "Google Sheet амжилттай холбогдлоо",
      data: {
        storeName: store.name,
        sheetTitle: verification.title,
        sheetId: sheetId,
      },
    });
  } catch (error) {
    console.error("❌ Configure Sheet Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
