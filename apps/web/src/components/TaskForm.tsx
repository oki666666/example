import { type FormEvent, useState } from "react";
import type { TaskCreateInput } from "../types/task";

interface TaskFormProps {
  onSubmit: (input: TaskCreateInput) => Promise<void>;
  busy?: boolean;
}

export function TaskForm({ onSubmit, busy = false }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || null
    });

    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
  };

  return (
    <form className="task-form card" onSubmit={handleSubmit}>
      <h2>タスクを追加</h2>
      <div className="form-grid">
        <label>
          タイトル
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例: クライアント提案書の初稿"
            required
            maxLength={120}
          />
        </label>
        <label>
          優先度
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as "low" | "medium" | "high")}
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>
        <label>
          期限
          <input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label className="full">
          メモ
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="補足メモ（任意）"
            maxLength={500}
            rows={3}
          />
        </label>
      </div>
      <button type="submit" className="primary" disabled={busy}>
        {busy ? "保存中..." : "追加する"}
      </button>
    </form>
  );
}
