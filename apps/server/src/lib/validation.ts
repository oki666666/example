import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "doing", "done"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "タイトルは必須です").max(120, "タイトルは120文字以内です"),
  description: z.string().trim().max(500, "説明は500文字以内です").optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime().optional().nullable()
});

export const taskUpdateSchema = taskCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "更新項目が必要です");

export const taskListFilterSchema = z.object({
  status: z.enum(["all", "todo", "doing", "done", "overdue"]).optional().default("all")
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskListFilterInput = z.infer<typeof taskListFilterSchema>;
