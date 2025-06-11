import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import App from "./App";
import { invoke } from "@tauri-apps/api/core";

const initialLists = [
  { id: "all", name: "All", icon: "home" },
  { id: "completed", name: "Completed", icon: "check" },
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

describe("App", () => {
  beforeEach(() => {
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
      expect(invoke).toHaveBeenCalledWith("save_todos", expect.any(Object));
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
      expect(screen.getByText("Storage Location")).toBeInTheDocument();
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

  test("can set storage path", async () => {
    render(<App />);
    const settingsButton = await waitFor(() =>
      screen.getByRole("button", { name: /^settings$/i })
    );
    fireEvent.click(settingsButton);

    const input = screen.getByPlaceholderText("Enter storage path...");
    const saveButton = screen.getByText("Save");

    fireEvent.change(input, { target: { value: "/test/path" } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("set_storage_path", {
        path: "/test/path",
      });
    });
  });
});
