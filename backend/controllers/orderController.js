const Order = require("../models/Order");
const Customer = require("../models/Customer");

/**
 * Get all orders
 * GET /api/orders
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, customerId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (customerId) query.customer = customerId;

    const orders = await Order.find(query)
      .populate("customer", "name facebookId")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalOrders: count,
    });
  } catch (error) {
    console.log("Error in getAllOrders:", error);
    next(error);
  }
};

/**
 * Get single order by ID
 * GET /api/orders/:id
 */
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer")
      .populate("conversation");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.log("Error in getOrderById:", error);
    next(error);
  }
};

/**
 * Update order status
 * PATCH /api/orders/:id/status
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.log("Error in updateOrderStatus:", error);
    next(error);
  }
};

/**
 * Verify/Review order (Update data and status)
 * PATCH /api/orders/:id/verify
 */
exports.verifyOrder = async (req, res, next) => {
  try {
    const { items, phoneNumber, address, status, notes } = req.body;

    const updateData = {
      verifiedAt: new Date(),
      "aiExtraction.needsReview": false,
    };

    if (items) updateData.items = items;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (address) updateData.address = address;
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.log("Error in verifyOrder:", error);
    next(error);
  }
};

/**
 * Delete order
 * DELETE /api/orders/:id
 */
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.log("Error in deleteOrder:", error);
    next(error);
  }
};
