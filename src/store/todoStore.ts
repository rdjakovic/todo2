import { create } from "zustand";
import { TodoList, Todo } from "../types/todo";
import { supabase } from "../lib/supabase";
import { initialLists } from "../const/initialLists";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";
import { useAuthStore } from "./authStore";
import { indexedDBManager, registerBackgroundSync, isOnline } from "../lib/indexedDB";

export type SortOption = 
  | "dateCreated" 
  | "priority" 
  | "dateCompleted" 
  | "completedFirst" 
  | "completedLast"
  | "dueDate";

interface TodoState {
  lists: TodoList[];
  todos: Todo[];
  selectedListId: string;
  loading: boolean;
  error: string | null;
  isOffline: boolean;

  // Form state
  newTodo: string;

  // Search state
  searchQuery: string;

  // Edit dialog state
  isEditDialogOpen: boolean;
  todoToEditDialog: Todo | null;

  // UI state
  isSidebarOpen: boolean;
  sidebarWidth: number;
  windowWidth: number;

  // Drag and drop state
  activeDraggedTodo: Todo | null;

  // Sorting settings
  sortBy: SortOption;

  // Actions
  setLists: (lists: TodoList[]) => void;
  setTodos: (todos: Todo[]) => void;
  setSelectedListId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsOffline: (offline: boolean) => void;
  setNewTodo: (newTodo: string) => void;
  setSearchQuery: (query: string) => void;
  setIsEditDialogOpen: (isOpen: boolean) => void;
  setTodoToEditDialog: (todo: Todo | null) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setWindowWidth: (width: number) => void;
  setActiveDraggedTodo: (todo: Todo | null) => void;
  setSortBy: (sortBy: SortOption) => void;

  // Todo operations
  fetchLists: (user: User) => Promise<void>;
  fetchTodos: () => Promise<void>;
  saveLists: (listsToSave: TodoList[]) => Promise<void>;
  saveTodos: (todos: Todo[]) => Promise<void>;
  addTodo: (listId: string, todo: Omit<Todo, "id">) => Promise<void>;
  toggleTodo: (todoId: string) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  editTodo: (
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
  createList: (name: string, icon?: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  editList: (id: string, name: string, icon?: string) => Promise<void>;
  toggleSidebar: () => void;

  // Offline sync functions
  syncPendingOperations: () => Promise<void>;
}

// Helper function to sort todos based on sort option
const sortTodos = (todos: Todo[], sortBy: SortOption): Todo[] => {
  const sortedTodos = [...todos];
  
  switch (sortBy) {
    case "dateCreated":
      return sortedTodos.sort((a, b) => 
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
      );
    
    case "priority":
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return sortedTodos.sort((a, b) => {
        const aPriority = priorityOrder[a.priority || "low"];
        const bPriority = priorityOrder[b.priority || "low"];
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // High priority first
        }
        // If same priority, sort by date created (newest first)
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      });
    
    case "dateCompleted":
      return sortedTodos.sort((a, b) => {
        // Completed items first, sorted by completion date (newest first)
        if (a.completed && b.completed) {
          if (a.dateOfCompletion && b.dateOfCompletion) {
            return new Date(b.dateOfCompletion).getTime() - new Date(a.dateOfCompletion).getTime();
          }
          return 0;
        }
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        // If both incomplete, sort by date created
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      });
    
    case "completedFirst":
      return sortedTodos.sort((a, b) => {
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        // If same completion status, sort by date created
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      });
    
    case "completedLast":
      return sortedTodos.sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        // If same completion status, sort by date created
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      });
    
    case "dueDate":
      return sortedTodos.sort((a, b) => {
        // Items with due dates come first, sorted by due date (earliest first)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        // If both have no due date, sort by date created
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      });
    
    default:
      return sortedTodos;
  }
};

// Helper function to filter todos by search query
const filterTodosBySearch = (todos: Todo[], searchQuery: string): Todo[] => {
  if (!searchQuery.trim()) {
    return todos;
  }

  const query = searchQuery.toLowerCase().trim();
  return todos.filter((todo) => {
    return (
      todo.title.toLowerCase().includes(query) ||
      (todo.notes && todo.notes.toLowerCase().includes(query))
    );
  });
};

