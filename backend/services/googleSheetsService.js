const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

/**
 * Service to handle Google Sheets operations
 */
class GoogleSheetsService {
  constructor() {
    this.doc = null;
    this.initialized = false;
  }

  /**
   * Extract Spreadsheet ID from a full Google Sheets URL
   */
  extractSheetId(url) {
    if (!url) return null;
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return matches ? matches[1] : url;
  }

  /**
   * Verify if the service has access to the sheet and check its structure
   */
  async verifySheetAccess(sheetId) {
    try {
      await this.init(sheetId);
      if (!this.initialized) throw new Error("Could not initialize connection");

      const productsSheet =
        this.doc.sheetsByTitle["Products"] ||
        this.doc.sheetsByTitle["Бараа"] ||
        this.doc.sheetsByIndex[0];

      await productsSheet.loadHeaderRow();

      return {
        success: true,
        title: this.doc.title,
        sheetName: productsSheet.title,
        headers: productsSheet.headerValues,
        rowCount: productsSheet.rowCount,
      };
    } catch (error) {
      console.error("❌ Sheet Verification Failed:", error.message);
      return {
        success: false,
        message: error.message.includes("403")
          ? "Эрх чөлөөгүй (403). Манай и-мэйлд 'Editor' эрх өгнө үү."
          : "Spreadsheet олдсонгүй эсвэл ID буруу байна.",
      };
    }
  }

