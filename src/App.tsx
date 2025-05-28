import { useState, useEffect, lazy, Suspense } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
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
import { arrayMove } from "@dnd-kit/sortable";
import { Sidebar } from "./components/Sidebar.tsx";
import TodoItem from "./components/TodoItem";
const EditTodoDialog = lazy(() => import("./components/EditTodoDialog"));
import LoadingIndicator from "./components/LoadingIndicator";
import SettingsView from "./components/SettingsView";
import TodoListView from "./components/TodoListView";
import { Todo, TodoList } from "./types/todo";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { isTauri } from "./utils/environment";
import { initialLists } from "./const/initialLists";
import {
  processLoadedLists,
  serializeListsForSave,
  getFilteredTodos,
  calculateTodoCountByList,
} from "./utils/helper";

function App() {
  const { theme, toggleTheme } = useTheme();
  const [lists, setLists] = useState<TodoList[]>(initialLists);
  const [selectedListId, setSelectedListId] = useState<number>(
    initialLists[0].id
  );
  // const filteredTodos = useMemo(() => {
  //   const currentList = getListById(lists, selectedList);
  //   if (!currentList) return [];
  //   return getFilteredTodos(lists, selectedList, currentList.showCompleted);
  // }, [lists, selectedList]);

  // const todoCounts = useMemo(() => calculateTodoCountByList(lists), [lists]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [storagePath, setStoragePath] = useState<string>("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [activeDraggedTodo, setActiveDraggedTodo] = useState<Todo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // Added state
  const [todoToEditDialog, setTodoToEditDialog] = useState<Todo | null>(null); // Added state

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    const currentList = lists.find((list) => list.id === selectedListId);
    setHideCompleted(!currentList?.showCompleted || false);
  }, [selectedListId, lists]);

  // const handleHideCompletedToggle = async () => {
  //   const newHideCompleted = !hideCompleted;
  //   setHideCompleted(newHideCompleted);

  //   const updatedLists = lists.map((list) =>
  //     list.id === selectedList
  //       ? { ...list, isCompletedHidden: newHideCompleted }
  //       : list
  //   );
  //   setLists(updatedLists);
  //   await saveList(updatedLists);
  // };

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
    let sourceListId: number | undefined;

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
    if (over.id !== sourceListId) {
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
            todos: [...list.todos, { ...sourceTodo! }],
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
        if (isTauri()) {
          // Tauri-specific code
          const savedPath = await import("@tauri-apps/api/core").then(
            ({ invoke }) => invoke<string>("load_storage_path")
          );
          setStoragePath(await savedPath);
          await loadLists();
        } else {
          // Web-specific code (e.g., using localStorage)
          const savedLists = localStorage.getItem("lists");
          if (savedLists) {
            const parsedLists = processLoadedLists(JSON.parse(savedLists));
            setLists(parsedLists);
          } else {
            // For initialLists, ensure dates are Date objects if they are strings
            const processedInitialLists = processLoadedLists(
              initialLists.map((list) => ({
                ...list,
                todos: list.todos.map((todo) => ({ ...todo })),
              }))
            ); // Ensure deep copy for processing
            setLists(processedInitialLists);
            // Save the processed initial lists, not the original initialLists which might have string dates
            localStorage.setItem(
              "lists",
              JSON.stringify(
                processedInitialLists.map((list) => ({
                  ...list,
                  todos: list.todos.map((todo) => ({
                    ...todo,
                    dateCreated: todo.dateCreated.toISOString(),
                    dueDate: todo.dueDate
                      ? todo.dueDate.toISOString()
                      : undefined,
                    dateOfCompletion: todo.dateOfCompletion
                      ? todo.dateOfCompletion.toISOString()
                      : undefined,
                  })),
                }))
              )
            );
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        setLoading(false);
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
      const loadedListsString = await import("@tauri-apps/api/core").then(
        ({ invoke }) => invoke<string>("load_lists")
      );
      const rawLists = JSON.parse(await loadedListsString);

      const loadedAndProcessedLists = processLoadedLists(rawLists);

      if (loadedAndProcessedLists && loadedAndProcessedLists.length > 0) {
        setLists(loadedAndProcessedLists);
      } else {
        // For initialLists, ensure dates are Date objects if they are strings
        const processedInitialLists = processLoadedLists(
          initialLists.map((list) => ({
            ...list,
            todos: list.todos.map((todo) => ({ ...todo })),
          }))
        ); // Ensure deep copy
        setLists(processedInitialLists);
        await saveList(processedInitialLists); // Save the processed initial lists
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

  const saveList = async (listsToSave: TodoList[]) => {
    try {
      const serializableLists = serializeListsForSave(listsToSave);

      if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("save_lists", {
          lists: JSON.stringify(serializableLists),
        });
      } else {
        localStorage.setItem("lists", JSON.stringify(serializableLists));
      }
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
      title: newTodo,
      notes: "",
      completed: false,
      dateCreated: new Date(),
      priority: "medium", // Added default
      dueDate: undefined,
      dateOfCompletion: undefined,
    };

    try {
      const updatedLists = lists.map((list) =>
        list.id === selectedListId
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
          todo.id === id
            ? {
                ...todo,
                completed: !todo.completed,
                dateOfCompletion: !todo.completed // Set dateOfCompletion if todo is now completed
                  ? new Date()
                  : undefined, // Clear if todo is now incomplete
              }
            : todo
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
      id: Date.now(),
      name,
      icon: "home",
      todos: [],
      showCompleted: false,
    };
    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    await saveList(updatedLists);
  };

  const deleteList = async (id: number) => {
    const listName = lists.find((list) => list.id === id)?.name;
    if (!listName) return;
    if (listName === "home" || listName === "completed") {
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
      if (selectedListId === id) {
        setSelectedListId(lists[0].id);
      }
    } catch (error) {
      setError("Failed to delete list");
      console.error("Error deleting list:", error);
    }
  };

  const editList = async (id: number, newName: string) => {
    // TODO : default lists to enum (home, completed)
    if (id === 1 || id === 2) {
      setError("Cannot edit default lists");
      return;
    }
    const updatedLists = lists.map((list) =>
      list.id === id ? { ...list, name: newName } : list
    );
    setLists(updatedLists);
    await saveList(updatedLists);
  };

  const editTodo = async (
    id: number,
    newTitle: string,
    newNotes?: string,
    newPriority?: "low" | "medium" | "high",
    newDueDate?: Date // Changed from string to Date
  ) => {
    try {
      const updatedLists = lists.map((list) => ({
        ...list,
        todos: list.todos.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                title: newTitle,
                notes: newNotes ?? todo.notes,
                priority: newPriority ?? todo.priority,
                dueDate: newDueDate !== undefined ? newDueDate : todo.dueDate, // Ensure newDueDate is used if provided
              }
            : todo
        ),
      }));
      setLists(updatedLists);
      await saveList(updatedLists);
      setError(null);
    } catch (err) {
      // Fixed: Added opening brace
      setError("Failed to edit todo");
    }
  };

  // Dialog handlers
  const handleOpenEditDialog = (todo: Todo) => {
    setTodoToEditDialog(todo);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setTodoToEditDialog(null);
    setIsEditDialogOpen(false);
  };

  const handleSaveEditDialog = async (
    id: number,
    newTitle: string,
    newNotes?: string,
    newPriority?: "low" | "medium" | "high",
    newDueDate?: Date // Changed from string to Date
  ) => {
    await editTodo(id, newTitle, newNotes, newPriority, newDueDate);
    handleCloseEditDialog();
  };

  const filteredTodos = getFilteredTodos(lists, selectedListId, hideCompleted);

  const todoCountByList = calculateTodoCountByList(lists);

  const handleSetPath = async (path: string) => {
    try {
      if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("set_storage_path", { path });
      }
      console.log("Storage path saved:", path);
      setStoragePath(path);
    } catch (error) {
      console.error("Failed to save storage path:", error);
    }
  };

  const renderContent = () => {
    //TODO : handle settings differently - it's not a list
    if (selectedListId === 1000) {
      return (
        <SettingsView
          theme={theme}
          toggleTheme={toggleTheme}
          storagePath={storagePath}
          setStoragePath={setStoragePath}
          handleSetPath={handleSetPath}
        />
      );
    }

    return (
      <TodoListView
        lists={lists}
        setLists={setLists}
        selectedList={selectedListId}
        error={error}
        addTodo={addTodo}
        newTodo={newTodo}
        setNewTodo={setNewTodo}
        filteredTodos={filteredTodos}
        toggleTodo={toggleTodo}
        deleteTodo={deleteTodo}
        editTodo={editTodo}
        handleOpenEditDialog={handleOpenEditDialog}
      />
    );
  };

  if (loading) {
    return <LoadingIndicator />;
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
            selectedList={selectedListId}
            onSelectList={setSelectedListId}
            onCreateList={createList}
            onDeleteList={deleteList}
            onEditList={editList}
            onSelectSettings={() => setSelectedListId(1000)}
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
              {activeDraggedTodo && (
                <TodoItem
                  todo={activeDraggedTodo}
                  onToggle={async () => {}}
                  onDelete={async () => {}}
                  onEdit={async (
                    _id,
                    _title,
                    _notes,
                    _priority,
                    _dueDate
                  ) => {}} // Matched signature
                  onOpenEditDialog={() => {}} // No-op for dragged item
                />
              )}
            </div>
          ) : null}
        </DragOverlay>
        <Suspense fallback={<div>Loading dialog...</div>}>
          <EditTodoDialog
            isOpen={isEditDialogOpen}
            todoToEdit={todoToEditDialog}
            onSave={handleSaveEditDialog}
            onCancel={handleCloseEditDialog}
          />
        </Suspense>
      </div>
    </DndContext>
  );
}

export default App;
