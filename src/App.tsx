import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { PlusIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Sidebar } from "./components/sidebar";
import { TodoItem } from "./components/TodoItem";
import { Todo, TodoList } from "./types/todo";
import "./App.css";
import { useTheme } from "./hooks/useTheme";

const initialLists = [
  { id: "home", name: "Home", icon: "home" },
  { id: "completed", name: "Completed", icon: "check" },
  { id: "personal", name: "Personal", icon: "user" },
  { id: "work", name: "Work", icon: "briefcase" },
  { id: "diet", name: "Diet", icon: "diet" },
  { id: "books", name: "List of Book", icon: "book" },
  { id: "roadtrip", name: "Road trip list", icon: "car" },
];

function App() {
  const { theme, toggleTheme } = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<TodoList[]>(initialLists);
  const [selectedList, setSelectedList] = useState("home");
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [storagePath, setStoragePath] = useState<string>("");
  const [hideCompleted, setHideCompleted] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedPath = await invoke<string>("load_storage_path");
        setStoragePath(savedPath);
        console.log("Saved path:", savedPath);
        await loadLists();
        await loadTodos();
      } catch (err) {
        console.error("Error loading initial data:", err);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (width < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call it initially
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadLists = async () => {
    try {
      const loadedLists = await invoke<string>("load_lists");
      const parsedLists = JSON.parse(loadedLists);
      if (parsedLists && parsedLists.length > 0) {
        setLists(parsedLists);
      } else {
        setLists(initialLists);
        await saveList(initialLists);
      }
    } catch (err) {
      console.error("Error loading lists:", err);
      setLists(initialLists);
    }
  };

  const loadTodos = async () => {
    try {
      setLoading(true);
      const loadedTodos = await invoke<string>("load_todos");
      setTodos(JSON.parse(loadedTodos) || []);
      setError(null);
    } catch (err) {
      setError("Failed to load todos");
      console.error("Error loading todos:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveList = async (updatedLists: TodoList[]) => {
    try {
      await invoke("save_lists", { lists: JSON.stringify(updatedLists) });
    } catch (err) {
      console.error("Error saving lists:", err);
    }
  };

  const saveTodos = async (updatedTodos: Todo[]) => {
    try {
      await invoke("save_todos", { todo: JSON.stringify(updatedTodos) });
      setError(null);
    } catch (err) {
      setError("Failed to save todos");
      console.error("Error saving todos:", err);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const newTodoItem: Todo = {
      id: Date.now(),
      text: newTodo,
      completed: false,
      date: new Date().toISOString(),
      listId: selectedList,
    };

    try {
      const updatedTodos = [...todos, newTodoItem];
      setTodos(updatedTodos);
      await saveTodos(updatedTodos);
      setNewTodo("");
      setError(null);
    } catch (err) {
      setError("Failed to add todo");
    }
  };

  const toggleTodo = async (id: number) => {
    try {
      const updatedTodos = todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      );
      setTodos(updatedTodos);
      await saveTodos(updatedTodos);
      setError(null);
    } catch (err) {
      setError("Failed to update todo");
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      const updatedTodos = todos.filter((todo) => todo.id !== id);
      setTodos(updatedTodos);
      await saveTodos(updatedTodos);
      setError(null);
    } catch (err) {
      setError("Failed to delete todo");
    }
  };

  const createList = async (name: string) => {
    const newList: TodoList = {
      id: `list-${Date.now()}`,
      name,
      icon: "home",
    };
    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    await saveList(updatedLists);
  };

  const deleteList = async (id: string) => {
    if (id === "home" || id === "completed") {
      setError("Cannot delete default lists");
      return;
    }

    try {
      // Check if list has todos before deleting
      const hasTodos = await invoke<boolean>("has_todos_in_list", {
        listId: id,
      });
      if (hasTodos) {
        const confirmed = await confirm(
          "This list contains todos. Are you sure you want to delete it?",
          { title: "Delete List", kind: "warning" }
        );
        if (!confirmed) {
          return;
        }
      }

      const updatedLists = lists.filter((list) => list.id !== id);
      setLists(updatedLists);
      await saveList(updatedLists);
      if (selectedList === id) {
        setSelectedList("home");
      }
      const updatedTodos = todos.filter((todo) => todo.listId !== id);
      setTodos(updatedTodos);
      await saveTodos(updatedTodos);
    } catch (error) {
      setError("Failed to delete list");
      console.error("Error deleting list:", error);
    }
  };

  const editList = async (id: string, newName: string) => {
    if (id === "home" || id === "completed") {
      setError("Cannot edit default lists");
      return;
    }
    const updatedLists = lists.map((list) =>
      list.id === id ? { ...list, name: newName } : list
    );
    setLists(updatedLists);
    await saveList(updatedLists);
  };

  const editTodo = async (id: number, newText: string) => {
    try {
      const updatedTodos = todos.map((todo) =>
        todo.id === id
          ? { ...todo, text: newText, isEditing: false, editText: undefined }
          : todo
      );
      setTodos(updatedTodos);
      await saveTodos(updatedTodos);
      setError(null);
    } catch (err) {
      setError("Failed to edit todo");
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (selectedList === "completed") {
      return todo.completed;
    }
    if (selectedList === "home") {
      return !todo.completed;
    }
    if (hideCompleted) {
      return todo.listId === selectedList && !todo.completed;
    }
    return todo.listId === selectedList;
  });

  const todoCountByList = todos.reduce((acc, todo) => {
    if (todo.completed) {
      acc["completed"] = (acc["completed"] || 0) + 1;
    }
    if (!todo.completed) {
      acc["home"] = (acc["home"] || 0) + 1;
    }
    acc[todo.listId] = (acc[todo.listId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSetPath = async (path: string) => {
    try {
      await invoke("set_storage_path", { path });
      console.log("Storage path saved:", path);
      setStoragePath(path);
    } catch (error) {
      console.error("Failed to save storage path:", error);
    }
  };

  const renderContent = () => {
    if (selectedList === "settings") {
      return (
        <div className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8">
              Settings
            </h1>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      Theme
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                    role="switch"
                    aria-checked={theme === "dark" ? "true" : "false"}
                    aria-label="Toggle dark mode"
                  >
                    <span className="sr-only">Toggle theme</span>
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        theme === "dark" ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Storage Location
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Set custom path for storing todos and lists (leave empty for
                    default location)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={storagePath}
                      onChange={(e) => setStoragePath(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter storage path..."
                    />
                    <button
                      onClick={() => handleSetPath(storagePath)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
              {lists.find((list) => list.id === selectedList)?.name || "Todos"}
            </h1>

            {selectedList !== "completed" && selectedList !== "home" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {hideCompleted ? "Show completed" : "Hide completed"}
                </span>
                <button
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                  role="switch"
                  aria-checked={hideCompleted}
                >
                  <span
                    className={clsx(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      hideCompleted ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={addTodo} className="mb-8">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                className="flex-1 h-10 px-4 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Add a new todo..."
              />
              <button
                type="submit"
                className="h-10 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add
              </button>
            </div>
          </form>

          <AnimatePresence mode="popLayout">
            {filteredTodos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-center text-gray-500 dark:text-gray-400 py-8"
              >
                No todos yet. Add one above!
              </motion.div>
            ) : (
              <div className="space-y-2">
                {filteredTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                    onEdit={editTodo}
                    onEditStart={(id, text) => {
                      const updatedTodos = todos.map((t) =>
                        t.id === id
                          ? { ...t, isEditing: true, editText: text }
                          : t
                      );
                      setTodos(updatedTodos);
                    }}
                    onEditCancel={(id) => {
                      const updatedTodos = todos.map((t) =>
                        t.id === id
                          ? { ...t, isEditing: false, editText: undefined }
                          : t
                      );
                      setTodos(updatedTodos);
                    }}
                    onEditChange={(id, newText) => {
                      const updatedTodos = todos.map((t) =>
                        t.id === id ? { ...t, editText: newText } : t
                      );
                      setTodos(updatedTodos);
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 dark:from-gray-900 to-blue-50 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 dark:border-purple-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 dark:from-gray-900 to-blue-50 dark:to-gray-800">
      <Sidebar
        lists={lists}
        selectedList={selectedList}
        onSelectList={setSelectedList}
        onCreateList={createList}
        onDeleteList={deleteList}
        onEditList={editList}
        onSelectSettings={() => setSelectedList("settings")}
        todoCountByList={todoCountByList}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />

      <main
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft:
            windowWidth >= 768 && isSidebarOpen ? `${sidebarWidth}px` : "0",
          paddingTop:
            (!isSidebarOpen && windowWidth >= 768) || windowWidth < 768
              ? "4rem"
              : "1rem",
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
