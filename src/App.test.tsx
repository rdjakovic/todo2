import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import App from "./App";
import { invoke } from "@tauri-apps/api/core";

const initialLists = [
  { id: "all", name: "All", icon: "home" },
  { id: "completed", name: "Completed", icon: "check" },
  { id: "list-1", name: "Personal", icon: "user" },
  { id: "settings", name: "Settings", icon: "settings" },
];

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock dialog
vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: vi.fn().mockResolvedValue(true),
}));

// Mock PWA register virtual module
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: vi.fn().mockReturnValue({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

// Mock auth store to return authenticated user
vi.mock("./store/authStore", () => ({
  useAuthStore: vi.fn().mockReturnValue({
    user: { id: "test-user-id", email: "test@example.com" },
    loading: false,
    initialize: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

// State for mock store to allow interactions to work in tests
const mockStoreState = {
  selectedListId: "list-1",
  isSidebarOpen: true,
  theme: "light",
  todos: [] as any[],
  searchQuery: "",
  newTodo: "",
  storagePath: "",
};

// Event system for mock store reactivity
const storeListeners = new Set<() => void>();
const notifyStoreChange = () => storeListeners.forEach(l => l());

// Mock todo store with initial data and stateful behavior
vi.mock("./store/todoStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./store/todoStore")>();
  return {
    ...actual,
    useTodoStore: vi.fn().mockImplementation(() => {
      // Use standard react state to trigger re-renders
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        const listener = () => setTick(t => t + 1);
        storeListeners.add(listener);
        return () => { storeListeners.delete(listener); };
      }, []);

      return {
        lists: initialLists,
        todos: mockStoreState.todos,
        selectedListId: mockStoreState.selectedListId,
        loading: false,
        isSidebarOpen: mockStoreState.isSidebarOpen,
        sidebarWidth: 256,
        windowWidth: 1024,
        activeDraggedTodo: null,
        isEditDialogOpen: false,
        todoToEditDialog: null,
        editDialogViewMode: false,
        filteredTodos: mockStoreState.todos,
        storagePath: mockStoreState.storagePath,
        searchQuery: mockStoreState.searchQuery,
        newTodo: mockStoreState.newTodo,
        getTodoCountByList: vi.fn().mockReturnValue({
          all: mockStoreState.todos.length,
          completed: mockStoreState.todos.filter(t => t.completed).length,
          "list-1": mockStoreState.todos.length
        }),
        sortBy: "dateCreated",
        sortDirection: "desc",
        listSortDirections: {},
        getEffectiveSortForList: vi.fn().mockReturnValue({ sort: 'dateCreated', direction: 'desc' }),
        setSortBy: vi.fn(),
        setSortDirection: vi.fn(),
        setListSortDirection: vi.fn(),
        editList: vi.fn().mockResolvedValue(undefined),
        setSelectedListId: vi.fn().mockImplementation((id) => { 
          mockStoreState.selectedListId = id; 
          notifyStoreChange();
        }),
        setIsSidebarOpen: vi.fn().mockImplementation((open) => { 
          mockStoreState.isSidebarOpen = open; 
          notifyStoreChange();
        }),
        setWindowWidth: vi.fn(),
        setSidebarWidth: vi.fn(),
        toggleSidebar: vi.fn().mockImplementation(() => { 
          mockStoreState.isSidebarOpen = !mockStoreState.isSidebarOpen; 
          notifyStoreChange();
        }),
        addTodo: vi.fn().mockImplementation(async (todo) => {
          const newTodo = { ...todo, id: Math.random().toString(), dateCreated: new Date() };
          mockStoreState.todos = [...mockStoreState.todos, newTodo];
          notifyStoreChange();
        }),
        setNewTodo: vi.fn().mockImplementation((val) => { 
          mockStoreState.newTodo = val; 
          notifyStoreChange();
        }),
        addTodoFromForm: vi.fn().mockImplementation(async (e) => {
          if (e) e.preventDefault();
          if (!mockStoreState.newTodo.trim()) return;
          const newTodo = { id: Math.random().toString(), title: mockStoreState.newTodo, completed: false, listId: mockStoreState.selectedListId, dateCreated: new Date() };
          mockStoreState.todos = [...mockStoreState.todos, newTodo];
          mockStoreState.newTodo = "";
          notifyStoreChange();
        }),
        toggleTodo: vi.fn().mockImplementation(async (id) => {
          mockStoreState.todos = mockStoreState.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
          notifyStoreChange();
        }),
        deleteTodo: vi.fn().mockImplementation(async (id) => {
          mockStoreState.todos = mockStoreState.todos.filter(t => t.id !== id);
          notifyStoreChange();
        }),
        editTodo: vi.fn().mockResolvedValue(undefined),
        openEditDialog: vi.fn(),
        closeEditDialog: vi.fn(),
        fetchLists: vi.fn().mockResolvedValue(undefined),
        fetchTodos: vi.fn().mockResolvedValue(undefined),
        setStoragePath: vi.fn().mockImplementation(async (path) => { 
          mockStoreState.storagePath = path; 
          notifyStoreChange();
        }),
        createList: vi.fn().mockResolvedValue(undefined),
        setSortForList: vi.fn(),
        setSearchQuery: vi.fn().mockImplementation((q) => { 
          mockStoreState.searchQuery = q; 
          notifyStoreChange();
        }),
        setError: vi.fn(),
        error: null,
      };
    }),
  };
});

describe("App", () => {
  beforeEach(() => {
    // Enable Tauri-specific paths
    (window as any).__TAURI__ = {};

    // Mock initial data loading
    (invoke as any).mockImplementation((cmd: string) => {
      switch (cmd) {
        case "load_storage_path":
          return Promise.resolve("");
        case "load_lists":
          return Promise.resolve(JSON.stringify(initialLists));
        case "load_todos":
          return Promise.resolve(JSON.stringify([]));
        case "get_theme":
          return Promise.resolve("light");
        default:
          return Promise.resolve(null);
      }
    });
  });

  test("renders initial lists", async () => {
    render(<App />);
    await waitFor(() => {
      // Look for the list items within the navigation
      const nav = screen.getByRole("navigation");
      const allButton = screen.getByRole("button", { name: /^all\s*0$/i });
      const completedButton = screen.getByRole("button", {
        name: /^completed\s*0$/i,
      });

      expect(nav).toContainElement(allButton);
      expect(nav).toContainElement(completedButton);
    });
  });

  test("can add new todo", async () => {
    render(<App />);
    const input = await waitFor(() =>
      screen.getByPlaceholderText("Add a new todo...")
    );
    const addButton = screen.getByText("Add");

    fireEvent.change(input, { target: { value: "New Test Todo" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("New Test Todo")).toBeInTheDocument();
    });
  });

  test("can toggle sidebar", async () => {
    render(<App />);
    const toggleButton = await waitFor(() =>
      screen.getByTitle("Toggle sidebar")
    );

    fireEvent.click(toggleButton);
    expect(screen.getByRole("navigation", { hidden: true })).toHaveClass(
      "-translate-x-full"
    );

    fireEvent.click(toggleButton);
    expect(screen.getByRole("navigation", { hidden: true })).not.toHaveClass(
      "-translate-x-full"
    );
  });

  test("can switch to settings", async () => {
    render(<App />);
    const settingsButton = await waitFor(() =>
      screen.getByRole("button", { name: /^settings$/i })
    );

    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Settings" })
      ).toBeInTheDocument();
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });
  });

  test("can toggle theme", async () => {
    render(<App />);
    const settingsButton = await waitFor(() =>
      screen.getByRole("button", { name: /^settings$/i })
    );
    fireEvent.click(settingsButton);

    const themeToggle = screen.getByRole("switch", {
      name: "Toggle dark mode",
    });
    fireEvent.click(themeToggle);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("set_theme", { theme: "dark" });
    });
  });

  // Removed obsolete storage path test
});
