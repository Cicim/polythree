use std::collections::{HashMap, HashSet};

use poly3lib::Offset;
use serde::{Deserialize, Serialize};

use poly3lib::maps::sections::MapNamesDump;
use poly3lib::{maps::map::MapHeaderDump, types::RomPointer};

use crate::{
    config::update_config,
    state::{rgba_image_to_base64, AppResult, AppState, AppStateFunctions, PolythreeState},
};

#[tauri::command]
pub fn get_map_list(state: AppState) -> AppResult<Vec<MapHeaderDump>> {
    state.with_rom(|rom| {
        // Dump all the map headers
        rom.dump_map_headers().map_err(|err| err.to_string())
    })
}

#[tauri::command]
pub fn get_map_names(state: AppState) -> AppResult<MapNamesDump> {
    state.with_rom(|rom| {
        // Dump all the map headers
        rom.read_region_map_sections_names()
            .map_err(|err| err.to_string())
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
        let image = rom
            .read_map_header(group, index)
            .map_err(|err| err.to_string())?
            .read_layout_data(rom)
            .map_err(|err| err.to_string())?
            .load_tilesets_and_render_map(rom)
            .map_err(|err| err.to_string())?;

        // Render the map
        Ok(rgba_image_to_base64(&image))
    })
}

#[derive(Debug, Deserialize)]
pub struct MapIdLayout {
    group: u8,
    index: u8,
    layout: u16,
}
#[derive(Serialize, Deserialize)]
pub struct MapId {
    group: u8,
    index: u8,
}
impl std::fmt::Debug for MapId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}.{}", self.group, self.index)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutAction {
    action: LayoutActionType,
    maps: Vec<MapId>,
    change_to: String,
}
#[derive(Debug, Deserialize)]
pub enum LayoutActionType {
    Nothing,
    Clear,
    Delete,
    Change,
}

#[tauri::command]
pub fn delete_maps(
    state: AppState,
    maps: Vec<MapIdLayout>,
    actions: HashMap<String, LayoutAction>,
) -> AppResult<Vec<MapId>> {
    let mut maps_to_delete: Vec<MapId> = vec![];
    let mut maps_to_update: Vec<(u16, Vec<MapId>)> = vec![];
    let mut layouts_to_delete: HashSet<u16> = HashSet::new();

    for MapIdLayout {
        group,
        index,
        layout,
    } in maps
    {
        maps_to_delete.push(MapId { group, index });
        layouts_to_delete.insert(layout);
    }

    for (layout, action) in actions {
        match action.action {
            LayoutActionType::Delete => maps_to_delete.extend(action.maps),
            LayoutActionType::Change => {
                maps_to_update.push((parse_u16(action.change_to)?, action.maps))
            }
            LayoutActionType::Clear => maps_to_update.push((0, action.maps)),
            LayoutActionType::Nothing => {
                let layout = parse_u16(layout)?;
                // Remove all the layouts you find from layouts_to_delete
                layouts_to_delete.remove(&layout);
            }
        }
    }

    println!("Maps to Delete: \n{:?}", maps_to_delete);
    println!("Maps to Update: \n{:?}", maps_to_update);
    println!("Layouts to Delete: \n{:?}", layouts_to_delete);

    let res = state.update_rom(|rom| {
        let mut scripts_to_remove = vec![];

        // Delete all maps
        for MapId { group, index } in maps_to_delete.iter() {
            let scripts = rom
                .delete_map(*group, *index)
                .map_err(|e| format!("Error while deleting map {}.{}: {}", group, index, e))?;

            scripts_to_remove.extend(scripts);
        }
        // Delete these map's scripts
        let res = rom.clear_scripts(&scripts_to_remove);
        if let Err(err) = res {
            println!("Error while clearing scripts: {}", err);
        }

        // Delete the layouts
        for layout in layouts_to_delete.iter() {
            rom.delete_map_layout(*layout)
                .map_err(|e| format!("Error while deleting layout {}: {}", layout, e))?;
        }

        // Change the requested headers
        for (layout, maps) in maps_to_update {
            for MapId { group, index } in maps {
                let mut map_header = rom.read_map_header(group, index).map_err(|e| {
                    format!(
                        "Error while updating map {}.{} to layout {}: {}",
                        group, index, layout, e
                    )
                })?;
                map_header.layout_id = layout;

                if layout == 0 {
                    map_header.layout = RomPointer::Null;
                } else {
                    map_header.layout =
                        RomPointer::NoData(rom.get_map_layout_offset(layout).map_err(|e| {
                            format!("Error while getting layout offset for id {}: {}", layout, e)
                        })?);
                }
                rom.write_map_header(group, index, map_header)
                    .map_err(|e| {
                        format!("Error while writing header {}.{}: {}", group, index, e)
                    })?;
            }
        }

        Ok(maps_to_delete)
    })?;

    update_config(state, |config| {
        for layout in layouts_to_delete.iter() {
            // Find and remove the name in the configs
            config.layout_names.remove(layout);
        }
    })?;

    Ok(res)
}

fn parse_u16(number: String) -> AppResult<u16> {
    number
        .parse::<u16>()
        .map_err(|e| format!("Svelte-side mishap: Failed to parse string. {}", e))
}

#[derive(Serialize)]
pub struct TilesetType {
    offset: usize,
    is_primary: bool,
}

#[tauri::command]
pub fn get_tilesets(state: AppState) -> AppResult<Vec<TilesetType>> {
    state.with_rom(|rom| match rom.refs.map_tilesets {
        Some(ref table) => {
            let mut tilesets = vec![];

            for (offset, info) in table {
                tilesets.push(TilesetType {
                    offset: *offset,
                    is_primary: info.is_primary,
                });
            }
            Ok(tilesets)
        }
        None => Ok(vec![]),
    })
}

#[tauri::command]
pub fn get_layout_ids(state: AppState) -> AppResult<Vec<u16>> {
    state.with_rom(|rom| {
        rom.dump_map_layouts()
            .map_err(|e| format!("Error while loading layout ids: {}", e))
    })
}

#[derive(Deserialize)]
pub enum MapCreationLayoutOptions {
    Use {
        layout: u16,
    },
    New {
        width: i32,
        height: i32,
        tileset1: u32,
        tileset2: u32,
        name: String,
    },
}

#[tauri::command]
pub fn create_map(
    state: AppState,
    group: u8,
    index: u8,
    layout_options: MapCreationLayoutOptions,
) -> AppResult<MapHeaderDump> {
    use MapCreationLayoutOptions::*;

    let mut layout_id = 0;

    let res = state.with_rom(|rom| {
        layout_id = match layout_options {
            Use { layout } => layout,
            New {
                width,
                height,
                tileset1,
                tileset2,
                ..
            } => rom
                .create_map_layout(tileset1 as Offset, tileset2 as Offset, width, height)
                .map_err(|e| format!("Error while creating new layout: {}", e))?,
        };

        rom.create_map(group, index, layout_id)
            .map_err(|e| format!("Error while creating new map: {}", e))?;

        rom.dump_map_header(group, index)
            .map_err(|e| format!("Error while dumping new map header: {}", e))
    })?;

    update_config(state, |config| match layout_options {
        MapCreationLayoutOptions::New { name, .. } => {
            config.layout_names.insert(layout_id, name);
        }
        _ => {}
    })?;

    Ok(res)
}
