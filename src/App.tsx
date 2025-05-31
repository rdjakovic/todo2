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
import { Todo } from "./types/todo";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { Toaster } from "react-hot-toast";

function App() {
  const { user, loading: authLoading, initialize } = useAuthStore();
  const {
    lists,
    selectedListId,
    loading,
    isSidebarOpen,
    sidebarWidth,
    windowWidth,
    activeDraggedTodo,
    isEditDialogOpen,
    todoToEditDialog,
    fetchLists,
    saveLists,
    editTodo: editTodoInList,
    setIsSidebarOpen,
    setWindowWidth,
    setActiveDraggedTodo,
    closeEditDialog,
  } = useTodoStore();

  const { theme, toggleTheme } = useTheme();
  const [dataInitialized, setDataInitialized] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

    const todoId = active.id;
    let sourceTodo: Todo | undefined;
    let sourceListId: string | undefined;

    lists.forEach((list) => {
      const todo = list.todos.find((t) => t.id === todoId);
      if (todo) {
        sourceTodo = todo;
        sourceListId = list.id;
      }
    });

    if (!sourceTodo || !sourceListId) return;

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
      await saveLists(updatedLists);
    } else if (active.id !== over.id) {
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
      await saveLists(updatedLists);
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

  const handleSaveEditDialog = async (
    id: string,
    newTitle: string,
    newNotes?: string,
    newPriority?: "low" | "medium" | "high",
    newDueDate?: Date
  ) => {
    await editTodoInList(selectedListId, id, {
      title: newTitle,
      notes: newNotes,
      priority: newPriority,
      dueDate: newDueDate,
    });
    closeEditDialog();
  };

  const renderContent = () => {
    if (selectedListId === "settings") {
      return <SettingsView theme={theme} toggleTheme={toggleTheme} />;
    }

    return <TodoListView />;
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
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={clsx("app", theme)}>
        <Toaster position="top-right" />
        <div className="flex min-h-screen bg-gradient-to-br from-purple-50 dark:from-gray-900 to-blue-50 dark:to-gray-800">
          <Sidebar />

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
            onCancel={closeEditDialog}
          />
        </Suspense>
      </div>
    </DndContext>
  );
}

export default App;
