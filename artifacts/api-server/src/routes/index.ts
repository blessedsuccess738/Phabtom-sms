import { Router, type IRouter } from "express";
import healthRouter from "./health";
import otpRouter from "./otp";
import gatewayRouter from "./gateway";
import apiKeysRouter from "./apiKeys";

const router: IRouter = Router();

router.use(healthRouter);
router.use(otpRouter);
router.use(gatewayRouter);
router.use(apiKeysRouter);

export default router;
