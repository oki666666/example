import { useCallback, useEffect, useMemo, useState } from "react";
import { tasksApi } from "./api/tasks";
import { KpiCards } from "./components/KpiCards";
import { TaskFilters } from "./components/TaskFilters";
import { TaskForm } from "./components/TaskForm";
import { TaskList } from "./components/TaskList";
import type { Task, TaskCreateInput, TaskFilter, TaskStatus, TaskUpdateInput } from "./types/task";

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (nextFilter: TaskFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.list(nextFilter);
      setTasks(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "タスク取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks(filter);
  }, [fetchTasks, filter]);

  const handleCreate = async (input: TaskCreateInput) => {
    setSaving(true);
    setError(null);
    try {
      await tasksApi.create(input);
      await fetchTasks(filter);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tasksApi.remove(id);
      await fetchTasks(filter);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "削除に失敗しました");
    }
  };

  const handleStatus = async (id: string, status: TaskStatus) => {
    try {
      await tasksApi.update(id, { status });
      await fetchTasks(filter);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "状態更新に失敗しました");
    }
  };

  const handleUpdate = async (id: string, input: TaskUpdateInput) => {
    try {
      await tasksApi.update(id, input);
      await fetchTasks(filter);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新に失敗しました");
    }
  };

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      }),
    [tasks]
  );

  return (
    <main className="app-shell">
      <header className="header">
        <h1>FocusBoard</h1>
        <p>締切リスクを可視化して、先送りを減らす個人向けタスク管理アプリ</p>
      </header>

      <KpiCards tasks={tasks} />
      <TaskForm onSubmit={handleCreate} busy={saving} />

      <TaskFilters value={filter} onChange={setFilter} />

      {error ? <p className="error-banner">{error}</p> : null}

      <TaskList
        tasks={sortedTasks}
        loading={loading}
        onDelete={handleDelete}
        onStatusChange={handleStatus}
        onUpdate={handleUpdate}
      />
    </main>
  );
}
