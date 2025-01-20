// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::State;
use std::path::PathBuf;
use std::fs;
use serde::{Serialize, Deserialize};

// Add a struct to hold the storage path
struct StoragePathState(Mutex<String>);

#[derive(Serialize, Deserialize)]
struct AppConfig {
    storage_path: String,
}

fn get_app_dir() -> Result<PathBuf, String> {
    std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())
        .map(|p| p.to_path_buf())
}

fn load_or_create_config() -> Result<AppConfig, String> {
    let app_dir = get_app_dir()?;
    let config_path = app_dir.join("config.json");

    if config_path.exists() {
        let config_str = fs::read_to_string(&config_path)
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&config_str)
            .map_err(|e| e.to_string())
    } else {
        let config = AppConfig {
            storage_path: String::new()
        };
        let config_str = serde_json::to_string(&config)
            .map_err(|e| e.to_string())?;
        fs::write(&config_path, config_str)
            .map_err(|e| e.to_string())?;
        Ok(config)
    }
}

#[tauri::command]
async fn set_storage_path(path: String, state: State<'_, StoragePathState>) -> Result<(), String> {
    if path.is_empty() {
        *state.0.lock().unwrap() = String::new();
        return Ok(());
    }

    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err("Path does not exist".to_string());
    }
    if !path_buf.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Save to config
    let app_dir = get_app_dir()?;
    let config_path = app_dir.join("config.json");
    let config = AppConfig { storage_path: path.clone() };
    let config_str = serde_json::to_string(&config)
        .map_err(|e| e.to_string())?;
    fs::write(config_path, config_str)
        .map_err(|e| e.to_string())?;

    // Update state
    *state.0.lock().unwrap() = path;
    Ok(())
}

#[tauri::command]
async fn load_todos(state: State<'_, StoragePathState>) -> Result<String, String> {
    let storage_path = state.0.lock().unwrap();
    let path = if storage_path.is_empty() {
        get_app_dir()?.join("todos.json")
    } else {
        PathBuf::from(&*storage_path).join("todos.json")
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
        get_app_dir()?.join("todos.json")
    } else {
        PathBuf::from(&*storage_path).join("todos.json")
    };

    std::fs::write(path, todo).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_lists(state: State<'_, StoragePathState>) -> Result<String, String> {
    let storage_path = state.0.lock().unwrap();
    let path = if storage_path.is_empty() {
        get_app_dir()?.join("lists.json")
    } else {
        PathBuf::from(&*storage_path).join("lists.json")
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
        get_app_dir()?.join("lists.json")
    } else {
        PathBuf::from(&*storage_path).join("lists.json")
    };

    std::fs::write(path, lists).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_storage_path() -> Result<String, String> {
    let config = load_or_create_config()?;
    Ok(config.storage_path)
}

fn main() {
    let config = load_or_create_config().unwrap_or_else(|_| AppConfig { storage_path: String::new() });
    let storage_path_state = StoragePathState(Mutex::new(config.storage_path));

    tauri::Builder::default()
        .manage(storage_path_state)
        .invoke_handler(tauri::generate_handler![
            load_todos,
            save_todos,
            load_lists,
            save_lists,
            set_storage_path,
            load_storage_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
