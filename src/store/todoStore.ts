import { create } from 'zustand';
import { TodoList, Todo } from '../types/todo';
import { supabase } from '../lib/supabase';

interface TodoState {
  lists: TodoList[];
  selectedListId: number;
  loading: boolean;
  error: string | null;
  setLists: (lists: TodoList[]) => void;
  setSelectedListId: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchLists: () => Promise<void>;
  saveLists: (lists: TodoList[]) => Promise<void>;
  addTodo: (listId: number, todo: Omit<Todo, 'id'>) => Promise<void>;
  toggleTodo: (listId: number, todoId: number) => Promise<void>;
  deleteTodo: (listId: number, todoId: number) => Promise<void>;
  editTodo: (
    listId: number,
    todoId: number,
    updates: Partial<Todo>
  ) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  lists: [],
  selectedListId: 1,
  loading: false,
  error: null,

  setLists: (lists) => set({ lists }),
  setSelectedListId: (id) => set({ selectedListId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchLists: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('id');

      if (error) throw error;

      const { data: todosData, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .order('dateCreated');

      if (todosError) throw todosError;

      const lists = data.map(list => ({
        ...list,
        todos: todosData
          .filter(todo => todo.listId === list.id)
          .map(todo => ({
            ...todo,
            dateCreated: new Date(todo.dateCreated),
            dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
            dateOfCompletion: todo.dateOfCompletion ? new Date(todo.dateOfCompletion) : undefined,
          })),
      }));

      set({ lists, loading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  saveLists: async (lists) => {
    try {
      // Update lists
      const { error: listsError } = await supabase
        .from('lists')
        .upsert(
          lists.map(({ todos, ...list }) => list)
        );

      if (listsError) throw listsError;

      // Update todos
      const todos = lists.flatMap(list =>
        list.todos.map(todo => ({
          ...todo,
          listId: list.id,
          dateCreated: todo.dateCreated.toISOString(),
          dueDate: todo.dueDate?.toISOString(),
          dateOfCompletion: todo.dateOfCompletion?.toISOString(),
        }))
      );

      const { error: todosError } = await supabase
        .from('todos')
        .upsert(todos);

      if (todosError) throw todosError;

      set({ error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addTodo: async (listId, todo) => {
    const lists = get().lists;
    const newTodo = {
      ...todo,
      id: Date.now(),
      listId,
    };

    try {
      const { error } = await supabase
        .from('todos')
        .insert([{
          ...newTodo,
          dateCreated: newTodo.dateCreated.toISOString(),
          dueDate: newTodo.dueDate?.toISOString(),
          dateOfCompletion: newTodo.dateOfCompletion?.toISOString(),
        }]);

      if (error) throw error;

      const updatedLists = lists.map(list =>
        list.id === listId
          ? { ...list, todos: [...list.todos, newTodo] }
          : list
      );

      set({ lists: updatedLists, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  toggleTodo: async (listId, todoId) => {
    const lists = get().lists;
    const list = lists.find(l => l.id === listId);
    const todo = list?.todos.find(t => t.id === todoId);

    if (!todo) return;

    const updatedTodo = {
      ...todo,
      completed: !todo.completed,
      dateOfCompletion: !todo.completed ? new Date() : undefined,
    };

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          completed: updatedTodo.completed,
          dateOfCompletion: updatedTodo.dateOfCompletion?.toISOString(),
        })
        .eq('id', todoId);

      if (error) throw error;

      const updatedLists = lists.map(list =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.map(t =>
                t.id === todoId ? updatedTodo : t
              ),
            }
          : list
      );

      set({ lists: updatedLists, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteTodo: async (listId, todoId) => {
    const lists = get().lists;

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;

      const updatedLists = lists.map(list =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.filter(t => t.id !== todoId),
            }
          : list
      );

      set({ lists: updatedLists, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  editTodo: async (listId, todoId, updates) => {
    const lists = get().lists;
    const list = lists.find(l => l.id === listId);
    const todo = list?.todos.find(t => t.id === todoId);

    if (!todo) return;

    const updatedTodo = {
      ...todo,
      ...updates,
    };

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          ...updates,
          dueDate: updates.dueDate?.toISOString(),
        })
        .eq('id', todoId);

      if (error) throw error;

      const updatedLists = lists.map(list =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.map(t =>
                t.id === todoId ? updatedTodo : t
              ),
            }
          : list
      );

      set({ lists: updatedLists, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));