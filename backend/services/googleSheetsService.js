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
   * Initialize the Google Spreadsheet connection
   * @param {string} sheetId - Optional specific sheet ID to load
   */
  async init(sheetId = null) {
    try {
      const spreadsheetId = sheetId || process.env.GOOGLE_SHEET_ID;

      // If already initialized with this sheet, skip
      if (this.initialized && this.doc?.spreadsheetId === spreadsheetId) return;

      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

      if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
        console.warn("⚠️ Google Sheets credentials missing");
        return;
      }

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
      if (error.response) {
        console.error("API Error Data:", error.response.data);
      }
    }
  }
}

module.exports = new GoogleSheetsService();
