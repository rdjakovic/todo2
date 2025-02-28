import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { TodoItem } from "./TodoItem";
import { Todo } from "../types/todo";

describe("TodoItem", () => {
  const mockTodo: Todo = {
    id: 1,
    text: "Test Todo",
    completed: false,
    date: new Date().toISOString(),
    listId: "home",
    isEditing: false,
    editText: "",
  };

  const mockOnToggle = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnEditStart = vi.fn();
  const mockOnEditCancel = vi.fn();
  const mockOnEditChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    render(
      <TodoItem
        todo={mockTodo}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
        onEditStart={mockOnEditStart}
        onEditCancel={mockOnEditCancel}
        onEditChange={mockOnEditChange}
      />
    );
  });

  test("renders todo text", () => {
    expect(screen.getByText("Test Todo")).toBeInTheDocument();
  });

  test("calls onToggle when checkbox is clicked", () => {
    const checkbox = screen.getByRole("button", { name: "" });
    fireEvent.click(checkbox);
    expect(mockOnToggle).toHaveBeenCalledWith(mockTodo.id);
  });

  test("calls onDelete when delete button is clicked", () => {
    const deleteButton = screen.getByTitle("Delete todo");
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockTodo.id);
  });

  test("calls onEditStart when edit button is clicked", () => {
    const editButton = screen.getByTitle("Edit todo");
    fireEvent.click(editButton);
    expect(mockOnEditStart).toHaveBeenCalledWith(mockTodo.id, mockTodo.text);
  });
});
