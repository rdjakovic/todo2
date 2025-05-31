import { create } from 'zustand';
import { TodoList, Todo } from '../types/todo';
import { supabase } from '../lib/supabase';
import { initialLists } from '../const/initialLists';
import toast from 'react-hot-toast';
import { User } from '@supabase/supabase-js';

interface TodoState {
  lists: TodoList[];
  selectedListId: number;
  loading: boolean;
  error: string | null;
  setLists: (lists: TodoList[]) => void;
  setSelectedListId: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchLists: (user: User) => Promise<void>;
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

  fetchLists: async (user) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('id');

      if (error) throw error;

      // If no lists exist, create initial lists
      if (data.length === 0) {
        const { error: insertError } = await supabase
          .from('lists')
          .insert(initialLists.map(list => ({
            id: list.id,
            name: list.name,
            icon: list.icon,
            show_completed: list.showCompleted,
            user_id: user.id
          })));

        if (insertError) throw insertError;

        // Fetch the newly inserted lists
        const { data: newData, error: refetchError } = await supabase
          .from('lists')
          .select('*')
          .order('id');

        if (refetchError) throw refetchError;
        data = newData;
      }

      const { data: todosData, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .order('date_created');

      if (todosError) throw todosError;

      const lists = data.map(list => ({
        ...list,
        showCompleted: list.show_completed,
        todos: todosData
          .filter(todo => todo.list_id === list.id)
          .map(todo => ({
            ...todo,
            listId: todo.list_id,
            dateCreated: new Date(todo.date_created),
            dueDate: todo.due_date ? new Date(todo.due_date) : undefined,
            dateOfCompletion: todo.date_of_completion ? new Date(todo.date_of_completion) : undefined,
          })),
      }));

      set({ lists, loading: false, error: null });
      toast.success('Connection to database successful!');
      localStorage.setItem('lists', JSON.stringify(lists));
    } catch (error) {
      console.error('Failed to fetch from Supabase:', error);
      const localData = localStorage.getItem('lists');
      if (localData) {
        const lists = JSON.parse(localData);
        set({ lists, loading: false, error: null });
        toast('Cannot connect to database. Using local data!');
      } else {
        set({ error: 'Failed to load data', loading: false });
      }
    }
  },

  saveLists: async (lists) => {
    try {
      const { error: listsError } = await supabase
        .from('lists')
        .upsert(
          lists.map(({ todos, ...list }) => list)
        );

      if (listsError) throw listsError;

      const todos = lists.flatMap(list =>
        list.todos.map(todo => ({
          ...todo,
          list_id: list.id,
          date_created: todo.dateCreated.toISOString(),
          due_date: todo.dueDate?.toISOString(),
          date_of_completion: todo.dateOfCompletion?.toISOString(),
        }))
      );

      const { error: todosError } = await supabase
        .from('todos')
        .upsert(todos);

      if (todosError) throw todosError;

      localStorage.setItem('lists', JSON.stringify(lists));
      set({ error: null });
    } catch (error) {
      console.error('Failed to save to Supabase:', error);
      localStorage.setItem('lists', JSON.stringify(lists));
      set({ error: 'Failed to save to database, saved locally' });
      toast.error('Failed to save to database, saved locally');
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
          list_id: newTodo.listId,
          date_created: newTodo.dateCreated.toISOString(),
          due_date: newTodo.dueDate?.toISOString(),
          date_of_completion: newTodo.dateOfCompletion?.toISOString(),
        }]);

      if (error) throw error;

      const updatedLists = lists.map(list =>
        list.id === listId
          ? { ...list, todos: [...list.todos, newTodo] }
          : list
      );

      set({ lists: updatedLists, error: null });
      localStorage.setItem('lists', JSON.stringify(updatedLists));
    } catch (error) {
      const updatedLists = lists.map(list =>
        list.id === listId
          ? { ...list, todos: [...list.todos, newTodo] }
          : list
      );
      set({ lists: updatedLists, error: 'Failed to save to database, saved locally' });
      localStorage.setItem('lists', JSON.stringify(updatedLists));
      toast.error('Failed to save to database, saved locally');
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
          date_of_completion: updatedTodo.dateOfCompletion?.toISOString(),
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
      localStorage.setItem('lists', JSON.stringify(updatedLists));
    } catch (error) {
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
      set({ lists: updatedLists, error: 'Failed to save to database, saved locally' });
      localStorage.setItem('lists', JSON.stringify(updatedLists));
      toast.error('Failed to save to database, saved locally');
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
      localStorage.setItem('lists', JSON.stringify(updatedLists));
    } catch (error) {
      const updatedLists = lists.map(list =>
        list.id === listId
          ? {
              ...list,
              todos: list.todos.filter(t => t.id !== todoId),
            }
          : list
      );
      set({ lists: updatedLists, error: 'Failed to save to database, saved locally' });
      localStorage.setItem('lists', JSON.stringify(updatedLists));
      toast.error('Failed to save to database, saved locally');
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
          due_date: updates.dueDate?.toISOString(),
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
      localStorage.setItem('lists', JSON.stringify(updatedLists));
    } catch (error) {
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
      set({ lists: updatedLists, error: 'Failed to save to database, saved locally' });
      localStorage.setItem('lists', JSON.stringify(updatedLists));
      toast.error('Failed to save to database, saved locally');
    }
  },
}));