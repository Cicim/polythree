// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod handlers;

use handlers::rom::init_rom;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![init_rom])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
