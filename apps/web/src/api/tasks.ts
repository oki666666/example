import type { Task, TaskCreateInput, TaskFilter, TaskUpdateInput } from "../types/task";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

interface ApiSuccess<T> {
  data: T;
}

interface ApiErrorShape {
  error?: {
    code?: string;
    message?: string;
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    let message = "リクエストに失敗しました";
    try {
      const payload = (await response.json()) as ApiErrorShape;
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // noop
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as ApiSuccess<T>;
  return payload.data;
}

export const tasksApi = {
  list(filter: TaskFilter = "all") {
    const params = new URLSearchParams();
    if (filter !== "all") {
      params.set("status", filter);
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<Task[]>(`/tasks${suffix}`);
  },
  create(input: TaskCreateInput) {
    return request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  update(id: string, input: TaskUpdateInput) {
    return request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  remove(id: string) {
    return request<{ id: string; deleted: boolean }>(`/tasks/${id}`, {
      method: "DELETE"
    });
  }
};
