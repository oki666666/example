import type { TaskFilter } from "../types/task";

interface TaskFiltersProps {
  value: TaskFilter;
  onChange: (next: TaskFilter) => void;
}

const FILTER_OPTIONS: Array<{ label: string; value: TaskFilter }> = [
  { label: "すべて", value: "all" },
  { label: "未着手", value: "todo" },
  { label: "進行中", value: "doing" },
  { label: "完了", value: "done" },
  { label: "期限切れ", value: "overdue" }
];

export function TaskFilters({ value, onChange }: TaskFiltersProps) {
  return (
    <div className="card filters">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
