import { type Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  taskCreateSchema,
  taskListFilterSchema,
  taskUpdateSchema
} from "../lib/validation.js";

export const tasksRouter = Router();

tasksRouter.get("/", async (req, res) => {
  try {
    const filter = taskListFilterSchema.parse(req.query);
    const now = new Date();
    const where: Prisma.TaskWhereInput = {};

    if (filter.status === "todo" || filter.status === "doing" || filter.status === "done") {
      where.status = filter.status;
    }
    if (filter.status === "overdue") {
      where.status = { not: "done" };
      where.dueDate = { lt: now };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ createdAt: "desc" }]
    });

    res.json({ data: tasks });
  } catch (error) {
    handleRouteError(error, res);
  }
});

tasksRouter.get("/:id", async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id }
  });

  if (!task) {
    res.status(404).json({
      error: {
        code: "TASK_NOT_FOUND",
        message: "タスクが見つかりません"
      }
    });
    return;
  }

  res.json({ data: task });
});

tasksRouter.post("/", async (req, res) => {
  try {
    const payload = taskCreateSchema.parse(req.body);
    const task = await prisma.task.create({
      data: {
        title: payload.title,
        description: payload.description ?? null,
        status: payload.status ?? "todo",
        priority: payload.priority ?? "medium",
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null
      }
    });

    res.status(201).json({ data: task });
  } catch (error) {
    handleRouteError(error, res);
  }
});

tasksRouter.patch("/:id", async (req, res) => {
  try {
    const payload = taskUpdateSchema.parse(req.body);
    const existingTask = await prisma.task.findUnique({
      where: { id: req.params.id }
    });

    if (!existingTask) {
      res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: "タスクが見つかりません"
        }
      });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description ?? null } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
        ...(payload.dueDate !== undefined
          ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null }
          : {})
      }
    });

    res.json({ data: task });
  } catch (error) {
    handleRouteError(error, res);
  }
});

tasksRouter.delete("/:id", async (req, res) => {
  const existingTask = await prisma.task.findUnique({
    where: { id: req.params.id }
  });

  if (!existingTask) {
    res.status(404).json({
      error: {
        code: "TASK_NOT_FOUND",
        message: "タスクが見つかりません"
      }
    });
    return;
  }

  await prisma.task.delete({
    where: { id: req.params.id }
  });

  res.json({
    data: {
      id: req.params.id,
      deleted: true
    }
  });
});

function handleRouteError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "入力値が不正です",
        details: error.flatten()
      }
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "予期しないエラーが発生しました"
    }
  });
}