  /**
   * Initialize the Google Spreadsheet connection
   * @param {string} sheetId - Optional specific sheet ID to load
   */
  async init(sheetId = null) {
    try {
      const spreadsheetId = sheetId || process.env.GOOGLE_SHEET_ID;

      // If already initialized with this sheet, skip
      if (this.initialized && this.doc?.spreadsheetId === spreadsheetId) return;

      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      let privateKey = process.env.GOOGLE_PRIVATE_KEY;

      if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
        console.warn("⚠️ Google Sheets credentials missing");
        return;
      }

      // Handle both literal \n and escaped \\n, and remove extra quotes if any
      privateKey = privateKey
        .replace(/^"|"$/g, "") // Remove wrapping quotes
        .replace(/\\n/g, "\n") // Convert escaped newlines
        .trim();

      const auth = new JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      this.doc = new GoogleSpreadsheet(spreadsheetId, auth);
      await this.doc.loadInfo();

      console.log(`✅ Connected to Google Sheet: ${this.doc.title}`);
      this.initialized = true;
    } catch (error) {
      console.error("❌ Google Sheets Init Error:", error.message);
    }
  }

  /**
   * Append a new order row to the spreadsheet
   * @param {Object} order - The order document
   * @param {string} sheetId - Store-specific sheet ID
   */
  async appendOrder(order, sheetId = null) {
    try {
      await this.init(sheetId);
      if (!this.initialized) return;

      const sheet = this.doc.sheetsByIndex[0]; // Assumes first sheet

      // Load the header row to verify
      await sheet.loadHeaderRow();
      console.log("📊 Sheet Headers found:", sheet.headerValues);

      // Create row data - simplified keys to match exactly
      const rowData = {
        Огноо: order.createdAt,
        "Захиалгын ID": order._id.toString(),
        Үйлчлүүлэгч: order.customer?.name || "Unknown",
        Утас: order.phoneNumber || "",
        Хаяг: order.address || "",
        Бараа: order.items
          ? order.items
              .map((item) => `${item.itemName} (${item.quantity})`)
              .join(", ")
          : "",
        "Нийт дүн": order.totalAmount || 0,
        Төлөв: order.status || "pending",
        "AI Confidence": order.aiExtraction?.confidence || 0,
        Notes: order.notes || "",
      };

      console.log(
        "📝 Attempting to add row:",
        JSON.stringify(rowData, null, 2),
      );

      await sheet.addRow(rowData);
      console.log(`✅ Order ${order._id} synced to Google Sheets successfully`);
    } catch (error) {
      console.error("❌ Error syncing to Google Sheets:", error.message);
    }
  }

  /**
   * Fetch and sync products from a spreadsheet to the database
   * @param {string} storeId - The store ID to link products to
   * @param {string} sheetId - The spreadsheet ID
   * @returns {Object} Sync results (count, errors)
   */
  async syncProductsFromSheet(storeId, sheetId = null) {
    try {
      const Product = require("../models/Product"); // Local require to avoid circular dependencies if any
      await this.init(sheetId);
      if (!this.initialized) throw new Error("Google Sheets not initialized");

      let sheet =
        this.doc.sheetsByTitle["Products"] ||
        this.doc.sheetsByTitle["Бараа"] ||
        this.doc.sheetsByIndex[0];

      const rows = await sheet.getRows();
      console.log(`🔄 Syncing ${rows.length} rows from sheet: ${sheet.title}`);

      let successCount = 0;
      let errorCount = 0;

      // Make sure "AI Status" column exists by checking headers
      await sheet.loadHeaderRow();
      if (!sheet.headerValues.includes("AI Status")) {
        // We can't easily add columns via this lib without clear header management
        // but it will work if the user added it. For now, we just check.
        console.warn("⚠️ 'AI Status' column not found in sheet");
      }

      for (const row of rows) {
        try {
          const name = row.get("Нэр") || row.get("Name") || row.get("Product");
          if (!name || name.trim() === "") continue;

          let priceStr = String(row.get("Үнэ") || row.get("Price") || "0");
          let stockStr = String(row.get("Үлдэгдэл") || row.get("Stock") || "0");

          // 1. Robust Sanitization: Extract only digits (handles 50k, 10,000₮, etc.)
          const price = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
          const stock = parseInt(stockStr.replace(/[^0-9]/g, ""));

          const description =
            row.get("Тайлбар") || row.get("Description") || "";
          const category = row.get("Төрөл") || row.get("Category") || "";

          // 2. Upsert in Database (Sync-then-Serve)
          await Product.findOneAndUpdate(
            { store: storeId, name: name.trim() },
            {
              store: storeId,
              name: name.trim(),
              description,
              price: isNaN(price) ? 0 : price,
              stock: isNaN(stock) ? 0 : stock,
              category,
              isActive: true,
            },
            { upsert: true, new: true },
          );

          // 3. Status Feedback
          if (sheet.headerValues.includes("AI Status")) {
            row.set(
              "AI Status",
              `✅ Synced: ${new Date().toLocaleTimeString()}`,
            );
            await row.save();
          }

          successCount++;
        } catch (rowError) {
          console.error(`❌ Error syncing row: ${rowError.message}`);
          errorCount++;
        }
      }

      console.log(
        `✅ Sync Completed: ${successCount} success, ${errorCount} errors`,
      );
      return { successCount, errorCount };
    } catch (error) {
      console.error("❌ Product Sync Error:", error.message);
      throw error;
    }
  }

  /**
   * Update a specific product's stock in the Google Sheet (Two-Way Sync)
   * Called when an order is placed to keep Sheets updated
   */
  async updateProductStock(sheetId, productName, newStock) {
    try {
      await this.init(sheetId);
      if (!this.initialized) return;

      let sheet =
        this.doc.sheetsByTitle["Products"] ||
        this.doc.sheetsByTitle["Бараа"] ||
        this.doc.sheetsByIndex[0];

      const rows = await sheet.getRows();
      const row = rows.find(
        (r) => (r.get("Нэр") || r.get("Name")) === productName,
      );

      if (row) {
        const stockKey =
          row.get("Үлдэгдэл") !== undefined ? "Үлдэгдэл" : "Stock";
        row.set(stockKey, newStock);
        row.set("AI Status", `📦 Order: ${new Date().toLocaleTimeString()}`);
        await row.save();
        console.log(
          `✅ Sheets stock updated for: ${productName} -> ${newStock}`,
        );
      }
    } catch (error) {
      console.error("❌ Error updating Sheets stock:", error.message);
    }
  }

  /**
   * Legacy method - kept for backward compatibility but enhanced
   */
  async getProductsFromSheet(sheetId) {
    try {
      await this.init(sheetId);
      if (!this.initialized) return [];

      let sheet =
        this.doc.sheetsByTitle["Products"] ||
        this.doc.sheetsByTitle["Бараа"] ||
        this.doc.sheetsByIndex[0];

      const rows = await sheet.getRows();

      return rows
        .map((row) => ({
          name: row.get("Нэр") || row.get("Name"),
          price: parseFloat(row.get("Үнэ") || row.get("Price") || 0),
          stock: parseInt(row.get("Үлдэгдэл") || row.get("Stock") || 0),
          category: row.get("Төрөл") || row.get("Category"),
          description: row.get("Тайлбар") || row.get("Description"),
          isActive: true,
        }))
        .filter((p) => p.name);
    } catch (error) {
      console.error("❌ Error fetching products from Sheets:", error.message);
      return [];
    }
  }
}

module.exports = new GoogleSheetsService();
