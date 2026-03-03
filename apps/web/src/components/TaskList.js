import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
export function TaskList({ tasks, loading = false, onDelete, onStatusChange, onUpdate }) {
    const [editingId, setEditingId] = useState(null);
    const [draftTitle, setDraftTitle] = useState("");
    const [draftDescription, setDraftDescription] = useState("");
    const [draftPriority, setDraftPriority] = useState("medium");
    const [draftDueDate, setDraftDueDate] = useState("");
    const editingTask = useMemo(() => tasks.find((task) => task.id === editingId), [editingId, tasks]);
    const startEdit = (task) => {
        setEditingId(task.id);
        setDraftTitle(task.title);
        setDraftDescription(task.description ?? "");
        setDraftPriority(task.priority);
        setDraftDueDate(task.dueDate ? toDateTimeLocal(task.dueDate) : "");
    };
    const submitEdit = async () => {
        if (!editingId || !draftTitle.trim())
            return;
        await onUpdate(editingId, {
            title: draftTitle.trim(),
            description: draftDescription.trim() || "",
            priority: draftPriority,
            dueDate: draftDueDate ? new Date(draftDueDate).toISOString() : null
        });
        setEditingId(null);
    };
    if (loading) {
        return _jsx("section", { className: "card", children: "\u8AAD\u307F\u8FBC\u307F\u4E2D..." });
    }
    if (tasks.length === 0) {
        return _jsx("section", { className: "card empty", children: "\u8A72\u5F53\u3059\u308B\u30BF\u30B9\u30AF\u304C\u3042\u308A\u307E\u305B\u3093\u3002" });
    }
    return (_jsxs("section", { className: "task-list", children: [tasks.map((task) => {
                const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
                return (_jsxs("article", { className: `card task-item ${task.status} ${isOverdue ? "overdue" : ""}`, children: [_jsxs("header", { children: [_jsx("h3", { children: task.title }), _jsx("span", { className: `priority ${task.priority}`, children: priorityLabel(task.priority) })] }), task.description ? _jsx("p", { className: "description", children: task.description }) : null, _jsxs("div", { className: "meta", children: [_jsxs("span", { children: ["\u671F\u9650: ", task.dueDate ? formatDate(task.dueDate) : "未設定"] }), _jsxs("span", { children: ["\u4F5C\u6210: ", formatDate(task.createdAt)] })] }), _jsxs("div", { className: "actions", children: [_jsxs("select", { value: task.status, onChange: (event) => onStatusChange(task.id, event.target.value), children: [_jsx("option", { value: "todo", children: "\u672A\u7740\u624B" }), _jsx("option", { value: "doing", children: "\u9032\u884C\u4E2D" }), _jsx("option", { value: "done", children: "\u5B8C\u4E86" })] }), _jsx("button", { type: "button", onClick: () => startEdit(task), children: "\u7DE8\u96C6" }), _jsx("button", { type: "button", className: "danger", onClick: () => onDelete(task.id), children: "\u524A\u9664" })] })] }, task.id));
            }), editingTask ? (_jsxs("dialog", { open: true, className: "edit-dialog", children: [_jsx("h3", { children: "\u30BF\u30B9\u30AF\u3092\u7DE8\u96C6" }), _jsxs("label", { children: ["\u30BF\u30A4\u30C8\u30EB", _jsx("input", { value: draftTitle, onChange: (event) => setDraftTitle(event.target.value) })] }), _jsxs("label", { children: ["\u30E1\u30E2", _jsx("textarea", { value: draftDescription, onChange: (event) => setDraftDescription(event.target.value) })] }), _jsxs("label", { children: ["\u512A\u5148\u5EA6", _jsxs("select", { value: draftPriority, onChange: (event) => setDraftPriority(event.target.value), children: [_jsx("option", { value: "high", children: "\u9AD8" }), _jsx("option", { value: "medium", children: "\u4E2D" }), _jsx("option", { value: "low", children: "\u4F4E" })] })] }), _jsxs("label", { children: ["\u671F\u9650", _jsx("input", { type: "datetime-local", value: draftDueDate, onChange: (event) => setDraftDueDate(event.target.value) })] }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { type: "button", onClick: submitEdit, children: "\u4FDD\u5B58" }), _jsx("button", { type: "button", onClick: () => setEditingId(null), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" })] })] })) : null] }));
}
function formatDate(value) {
    const date = new Date(value);
    return date.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}
function priorityLabel(priority) {
    if (priority === "high")
        return "高";
    if (priority === "low")
        return "低";
    return "中";
}
function toDateTimeLocal(isoString) {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
