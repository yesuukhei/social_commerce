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
   */
  async init() {
    try {
      if (this.initialized) return;

      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
        console.warn("⚠️ Google Sheets credentials missing in .env");
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
   */
  async appendOrder(order) {
    try {
      await this.init();
      if (!this.initialized) return;

      const sheet = this.doc.sheetsByIndex[0]; // Assumes first sheet

      // Create row data
      const rowData = {
        Огноо: new Date(order.createdAt).toLocaleString("mn-MN"),
        "Захиалгын ID": order._id.toString(),
        Үйлчлүүлэгч: order.customer?.name || "Unknown",
        Утас: order.phoneNumber,
        Хаяг: order.address,
        Бараа: order.items
          .map((item) => `${item.itemName} (${item.quantity})`)
          .join(", "),
        "Нийт дүн": order.totalAmount || 0,
        Төлөв: order.status,
        "AI Confidence": order.aiExtraction?.confidence || 0,
        Notes: order.notes || "",
      };

      await sheet.addRow(rowData);
      console.log(`📊 Order ${order._id} synced to Google Sheets`);
    } catch (error) {
      console.error("❌ Error syncing to Google Sheets:", error.message);
    }
  }
}

module.exports = new GoogleSheetsService();
