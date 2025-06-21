import { useEffect, lazy, Suspense } from "react";
import clsx from "clsx";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners,
  rectIntersection,
  CollisionDetection,
} from "@dnd-kit/core";
import { Sidebar } from "./components/Sidebar.tsx";
import TodoItem from "./components/TodoItem";
import LoginForm from "./components/LoginForm";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import OfflineIndicator from "./components/OfflineIndicator";
import { useAuthStore } from "./store/authStore";
import { useTodoStore } from "./store/todoStore";
const EditTodoDialog = lazy(() => import("./components/EditTodoDialog"));
import LoadingIndicator from "./components/LoadingIndicator";
import SettingsView from "./components/SettingsView";
import TodoListView from "./components/TodoListView";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { Toaster } from "react-hot-toast";

function App() {
  const { user, loading: authLoading, initialize } = useAuthStore();
  const {
    selectedListId,
    loading,
    isSidebarOpen,
    sidebarWidth,
    windowWidth,
    activeDraggedTodo,
    isEditDialogOpen,
    todoToEditDialog,
    editTodo: editTodoInList,
    setIsSidebarOpen,
    setWindowWidth,
    closeEditDialog,
  } = useTodoStore();

  const { theme, toggleTheme } = useTheme();
  const { handleDragStart, handleDragEnd } = useDragAndDrop();

  // Custom collision detection that prioritizes sidebar lists over todo items
  const customCollisionDetection: CollisionDetection = (args) => {
    // Use rectangle intersection - works better for both directions than corners
    const rectCollisions = rectIntersection(args);

    if (rectCollisions.length > 0) {
      // Filter to prioritize sidebar lists (shorter width = sidebar items)
      const sidebarCollisions = rectCollisions.filter(collision => {
        const container = args.droppableContainers.find(c => c.id === collision.id);
        return container && container.rect.current && container.rect.current.width < 300; // Sidebar items are narrower
      });

      // If we have sidebar collisions, prioritize them
      if (sidebarCollisions.length > 0) {
        console.log('🎯 Sidebar collision prioritized:', sidebarCollisions.map(c => c.id));
        return sidebarCollisions;
      }

      // Otherwise return all collisions
      console.log('📝 Todo collision found:', rectCollisions.map(c => c.id));
      return rectCollisions;
    }

    // Fall back to corner-based detection as last resort
    return closestCorners(args);
  };

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

  // Listen for service worker sync completion messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          console.log(`Background sync completed: ${event.data.syncedCount} operations synced`);
        }
      });
    }
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
    await editTodoInList(id, {
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
    return <LoginForm />;
  }

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={clsx("app", theme)}>
        <Toaster position="top-right" />
        <OfflineIndicator />
        <div className="flex min-h-screen bg-gradient-to-br from-purple-50 dark:from-gray-900 to-blue-50 dark:to-gray-800">
          <Sidebar />

          <main
            className="flex-1 transition-all duration-300"
            style={{
              marginLeft:
                windowWidth >= 1024 && isSidebarOpen
                  ? `${sidebarWidth}px`
                  : "0",
              paddingTop:
                (!isSidebarOpen && windowWidth >= 1024) || windowWidth < 1024
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

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </DndContext>
  );
}

export default App;