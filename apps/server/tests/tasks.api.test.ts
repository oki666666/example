import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { createApp } from "../src/app.js";

const app = createApp();

describe("Tasks API", () => {
  beforeEach(async () => {
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("タスクを作成して取得できる", async () => {
    const createResponse = await request(app).post("/tasks").send({
      title: "レポート作成",
      priority: "high"
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.title).toBe("レポート作成");

    const listResponse = await request(app).get("/tasks");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
  });

  it("バリデーションエラーを返す", async () => {
    const response = await request(app).post("/tasks").send({
      title: ""
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("タスクを更新できる", async () => {
    const createResponse = await request(app).post("/tasks").send({
      title: "仕様確認"
    });

    const id = createResponse.body.data.id;
    const updateResponse = await request(app).patch(`/tasks/${id}`).send({
      status: "doing",
      priority: "high"
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.status).toBe("doing");
    expect(updateResponse.body.data.priority).toBe("high");
  });

  it("期限切れフィルタが機能する", async () => {
    await request(app).post("/tasks").send({
      title: "昨日までのタスク",
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    });
    await request(app).post("/tasks").send({
      title: "明日のタスク",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
    });

    const response = await request(app).get("/tasks").query({ status: "overdue" });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe("昨日までのタスク");
  });
});
