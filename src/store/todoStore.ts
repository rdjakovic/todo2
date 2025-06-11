import { create } from "zustand";
import { TodoList, Todo } from "../types/todo";
import { supabase } from "../lib/supabase";
import { initialLists } from "../const/initialLists";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";
import { useAuthStore } from "./authStore";

interface TodoState {
  lists: TodoList[];
  todos: Todo[];
  selectedListId: string;
  loading: boolean;
  error: string | null;

  // Form state
  newTodo: string;

  // Edit dialog state
  isEditDialogOpen: boolean;
  todoToEditDialog: Todo | null;

  // UI state
  isSidebarOpen: boolean;
  sidebarWidth: number;
  windowWidth: number;

  // Drag and drop state
  activeDraggedTodo: Todo | null;

  // Actions
  setLists: (lists: TodoList[]) => void;
  setTodos: (todos: Todo[]) => void;
  setSelectedListId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setNewTodo: (newTodo: string) => void;
  setIsEditDialogOpen: (isOpen: boolean) => void;
  setTodoToEditDialog: (todo: Todo | null) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setWindowWidth: (width: number) => void;
  setActiveDraggedTodo: (todo: Todo | null) => void;

  // Todo operations
  fetchLists: (user: User) => Promise<void>;
  fetchTodos: (user: User) => Promise<void>;
  saveLists: (listsToSave: TodoList[]) => Promise<void>;
  saveTodos: (todos: Todo[]) => Promise<void>;
  loadFromLocalStorage: () => Promise<void>;
  addTodo: (listId: string, todo: Omit<Todo, "id">) => Promise<void>;
  toggleTodo: (todoId: string) => Promise<void>;
  deleteTodo: (listId: string, todoId: string) => Promise<void>;
  editTodo: (
    listId: string,
    todoId: string,
    updates: Partial<Todo>
  ) => Promise<void>;
  reset: () => void;

