import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import router from "./routes";
import { logger } from "./lib/logger";

// pino-http has a CJS/ESM dual-package that trips some TS checkers (TS2349).
// We resolve the callable safely and cast to RequestHandler to satisfy Express.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const pinoHttpFn = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const raw = require("pino-http") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (typeof raw === "function" ? raw : raw.default) as (opts: any) => RequestHandler;
})();

const app: Express = express();

app.use(
  pinoHttpFn({
    logger,
    serializers: {
      req(req: { id: unknown; method: string; url?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: { statusCode: number }) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
export { app };
