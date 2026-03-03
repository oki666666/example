import { jsx as _jsx } from "react/jsx-runtime";
const FILTER_OPTIONS = [
    { label: "すべて", value: "all" },
    { label: "未着手", value: "todo" },
    { label: "進行中", value: "doing" },
    { label: "完了", value: "done" },
    { label: "期限切れ", value: "overdue" }
];
export function TaskFilters({ value, onChange }) {
    return (_jsx("div", { className: "card filters", children: FILTER_OPTIONS.map((option) => (_jsx("button", { type: "button", className: option.value === value ? "active" : "", onClick: () => onChange(option.value), children: option.label }, option.value))) }));
}