  // Helper functions
  getCurrentList: () => TodoList | undefined;
  getFilteredTodos: () => Todo[];
  getTodoCountByList: () => Record<string, number>;
  openEditDialog: (todo: Todo) => void;
  closeEditDialog: () => void;
  addTodoFromForm: (e: React.FormEvent) => Promise<void>;
  createList: (name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  editList: (id: string, name: string, icon?: string) => Promise<void>;
  toggleSidebar: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  lists: [],
  todos: [],
  selectedListId: "home",
  loading: false,
  error: null,

  // Form state
  newTodo: "",

  // Edit dialog state
  isEditDialogOpen: false,
  todoToEditDialog: null,

  // UI state
  isSidebarOpen:
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  sidebarWidth: 256,
  windowWidth: typeof window !== "undefined" ? window.innerWidth : 1024,

  // Drag and drop state
  activeDraggedTodo: null,

  setLists: (lists) => set({ lists }),
  setTodos: (todos) => set({ todos }),
  setSelectedListId: (id) => set({ selectedListId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setNewTodo: (newTodo) => set({ newTodo }),
  setIsEditDialogOpen: (isOpen) => set({ isEditDialogOpen: isOpen }),
  setTodoToEditDialog: (todo) => set({ todoToEditDialog: todo }),
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setWindowWidth: (width) => set({ windowWidth: width }),
  setActiveDraggedTodo: (todo) => set({ activeDraggedTodo: todo }),

  // New reset function to clear state and localStorage
  reset: () => {
    localStorage.removeItem("todo-lists");
    localStorage.removeItem("todos");
    set({
      lists: [],
      todos: [],
      selectedListId: "home",
      loading: false,
      error: null,
      newTodo: "",
      isEditDialogOpen: false,
      todoToEditDialog: null,
      activeDraggedTodo: null,
    });
  },

  fetchLists: async (user) => {
    set({ loading: true });
    try {
      // First try to fetch from Supabase
      let { data: lists, error } = await supabase
        .from("lists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // If no lists exist, create initial lists
      if (lists?.length === 0) {
        const { error: insertError } = await supabase.from("lists").insert(
          initialLists.map((list) => ({
            name: list.name,
            icon: list.icon,
            show_completed: list.showCompleted,
            user_id: user.id,
          }))
        );

        if (insertError) throw insertError;

        // Fetch the newly inserted lists
        const { data: newData, error: refetchError } = await supabase
          .from("lists")
          .select("*")
          .eq("user_id", user.id)
          .order("id");

        if (refetchError) throw refetchError;
        lists = newData;
      }

      const processedLists = lists?.map((list) => ({
        ...list,
        showCompleted: list.show_completed,
        id: list.id,
        userId: list.user_id,
      }));

      // Set the selectedListId to the Home list's UUID
      const homeList = processedLists?.find(
        (list) => list.name.toLowerCase() === "home"
      );

      set({
        lists: processedLists,
        selectedListId: homeList?.id || "home",
        loading: false,
        error: null,
      });

      // Fetch todos separately
      await get().fetchTodos(user);

      toast.success("Connection to database successful!");
      localStorage.setItem("todo-lists", JSON.stringify(processedLists));
    } catch (error) {
      console.error("Failed to fetch from Supabase:", error);
      // Try to load from localStorage with migration support
      await get().loadFromLocalStorage();
    }
  },

  fetchTodos: async (user) => {
    try {
      const { data: todosData, error: todosError } = await supabase
        .from("todos")
        .select(
          "id, list_id, title, notes, completed, priority, date_created, due_date, date_of_completion"
        )
        .order("date_created");

      if (todosError) throw todosError;

      const processedTodos =
        todosData?.map((todo) => ({
          id: todo.id,
          listId: todo.list_id,
          title: todo.title,
          notes: todo.notes,
          completed: todo.completed,
          priority: todo.priority,
          dateCreated: new Date(todo.date_created),
          dueDate: todo.due_date ? new Date(todo.due_date) : undefined,
          dateOfCompletion: todo.date_of_completion
            ? new Date(todo.date_of_completion)
            : undefined,
        })) || [];

      set({ todos: processedTodos });
      localStorage.setItem("todos", JSON.stringify(processedTodos));
    } catch (error) {
      console.error("Failed to fetch todos from Supabase:", error);
      // Try to load from localStorage
      const localTodos = localStorage.getItem("todos");
      if (localTodos) {
        const todos = JSON.parse(localTodos);
        set({ todos });
      }
    }
  },

  saveTodos: async (todos) => {
    try {
      // Get current user from auth store
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const { error: todosError } = await supabase.from("todos").upsert(
        todos.map((todo) => ({
          id: todo.id,
          list_id: todo.listId,
          title: todo.title,
          notes: todo.notes,
          completed: todo.completed,
          priority: todo.priority,
          date_created: todo.dateCreated.toISOString(),
          due_date: todo.dueDate?.toISOString(),
          date_of_completion: todo.dateOfCompletion?.toISOString(),
        }))
      );

      if (todosError) throw todosError;

      localStorage.setItem("todos", JSON.stringify(todos));
      set({ error: null, todos }); // Update local state directly
    } catch (error) {
      console.error("Failed to save todos to Supabase:", error);
      localStorage.setItem("todos", JSON.stringify(todos));
      set({ error: "Failed to save todos to database, saved locally", todos }); // Update local state directly
      toast.error("Failed to save todos to database, saved locally");
    }
  },

  loadFromLocalStorage: async () => {
    try {
      // Check for old format first (migration)
      const oldData = localStorage.getItem("lists");
      if (oldData) {
        const oldLists = JSON.parse(oldData);
        // Check if this is old format (has todos property)
        if (oldLists.length > 0 && oldLists[0].todos) {
          // Migrate old format to new format
          const lists = oldLists.map(({ todos, ...list }: any) => list);
          const todos = oldLists.flatMap((list: any) => list.todos || []);

          set({ lists, todos, loading: false, error: null });

          // Save in new format
          localStorage.setItem("todo-lists", JSON.stringify(lists));
          localStorage.setItem("todos", JSON.stringify(todos));
          localStorage.removeItem("lists"); // Remove old format

          toast("Migrated data to new format!");
          return;
        }
      }

      // Load new format
      const listsData = localStorage.getItem("todo-lists");
      const todosData = localStorage.getItem("todos");

      if (listsData || todosData) {
        const lists = listsData ? JSON.parse(listsData) : [];
        const todos = todosData ? JSON.parse(todosData) : [];
        set({ lists, todos, loading: false, error: null });
        toast("Loaded data from local storage!");
      } else {
        set({ error: "No data found", loading: false });
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
      set({ error: "Failed to load local data", loading: false });
    }
  },

  saveLists: async (listsToSave) => {
    try {
      // Get current user from auth store
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Get the current full list of lists
      const allCurrentLists = get().lists;

      const { error: listsError } = await supabase.from("lists").upsert(
        listsToSave.map(({ showCompleted, ...list }) => ({
          id: list.id,
          name: list.name,
          icon: list.icon,
          show_completed: showCompleted,
          user_id: currentUser.id,
        })),
        { onConflict: "id" }
      );

      if (listsError) throw listsError;

      // Update the current lists with the changes from listsToSave
      const updatedLists = allCurrentLists.map((list) => {
        // Find if this list was updated
        const updatedList = listsToSave.find((l) => l.id === list.id);
        // If it was updated, return the updated version, otherwise keep the original
        return updatedList || list;
      });

      // Only update localStorage if we're saving all lists
      if (listsToSave.length === allCurrentLists.length) {
        localStorage.setItem("todo-lists", JSON.stringify(listsToSave));
      } else {
        // Update just the changed lists in localStorage
        const currentLists = JSON.parse(
          localStorage.getItem("todo-lists") || "[]"
        );
        const updatedLocalLists = currentLists.map((list: TodoList) => {
          const updatedList = listsToSave.find((l) => l.id === list.id);
          return updatedList || list;
        });
        localStorage.setItem("todo-lists", JSON.stringify(updatedLocalLists));
      }
      
      // Update state with the merged lists that include both updated and non-updated lists
      set({ error: null, lists: updatedLists });
    } catch (error) {
      console.error("Failed to save lists to Supabase:", error);
      
      // Even in case of error, we need to update the state correctly
      const allCurrentLists = get().lists;
      const updatedLists = allCurrentLists.map((list) => {
        const updatedList = listsToSave.find((l) => l.id === list.id);
        return updatedList || list;
      });
      
      localStorage.setItem("todo-lists", JSON.stringify(updatedLists));
      set({ 
        lists: updatedLists, 
        error: "Failed to save lists to database, saved locally" 
      });
      toast.error("Failed to save lists to database, saved locally");
    }
  },

  addTodo: async (listId, todo) => {
    const { todos } = get();
    const newTodo = {
      ...todo,
      id: crypto.randomUUID(),
      listId,
    };
    try {
      const { error } = await supabase.from("todos").insert([
        {
          id: newTodo.id,
          list_id: newTodo.listId,
          title: newTodo.title,
          notes: newTodo.notes,
          completed: newTodo.completed,
          priority: newTodo.priority,
          date_created: newTodo.dateCreated.toISOString(),
          due_date: newTodo.dueDate?.toISOString(),
          date_of_completion: newTodo.dateOfCompletion?.toISOString(),
        },
      ]);

      if (error) throw error;

      const updatedTodos = [...todos, newTodo];
      set({ todos: updatedTodos, error: null });
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
    } catch (error) {
      const updatedTodos = [...todos, newTodo];
      set({
        todos: updatedTodos,
        error: "Failed to save to database, saved locally",
      });
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
      toast.error("Failed to save to database, saved locally");
    }
  },

  toggleTodo: async (todoId) => {
    const { todos } = get();
    const todo = todos.find((t) => t.id === todoId);

    if (!todo) return;

    const updatedTodo = {
      ...todo,
      completed: !todo.completed,
      dateOfCompletion: !todo.completed ? new Date() : undefined,
    };

    try {
      const { error } = await supabase
        .from("todos")
        .update({
          completed: updatedTodo.completed,
          date_of_completion: updatedTodo.dateOfCompletion?.toISOString(),
        })
        .eq("id", todoId);

      if (error) throw error;

      const updatedTodos = todos.map((t) =>
        t.id === todoId ? updatedTodo : t
      );

      set({ todos: updatedTodos, error: null });
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
    } catch (error) {
      const updatedTodos = todos.map((t) =>
        t.id === todoId ? updatedTodo : t
      );
      set({
        todos: updatedTodos,
        error: "Failed to save to database, saved locally",
      });
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
      toast.error("Failed to save to database, saved locally");
    }
  },

  deleteTodo: async (listId, todoId) => {
    const { todos } = get();

    try {
      const { error } = await supabase.from("todos").delete().eq("id", todoId);

      if (error) throw error;

      const updatedTodos = todos.filter((t) => t.id !== todoId);

      set({ todos: updatedTodos, error: null });
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
    } catch (error) {
      const updatedTodos = todos.filter((t) => t.id !== todoId);
      set({
        todos: updatedTodos,
        error: "Failed to save to database, saved locally",
      });
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
      toast.error("Failed to save to database, saved locally");
    }
  },

  editTodo: async (listId, todoId, updates) => {
    const { todos } = get();
    const todo = todos.find((t) => t.id === todoId);

    if (!todo) return;

    const updatedTodo = {
      ...todo,
      ...updates,
    };

    try {
      const payload: any = {
        title: updates.title,
        notes: updates.notes,
        completed: updates.completed,
        priority: updates.priority,
      };

      if (updates.dueDate !== undefined) {
        payload.due_date = updates.dueDate?.toISOString();
      }
      if (updates.dateOfCompletion !== undefined) {
        payload.date_of_completion = updates.dateOfCompletion?.toISOString();
      }
      if (updates.dateCreated !== undefined) {
        payload.date_created = updates.dateCreated.toISOString();
      }

      const { error } = await supabase
        .from("todos")
        .update(payload)
        .eq("id", todoId);

      if (error) throw error;

      const updatedTodos = todos.map((t) =>
        t.id === todoId ? updatedTodo : t
      );

      set({ todos: updatedTodos, error: null });
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
    } catch (error) {
      const updatedTodos = todos.map((t) =>
        t.id === todoId ? updatedTodo : t
      );
      set({
        todos: updatedTodos,
        error: "Failed to save to database, saved locally",
      });
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
      toast.error("Failed to save to database, saved locally");
    }
  },

  // Helper functions
  getCurrentList: () => {
    const { lists, selectedListId } = get();
    return lists.find((list) => list.id === selectedListId);
  },

  getFilteredTodos: () => {
    const { todos, lists, selectedListId } = get();
    const currentList = lists.find((list) => list.id === selectedListId);
    if (!currentList) return [];

    const listTodos = todos.filter((todo) => todo.listId === selectedListId);
    return currentList.showCompleted
      ? listTodos
      : listTodos.filter((todo) => !todo.completed);
  },

  getTodoCountByList: () => {
    const { todos } = get();
    const counts: Record<string, number> = {};
    todos.forEach((todo) => {
      if (!counts[todo.listId]) {
        counts[todo.listId] = 0;
      }
      if (!todo.completed) {
        counts[todo.listId]++;
      }
    });
    return counts;
  },

  openEditDialog: (todo: Todo) => {
    set({
      todoToEditDialog: todo,
      isEditDialogOpen: true,
    });
  },

  closeEditDialog: () => {
    set({
      todoToEditDialog: null,
      isEditDialogOpen: false,
    });
  },

  addTodoFromForm: async (e: React.FormEvent) => {
    e.preventDefault();
    const { newTodo, selectedListId, addTodo } = get();

    if (!newTodo.trim()) return;

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

    await addTodo(selectedListId, newTodoItem);
    set({ newTodo: "" });
  },

  createList: async (name: string) => {
    const { lists, saveLists } = get();
    // Get current user from auth store
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const newList: TodoList = {
      id: crypto.randomUUID(),
      name,
      icon: "home",
      showCompleted: true,
      userId: currentUser.id,
    };
    await saveLists([...lists, newList]);
  },

  deleteList: async (id: string) => {
    const { lists, todos, saveLists, saveTodos } = get();

    try {
      // First delete the todos belonging to this list from Supabase
      const { error: todosDeleteError } = await supabase
        .from("todos")
        .delete()
        .eq("list_id", id);

      if (todosDeleteError) throw todosDeleteError;

      // Then delete the list itself from Supabase
      const { error: listDeleteError } = await supabase
        .from("lists")
        .delete()
        .eq("id", id);

      if (listDeleteError) throw listDeleteError;

      // Update local state after successful database operations
      const updatedLists = lists.filter((l) => l.id !== id);
      const updatedTodos = todos.filter((t) => t.listId !== id);

      set({ lists: updatedLists, todos: updatedTodos, error: null });

      // Keep these as fallback for offline support
      localStorage.setItem("todo-lists", JSON.stringify(updatedLists));
      localStorage.setItem("todos", JSON.stringify(updatedTodos));
    } catch (error) {
      console.error("Failed to delete from Supabase:", error);
      // Fallback to local-only deletion
      const updatedLists = lists.filter((l) => l.id !== id);
      const updatedTodos = todos.filter((t) => t.listId !== id);

      await saveLists(updatedLists);
      await saveTodos(updatedTodos);

      toast.error("Failed to delete from database, updated locally");
    }
  },

  editList: async (id: string, name: string, icon?: string) => {
    const { lists, saveLists } = get();
    const updatedLists = lists.map((l) => 
      l.id === id ? { ...l, name, ...(icon && { icon }) } : l
    );
    await saveLists(updatedLists);
  },

  toggleSidebar: () => {
    const { isSidebarOpen, setIsSidebarOpen } = get();
    setIsSidebarOpen(!isSidebarOpen);
  },
}));