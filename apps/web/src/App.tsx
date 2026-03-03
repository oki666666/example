import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, tasksApi } from "./api/tasks";
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoTaskId, setUndoTaskId] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tasksApi.list({
        filter,
        query: query || undefined,
        sort,
        includeArchived
      });
      setTasks(data);
      setSelectedIds((prev) => prev.filter((id) => data.some((task) => task.id === id)));
      setLoadFailed(false);
    } catch (fetchError) {
      setLoadFailed(true);
      setError(toUserMessage(fetchError, "タスク取得に失敗しました"));
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
      setNotice("タスクを追加しました");
    } catch (createError) {
      setError(toUserMessage(createError, "作成に失敗しました"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prevTasks = tasks;
    setTasks((current) => current.filter((task) => task.id !== id));
    try {
      await tasksApi.remove(id);
      setUndoTaskId(id);
      setNotice("タスクを削除しました（8秒以内なら元に戻せます）");
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      undoTimerRef.current = setTimeout(() => {
        setUndoTaskId(null);
      }, 8000);
    } catch (removeError) {
      setTasks(prevTasks);
      setError(toUserMessage(removeError, "削除に失敗しました"));
    }
  };

  const handleStatus = async (id: string, status: TaskStatus) => {
    const prevTasks = tasks;
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, status } : task)));
    try {
      await tasksApi.update(id, { status });
      setNotice("ステータスを更新しました");
    } catch (statusError) {
      setTasks(prevTasks);
      setError(toUserMessage(statusError, "状態更新に失敗しました"));
    }
  };

  const handleUpdate = async (id: string, input: TaskUpdateInput) => {
    try {
      await tasksApi.update(id, input);
      await fetchTasks();
      setNotice("タスクを更新しました");
    } catch (updateError) {
      setError(toUserMessage(updateError, "更新に失敗しました"));
    }
  };

  const handleBulkMarkDone = async () => {
    if (selectedIds.length === 0) return;
    try {
      await tasksApi.bulk({ action: "markDone", ids: selectedIds });
      await fetchTasks();
      setNotice(`${selectedIds.length}件を完了にしました`);
    } catch (bulkError) {
      setError(toUserMessage(bulkError, "一括完了に失敗しました"));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    try {
      await tasksApi.bulk({ action: "archive", ids: selectedIds });
      setSelectedIds([]);
      await fetchTasks();
      setNotice(`${selectedIds.length}件をアーカイブしました`);
    } catch (bulkError) {
      setError(toUserMessage(bulkError, "一括アーカイブに失敗しました"));
    }
  };

  const canBulkAction = selectedIds.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleUndoDelete = async () => {
    if (!undoTaskId) return;
    try {
      await tasksApi.restore(undoTaskId);
      setUndoTaskId(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      await fetchTasks();
      setNotice("削除を取り消しました");
    } catch (undoError) {
      setError(toUserMessage(undoError, "取り消しに失敗しました"));
    }
  };

  const handleExport = async () => {
    try {
      const data = await tasksApi.exportJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `focusboard-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("JSONエクスポートを保存しました");
    } catch (exportError) {
      setError(toUserMessage(exportError, "エクスポートに失敗しました"));
    }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInputLike =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;

      if (event.key === "/" && !isInputLike) {
        event.preventDefault();
        const search = document.getElementById("task-search");
        search?.focus();
      }
      if (event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        const titleInput = document.getElementById("task-title-input");
        titleInput?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
            id="task-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="タイトル/メモで検索"
            aria-label="タスク検索"
          />
        </label>
        <label>
          並び順
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as TaskSort)}
            aria-label="並び順"
          >
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
            aria-label="アーカイブを含める"
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
          <button type="button" onClick={handleExport}>
            JSONエクスポート
          </button>
        </div>
      </section>

      {notice ? <p className="notice-banner" role="status" aria-live="polite">{notice}</p> : null}
      {error ? (
        <div className="error-banner" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void fetchTasks()}>
            再試行
          </button>
        </div>
      ) : null}
      {undoTaskId ? (
        <div className="undo-banner" role="status" aria-live="polite">
          <p>削除したタスクを元に戻せます</p>
          <button type="button" onClick={() => void handleUndoDelete()}>
            取り消す
          </button>
        </div>
      ) : null}
      {loadFailed ? (
        <section className="card failure-state">
          <h3>タスク取得に失敗しました</h3>
          <p>ネットワークやAPIの状態を確認してください。</p>
          <button type="button" onClick={() => void fetchTasks()}>
            再読み込み
          </button>
        </section>
      ) : null}

      <TaskList
        tasks={tasks}
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

function toUserMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiClientError) {
    if (error.code === "VALIDATION_ERROR") {
      return "入力内容を確認してください。";
    }
    if (error.code === "TASK_NOT_FOUND") {
      return "対象のタスクが見つかりませんでした。";
    }
    return error.message || fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
