import { useState, useEffect, lazy, Suspense } from "react";
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
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Sidebar } from "./components/Sidebar.tsx";
import TodoItem from "./components/TodoItem";
import LoginForm from "./components/LoginForm";
import { useAuthStore } from "./store/authStore";
import { useTodoStore } from "./store/todoStore";
const EditTodoDialog = lazy(() => import("./components/EditTodoDialog"));
import LoadingIndicator from "./components/LoadingIndicator";
import SettingsView from "./components/SettingsView";
import TodoListView from "./components/TodoListView";
import { Todo, TodoList } from "./types/todo";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { Toaster } from "react-hot-toast";

function App() {
  const { user, loading: authLoading, initialize } = useAuthStore();
  const {
    lists,
    selectedListId,
    loading,
    error,
    setSelectedListId,
    fetchLists,
    saveLists,
    setLists,
    addTodo: addTodoToList,
    toggleTodo: toggleTodoInList,
    deleteTodo: deleteTodoFromList,
    editTodo: editTodoInList,
  } = useTodoStore();

  const { theme, toggleTheme } = useTheme();
  const [newTodo, setNewTodo] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [activeDraggedTodo, setActiveDraggedTodo] = useState<Todo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [todoToEditDialog, setTodoToEditDialog] = useState<Todo | null>(null);
  const [dataInitialized, setDataInitialized] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user && !dataInitialized) {
      fetchLists(user);
      setDataInitialized(true);
    }
  }, [user, dataInitialized, fetchLists]);

  useEffect(() => {
    const currentList = lists.find((list) => list.id === selectedListId);
    setHideCompleted(!currentList?.showCompleted || false);
  }, [selectedListId, lists]);

  // Add this function to get filtered todos based on the showCompleted property
  const getFilteredTodos = () => {
    if (!selectedListId) return [];
    const currentList = lists.find((list) => list.id === selectedListId);
    if (!currentList) return [];

    return currentList.showCompleted
      ? currentList.todos
      : currentList.todos.filter((todo) => !todo.completed);
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log("Drag start - active.id:", event.active.id);
    const { active } = event;
    const draggedTodo = lists
      .flatMap((list) => list.todos)
      .find((todo) => todo.id === active.id);
    if (draggedTodo) {
      console.log("Found dragged todo:", draggedTodo.title);
      setActiveDraggedTodo(draggedTodo);
    } else {
      console.log("No todo found for active.id:", active.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log(
      "handleDragEnd called - active.id:",
      event.active.id,
      "over.id:",
      event.over?.id
    );
    const { active, over } = event;

    if (!over) {
      console.log("No over target, ending drag");
      setActiveDraggedTodo(null);
      return;
    }

    const todoId = active.id; // Keep as string/UUID
    let sourceTodo: Todo | undefined;
    let sourceListId: number | undefined;

    lists.forEach((list) => {
      const todo = list.todos.find((t) => t.id === todoId);
      if (todo) {
        sourceTodo = todo;
        sourceListId = list.id;
      }
    });

    if (!sourceTodo || !sourceListId) {
      console.log("No source todo or list found");
      setActiveDraggedTodo(null);
      return;
    }

    console.log(
      "Drag end - active.id:",
      active.id,
      "over.id:",
      over.id,
      "sourceListId:",
      sourceListId
    );

    // Check if over.id is a list ID (dropping on a different list)
    const targetList = lists.find((list) => list.id === over.id);
    if (targetList && over.id !== sourceListId) {
      console.log("Moving todo from list", sourceListId, "to list", over.id);
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
            todos: [...list.todos, { ...sourceTodo!, listId: Number(over.id) }],
          };
        }
        return list;
      });

      // Update local state immediately
      setLists(updatedLists);
      // Then save to database
      await saveLists(updatedLists);
    } else {
      // Check if over.id is a todo ID (reordering within the same list)
      const targetTodo = lists
        .flatMap((list) => list.todos)
        .find((todo) => todo.id === over.id);
      if (targetTodo && active.id !== over.id) {
        console.log(
          "Reordering within list - from todo",
          active.id,
          "to todo",
          over.id
        );
        const list = lists.find((l) => l.id === sourceListId)!;
        const oldIndex = list.todos.findIndex((t) => t.id === active.id);
        const newIndex = list.todos.findIndex((t) => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const updatedLists = lists.map((l) => {
            if (l.id === sourceListId) {
              const reorderedTodos = arrayMove(l.todos, oldIndex, newIndex);
              return { ...l, todos: reorderedTodos };
            }
            return l;
          });

          // Update local state immediately
          setLists(updatedLists);
          // Then save to database
          await saveLists(updatedLists);
        }
      }
    }

    setActiveDraggedTodo(null);
  };

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
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !selectedListId) return;

    const newTodoItem: Omit<Todo, "id"> = {
      title: newTodo,
      notes: "",
      completed: false,
      dateCreated: new Date(),
      priority: "medium",
      dueDate: undefined,
      dateOfCompletion: undefined,
      listId: selectedListId,
    };

    await addTodoToList(selectedListId, newTodoItem);
    setNewTodo("");
  };

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
    newDueDate?: Date
  ) => {
    if (!selectedListId) return;
    await editTodoInList(selectedListId, id, {
      title: newTitle,
      notes: newNotes,
      priority: newPriority,
      dueDate: newDueDate,
    });
    handleCloseEditDialog();
  };

  const renderContent = () => {
    if (selectedListId === 1000) {
      return <SettingsView theme={theme} toggleTheme={toggleTheme} />;
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
        filteredTodos={getFilteredTodos()}
        toggleTodo={(id) =>
          selectedListId
            ? toggleTodoInList(selectedListId, id)
            : Promise.resolve()
        }
        deleteTodo={(id) =>
          selectedListId
            ? deleteTodoFromList(selectedListId, id)
            : Promise.resolve()
        }
        editTodo={(id, title, notes, priority, dueDate) =>
          selectedListId
            ? editTodoInList(selectedListId, id, {
                title,
                notes,
                priority,
                dueDate,
              })
            : Promise.resolve()
        }
        handleOpenEditDialog={handleOpenEditDialog}
        saveLists={saveLists}
      />
    );
  };

  if (authLoading) {
    return <LoadingIndicator />;
  }

  if (!user) {
    return <LoginForm onSuccess={() => {}} />;
  }

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={clsx("app", theme)}>
        <Toaster position="top-right" />
        <div className="flex min-h-screen bg-gradient-to-br from-purple-50 dark:from-gray-900 to-blue-50 dark:to-gray-800">
          <Sidebar
            lists={lists}
            selectedList={selectedListId}
            onSelectList={setSelectedListId}
            onCreateList={async (name) => {
              const newList: TodoList = {
                id: Math.floor(Math.random() * 1000000), // Generate a temporary ID
                name,
                icon: "home",
                todos: [],
                showCompleted: true,
              };
              await saveLists([...lists, newList]);
            }}
            onDeleteList={async (id) => {
              const updatedLists = lists.filter((l) => l.id !== id);
              await saveLists(updatedLists);
            }}
            onEditList={async (id, newName) => {
              const updatedLists = lists.map((l) =>
                l.id === id ? { ...l, name: newName } : l
              );
              await saveLists(updatedLists);
            }}
            onSelectSettings={() => setSelectedListId(1000)}
            todoCountByList={{}}
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
                  ) => {}}
                  onOpenEditDialog={() => {}}
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
