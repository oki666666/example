import type { Task } from "../types/task";

interface KpiCardsProps {
  tasks: Task[];
}

export function KpiCards({ tasks }: KpiCardsProps) {
  const now = new Date();
  const activeCount = tasks.filter((task) => task.status !== "done").length;
  const dueTodayCount = tasks.filter((task) => {
    if (!task.dueDate || task.status === "done") return false;
    const dueDate = new Date(task.dueDate);
    return dueDate.toDateString() === now.toDateString();
  }).length;
  const overdueCount = tasks.filter((task) => {
    if (!task.dueDate || task.status === "done") return false;
    return new Date(task.dueDate) < now;
  }).length;

  return (
    <section className="kpi-grid">
      <article className="card kpi">
        <h3>未完了</h3>
        <p>{activeCount}</p>
      </article>
      <article className="card kpi">
        <h3>本日期限</h3>
        <p>{dueTodayCount}</p>
      </article>
      <article className="card kpi warning">
        <h3>期限切れ</h3>
        <p>{overdueCount}</p>
      </article>
    </section>
  );
}
