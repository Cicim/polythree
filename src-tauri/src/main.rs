// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod handlers;
mod state;

use state::PolythreeState;

use crate::handlers::{
    map_list::{get_map_list, get_map_names, get_map_preview},
    rom::{close_rom, init_rom},
};

fn main() {
    tauri::Builder::default()
        .manage(PolythreeState::new())
        .invoke_handler(tauri::generate_handler![
            // ROM
            init_rom,
            close_rom,
            // Map list
            get_map_list,
            get_map_names,
            get_map_preview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