export const useTodoStore = create<TodoState>((set, get) => ({
  lists: [],
  todos: [],
  selectedListId: "all",
  loading: false,
  error: null,
  isOffline: !isOnline(),

  // Form state
  newTodo: "",

  // Search state
  searchQuery: "",

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

  // Sorting settings - load from localStorage or default to dateCreated (keep this as user preference)
  sortBy: (typeof window !== "undefined" ? 
    (localStorage.getItem("todo-sort-by") as SortOption) || "dateCreated" : 
    "dateCreated"),

  setLists: (lists) => set({ lists }),
  setTodos: (todos) => set({ todos }),
  setSelectedListId: (id) => set({ selectedListId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setIsOffline: (offline) => set({ isOffline: offline }),
  setNewTodo: (newTodo) => set({ newTodo }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsEditDialogOpen: (isOpen) => set({ isEditDialogOpen: isOpen }),
  setTodoToEditDialog: (todo) => set({ todoToEditDialog: todo }),
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setWindowWidth: (width) => set({ windowWidth: width }),
  setActiveDraggedTodo: (todo) => set({ activeDraggedTodo: todo }),
  setSortBy: (sortBy) => {
    set({ sortBy });
    // Keep localStorage for user preferences like sorting
    if (typeof window !== "undefined") {
      localStorage.setItem("todo-sort-by", sortBy);
    }
  },

  // Reset function - only clear sorting preference, no list/todo data
  reset: () => {
    // Only clear user preferences, not data
    if (typeof window !== "undefined") {
      localStorage.removeItem("todo-sort-by");
    }
    // Clear IndexedDB data on reset (but don't await it to avoid blocking)
    indexedDBManager.clearAllData().catch(console.error);
    
    set({
      lists: [],
      todos: [],
      selectedListId: "all",
      loading: false,
      error: null,
      isOffline: !isOnline(),
      newTodo: "",
      searchQuery: "",
      isEditDialogOpen: false,
      todoToEditDialog: null,
      activeDraggedTodo: null,
      sortBy: "dateCreated",
    });
  },

  fetchLists: async (user) => {
    set({ loading: true });
    
    // Ensure we have a valid authenticated user before loading any data
    if (!user) {
      console.error("No authenticated user provided to fetchLists");
      set({ loading: false, error: "Authentication required" });
      return;
    }
    
    try {
      // First, try to load from IndexedDB for immediate UI update
      const offlineData = await indexedDBManager.hasOfflineData();
      if (offlineData.hasLists) {
        console.log("Loading lists from IndexedDB...");
        const offlineLists = await indexedDBManager.getLists();
        
        // Verify that offline data belongs to the current user
        const userLists = offlineLists.filter(list => list.user_id === user.id);
        if (userLists.length === 0 && offlineLists.length > 0) {
          // Data belongs to different user, clear it
          console.log("Clearing IndexedDB data for different user");
          await indexedDBManager.clearAllData();
        } else if (userLists.length > 0) {
        // Process offline lists
        const processedLists = userLists.map((list) => ({
          ...list,
          showCompleted: list.show_completed,
          userId: list.user_id,
        }));

        // Create the "All" list as a client-side only list
        const allList: TodoList = {
          id: "all",
          name: "All",
          icon: "home",
          showCompleted: true,
          userId: user.id,
        };

        const allLists = [allList, ...processedLists];
        const sortedLists = allLists.sort((a, b) => {
          if (a.name.toLowerCase() === "all") return -1;
          if (b.name.toLowerCase() === "all") return 1;
          if (a.name.toLowerCase() === "completed") return -1;
          if (b.name.toLowerCase() === "completed") return 1;
          const aDate = new Date(a.created_at || 0);
          const bDate = new Date(b.created_at || 0);
          return aDate.getTime() - bDate.getTime();
        });

        set({
          lists: sortedLists,
          selectedListId: "all",
          loading: false,
        });

        // Load todos from IndexedDB too
        if (offlineData.hasTodos) {
          const offlineTodos = await indexedDBManager.getTodos();
          // Filter todos to only include those belonging to current user's lists
          const userTodos = offlineTodos.filter(todo => 
            userLists.some(list => list.id === todo.listId)
          );
          set({ todos: userTodos });
        }

        toast.success("Loaded data from offline storage");
        }
      }

      // Then try to sync with Supabase if online
      if (isOnline()) {
        console.log("Syncing with Supabase...");
        let { data: lists, error } = await supabase
          .from("lists")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        // If no lists exist in Supabase, create initial lists
        if (lists?.length === 0) {
          const listsToInsert = initialLists.filter(list => list.name !== "All");
          const { error: insertError } = await supabase.from("lists").insert(
            listsToInsert.map((list) => ({
              name: list.name,
              icon: list.icon,
              show_completed: list.showCompleted,
              user_id: user.id,
            }))
          );

          if (insertError) throw insertError;

          const { data: newData, error: refetchError } = await supabase
            .from("lists")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });

          if (refetchError) throw refetchError;
          lists = newData;
        }

        // Process and update lists
        const processedLists = lists?.map((list) => ({
          ...list,
          showCompleted: list.show_completed,
          id: list.id,
          userId: list.user_id,
        }));

        const allList: TodoList = {
          id: "all",
          name: "All",
          icon: "home",
          showCompleted: true,
          userId: user.id,
        };

        const allLists = [allList, ...(processedLists || [])];
        const sortedLists = allLists.sort((a, b) => {
          if (a.name.toLowerCase() === "all") return -1;
          if (b.name.toLowerCase() === "all") return 1;
          if (a.name.toLowerCase() === "completed") return -1;
          if (b.name.toLowerCase() === "completed") return 1;
          const aDate = new Date(a.created_at || 0);
          const bDate = new Date(b.created_at || 0);
          return aDate.getTime() - bDate.getTime();
        });

        set({
          lists: sortedLists,
          selectedListId: "all",
          loading: false,
          error: null,
          isOffline: false,
        });

        // Save to IndexedDB for offline access
        await indexedDBManager.saveLists(lists || []);

        // Fetch and sync todos
        await get().fetchTodos();

        // Sync any pending operations
        await get().syncPendingOperations();

        toast.success("Data synced successfully!");
      } else {
        set({ isOffline: true, loading: false });
        if (!offlineData.hasLists) {
          toast.error("No internet connection and no offline data available");
        }
      }
    } catch (error) {
      console.error("Failed to fetch lists:", error);
      set({ 
        error: "Failed to load data", 
        loading: false,
        isOffline: !isOnline(),
      });
      
      // Try to load from offline storage as fallback
      try {
        const offlineData = await indexedDBManager.hasOfflineData();
        if (offlineData.hasLists) {
          const offlineLists = await indexedDBManager.getLists();
          const processedLists = offlineLists.map((list) => ({
            ...list,
            showCompleted: list.show_completed,
            userId: list.user_id,
          }));

          const allList: TodoList = {
            id: "all",
            name: "All",
            icon: "home",
            showCompleted: true,
            userId: user.id,
          };

          const allLists = [allList, ...processedLists];
          set({ lists: allLists });
          
          if (offlineData.hasTodos) {
            const offlineTodos = await indexedDBManager.getTodos();
            set({ todos: offlineTodos });
          }
          
          toast.error("Using offline data - sync will resume when online");
        } else {
          toast.error("Failed to load data and no offline backup available");
        }
      } catch (offlineError) {
        console.error("Failed to load offline data:", offlineError);
        toast.error("Failed to load data from database");
      }
    }
  },

  fetchTodos: async () => {
    try {
      if (isOnline()) {
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

        set({ todos: processedTodos, isOffline: false });
        
        // Save to IndexedDB for offline access
        await indexedDBManager.saveTodos(processedTodos);
      }
    } catch (error) {
      console.error("Failed to fetch todos from Supabase:", error);
      set({ error: "Failed to load todos from database", isOffline: !isOnline() });
      
      // Try to load from IndexedDB as fallback
      try {
        const offlineTodos = await indexedDBManager.getTodos();
        set({ todos: offlineTodos });
        toast.error("Using offline todos - sync will resume when online");
      } catch (offlineError) {
        console.error("Failed to load offline todos:", offlineError);
        toast.error("Failed to load todos from database");
      }
    }
  },

  saveTodos: async (todos) => {
    // Update local state immediately
    set({ todos });
    
    try {
      // Save to IndexedDB immediately
      await indexedDBManager.saveTodos(todos);
      
      if (isOnline()) {
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

        set({ error: null, isOffline: false });
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'saveTodos',
          data: { todos },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
        toast.success("Saved offline - will sync when online");
      }
    } catch (error) {
      console.error("Failed to save todos:", error);
      set({ error: "Failed to save todos", isOffline: !isOnline() });
      
      // Still queue for sync even if Supabase fails
      try {
        await indexedDBManager.addToSyncQueue({
          type: 'saveTodos',
          data: { todos },
        });
        await registerBackgroundSync();
        toast.error("Saved offline - will retry sync when online");
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to save todos");
      }
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

      // Update local state immediately
      const updatedLists = allCurrentLists.map((list) => {
        const updatedList = listsToSave.find((l) => l.id === list.id);
        return updatedList || list;
      });
      set({ lists: updatedLists });

      // Filter out the "All" list as it's a client-side only virtual list
      const dbListsToSave = listsToSave.filter(list => list.name !== "All");
      
      // Save to IndexedDB immediately
      await indexedDBManager.saveLists(dbListsToSave);

      if (isOnline()) {
        const { error: listsError } = await supabase.from("lists").upsert(
          dbListsToSave.map(({ showCompleted, ...list }) => ({
            id: list.id,
            name: list.name,
            icon: list.icon,
            show_completed: showCompleted,
            user_id: currentUser.id,
          })),
          { onConflict: "id" }
        );

        if (listsError) throw listsError;

        set({ error: null, isOffline: false });
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'saveLists',
          data: { lists: dbListsToSave },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
        toast.success("Saved offline - will sync when online");
      }
    } catch (error) {
      console.error("Failed to save lists:", error);
      
      // Still update local state and queue for sync
      const allCurrentLists = get().lists;
      const updatedLists = allCurrentLists.map((list) => {
        const updatedList = listsToSave.find((l) => l.id === list.id);
        return updatedList || list;
      });
      
      set({ 
        lists: updatedLists, 
        error: "Failed to save lists",
        isOffline: !isOnline(),
      });
      
      try {
        const dbListsToSave = listsToSave.filter(list => list.name !== "All");
        await indexedDBManager.addToSyncQueue({
          type: 'saveLists',
          data: { lists: dbListsToSave },
        });
        await registerBackgroundSync();
        toast.error("Saved offline - will retry sync when online");
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to save lists");
      }
    }
  },

  addTodo: async (listId, todo) => {
    const { todos } = get();
    const newTodo = {
      ...todo,
      id: crypto.randomUUID(),
      listId,
    };
    
    // Update local state immediately
    const updatedTodos = [...todos, newTodo];
    set({ todos: updatedTodos });
    
    try {
      // Save to IndexedDB immediately
      await indexedDBManager.saveTodos(updatedTodos);
      
      if (isOnline()) {
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

        set({ error: null, isOffline: false });
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'addTodo',
          data: { listId, todo: newTodo },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
        toast.success("Added offline - will sync when online");
      }
    } catch (error) {
      console.error("Failed to add todo:", error);
      set({ error: "Failed to add todo", isOffline: !isOnline() });
      
      try {
        await indexedDBManager.addToSyncQueue({
          type: 'addTodo',
          data: { listId, todo: newTodo },
        });
        await registerBackgroundSync();
        toast.error("Added offline - will retry sync when online");
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to add todo");
      }
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

    // Update local state immediately
    const updatedTodos = todos.map((t) =>
      t.id === todoId ? updatedTodo : t
    );
    set({ todos: updatedTodos });

    try {
      // Save to IndexedDB immediately
      await indexedDBManager.saveTodos(updatedTodos);
      
      if (isOnline()) {
        const { error } = await supabase
          .from("todos")
          .update({
            completed: updatedTodo.completed,
            date_of_completion: updatedTodo.dateOfCompletion?.toISOString(),
          })
          .eq("id", todoId);

        if (error) throw error;

        set({ error: null, isOffline: false });
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'toggleTodo',
          data: { todoId, completed: updatedTodo.completed, dateOfCompletion: updatedTodo.dateOfCompletion },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
      }
    } catch (error) {
      console.error("Failed to toggle todo:", error);
      set({ error: "Failed to update todo", isOffline: !isOnline() });
      
      try {
        await indexedDBManager.addToSyncQueue({
          type: 'toggleTodo',
          data: { todoId, completed: updatedTodo.completed, dateOfCompletion: updatedTodo.dateOfCompletion },
        });
        await registerBackgroundSync();
        if (isOnline()) {
          toast.error("Update failed - will retry sync when online");
        }
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to update todo");
      }
    }
  },

  deleteTodo: async (todoId) => {
    const { todos } = get();

    // Update local state immediately
    const updatedTodos = todos.filter((t) => t.id !== todoId);
    set({ todos: updatedTodos });

    try {
      // Save to IndexedDB immediately
      await indexedDBManager.saveTodos(updatedTodos);
      
      if (isOnline()) {
        const { error } = await supabase.from("todos").delete().eq("id", todoId);

        if (error) throw error;

        set({ error: null, isOffline: false });
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'deleteTodo',
          data: { todoId },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
      }
    } catch (error) {
      console.error("Failed to delete todo:", error);
      set({ error: "Failed to delete todo", isOffline: !isOnline() });
      
      try {
        await indexedDBManager.addToSyncQueue({
          type: 'deleteTodo',
          data: { todoId },
        });
        await registerBackgroundSync();
        if (isOnline()) {
          toast.error("Delete failed - will retry sync when online");
        }
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to delete todo");
      }
    }
  },

  editTodo: async (todoId, updates) => {
    const { todos } = get();
    const todo = todos.find((t) => t.id === todoId);

    if (!todo) return;

    const updatedTodo = {
      ...todo,
      ...updates,
    };

    // Update local state immediately
    const updatedTodos = todos.map((t) =>
      t.id === todoId ? updatedTodo : t
    );
    set({ todos: updatedTodos });

    try {
      // Save to IndexedDB immediately
      await indexedDBManager.saveTodos(updatedTodos);
      
      if (isOnline()) {
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

        set({ error: null, isOffline: false });
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'editTodo',
          data: { todoId, updates },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
      }
    } catch (error) {
      console.error("Failed to edit todo:", error);
      set({ error: "Failed to update todo", isOffline: !isOnline() });
      
      try {
        await indexedDBManager.addToSyncQueue({
          type: 'editTodo',
          data: { todoId, updates },
        });
        await registerBackgroundSync();
        if (isOnline()) {
          toast.error("Update failed - will retry sync when online");
        }
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to update todo");
      }
    }
  },

  // Helper functions
  getCurrentList: () => {
    const { lists, selectedListId } = get();
    return lists.find((list) => list.id === selectedListId);
  },

  getFilteredTodos: () => {
    const { todos, lists, selectedListId, sortBy, searchQuery } = get();
    const currentList = lists.find((list) => list.id === selectedListId);
    if (!currentList) return [];

    let filteredTodos: Todo[] = [];

    // Special handling for "All" list - show all todos from all lists
    if (currentList.name.toLowerCase() === "all") {
      filteredTodos = currentList.showCompleted
        ? todos
        : todos.filter((todo) => !todo.completed);
    }
    // Special handling for "Completed" list - show all completed todos from all lists
    else if (currentList.name.toLowerCase() === "completed") {
      filteredTodos = todos.filter((todo) => todo.completed);
    }
    // For other lists, filter by listId and showCompleted setting
    else {
      const listTodos = todos.filter((todo) => todo.listId === selectedListId);
      filteredTodos = currentList.showCompleted
        ? listTodos
        : listTodos.filter((todo) => !todo.completed);
    }

    // Apply search filter
    const searchFilteredTodos = filterTodosBySearch(filteredTodos, searchQuery);

    // Apply sorting
    return sortTodos(searchFilteredTodos, sortBy);
  },

  getTodoCountByList: () => {
    const { todos, lists } = get();
    const counts: Record<string, number> = {};
    
    // Initialize counts for all lists
    lists.forEach((list) => {
      counts[list.id] = 0;
    });
    
    todos.forEach((todo) => {
      // For regular lists, count incomplete todos
      if (!todo.completed && counts.hasOwnProperty(todo.listId)) {
        counts[todo.listId]++;
      }
    });
    
    // Special handling for "All" list - count all incomplete todos
    const allList = lists.find((list) => list.name.toLowerCase() === "all");
    if (allList) {
      counts[allList.id] = allList.showCompleted 
        ? todos.length 
        : todos.filter((todo) => !todo.completed).length;
    }
    
    // Special handling for "Completed" list - count all completed todos
    const completedList = lists.find((list) => list.name.toLowerCase() === "completed");
    if (completedList) {
      counts[completedList.id] = todos.filter((todo) => todo.completed).length;
    }
    
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

  createList: async (name: string, icon: string = "home") => {
    const { lists } = get();
    // Get current user from auth store
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const newList: TodoList = {
      id: crypto.randomUUID(),
      name,
      icon,
      showCompleted: true,
      userId: currentUser.id,
    };
    
    // Update local state immediately
    const updatedLists = [...lists, newList];
    set({ lists: updatedLists });
    
    try {
      // Save to IndexedDB immediately
      await indexedDBManager.saveLists([newList]);
      
      if (isOnline()) {
        // Save to Supabase
        const { error } = await supabase.from("lists").insert([
          {
            id: newList.id,
            name: newList.name,
            icon: newList.icon,
            show_completed: newList.showCompleted,
            user_id: currentUser.id,
          },
        ]);

        if (error) throw error;

        set({ error: null, isOffline: false });
        toast.success("List created successfully!");
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'createList',
          data: { list: newList },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
        toast.success("List created offline - will sync when online");
      }
    } catch (error) {
      console.error("Failed to create list:", error);
      set({ error: "Failed to create list", isOffline: !isOnline() });
      
      try {
        await indexedDBManager.addToSyncQueue({
          type: 'createList',
          data: { list: newList },
        });
        await registerBackgroundSync();
        toast.error("List created offline - will retry sync when online");
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to create list");
      }
    }
  },

  deleteList: async (id: string) => {
    const { lists, todos } = get();

    // Prevent deletion of "All" list
    const listToDelete = lists.find(l => l.id === id);
    if (listToDelete?.name.toLowerCase() === "all") {
      toast.error("Cannot delete the All list");
      return;
    }
    
    // Update local state immediately
    const updatedLists = lists.filter((l) => l.id !== id);
    const updatedTodos = todos.filter((t) => t.listId !== id);
    set({ lists: updatedLists, todos: updatedTodos });
    
    try {
      // Save to IndexedDB immediately
      await indexedDBManager.saveLists(updatedLists.filter(l => l.name !== "All"));
      await indexedDBManager.saveTodos(updatedTodos);
      
      if (isOnline()) {
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

        set({ error: null, isOffline: false });
        toast.success("List deleted successfully!");
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'deleteList',
          data: { listId: id },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
        toast.success("List deleted offline - will sync when online");
      }
    } catch (error) {
      console.error("Failed to delete list:", error);
      set({ error: "Failed to delete list", isOffline: !isOnline() });
      
      try {
        await indexedDBManager.addToSyncQueue({
          type: 'deleteList',
          data: { listId: id },
        });
        await registerBackgroundSync();
        toast.error("List deleted offline - will retry sync when online");
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to delete list");
      }
    }
  },

  editList: async (id: string, name: string, icon?: string) => {
    const { lists } = get();
    
    // Prevent editing of "All" list
    const listToEdit = lists.find(l => l.id === id);
    if (listToEdit?.name.toLowerCase() === "all") {
      toast.error("Cannot edit the All list");
      return;
    }
    
    const updatedLists = lists.map((l) => 
      l.id === id ? { ...l, name, ...(icon && { icon }) } : l
    );
    
    // Update local state immediately
    set({ lists: updatedLists });
    
    try {
      // Save to IndexedDB immediately
      const dbLists = updatedLists.filter(l => l.name !== "All");
      await indexedDBManager.saveLists(dbLists);
      
      if (isOnline()) {
        await get().saveLists(updatedLists);
      } else {
        // Queue for sync when online
        await indexedDBManager.addToSyncQueue({
          type: 'editList',
          data: { listId: id, name, icon },
        });
        await registerBackgroundSync();
        set({ isOffline: true });
        toast.success("List updated offline - will sync when online");
      }
    } catch (error) {
      console.error("Failed to edit list:", error);
      set({ error: "Failed to update list", isOffline: !isOnline() });
      
      try {
        await indexedDBManager.addToSyncQueue({
          type: 'editList',
          data: { listId: id, name, icon },
        });
        await registerBackgroundSync();
        toast.error("List updated offline - will retry sync when online");
      } catch (queueError) {
        console.error("Failed to queue operation:", queueError);
        toast.error("Failed to update list");
      }
    }
  },

  toggleSidebar: () => {
    const { isSidebarOpen, setIsSidebarOpen } = get();
    setIsSidebarOpen(!isSidebarOpen);
  },

  // Sync pending operations
  syncPendingOperations: async () => {
    if (!isOnline()) return;

    try {
      const pendingOperations = await indexedDBManager.getSyncQueue();
      console.log(`Syncing ${pendingOperations.length} pending operations...`);

      for (const operation of pendingOperations) {
        try {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) continue;

          switch (operation.type) {
            case 'addTodo':
              await supabase.from("todos").insert([
                {
                  id: operation.data.todo.id,
                  list_id: operation.data.todo.listId,
                  title: operation.data.todo.title,
                  notes: operation.data.todo.notes,
                  completed: operation.data.todo.completed,
                  priority: operation.data.todo.priority,
                  date_created: operation.data.todo.dateCreated.toISOString(),
                  due_date: operation.data.todo.dueDate?.toISOString(),
                  date_of_completion: operation.data.todo.dateOfCompletion?.toISOString(),
                },
              ]);
              break;

            case 'toggleTodo':
              await supabase
                .from("todos")
                .update({
                  completed: operation.data.completed,
                  date_of_completion: operation.data.dateOfCompletion?.toISOString(),
                })
                .eq("id", operation.data.todoId);
              break;

            case 'deleteTodo':
              await supabase.from("todos").delete().eq("id", operation.data.todoId);
              break;

            case 'editTodo':
              const payload: any = {
                title: operation.data.updates.title,
                notes: operation.data.updates.notes,
                completed: operation.data.updates.completed,
                priority: operation.data.updates.priority,
              };

              if (operation.data.updates.dueDate !== undefined) {
                payload.due_date = operation.data.updates.dueDate?.toISOString();
              }
              if (operation.data.updates.dateOfCompletion !== undefined) {
                payload.date_of_completion = operation.data.updates.dateOfCompletion?.toISOString();
              }
              if (operation.data.updates.dateCreated !== undefined) {
                payload.date_created = operation.data.updates.dateCreated.toISOString();
              }

              await supabase
                .from("todos")
                .update(payload)
                .eq("id", operation.data.todoId);
              break;

            case 'createList':
              await supabase.from("lists").insert([
                {
                  id: operation.data.list.id,
                  name: operation.data.list.name,
                  icon: operation.data.list.icon,
                  show_completed: operation.data.list.showCompleted,
                  user_id: currentUser.id,
                },
              ]);
              break;

            case 'deleteList':
              await supabase.from("todos").delete().eq("list_id", operation.data.listId);
              await supabase.from("lists").delete().eq("id", operation.data.listId);
              break;

            case 'editList':
              await supabase.from("lists").update({
                name: operation.data.name,
                ...(operation.data.icon && { icon: operation.data.icon }),
              }).eq("id", operation.data.listId);
              break;

            case 'saveTodos':
              await supabase.from("todos").upsert(
                operation.data.todos.map((todo: any) => ({
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
              break;

            case 'saveLists':
              await supabase.from("lists").upsert(
                operation.data.lists.map((list: any) => ({
                  id: list.id,
                  name: list.name,
                  icon: list.icon,
                  show_completed: list.showCompleted,
                  user_id: currentUser.id,
                })),
                { onConflict: "id" }
              );
              break;
          }

          // Remove successfully synced operation
          await indexedDBManager.removeFromSyncQueue(operation.id);
          console.log(`Synced operation: ${operation.type}`);
        } catch (error) {
          console.error(`Failed to sync operation ${operation.type}:`, error);
          
          // Increment retry count
          operation.retryCount++;
          if (operation.retryCount < 3) {
            await indexedDBManager.updateSyncOperation(operation);
          } else {
            // Remove after 3 failed attempts
            await indexedDBManager.removeFromSyncQueue(operation.id);
            console.error(`Giving up on operation ${operation.type} after 3 attempts`);
          }
        }
      }

      if (pendingOperations.length > 0) {
        toast.success(`Synced ${pendingOperations.length} offline changes`);
      }
    } catch (error) {
      console.error("Failed to sync pending operations:", error);
    }
  },
}));

// Listen for online/offline events
if (typeof window !== "undefined") {
  window.addEventListener('online', () => {
    const store = useTodoStore.getState();
    store.setIsOffline(false);
    store.syncPendingOperations();
    toast.success("Back online - syncing changes...");
  });

  window.addEventListener('offline', () => {
    const store = useTodoStore.getState();
    store.setIsOffline(true);
    toast.error("You're offline - changes will sync when reconnected");
  });
}