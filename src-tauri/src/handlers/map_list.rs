use std::collections::{HashMap, HashSet};

use poly3lib::maps::{header::MapHeaderDump, mapsec::MapSectionDump};
use gba_types::pointers::PointedData;

use crate::state::{AppResult, AppState, AppStateFunctions, PolythreeState};
use serde::{Deserialize, Serialize};

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

    state.with_rom(|rom| {
        let mut headers = rom.map_headers();
        let mut scripts_to_remove = vec![];

        // Delete all maps
        for MapId { group, index } in maps_to_delete.iter() {
            let scripts = headers
                .delete_header(*group, *index)
                .map_err(|e| format!("Error while deleting map {}.{}: {}", group, index, e))?;

            scripts_to_remove.extend(scripts);
        }
        // Delete these map's scripts
        rom.clear_scripts(scripts_to_remove);

        // Delete the layouts
        let mut layouts = rom.map_layouts();
        for layout in layouts_to_delete {
            layouts
                .delete_layout(layout)
                .map_err(|e| format!("Error while deleting layout {}: {}", layout, e))?;
        }

        // Change the requested headers
        let mut headers = rom.map_headers();
        for (layout, maps) in maps_to_update {
            for MapId { group, index } in maps {
                let mut map_header = headers.read_header(group, index).map_err(|e| {
                    format!(
                        "Error while updating map {}.{} to layout {}: {}",
                        group, index, layout, e
                    )
                })?;
                map_header.map_layout_id = layout;
                if layout == 0 {
                    map_header.map_layout = PointedData::Null;
                } else {
                    map_header.map_layout = PointedData::NoData(
                        headers.rom.map_layouts().get_header_offset(layout)
                        .map_err(|e| {
                            format!("Error while getting layout offset for id {}: {}", layout, e)
                        })? as u32
                    );
                }
                headers.write_header(group, index, map_header).map_err(|e| {
                    format!("Error while writing header {}.{}: {}", group, index, e)
                })?;
            }
        }

        Ok(maps_to_delete)
    })
}

fn parse_u16(number: String) -> AppResult<u16> {
    number
        .parse::<u16>()
        .map_err(|e| format!("Svelte-side mishap: Failed to parse string. {}", e))
}
