// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskFilters } from "./TaskFilters";

describe("TaskFilters", () => {
  it("クリック時に選択フィルタを通知する", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TaskFilters value="all" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "期限切れ" }));

    expect(onChange).toHaveBeenCalledWith("overdue");
  });
});
