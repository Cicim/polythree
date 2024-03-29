use poly3lib::maps::{
    header::{MapHeader, MapHeaderData},
    layout::{MapLayout, MapLayoutData},
    render::TilesetsPair,
    tileset::TilesetsRenderData,
    tileset_anims::TilesetAnimationList,
};

use crate::state::{AppResult, AppState, AppStateFunctions, PolythreeState};

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

// ANCHOR Loading animations
#[derive(serde::Serialize)]
pub struct ExportedTilesetsAnimations {
    primary: Vec<ExportedAnimation>,
    primary_max_frames: u16,

    secondary: Vec<ExportedAnimation>,
    secondary_max_frames: u16,
}

#[derive(serde::Serialize)]
pub struct ExportedAnimation {
    start_tile: u16,
    graphics: Vec<Vec<u8>>,

    start_time: u16,
    interval: u16,
}

#[tauri::command]
pub async fn get_tilesets_animations<'r>(
    state: tauri::State<'r, PolythreeState>,
    tileset1: usize,
    tileset2: usize,
) -> AppResult<ExportedTilesetsAnimations> {
    state.with_rom(|rom| {
        let mut tilesets = TilesetsPair::new(&rom, tileset1, tileset2)
            .map_err(|e| format!("Error while loading tilesets: {}", e))?;

        if let Err(anim) = tilesets.load_animations(rom) {
            println!("Error while loading animations: {}", anim);
        }

        let mut exported = ExportedTilesetsAnimations {
            primary: vec![],
            primary_max_frames: 0,
            secondary: vec![],
            secondary_max_frames: 0,
        };

        if let Some(primary) = tilesets.primary.animations {
            exported.primary = prepare_anims(&primary);
            exported.primary_max_frames = primary.max_frames;
        }

        if let Some(secondary) = tilesets.secondary.animations {
            exported.secondary = prepare_anims(&secondary);
            exported.secondary_max_frames = secondary.max_frames;
        }

        Ok(exported)
    })
}

fn prepare_anims(anims: &TilesetAnimationList) -> Vec<ExportedAnimation> {
    let mut res = vec![];

    for anim in anims.animations.iter() {
        let mut exported = ExportedAnimation {
            start_tile: anim.start_tile,
            graphics: Vec::new(),
            start_time: anim.start_time,
            interval: anim.interval,
        };

        for frame in anim.frame_graphics.iter() {
            let mut flattened = vec![];

            for tile in frame.tiles.iter() {
                for row in tile.iter() {
                    flattened.extend_from_slice(row);
                }
            }

            exported.graphics.push(flattened);
        }

        res.push(exported);
    }

    res
}
