import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PlusIcon, TrashIcon, CheckIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import clsx from "clsx";
import "./App.css";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  date: string;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTodos();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Tauri Todo App
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={addTodo} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          {todos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-500 py-8"
            >
              No todos yet. Add one above!
            </motion.div>
          ) : (
            todos.map((todo) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="mb-3"
              >
                <div
                  className={clsx(
                    "p-4 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center gap-4",
                    todo.completed && "bg-gray-50"
                  )}
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={clsx(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                      todo.completed
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300"
                    )}
                  >
                    {todo.completed && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </button>

                  <div className="flex-1">
                    <p
                      className={clsx(
                        "text-gray-800",
                        todo.completed && "line-through text-gray-500"
                      )}
                    >
                      {todo.text}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(todo.date), "MMM d, yyyy - HH:mm")}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50"
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
}

export default App;
