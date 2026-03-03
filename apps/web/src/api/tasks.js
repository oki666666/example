const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";
async function request(path, options) {
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
            const payload = (await response.json());
            if (payload.error?.message) {
                message = payload.error.message;
            }
        }
        catch {
            // noop
        }
        throw new Error(message);
    }
    const payload = (await response.json());
    return payload.data;
}
export const tasksApi = {
    list(filter = "all") {
        const params = new URLSearchParams();
        if (filter !== "all") {
            params.set("status", filter);
        }
        const suffix = params.toString() ? `?${params.toString()}` : "";
        return request(`/tasks${suffix}`);
    },
    create(input) {
        return request("/tasks", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    update(id, input) {
        return request(`/tasks/${id}`, {
            method: "PATCH",
            body: JSON.stringify(input)
        });
    },
    remove(id) {
        return request(`/tasks/${id}`, {
            method: "DELETE"
        });
    }
};
