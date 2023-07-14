use poly3lib::maps::{header::MapHeaderData, layout::MapLayoutData};

use crate::state::{AppResult, AppState, AppStateFunctions};

#[tauri::command]
pub fn get_map_header_data(state: AppState, group: u8, index: u8) -> AppResult<MapHeaderData> {
    state.with_rom(|rom| {
        rom.map_headers()
            .read_data(group, index)
            .map_err(|e| format!("Error while loading map data: {}", e))
    })
}

#[tauri::command]
pub fn get_map_layout_data(state: AppState, id: u16) -> AppResult<MapLayoutData> {
    state.with_rom(|rom| {
        rom.map_layouts()
            .read_data(id)
            .map_err(|e| format!("Error while loading map data: {}", e))
    })
}
