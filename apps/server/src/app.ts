import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.js";
import { tasksRouter } from "./routes/tasks.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      data: {
        name: "FocusBoard API",
        version: "1.0.0"
      }
    });
  });

  app.use("/health", healthRouter);
  app.use("/tasks", tasksRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "予期しないエラーが発生しました"
      }
    });
  });

  return app;
}
