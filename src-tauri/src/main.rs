// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::State;
use directories::ProjectDirs;
use std::path::PathBuf;

// Add a struct to hold the storage path
struct StoragePathState(Mutex<String>);

#[tauri::command]
async fn set_storage_path(path: String, state: State<'_, StoragePathState>) -> Result<(), String> {
    if path.is_empty() {
        *state.0.lock().unwrap() = String::new();
        return Ok(());
    }

    // Verify the path exists and is a directory
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err("Path does not exist".to_string());
    }
    if !path_buf.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Store the path
    *state.0.lock().unwrap() = path;
    Ok(())
}

#[tauri::command]
async fn load_todos(state: State<'_, StoragePathState>) -> Result<String, String> {
    let storage_path = state.0.lock().unwrap();
    let path = if storage_path.is_empty() {
        get_default_todos_path()?
    } else {
        let mut path_buf = PathBuf::from(&*storage_path);
        path_buf.push("todos.json");
        path_buf.to_string_lossy().into_owned()
    };

    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(_) => Ok("[]".to_string()),
    }
}

#[tauri::command]
async fn save_todos(todo: String, state: State<'_, StoragePathState>) -> Result<(), String> {
    let storage_path = state.0.lock().unwrap();
    let path = if storage_path.is_empty() {
        get_default_todos_path()?
    } else {
        let mut path_buf = PathBuf::from(&*storage_path);
        path_buf.push("todos.json");
        path_buf.to_string_lossy().into_owned()
    };

    std::fs::write(path, todo).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_lists(state: State<'_, StoragePathState>) -> Result<String, String> {
    let storage_path = state.0.lock().unwrap();
    let path = if storage_path.is_empty() {
        get_default_lists_path()?
    } else {
        let mut path_buf = PathBuf::from(&*storage_path);
        path_buf.push("lists.json");
        path_buf.to_string_lossy().into_owned()
    };

    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(_) => Ok("[]".to_string()),
    }
}

#[tauri::command]
async fn save_lists(lists: String, state: State<'_, StoragePathState>) -> Result<(), String> {
    let storage_path = state.0.lock().unwrap();
    let path = if storage_path.is_empty() {
        get_default_lists_path()?
    } else {
        let mut path_buf = PathBuf::from(&*storage_path);
        path_buf.push("lists.json");
        path_buf.to_string_lossy().into_owned()
    };

    std::fs::write(path, lists).map_err(|e| e.to_string())
}

fn get_default_todos_path() -> Result<String, String> {
    let project_dirs = ProjectDirs::from("com", "todo2", "Todo2")
        .ok_or_else(|| "Failed to get app directory".to_string())?;
    let data_dir = project_dirs.data_dir();
    std::fs::create_dir_all(data_dir).map_err(|e| e.to_string())?;
    Ok(data_dir.join("todos.json").to_string_lossy().into_owned())
}

fn get_default_lists_path() -> Result<String, String> {
    let project_dirs = ProjectDirs::from("com", "todo2", "Todo2")
        .ok_or_else(|| "Failed to get app directory".to_string())?;
    let data_dir = project_dirs.data_dir();
    std::fs::create_dir_all(data_dir).map_err(|e| e.to_string())?;
    Ok(data_dir.join("lists.json").to_string_lossy().into_owned())
}

fn main() {
    let storage_path_state = StoragePathState(Mutex::new(String::new()));

    tauri::Builder::default()
        .manage(storage_path_state)
        .invoke_handler(tauri::generate_handler![
            load_todos,
            save_todos,
            load_lists,
            save_lists,
            set_storage_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
