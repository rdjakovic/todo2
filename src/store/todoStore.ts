import { create } from "zustand";
import { TodoList, Todo } from "../types/todo";
import { supabase } from "../lib/supabase";
import { initialLists } from "../const/initialLists";
import toast from "react-hot-toast";
import { User } from "@supabase/supabase-js";

interface TodoState {
  lists: TodoList[];
  selectedListId: string;
  loading: boolean;
  error: string | null;
  setLists: (lists: TodoList[]) => void;
  setSelectedListId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchLists: (user: User) => Promise<void>;
  saveLists: (lists: TodoList[]) => Promise<void>;
  addTodo: (listId: string, todo: Omit<Todo, "id">) => Promise<void>;
  toggleTodo: (listId: string, todoId: string) => Promise<void>;
  deleteTodo: (listId: string, todoId: string) => Promise<void>;
  editTodo: (
    listId: string,
    todoId: string,
    updates: Partial<Todo>
  ) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  lists: [],
  selectedListId: "home",
  loading: false,
  error: null,

  setLists: (lists) => set({ lists }),
  setSelectedListId: (id) => set({ selectedListId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchLists: async (user) => {
    set({ loading: true });
    try {
      let { data: lists, error } = await supabase
        .from("lists")
        .select(
          `
        *,
        todos:todos(*)
      `
        )
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
          .order("id");

        if (refetchError) throw refetchError;
        lists = newData;
      }

      const { data: todosData, error: todosError } = await supabase
        .from("todos")
        .select(
          "id, list_id, title, notes, completed, priority, due_date, date_created, date_of_completion"
        )
        .order("date_created");

      if (todosError) throw todosError;

      const processedLists = lists?.map((list) => ({
        ...list,
        showCompleted: list.show_completed,
        id: list.id,
        todos: todosData
          .filter((todo) => todo.list_id === list.id)
          .map((todo) => ({
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
          })),
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

      toast.success("Connection to database successful!");
      localStorage.setItem("lists", JSON.stringify(processedLists));
    } catch (error) {
      console.error("Failed to fetch from Supabase:", error);
      const localData = localStorage.getItem("lists");
      if (localData) {
        const lists = JSON.parse(localData);
        set({ lists, loading: false, error: null });
        toast("Cannot connect to database. Using local data!");
      } else {
        set({ error: "Failed to load data", loading: false });
      }
    }
  },

  saveLists: async (lists) => {
    try {
      const { error: listsError } = await supabase.from("lists").upsert(
        lists.map(({ todos, showCompleted, ...list }) => ({
          id: list.id,
          name: list.name,
          icon: list.icon,
          show_completed: showCompleted,
          user_id: get().lists.find((l) => l.id === list.id)?.userId,
        }))
      );

      if (listsError) throw listsError;

      const todos = lists.flatMap((list) =>
        list.todos.map((todo) => ({
          id: todo.id,
          list_id: list.id,
          title: todo.title,
          notes: todo.notes,
          completed: todo.completed,
          priority: todo.priority,
          date_created: todo.dateCreated.toISOString(),
          due_date: todo.dueDate?.toISOString(),
          date_of_completion: todo.dateOfCompletion?.toISOString(),
        }))
      );

      const { error: todosError } = await supabase.from("todos").upsert(todos);

      if (todosError) throw todosError;

      localStorage.setItem("lists", JSON.stringify(lists));
      set({ error: null });
    } catch (error) {
      console.error("Failed to save to Supabase:", error);
      localStorage.setItem("lists", JSON.stringify(lists));
      set({ error: "Failed to save to database, saved locally" });
      toast.error("Failed to save to database, saved locally");
    }
  },

  addTodo: async (listId, todo) => {
    const lists = get().lists;
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

      const updatedLists = lists.map((list) =>
        list.id === listId ? { ...list, todos: [...list.todos, newTodo] } : list
      );

      set({ lists: updatedLists, error: null });
      localStorage.setItem("lists", JSON.stringify(updatedLists));
    } catch (error) {
      const updatedLists = lists.map((list) =>
        list.id === listId ? { ...list, todos: [...list.todos, newTodo] } : list
      );
      set({
        lists: updatedLists,
        error: "Failed to save to database, saved locally",
      });
      localStorage.setItem("lists", JSON.stringify(updatedLists));
      toast.error("Failed to save to database, saved locally");
    }
  },

  toggleTodo: async (listId, todoId) => {
    const lists = get().lists;
    const list = lists.find((l) => l.id === listId);
    const todo = list?.todos.find((t) => t.id === todoId);

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

      const updatedLists = lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.map((t) => (t.id === todoId ? updatedTodo : t)),
            }
          : list
      );

      set({ lists: updatedLists, error: null });
      localStorage.setItem("lists", JSON.stringify(updatedLists));
    } catch (error) {
      const updatedLists = lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.map((t) => (t.id === todoId ? updatedTodo : t)),
            }
          : list
      );
      set({
        lists: updatedLists,
        error: "Failed to save to database, saved locally",
      });
      localStorage.setItem("lists", JSON.stringify(updatedLists));
      toast.error("Failed to save to database, saved locally");
    }
  },

  deleteTodo: async (listId, todoId) => {
    const lists = get().lists;

    try {
      const { error } = await supabase.from("todos").delete().eq("id", todoId);

      if (error) throw error;

      const updatedLists = lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.filter((t) => t.id !== todoId),
            }
          : list
      );

      set({ lists: updatedLists, error: null });
      localStorage.setItem("lists", JSON.stringify(updatedLists));
    } catch (error) {
      const updatedLists = lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.filter((t) => t.id !== todoId),
            }
          : list
      );
      set({
        lists: updatedLists,
        error: "Failed to save to database, saved locally",
      });
      localStorage.setItem("lists", JSON.stringify(updatedLists));
      toast.error("Failed to save to database, saved locally");
    }
  },

  editTodo: async (listId, todoId, updates) => {
    const lists = get().lists;
    const list = lists.find((l) => l.id === listId);
    const todo = list?.todos.find((t) => t.id === todoId);

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

      const updatedLists = lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.map((t) => (t.id === todoId ? updatedTodo : t)),
            }
          : list
      );

      set({ lists: updatedLists, error: null });
      localStorage.setItem("lists", JSON.stringify(updatedLists));
    } catch (error) {
      const updatedLists = lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.map((t) => (t.id === todoId ? updatedTodo : t)),
            }
          : list
      );
      set({
        lists: updatedLists,
        error: "Failed to save to database, saved locally",
      });
      localStorage.setItem("lists", JSON.stringify(updatedLists));
      toast.error("Failed to save to database, saved locally");
    }
  },
}));
