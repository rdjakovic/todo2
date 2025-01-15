export interface TodoList {
    id: string;
    name: string;
    icon: string;
}

export interface Todo {
    id: number;
    text: string;
    completed: boolean;
    date: string;
    listId: string;
}

