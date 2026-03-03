import { useCallback, useEffect, useMemo, useState } from "react";
import { tasksApi } from "./api/tasks";
import { KpiCards } from "./components/KpiCards";
import { TaskFilters } from "./components/TaskFilters";
import { TaskForm } from "./components/TaskForm";
import { TaskList } from "./components/TaskList";
import type { Task, TaskCreateInput, TaskFilter, TaskSort, TaskStatus, TaskUpdateInput } from "./types/task";

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [sort, setSort] = useState<TaskSort>("createdAtDesc");
  const [query, setQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.list({
        filter,
        query: query || undefined,
        sort,
        includeArchived
      });
      setTasks(data);
      setSelectedIds((prev) => prev.filter((id) => data.some((task) => task.id === id)));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "タスク取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [filter, includeArchived, query, sort]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const handleCreate = async (input: TaskCreateInput) => {
    setSaving(true);
    setError(null);
    try {
      await tasksApi.create(input);
      await fetchTasks();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tasksApi.remove(id);
      await fetchTasks();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "削除に失敗しました");
    }
  };

  const handleStatus = async (id: string, status: TaskStatus) => {
    try {
      await tasksApi.update(id, { status });
      await fetchTasks();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "状態更新に失敗しました");
    }
  };

  const handleUpdate = async (id: string, input: TaskUpdateInput) => {
    try {
      await tasksApi.update(id, input);
      await fetchTasks();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新に失敗しました");
    }
  };

  const handleBulkMarkDone = async () => {
    if (selectedIds.length === 0) return;
    try {
      await tasksApi.bulk({ action: "markDone", ids: selectedIds });
      await fetchTasks();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "一括完了に失敗しました");
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    try {
      await tasksApi.bulk({ action: "archive", ids: selectedIds });
      setSelectedIds([]);
      await fetchTasks();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "一括アーカイブに失敗しました");
    }
  };

  const canBulkAction = selectedIds.length > 0;

  const visibleTasks = useMemo(() => tasks, [tasks]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <main className="app-shell">
      <header className="header">
        <h1>FocusBoard</h1>
        <p>締切リスクを可視化して、先送りを減らす個人向けタスク管理アプリ</p>
      </header>

      <KpiCards tasks={tasks} />
      <TaskForm onSubmit={handleCreate} busy={saving} />

      <TaskFilters value={filter} onChange={setFilter} />
      <section className="card control-panel">
        <label>
          検索
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="タイトル/メモで検索"
          />
        </label>
        <label>
          並び順
          <select value={sort} onChange={(event) => setSort(event.target.value as TaskSort)}>
            <option value="createdAtDesc">作成日時（新しい順）</option>
            <option value="dueDateAsc">期限（近い順）</option>
            <option value="priorityDesc">優先度（高→低）</option>
          </select>
        </label>
        <label className="checkbox-inline">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          アーカイブを含める
        </label>
      </section>

      <section className="card bulk-actions">
        <p>{selectedIds.length}件選択中</p>
        <div>
          <button type="button" onClick={handleBulkMarkDone} disabled={!canBulkAction}>
            選択を完了にする
          </button>
          <button type="button" onClick={handleBulkArchive} disabled={!canBulkAction}>
            選択をアーカイブ
          </button>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <TaskList
        tasks={visibleTasks}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onDelete={handleDelete}
        onStatusChange={handleStatus}
        onUpdate={handleUpdate}
      />
    </main>
  );
}
