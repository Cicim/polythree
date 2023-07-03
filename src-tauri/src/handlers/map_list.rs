use poly3lib::maps::{header::MapHeaderDump, mapsec::MapSectionDump};

use crate::state::{AppResult, AppState, AppStateFunctions, PolythreeState};

#[tauri::command]
pub fn get_map_list(state: AppState) -> AppResult<Vec<MapHeaderDump>> {
    state.with_rom(|rom| {
        // Dump all the map headers
        rom.map_headers()
            .dump_headers()
            .map_err(|err| err.to_string())
    })
}

#[tauri::command]
pub fn get_map_names(state: AppState) -> AppResult<MapSectionDump> {
    state.with_rom(|rom| {
        // Dump all the map headers
        rom.mapsec().dump_names().map_err(|err| err.to_string())
    })
}

#[tauri::command]
pub async fn get_map_preview<'r>(
    state: tauri::State<'r, PolythreeState>,
    group: u8,
    index: u8,
) -> AppResult<String> {
    state.with_rom(|rom| {
        // Read the header
        let header = rom
            .map_headers()
            .read_header(group, index)
            .map_err(|err| err.to_string())?;

        // Read the layout
        let layout = rom
            .map_layouts()
            .read_data(header.map_layout_id)
            .map_err(|err| err.to_string())?;

        // Render the tileset
        let tilesets = layout
            .read_tilesets(&rom)
            .map_err(|_| "Error while reading the tileset")?;
        let rendered = tilesets.render();

        // Render the map
        Ok(layout.render_to_base64(&rendered))
    })
}
