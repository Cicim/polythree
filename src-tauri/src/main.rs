// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod handlers;
mod state;

use config::{get_config, set_config};
use state::PolythreeState;

use crate::handlers::{map_editor::*, map_list::*, rom::*};

fn main() {
    tauri::Builder::default()
        .manage(PolythreeState::new())
        .invoke_handler(tauri::generate_handler![
            // ROM
            init_rom,
            close_rom,
            // Config
            get_config,
            set_config,
            // Map list
            get_map_list,
            get_map_names,
            get_map_preview,
            get_tilesets,
            get_layout_ids,
            create_map,
            delete_maps,
            // Map editor
            get_map_header_data,
            get_map_layout_data,
            get_rendered_tilesets,
            get_layout_offset,
            update_map_header,
            update_layout_header,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
