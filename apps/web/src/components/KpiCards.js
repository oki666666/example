import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function KpiCards({ tasks }) {
    const now = new Date();
    const activeCount = tasks.filter((task) => task.status !== "done").length;
    const dueTodayCount = tasks.filter((task) => {
        if (!task.dueDate || task.status === "done")
            return false;
        const dueDate = new Date(task.dueDate);
        return dueDate.toDateString() === now.toDateString();
    }).length;
    const overdueCount = tasks.filter((task) => {
        if (!task.dueDate || task.status === "done")
            return false;
        return new Date(task.dueDate) < now;
    }).length;
    return (_jsxs("section", { className: "kpi-grid", children: [_jsxs("article", { className: "card kpi", children: [_jsx("h3", { children: "\u672A\u5B8C\u4E86" }), _jsx("p", { children: activeCount })] }), _jsxs("article", { className: "card kpi", children: [_jsx("h3", { children: "\u672C\u65E5\u671F\u9650" }), _jsx("p", { children: dueTodayCount })] }), _jsxs("article", { className: "card kpi warning", children: [_jsx("h3", { children: "\u671F\u9650\u5207\u308C" }), _jsx("p", { children: overdueCount })] })] }));
}
