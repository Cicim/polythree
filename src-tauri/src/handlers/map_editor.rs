use poly3lib::maps::{
    header::{MapHeader, MapHeaderData},
    layout::{MapLayout, MapLayoutData},
    render::TilesetsPair,
    tileset::TilesetsRenderData,
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
pub fn get_tilesets_rendering_data(
    state: AppState,
    tileset1: usize,
    tileset2: usize,
) -> AppResult<TilesetsRenderData> {
    state.with_rom(|rom| {
        // Get the tileset
        let tilesets = TilesetsPair::new(rom, tileset1, tileset2)
            .map_err(|e| format!("Error while loading tilesets: {}", e))?;
        // Get the render data
        let render_data = tilesets
            .get_render_data(&rom)
            .map_err(|e| format!("Error getting tileset render data: {}", e))?;

        Ok(render_data)
    })
}

#[tauri::command]
pub fn get_tilesets_lengths(
    state: AppState,
    tileset1: usize,
    tileset2: usize,
) -> AppResult<(usize, usize)> {
    state.with_rom(|rom| match rom.refs.tilesets_table.as_ref() {
        Some(table) => Ok((
            table.get(&tileset1).map(|x| x.0).unwrap_or(0),
            table.get(&tileset2).map(|x| x.0).unwrap_or(0),
        )),
        None => {
            return Err("Tilesets table not found".to_owned());
        }
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
