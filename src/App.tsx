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
import { initialLists } from "./const/initialLists";
import { Toaster } from 'react-hot-toast';

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
    addTodo: addTodoToList,
    toggleTodo: toggleTodoInList,
    deleteTodo: deleteTodoFromList,
    editTodo: editTodoInList
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

  useEffect(() => {
    const currentList = lists.find((list) => list.id === selectedListId);
    setHideCompleted(!currentList?.showCompleted || false);
  }, [selectedListId, lists]);

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
    }
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

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const newTodoItem: Omit<Todo, 'id'> = {
      title: newTodo,
      notes: "",
      completed: false,
      dateCreated: new Date(),
      priority: "medium",
      dueDate: undefined,
      dateOfCompletion: undefined,
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
      return (
        <SettingsView
          theme={theme}
          toggleTheme={toggleTheme}
          storagePath=""
          setStoragePath={() => {}}
          handleSetPath={() => {}}
        />
      );
    }

    return (
      <TodoListView
        lists={lists}
        selectedList={selectedListId}
        error={error}
        addTodo={addTodo}
        newTodo={newTodo}
        setNewTodo={setNewTodo}
        filteredTodos={lists.find(l => l.id === selectedListId)?.todos || []}
        toggleTodo={(id) => toggleTodoInList(selectedListId, id)}
        deleteTodo={(id) => deleteTodoFromList(selectedListId, id)}
        editTodo={(id, title, notes, priority, dueDate) => 
          editTodoInList(selectedListId, id, { title, notes, priority, dueDate })}
        handleOpenEditDialog={handleOpenEditDialog}
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
      collisionDetection={closestCenter}
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
              const newList: Partial<TodoList> = {
                name,
                icon: "home",
                todos: [],
                showCompleted: true,
              };
              await saveLists([...lists, newList]);
            }}
            onDeleteList={async (id) => {
              const updatedLists = lists.filter(l => l.id !== id);
              await saveLists(updatedLists);
            }}
            onEditList={async (id, newName) => {
              const updatedLists = lists.map(l =>
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