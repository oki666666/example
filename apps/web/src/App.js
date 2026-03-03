import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { tasksApi } from "./api/tasks";
import { KpiCards } from "./components/KpiCards";
import { TaskFilters } from "./components/TaskFilters";
import { TaskForm } from "./components/TaskForm";
import { TaskList } from "./components/TaskList";
export function App() {
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const fetchTasks = useCallback(async (nextFilter) => {
        setLoading(true);
        setError(null);
        try {
            const data = await tasksApi.list(nextFilter);
            setTasks(data);
        }
        catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : "タスク取得に失敗しました");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void fetchTasks(filter);
    }, [fetchTasks, filter]);
    const handleCreate = async (input) => {
        setSaving(true);
        setError(null);
        try {
            await tasksApi.create(input);
            await fetchTasks(filter);
        }
        catch (createError) {
            setError(createError instanceof Error ? createError.message : "作成に失敗しました");
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (id) => {
        try {
            await tasksApi.remove(id);
            await fetchTasks(filter);
        }
        catch (removeError) {
            setError(removeError instanceof Error ? removeError.message : "削除に失敗しました");
        }
    };
    const handleStatus = async (id, status) => {
        try {
            await tasksApi.update(id, { status });
            await fetchTasks(filter);
        }
        catch (statusError) {
            setError(statusError instanceof Error ? statusError.message : "状態更新に失敗しました");
        }
    };
    const handleUpdate = async (id, input) => {
        try {
            await tasksApi.update(id, input);
            await fetchTasks(filter);
        }
        catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : "更新に失敗しました");
        }
    };
    const sortedTasks = useMemo(() => [...tasks].sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
    }), [tasks]);
    return (_jsxs("main", { className: "app-shell", children: [_jsxs("header", { className: "header", children: [_jsx("h1", { children: "FocusBoard" }), _jsx("p", { children: "\u7DE0\u5207\u30EA\u30B9\u30AF\u3092\u53EF\u8996\u5316\u3057\u3066\u3001\u5148\u9001\u308A\u3092\u6E1B\u3089\u3059\u500B\u4EBA\u5411\u3051\u30BF\u30B9\u30AF\u7BA1\u7406\u30A2\u30D7\u30EA" })] }), _jsx(KpiCards, { tasks: tasks }), _jsx(TaskForm, { onSubmit: handleCreate, busy: saving }), _jsx(TaskFilters, { value: filter, onChange: setFilter }), error ? _jsx("p", { className: "error-banner", children: error }) : null, _jsx(TaskList, { tasks: sortedTasks, loading: loading, onDelete: handleDelete, onStatusChange: handleStatus, onUpdate: handleUpdate })] }));
}
