import { Router, type IRouter } from "express";
import healthRouter from "./health";
import otpRouter from "./otp";
import gatewayRouter from "./gateway";

const router: IRouter = Router();

router.use(healthRouter);
router.use(otpRouter);
router.use(gatewayRouter);

export default router;
