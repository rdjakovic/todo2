import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../utils/environment";

export async function saveTodos(todos: string) {
  if (isTauri()) {
    return invoke("save_todos", { todos });
  } else {
    localStorage.setItem("todos", todos);
    return Promise.resolve();
  }
}

export async function loadTodos() {
  if (isTauri()) {
    return invoke<string>("load_todos");
  } else {
    const todos = localStorage.getItem("todos") || "[]";
    return Promise.resolve(todos);
  }
}