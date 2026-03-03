import type { Task, TaskCreateInput, TaskFilter, TaskSort, TaskUpdateInput } from "../types/task";

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

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number
  ) {
    super(message);
  }
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
    let code: string | undefined;
    try {
      const payload = (await response.json()) as ApiErrorShape;
      if (payload.error?.message) {
        message = payload.error.message;
      }
      code = payload.error?.code;
    } catch {
      // noop
    }
    throw new ApiClientError(message, code, response.status);
  }

  const payload = (await response.json()) as ApiSuccess<T>;
  return payload.data;
}

export const tasksApi = {
  list(options?: { filter?: TaskFilter; query?: string; sort?: TaskSort; includeArchived?: boolean }) {
    const params = new URLSearchParams();
    const filter = options?.filter ?? "all";
    if (filter !== "all") {
      params.set("status", filter);
    }
    if (options?.query) {
      params.set("query", options.query);
    }
    if (options?.sort) {
      params.set("sort", options.sort);
    }
    if (options?.includeArchived) {
      params.set("includeArchived", "true");
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
    return request<{ id: string; deleted: boolean; task: Task }>(`/tasks/${id}`, {
      method: "DELETE"
    });
  },
  bulk(input: { action: "markDone" | "archive"; ids: string[] }) {
    return request<{ updatedCount: number }>("/tasks/bulk", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  restore(id: string) {
    return request<Task>(`/tasks/${id}/restore`, {
      method: "POST"
    });
  },
  exportJson() {
    return request<{ exportedAt: string; total: number; tasks: Task[] }>("/tasks/export");
  }
};
