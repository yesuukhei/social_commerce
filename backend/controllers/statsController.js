const { Order, Customer } = require("../models");

/**
 * Get store statistics
 * GET /api/stats
 */
exports.getStats = async (req, res) => {
  try {
    const { storeId } = req.query;

    // For MVP, if no storeId, use the first one
    let query = {};
    if (storeId) {
      query.store = storeId;
    }

    // 1. Total Sales & Order Count
    const orders = await Order.find(query);
    const totalSales = orders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );
    const orderCount = orders.length;

    // 2. AI Confidence Average
    const extractedOrders = orders.filter(
      (o) => o.aiExtraction && o.aiExtraction.confidence !== undefined,
    );
    const avgConfidence =
      extractedOrders.length > 0
        ? (extractedOrders.reduce(
            (sum, o) => sum + o.aiExtraction.confidence,
            0,
          ) /
            extractedOrders.length) *
          100
        : 0;

    // 3. New Customers (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomersCount = await Customer.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // 4. Recent Orders (for the dashboard table)
    const recentOrders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customer");

    return res.status(200).json({
      success: true,
      data: {
        stats: [
          {
            label: "Нийт борлуулалт",
            value: `₮${totalSales.toLocaleString()}`,
            icon: "payments",
            trend: 12.5,
          },
          {
            label: "Захиалгын тоо",
            value: orderCount.toString(),
            icon: "receipt_long",
            trend: 8.2,
          },
          {
            label: "AI Баталгаажуулт",
            value: `${avgConfidence.toFixed(0)}%`,
            icon: "smart_toy",
            trend: 2.1,
          },
          {
            label: "Шинэ хэрэглэгч",
            value: newCustomersCount.toString(),
            icon: "group",
            trend: 5.4,
          },
        ],
        recentOrders: recentOrders.map((o) => ({
          id: o._id.toString().substring(0, 8),
          customer: o.customer?.name || "Unknown",
          items: o.items.map((i) => i.itemName).join(", "),
          total: o.totalAmount.toLocaleString(),
          status:
            o.status === "pending"
              ? "Хүлээгдэж байна"
              : o.status === "confirmed"
                ? "Баталгаажсан"
                : o.status === "delivered"
                  ? "Хүргэгдсэн"
                  : o.status,
          statusStyle:
            o.status === "pending"
              ? "bg-amber-50 text-amber-600 border-amber-100"
              : o.status === "delivered"
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-slate-50 text-slate-600 border-slate-100",
        })),
      },
    });
  } catch (error) {
    console.error("❌ Stats Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
