import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export function TaskForm({ onSubmit, busy = false }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("medium");
    const [dueDate, setDueDate] = useState("");
    const handleSubmit = async (event) => {
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
    return (_jsxs("form", { className: "task-form card", onSubmit: handleSubmit, children: [_jsx("h2", { children: "\u30BF\u30B9\u30AF\u3092\u8FFD\u52A0" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["\u30BF\u30A4\u30C8\u30EB", _jsx("input", { value: title, onChange: (event) => setTitle(event.target.value), placeholder: "\u4F8B: \u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u63D0\u6848\u66F8\u306E\u521D\u7A3F", required: true, maxLength: 120 })] }), _jsxs("label", { children: ["\u512A\u5148\u5EA6", _jsxs("select", { value: priority, onChange: (event) => setPriority(event.target.value), children: [_jsx("option", { value: "high", children: "\u9AD8" }), _jsx("option", { value: "medium", children: "\u4E2D" }), _jsx("option", { value: "low", children: "\u4F4E" })] })] }), _jsxs("label", { children: ["\u671F\u9650", _jsx("input", { type: "datetime-local", value: dueDate, onChange: (event) => setDueDate(event.target.value) })] }), _jsxs("label", { className: "full", children: ["\u30E1\u30E2", _jsx("textarea", { value: description, onChange: (event) => setDescription(event.target.value), placeholder: "\u88DC\u8DB3\u30E1\u30E2\uFF08\u4EFB\u610F\uFF09", maxLength: 500, rows: 3 })] })] }), _jsx("button", { type: "submit", className: "primary", disabled: busy, children: busy ? "保存中..." : "追加する" })] }));
}
