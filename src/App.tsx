import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { PlusIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Sidebar } from "./components/sidebar";
import { TodoItem } from "./components/TodoItem";
import { Todo, TodoList } from "./types/todo";
import "./App.css";
import { useTheme } from "./hooks/useTheme";

const initialLists: TodoList[] = [
  { id: "home", name: "Home", icon: "home", todos: [] },
  { id: "completed", name: "Completed", icon: "check", todos: [] },
  { id: "personal", name: "Personal", icon: "user", todos: [] },
  { id: "work", name: "Work", icon: "briefcase", todos: [] },
  { id: "diet", name: "Diet", icon: "diet", todos: [] },
  { id: "books", name: "List of Book", icon: "book", todos: [] },
  { id: "roadtrip", name: "Road trip list", icon: "car", todos: [] },
];

function App() {
  const { theme, toggleTheme } = useTheme();
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
  const [activeDraggedTodo, setActiveDraggedTodo] = useState<Todo | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedTodo = lists
      .flatMap((list) => list.todos)
      .find((todo) => todo.id === active.id);
    if (draggedTodo) {
      setActiveDraggedTodo(draggedTodo);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const todoId = Number(active.id);
    let sourceTodo: Todo | undefined;
    let sourceListId: string | undefined;

    // Find the todo and its source list
    lists.forEach((list) => {
      const todo = list.todos.find((t) => t.id === todoId);
      if (todo) {
        sourceTodo = todo;
        sourceListId = list.id;
      }
    });

    if (!sourceTodo || !sourceListId) return;

    // If dropping on a different list
    if (typeof over.id === "string" && over.id !== sourceListId) {
      const updatedLists = lists.map((list) => {
        if (list.id === sourceListId) {
          return {
            ...list,
            todos: list.todos.filter((t) => t.id !== todoId),
          };
        }
        if (list.id === over.id) {
          return {
            ...list,
            todos: [...list.todos, { ...sourceTodo!, listId: over.id }],
          };
        }
        return list;
      });
      setLists(updatedLists);
      await saveList(updatedLists);
    }
    // If reordering within the same list
    else if (typeof over.id === "number" && active.id !== over.id) {
      const list = lists.find((l) => l.id === sourceListId)!;
      const oldIndex = list.todos.findIndex((t) => t.id === active.id);
      const newIndex = list.todos.findIndex((t) => t.id === over.id);

      const updatedLists = lists.map((l) => {
        if (l.id === sourceListId) {
          const reorderedTodos = arrayMove(l.todos, oldIndex, newIndex);
          return { ...l, todos: reorderedTodos };
        }
        return l;
      });
      setLists(updatedLists);
      await saveList(updatedLists);
    }

    setActiveDraggedTodo(null);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedPath = await invoke<string>("load_storage_path");
        setStoragePath(savedPath);
        console.log("Saved path:", savedPath);
        await loadLists();
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
      setLoading(true);
      const loadedLists = await invoke<string>("load_lists");
      const parsedLists = JSON.parse(loadedLists);
      if (parsedLists && parsedLists.length > 0) {
        setLists(parsedLists);
      } else {
        setLists(initialLists);
        await saveList(initialLists);
      }
      setError(null);
    } catch (err) {
      console.error("Error loading lists:", err);
      setLists(initialLists);
      setError("Failed to load lists");
    } finally {
      setLoading(false);
    }
  };

  const saveList = async (updatedLists: TodoList[]) => {
    try {
      await invoke("save_lists", { lists: JSON.stringify(updatedLists) });
      setError(null);
    } catch (err) {
      console.error("Error saving lists:", err);
      setError("Failed to save lists");
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
      const updatedLists = lists.map((list) =>
        list.id === selectedList
          ? { ...list, todos: [...list.todos, newTodoItem] }
          : list
      );
      setLists(updatedLists);
      await saveList(updatedLists);
      setNewTodo("");
      setError(null);
    } catch (err) {
      setError("Failed to add todo");
    }
  };

  const toggleTodo = async (id: number) => {
    try {
      const updatedLists = lists.map((list) => ({
        ...list,
        todos: list.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ),
      }));
      setLists(updatedLists);
      await saveList(updatedLists);
      setError(null);
    } catch (err) {
      setError("Failed to update todo");
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      const updatedLists = lists.map((list) => ({
        ...list,
        todos: list.todos.filter((todo) => todo.id !== id),
      }));
      setLists(updatedLists);
      await saveList(updatedLists);
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
      todos: [],
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
      const listToDelete = lists.find((list) => list.id === id);
      if (listToDelete && listToDelete.todos.length > 0) {
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
      const updatedLists = lists.map((list) => ({
        ...list,
        todos: list.todos.map((todo) =>
          todo.id === id
            ? { ...todo, text: newText, isEditing: false, editText: undefined }
            : todo
        ),
      }));
      setLists(updatedLists);
      await saveList(updatedLists);
      setError(null);
    } catch (err) {
      setError("Failed to edit todo");
    }
  };

  const filteredTodos =
    selectedList === "completed"
      ? lists
          .filter((list) => list && list.todos)
          .flatMap((list) => list.todos.filter((todo) => todo.completed))
      : selectedList === "home"
      ? lists
          .filter((list) => list && list.todos)
          .flatMap((list) => list.todos.filter((todo) => !todo.completed))
      : lists
          .find((list) => list && list.id === selectedList)
          ?.todos?.filter((todo) => !hideCompleted || !todo.completed) ?? [];

  const todoCountByList = lists
    .filter((list) => list && list.todos)
    .reduce((acc, list) => {
      // Count completed todos
      const completedCount = list.todos.filter((todo) => todo.completed).length;
      acc["completed"] = (acc["completed"] || 0) + completedCount;

      // Count incomplete todos
      const incompleteCount = list.todos.filter(
        (todo) => !todo.completed
      ).length;
      acc["home"] = (acc["home"] || 0) + incompleteCount;

      // Count all todos in the list
      acc[list.id] = list.todos.length;
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
                    aria-checked={theme === "dark"}
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
                  aria-label="Toggle completed todos visibility"
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                layout
              >
                <SortableContext
                  items={filteredTodos.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {filteredTodos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={toggleTodo}
                        onDelete={deleteTodo}
                        onEdit={editTodo}
                        onEditStart={(id, text) => {
                          const updatedTodos = lists.map((list) => ({
                            ...list,
                            todos: list.todos.map((t) =>
                              t.id === id
                                ? { ...t, isEditing: true, editText: text }
                                : t
                            ),
                          }));
                          setLists(updatedTodos);
                        }}
                        onEditCancel={(id) => {
                          const updatedTodos = lists.map((list) => ({
                            ...list,
                            todos: list.todos.map((t) =>
                              t.id === id
                                ? {
                                    ...t,
                                    isEditing: false,
                                    editText: undefined,
                                  }
                                : t
                            ),
                          }));
                          setLists(updatedTodos);
                        }}
                        onEditChange={(id, newText) => {
                          const updatedTodos = lists.map((list) => ({
                            ...list,
                            todos: list.todos.map((t) =>
                              t.id === id ? { ...t, editText: newText } : t
                            ),
                          }));
                          setLists(updatedTodos);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </motion.div>
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={clsx("app", theme)}>
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
        <DragOverlay>
          {activeDraggedTodo ? (
            <div className="dragged-todo-overlay">
              <TodoItem
                todo={activeDraggedTodo}
                onToggle={async () => {}}
                onDelete={async () => {}}
                onEdit={async () => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default App;
