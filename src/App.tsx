import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PlusIcon, TrashIcon, CheckIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import clsx from "clsx";
import { Sidebar } from "./components/sidebar";
import { Todo, TodoList } from "./types/todo";
import "./App.css";

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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<TodoList[]>(initialLists);
  const [selectedList, setSelectedList] = useState("home");
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [sidebarWidth, setSidebarWidth] = useState(256);

  useEffect(() => {
    loadTodos();
    loadLists();
    // Load saved theme
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

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
    const updatedLists = lists.filter((list) => list.id !== id);
    setLists(updatedLists);
    await saveList(updatedLists);
    if (selectedList === id) {
      setSelectedList("home");
    }
    const updatedTodos = todos.filter((todo) => todo.listId !== id);
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
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

  const filteredTodos = todos.filter((todo) =>
    selectedList === "completed"
      ? todo.completed
      : selectedList === "home"
      ? !todo.completed
      : todo.listId === selectedList
  );

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

  const renderContent = () => {
    if (selectedList === "settings") {
      return (
        <div className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8">
              Settings
            </h1>

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
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8">
            {lists.find((list) => list.id === selectedList)?.name || "Todos"}
          </h1>

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
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Add a new todo..."
              />
              <button
                type="submit"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center gap-2"
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
                className="text-center text-gray-500 dark:text-gray-400 py-8"
              >
                No todos yet. Add one above!
              </motion.div>
            ) : (
              filteredTodos.map((todo) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="mb-3"
                >
                  <div
                    className={clsx(
                      "p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4",
                      todo.completed && "bg-gray-50 dark:bg-gray-900"
                    )}
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                        todo.completed
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300 dark:border-gray-500"
                      )}
                    >
                      {todo.completed && (
                        <CheckIcon className="w-4 h-4 text-white" />
                      )}
                    </button>

                    <div className="flex-1">
                      <p
                        className={clsx(
                          "text-gray-800 dark:text-gray-100",
                          todo.completed &&
                            "line-through text-gray-500 dark:text-gray-400"
                        )}
                      >
                        {todo.text}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(todo.date), "MMM d, yyyy - HH:mm")}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900"
                      title="Delete todo"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
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
            window.innerWidth >= 768
              ? isSidebarOpen
                ? `${sidebarWidth}px`
                : "0"
              : "0",
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
