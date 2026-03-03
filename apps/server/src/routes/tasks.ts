import { type Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  bulkTaskActionSchema,
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
    const includeArchived = filter.includeArchived === "true" || filter.includeArchived === true;

    if (filter.status === "todo" || filter.status === "doing" || filter.status === "done") {
      where.status = filter.status;
    }
    if (filter.status === "overdue") {
      where.status = { not: "done" };
      where.dueDate = { lt: now };
    }
    if (!includeArchived) {
      where.archivedAt = null;
    }
    if (filter.query) {
      where.OR = [
        { title: { contains: filter.query } },
        { description: { contains: filter.query } }
      ];
    }

    const orderBy = (() => {
      if (filter.sort === "dueDateAsc") {
        return [{ createdAt: "desc" as const }];
      }
      if (filter.sort === "priorityDesc") {
        return [{ createdAt: "desc" as const }];
      }
      return [{ createdAt: "desc" as const }];
    })();

    const tasks = await prisma.task.findMany({
      where,
      orderBy
    });
    const finalTasks = [...tasks];
    if (filter.sort === "priorityDesc") {
      finalTasks.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
    }
    if (filter.sort === "dueDateAsc") {
      finalTasks.sort((a, b) => {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    }

    res.json({
      data: finalTasks,
      meta: {
        total: finalTasks.length
      }
    });
  } catch (error) {
    handleRouteError(error, res);
  }
});

tasksRouter.patch("/bulk", async (req, res) => {
  try {
    const payload = bulkTaskActionSchema.parse(req.body);
    if (payload.action === "markDone") {
      const result = await prisma.task.updateMany({
        where: {
          id: { in: payload.ids },
          archivedAt: null
        },
        data: {
          status: "done"
        }
      });
      res.json({ data: { updatedCount: result.count } });
      return;
    }

    const result = await prisma.task.updateMany({
      where: {
        id: { in: payload.ids },
        archivedAt: null
      },
      data: {
        archivedAt: new Date()
      }
    });
    res.json({ data: { updatedCount: result.count } });
  } catch (error) {
    handleRouteError(error, res);
  }
});

tasksRouter.get("/export", async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ createdAt: "desc" }]
    });
    res.json({
      data: {
        exportedAt: new Date().toISOString(),
        total: tasks.length,
        tasks
      }
    });
  } catch (error) {
    handleRouteError(error, res);
  }
});

tasksRouter.post("/:id/restore", async (req, res) => {
  try {
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
        archivedAt: null
      }
    });
    res.json({ data: task });
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
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        archivedAt: null
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
          : {}),
        archivedAt: null
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

  const archivedTask = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      archivedAt: new Date()
    }
  });

  res.json({
    data: {
      id: req.params.id,
      deleted: true,
      task: archivedTask
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

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1
} as const;
