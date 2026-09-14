import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AzkarCategory, AzkarSchedule } from "@manarah/core";
import { AzkarScheduleEditor } from "./AzkarScheduleEditor.js";

const categories: AzkarCategory[] = [
  { id: "27", name: "Morning and evening remembrance", trigger: "morning", items: [] },
  { id: "96", name: "Invocation for traveling", trigger: "situational", items: [] },
];

describe("AzkarScheduleEditor", () => {
  it("renders every category with its default trigger pre-selected and unmuted", () => {
    render(<AzkarScheduleEditor categories={categories} schedules={[]} onChange={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "Mute Morning and evening remembrance" })).not.toBeChecked();
    expect(screen.getByRole("combobox", { name: "Trigger for Morning and evening remembrance" })).toHaveValue(
      "morning"
    );
    expect(screen.getByRole("combobox", { name: "Trigger for Invocation for traveling" })).toHaveValue(
      "situational"
    );
  });

  it("reflects an existing schedule override instead of the category default", () => {
    const schedules: AzkarSchedule[] = [{ categoryId: "96", trigger: "post-salah", muted: false }];
    render(<AzkarScheduleEditor categories={categories} schedules={schedules} onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Trigger for Invocation for traveling" })).toHaveValue(
      "post-salah"
    );
  });

  it("calls onChange with a new muted schedule when the checkbox is checked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AzkarScheduleEditor categories={categories} schedules={[]} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Mute Morning and evening remembrance" }));

    expect(onChange).toHaveBeenCalledWith([{ categoryId: "27", trigger: "morning", muted: true }]);
  });

  it("calls onChange with a remapped trigger when the select changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AzkarScheduleEditor categories={categories} schedules={[]} onChange={onChange} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Trigger for Invocation for traveling" }),
      "post-salah"
    );

    expect(onChange).toHaveBeenCalledWith([{ categoryId: "96", trigger: "post-salah", muted: false }]);
  });

  it("shows a time input only when the trigger is custom-time, and reports the chosen time", async () => {
    const user = userEvent.setup();
    let schedules: AzkarSchedule[] = [];
    const onChange = vi.fn((next: AzkarSchedule[]) => {
      schedules = next;
    });

    const { rerender } = render(
      <AzkarScheduleEditor categories={categories} schedules={schedules} onChange={onChange} />
    );

    expect(screen.queryByRole("textbox", { name: "Custom time for Invocation for traveling" })).toBeNull();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Trigger for Invocation for traveling" }),
      "custom-time"
    );
    rerender(<AzkarScheduleEditor categories={categories} schedules={schedules} onChange={onChange} />);

    const timeInput = screen.getByLabelText("Custom time for Invocation for traveling");
    expect(timeInput).toBeInTheDocument();

    // fireEvent.change (not user.type) for <input type="time"> — userEvent's
    // keystroke-by-keystroke typing lands in the wrong HH/mm segment under
    // jsdom for segmented time inputs.
    fireEvent.change(timeInput, { target: { value: "14:30" } });
    expect(onChange).toHaveBeenLastCalledWith([
      { categoryId: "96", trigger: "custom-time", muted: false, customTime: "14:30" },
    ]);
  });

  it("drops the schedule entry entirely once a category is set back to its own default", async () => {
    const user = userEvent.setup();
    const schedules: AzkarSchedule[] = [{ categoryId: "27", trigger: "morning", muted: true }];
    const onChange = vi.fn();
    render(<AzkarScheduleEditor categories={categories} schedules={schedules} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Mute Morning and evening remembrance" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("hides the trigger controls' custom-time input while a category is muted", () => {
    const schedules: AzkarSchedule[] = [{ categoryId: "96", trigger: "custom-time", customTime: "09:00", muted: true }];
    render(<AzkarScheduleEditor categories={categories} schedules={schedules} onChange={vi.fn()} />);

    expect(screen.queryByLabelText("Custom time for Invocation for traveling")).toBeNull();
  });
});
