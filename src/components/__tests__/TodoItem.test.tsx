import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import TodoItem from "../TodoItem"; // Changed to default import
import { Todo } from "../../types/todo";

describe("TodoItem", () => {
  const mockTodo: Todo = {
    id: "1", // Changed from number to string
    title: "Test Todo",
    completed: false,
    dateCreated: new Date(),
    listId: "test-list-id", // Added required listId property
  };

  const mockOnToggle = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnOpenEditDialog = vi.fn(); // Added

  beforeEach(() => {
    vi.clearAllMocks();
    render(
      <TodoItem
        todo={mockTodo}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onOpenEditDialog={mockOnOpenEditDialog} // Added
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

  test("calls onOpenEditDialog when edit button is clicked", () => {
    const editButton = screen.getByTitle("Edit todo");
    fireEvent.click(editButton);
    expect(mockOnOpenEditDialog).toHaveBeenCalledWith(mockTodo, false); // Edit mode = false viewMode
  });
});