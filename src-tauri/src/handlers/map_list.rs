use poly3lib::maps::{header::MapHeaderDump, mapsec::MapSectionDump};

use crate::state::{AppResult, AppState, AppStateFunctions};

#[tauri::command]
pub fn get_map_list(state: AppState) -> AppResult<Vec<MapHeaderDump>> {
    let mut rom = state.get_rom()?;

    // Dump all the map headers
    rom.map_headers()
        .dump_headers()
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_map_names(state: AppState) -> AppResult<MapSectionDump> {
    let mut rom = state.get_rom()?;

    // Dump all the map headers
    rom.mapsec().dump_names().map_err(|err| err.to_string())
}
