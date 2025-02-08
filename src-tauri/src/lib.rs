use std::fs;

const TODOS_FILE_PATH: &str = "todos.txt";
const LISTS_FILE_PATH: &str = "lists.txt";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_todos, load_todos, save_lists, load_lists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn save_todos(todo: String) -> Result<(), String> {
    match fs::write(TODOS_FILE_PATH, todo) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_lists(lists: String) -> Result<(), String> {
    match fs::write(LISTS_FILE_PATH, lists) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn load_todos() -> Result<String, String> {
    match fs::read_to_string(TODOS_FILE_PATH) {
        Ok(contents) => Ok(contents),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(String::new())
            } else {
                Err(e.to_string())
            }
        }
    }
}

#[tauri::command]
fn load_lists() -> Result<String, String> {
    match fs::read_to_string(LISTS_FILE_PATH) {
        Ok(contents) => Ok(contents),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(String::new())
            } else {
                Err(e.to_string())
            }
        }
    }
}
