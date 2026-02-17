const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// All routes here are prefixed with /api/orders in server.js

router.get("/", orderController.getAllOrders);
router.get("/:id", orderController.getOrderById);
router.patch("/:id/status", orderController.updateOrderStatus);
router.patch("/:id/verify", orderController.verifyOrder);
router.delete("/:id", orderController.deleteOrder);

module.exports = router;
