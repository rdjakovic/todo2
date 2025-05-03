// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

// Add a struct to hold the storage path
struct StoragePathState(Mutex<String>);

#[derive(Serialize, Deserialize)]
struct AppConfig {
    storage_path: String,
    theme: Option<String>,
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
        let config_str = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&config_str).map_err(|e| e.to_string())
    } else {
        let config = AppConfig {
            storage_path: String::new(),
            theme: None,
        };
        let config_str = serde_json::to_string(&config).map_err(|e| e.to_string())?;
        fs::write(&config_path, config_str).map_err(|e| e.to_string())?;
        Ok(config)
    }
}

fn save_config(config: &AppConfig) -> Result<(), String> {
    let app_dir = get_app_dir()?;
    let config_path = app_dir.join("config.json");
    let config_str = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, config_str).map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_theme(theme: String) -> Result<(), String> {
    let mut config = load_or_create_config()?;
    config.theme = Some(theme);
    save_config(&config)
}

#[tauri::command]
async fn get_theme() -> Result<String, String> {
    let config = load_or_create_config()?;
    Ok(config.theme.unwrap_or_else(|| "light".to_string()))
}

#[tauri::command]
async fn set_storage_path(path: String, state: State<'_, StoragePathState>) -> Result<(), String> {
    if path.is_empty() {
        *state.0.lock().unwrap() = String::new();
        let mut config = load_or_create_config()?;
        config.storage_path = String::new();
        save_config(&config)?;
        return Ok(());
    }

    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err("Path does not exist".to_string());
    }
    if !path_buf.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Update config and state
    let mut config = load_or_create_config()?;
    config.storage_path = path.clone();
    save_config(&config)?;
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

#[tauri::command]
async fn has_todos_in_list(list_id: String, state: State<'_, StoragePathState>) -> Result<bool, String> {
    let lists_str = load_lists(state.clone()).await?;
    let lists: Vec<serde_json::Value> = serde_json::from_str(&lists_str)
        .map_err(|e| e.to_string())?;

    // Find the list with the given ID and check if it has todos
    Ok(lists.iter().any(|list| {
        list.get("id")
            .and_then(|id| id.as_str())
            .map(|id| id == list_id)
            .unwrap_or(false) &&
        list.get("todos")
            .and_then(|todos| todos.as_array())
            .map(|todos| !todos.is_empty())
            .unwrap_or(false)
    }))
}

fn main() {
    let config = load_or_create_config().unwrap_or_else(|_| AppConfig {
        storage_path: String::new(),
        theme: None,
    });
    let storage_path_state = StoragePathState(Mutex::new(config.storage_path));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(storage_path_state)
        .invoke_handler(tauri::generate_handler![
            load_todos,
            save_todos,
            load_lists,
            save_lists,
            set_storage_path,
            load_storage_path,
            set_theme,
            get_theme,
            has_todos_in_list
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
