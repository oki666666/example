import { useMemo, useState } from "react";
import type { Task, TaskStatus, TaskUpdateInput } from "../types/task";

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  onUpdate: (id: string, input: TaskUpdateInput) => Promise<void>;
}

export function TaskList({
  tasks,
  loading = false,
  selectedIds,
  onToggleSelect,
  onDelete,
  onStatusChange,
  onUpdate
}: TaskListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPriority, setDraftPriority] = useState<"low" | "medium" | "high">("medium");
  const [draftDueDate, setDraftDueDate] = useState("");

  const editingTask = useMemo(() => tasks.find((task) => task.id === editingId), [editingId, tasks]);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setDraftTitle(task.title);
    setDraftDescription(task.description ?? "");
    setDraftPriority(task.priority);
    setDraftDueDate(task.dueDate ? toDateTimeLocal(task.dueDate) : "");
  };

  const submitEdit = async () => {
    if (!editingId || !draftTitle.trim()) return;
    await onUpdate(editingId, {
      title: draftTitle.trim(),
      description: draftDescription.trim() || "",
      priority: draftPriority,
      dueDate: draftDueDate ? new Date(draftDueDate).toISOString() : null
    });
    setEditingId(null);
  };

  if (loading) {
    return <section className="card">読み込み中...</section>;
  }

  if (tasks.length === 0) {
    return <section className="card empty">該当するタスクがありません。</section>;
  }

  return (
    <section className="task-list">
      {tasks.map((task) => {
        const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
        return (
          <article key={task.id} className={`card task-item ${task.status} ${isOverdue ? "overdue" : ""}`}>
            <header>
              <div className="title-row">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(task.id)}
                  onChange={() => onToggleSelect(task.id)}
                  aria-label={`${task.title} を選択`}
                />
                <h3>{task.title}</h3>
              </div>
              <div className="badge-row">
                {task.archivedAt ? <span className="archived-badge">アーカイブ</span> : null}
                <span className={`priority ${task.priority}`}>{priorityLabel(task.priority)}</span>
              </div>
            </header>
            {task.description ? <p className="description">{task.description}</p> : null}
            <div className="meta">
              <span>期限: {task.dueDate ? formatDate(task.dueDate) : "未設定"}</span>
              <span>作成: {formatDate(task.createdAt)}</span>
            </div>
            <div className="actions">
              <select
                value={task.status}
                onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
              >
                <option value="todo">未着手</option>
                <option value="doing">進行中</option>
                <option value="done">完了</option>
              </select>
              <button type="button" onClick={() => startEdit(task)}>
                編集
              </button>
              <button type="button" className="danger" onClick={() => onDelete(task.id)}>
                削除
              </button>
            </div>
          </article>
        );
      })}

      {editingTask ? (
        <dialog open className="edit-dialog">
          <h3>タスクを編集</h3>
          <label>
            タイトル
            <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
          </label>
          <label>
            メモ
            <textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} />
          </label>
          <label>
            優先度
            <select
              value={draftPriority}
              onChange={(event) => setDraftPriority(event.target.value as "low" | "medium" | "high")}
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>
          <label>
            期限
            <input
              type="datetime-local"
              value={draftDueDate}
              onChange={(event) => setDraftDueDate(event.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" onClick={submitEdit}>
              保存
            </button>
            <button type="button" onClick={() => setEditingId(null)}>
              キャンセル
            </button>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function priorityLabel(priority: "low" | "medium" | "high") {
  if (priority === "high") return "高";
  if (priority === "low") return "低";
  return "中";
}

function toDateTimeLocal(isoString: string) {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
