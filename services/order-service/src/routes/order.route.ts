import { Router } from "express";
import { placeOrder, vendorAction, assignCourier, markOrderDelivered } from "../controllers/order.controller";

const router = Router();

router.post("/", placeOrder);
router.put("/:id/vendor-action", vendorAction);
router.put("/:id/assign-courier", assignCourier);
router.put("/:id/deliver", markOrderDelivered);

export default router;