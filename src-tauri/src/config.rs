use std::{
    collections::{BTreeMap, HashMap},
    path::Path,
};

use poly3lib::rom::RomType;
use serde::{Deserialize, Serialize, Serializer};
use tauri::AppHandle;

use crate::state::{get_rom_path, AppResult, AppState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomConfig {
    /// Associations of layout IDs to layout names.
    #[serde(serialize_with = "ordered_map")]
    pub layout_names: HashMap<u16, String>,
    #[serde(serialize_with = "ordered_map")]
    pub tileset_names: HashMap<u32, String>,
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
    pub fn init(handle: AppHandle, rom_path: &str, rom_type: &RomType) -> AppResult<Self> {
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

    pub fn default_for(handle: AppHandle, rom_type: &RomType) -> Self {
        // Read the config file from the configs folder
        use RomType::*;
        let template_path_str = match rom_type {
            FireRed | LeafGreen => "configs/bpre.json",
            Ruby | Sapphire | Emerald => "configs/bpee.json",
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
        }
    }

    pub fn save(&self, config_path: String) -> AppResult<()> {
        let config_file = std::fs::File::create(config_path)
            .map_err(|e| format!("Could create config file: {}", e))?;
        serde_json::to_writer_pretty(config_file, self)
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
