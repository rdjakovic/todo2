import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ListSortDropdown from "../ListSortDropdown";
import { TodoList } from "../../types/todo";

const mockList: TodoList = {
  id: "list-1",
  name: "My List",
  icon: "📝",
  showCompleted: false,
  userId: "user-1",
};

const defaultProps = {
  currentList: mockList,
  globalSort: "dateCreated" as const,
  globalDirection: "desc" as const,
  onSetSort: vi.fn().mockResolvedValue(undefined),
  onUseGlobal: vi.fn().mockResolvedValue(undefined),
};

describe("ListSortDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sort button", () => {
    render(<ListSortDropdown {...defaultProps} />);
    expect(screen.getByTitle("Sort options")).toBeInTheDocument();
  });

  it("dropdown is closed by default", () => {
    render(<ListSortDropdown {...defaultProps} />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens dropdown when button is clicked", () => {
    render(<ListSortDropdown {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Sort options"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows all sort options in the dropdown", () => {
    render(<ListSortDropdown {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Sort options"));
    expect(screen.getByText("Use Global Default")).toBeInTheDocument();
    expect(screen.getByText("Date Created")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Due Date")).toBeInTheDocument();
    expect(screen.getByText("Completed First")).toBeInTheDocument();
    expect(screen.getByText("Completed Last")).toBeInTheDocument();
    expect(screen.getByText("Custom Sort (Drag & Drop)")).toBeInTheDocument();
  });

  it("calls onSetSort with correct args when direction button is clicked", async () => {
    render(<ListSortDropdown {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Sort options"));

    const ascBtn = screen.getByLabelText("Sort by Date Created ascending");
    fireEvent.click(ascBtn);

    await waitFor(() => {
      expect(defaultProps.onSetSort).toHaveBeenCalledWith("dateCreated", "asc");
    });
  });

  it("calls onUseGlobal when 'Use Global Default' is clicked", async () => {
    const listWithSort: TodoList = { ...mockList, sortPreference: "priority:desc" };
    render(<ListSortDropdown {...defaultProps} currentList={listWithSort} />);
    fireEvent.click(screen.getByTitle("Sort (customized)"));

    fireEvent.click(screen.getByText("Use Global Default"));
    await waitFor(() => {
      expect(defaultProps.onUseGlobal).toHaveBeenCalled();
    });
  });

  it("closes dropdown on Escape key", async () => {
    render(<ListSortDropdown {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Sort options"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("shows purple dot indicator when list has custom sort", () => {
    const listWithSort: TodoList = { ...mockList, sortPreference: "priority:desc" };
    render(<ListSortDropdown {...defaultProps} currentList={listWithSort} />);
    // The button title changes and the purple dot span is rendered
    expect(screen.getByTitle("Sort (customized)")).toBeInTheDocument();
  });

  it("highlights the active sort option", () => {
    const listWithSort: TodoList = { ...mockList, sortPreference: "priority" };
    render(<ListSortDropdown {...defaultProps} currentList={listWithSort} listDirection="asc" />);
    fireEvent.click(screen.getByTitle("Sort (customized)"));

    const ascBtn = screen.getByLabelText("Sort by Priority ascending");
    expect(ascBtn).toHaveAttribute("aria-pressed", "true");
  });
});
