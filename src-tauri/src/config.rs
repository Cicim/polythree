use std::{
    collections::{BTreeMap, HashMap},
    path::Path,
};

use poly3lib::RomBase;
use serde::{Deserialize, Serialize, Serializer};
use serde_json::Value;
use tauri::AppHandle;

use crate::state::{get_rom_path, AppResult, AppState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrimaryBrushStore {
    brushes: Vec<Value>,
    secondary: HashMap<u32, Vec<Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomConfig {
    /// Associations of layout IDs to layout names.
    #[serde(serialize_with = "ordered_map")]
    pub layout_names: HashMap<u16, String>,
    #[serde(serialize_with = "ordered_map")]
    pub tileset_names: HashMap<u32, String>,
    #[serde(serialize_with = "ordered_map")]
    pub tileset_levels: HashMap<u32, String>,
    pub brushes: HashMap<u32, PrimaryBrushStore>,
}

fn ordered_map<S, T>(value: &HashMap<T, String>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
    T: Ord + Serialize,
{
    let ordered: BTreeMap<_, _> = value.iter().collect();
    ordered.serialize(serializer)
}

impl RomConfig {
    pub fn init(handle: AppHandle, rom_path: &str, rom_type: &RomBase) -> AppResult<Self> {
        let config_path = format!("{}.config.json", rom_path);

        let config = if !Path::new(&config_path).exists() {
            RomConfig::default_for(handle, rom_type)
        } else {
            RomConfig::load(&config_path)?
        };
        // Write the config to file
        config.save(config_path.clone())?;

        Ok(config)
    }

    pub fn default_for(handle: AppHandle, rom_type: &RomBase) -> Self {
        // Read the config file from the configs folder
        use RomBase as B;
        let template_path_str = match rom_type {
            B::FireRed | B::LeafGreen => "configs/bpre.json",
            B::Ruby | B::Sapphire | B::Emerald => "configs/bpee.json",
        };
        let template_path = handle
            .path_resolver()
            .resolve_resource(template_path_str)
            .ok_or("Could not resolve resource path")
            .unwrap();

        if let Ok(template_file) = std::fs::File::open(template_path) {
            println!("Loaded config template from {}.", template_path_str);

            match serde_json::from_reader(template_file)
                .map_err(|e| format!("Could not read config file: {}", e))
            {
                Ok(config) => return config,
                Err(e) => println!("Could not parse config file: {}", e),
            }
        }

        // Read the template
        println!("Could not load config template from {}", template_path_str);
        Self {
            layout_names: HashMap::new(),
            tileset_names: HashMap::new(),
            tileset_levels: HashMap::new(),
            brushes: HashMap::new(),
        }
    }

    pub fn save(&self, config_path: String) -> AppResult<()> {
        let config_file = std::fs::File::create(config_path)
            .map_err(|e| format!("Could create config file: {}", e))?;
        serde_json::to_writer(config_file, self)
            .map_err(|e| format!("Could not write to config file: {}", e))?;
        Ok(())
    }

    pub fn load(config_path: &str) -> AppResult<Self> {
        let config_file = std::fs::File::open(config_path)
            .map_err(|e| format!("Could not open config file: {}", e))?;
        serde_json::from_reader(config_file)
            .map_err(|e| format!("Could not read config file: {}", e))
    }
}

#[tauri::command]
pub fn get_config(state: AppState) -> AppResult<RomConfig> {
    // Unlock the ROM data
    let config_data = state
        .config
        .lock()
        .map_err(|_| "Failed to unlock the config data")?;

    // Get a mutable reference to the ROM data
    let config = config_data.as_ref().ok_or("No ROM is open")?;

    Ok(config.clone())
}

#[tauri::command]
pub fn set_config(state: AppState) -> AppResult<()> {
    // Get the ROM path
    let rom_path = get_rom_path(&state)?;

    // Unlock the ROM data
    let mut config_data = state
        .config
        .lock()
        .map_err(|_| "Failed to unlock the config data")?;

    // Get a mutable reference to the ROM data
    let config = config_data.as_mut().ok_or("No ROM is open")?;

    // Call the callback with the ROM
    let config_path = format!("{}.config.json", rom_path);
    config.save(config_path)?;

    Ok(())
}

pub fn update_config(state: AppState, callback: impl FnOnce(&mut RomConfig)) -> AppResult<()> {
    let rom_path = get_rom_path(&state)?;

    // Unlock the ROM data
    let mut config_data = state
        .config
        .lock()
        .map_err(|_| "Failed to unlock the config data")
        .unwrap();

    // Get a mutable reference to the ROM data
    let config = config_data.as_mut().ok_or("No ROM is open")?;

    // Call the callback with the ROM
    callback(config);

    // Call the callback with the ROM
    let config_path = format!("{}.config.json", rom_path);
    config.save(config_path)?;

    Ok(())
}

// TODO Rename level(s) to permissions
#[tauri::command]
pub fn update_tileset_level(state: AppState, tileset: u32, levels: String) -> AppResult<()> {
    update_config(state, |config| {
        config.tileset_levels.insert(tileset, levels);
    })
}

#[tauri::command]
pub fn update_brushes(
    state: AppState,
    tileset1: u32,
    tileset2: u32,
    tileset1_brushes: Vec<Value>,
    tileset2_brushes: Vec<Value>,
) -> AppResult<()> {
    if tileset1_brushes.len() == 0 && tileset2_brushes.len() == 0 {
        Ok(())
    } else {
        update_config(state, |config| {
            config.brushes.insert(
                tileset1,
                // Find if the tileset1 configs exist
                match config.brushes.get(&tileset1) {
                    // If it doesn't exist, create it
                    None => {
                        let mut secondary_store = HashMap::new();
                        if tileset2_brushes.len() > 0 {
                            secondary_store.insert(tileset2, tileset2_brushes);
                        }
                        PrimaryBrushStore {
                            brushes: tileset1_brushes,
                            secondary: secondary_store,
                        }
                    }
                    Some(primary_brush_store) => {
                        let mut primary_store = primary_brush_store.clone();
                        primary_store.brushes = tileset1_brushes;
                        if tileset2_brushes.len() > 0 {
                            primary_store.secondary.insert(tileset2, tileset2_brushes);
                        }
                        primary_store.clone()
                    }
                },
            );
        })
    }
}
