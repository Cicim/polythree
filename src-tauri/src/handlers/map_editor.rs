use poly3lib::maps::{
    header::{MapHeader, MapHeaderData},
    layout::{MapLayoutData, MapLayout},
    render::{RenderedMetatile, TilesetsPair},
};

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

#[tauri::command]
pub fn get_rendered_tilesets(
    state: AppState,
    tileset1: usize,
    tileset2: usize,
) -> AppResult<Vec<RenderedMetatile>> {
    state.with_rom(|rom| {
        let tilesets = TilesetsPair::new(rom, tileset1, tileset2)
            .map_err(|e| format!("Error while loading tilesets: {}", e))?;

        Ok(tilesets.render())
    })
}

#[tauri::command]
pub fn get_layout_offset(state: AppState, id: u16) -> AppResult<usize> {
    state.with_rom(|rom| {
        rom.map_layouts()
            .get_header_offset(id)
            .map_err(|e| format!("Error while converting layout id to offset: {}", e))
    })
}

#[tauri::command]
pub fn update_map_header(
    state: AppState,
    group: u8,
    index: u8,
    header: MapHeader,
) -> AppResult<()> {
    state.update_rom(|rom| {
        rom.map_headers()
            .write_header(group, index, header)
            .map_err(|e| format!("Error while updating map header: {}", e))
    })
}

#[tauri::command]
pub fn update_layout_header(state: AppState, id: u16, header: MapLayout) -> AppResult<()> {
    state.update_rom(|rom| {
        rom.map_layouts()
            .write_header(id, header)
            .map_err(|e| format!("Error while updating map layout header: {}", e))
    })
}
