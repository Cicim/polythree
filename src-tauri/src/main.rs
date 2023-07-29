// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod handlers;
mod iconify_server;
mod state;

use std::path::PathBuf;

use iconify_server::spawn_iconify_server_thread;
use state::PolythreeState;
use tauri::App;

use crate::{
    config::*,
    handlers::{map_editor::*, map_list::*, rom::*},
};

fn setup_function(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // If you are in development
    let path = if !cfg!(debug_assertions) {
        app.handle()
            .path_resolver()
            .resolve_resource("iconify-icons/")
            .ok_or("Could not resolve iconify-icons path")
            .unwrap()
    } else {
        PathBuf::from("./iconify-icons/")
    };

    // Run an http server in a separate thread
    spawn_iconify_server_thread(path);

    Ok(())
}

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
            update_tileset_level,
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
            get_tilesets_lengths,
            update_map_header,
            update_layout_header,
        ])
        .setup(setup_function)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
