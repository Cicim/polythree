use poly3lib::rom::Rom;
use serde::Serialize;
use tauri::AppHandle;

use crate::{
    config::RomConfig,
    state::{AppResult, AppState, AppStateFunctions},
};

#[derive(Serialize)]
pub struct OpenRom {
    rom_type: String,
    rom_size: usize,
    rom_size_fmt: String,
}

#[tauri::command]
pub fn init_rom(state: AppState, handle: AppHandle, path: String) -> AppResult<OpenRom> {
    println!("Loading ROM: {}", path);

    match Rom::load(&path) {
        Ok(mut rom) => {
            // Initialize the ROM's references so that
            // later operations will be faster
            if let Err(err) = rom.init_map() {
                return Err(format!("Failed to initialize references: {}", err));
            }

            // Save the references
            if let Err(err) = rom.save_refs(&path) {
                return Err(format!("Failed to save references: {}", err));
            }

            // Check if you have the config file near the ROM.
            // If you don't, create it.
            let config = RomConfig::init(handle, &path, &rom.rom_type)?;

            // Prepare the response
            let res = OpenRom {
                rom_type: rom.rom_type.to_string(),
                rom_size: rom.data.len(),
                rom_size_fmt: {
                    let bytes = rom.data.len() as u64;
                    let bytes = byte_unit::Byte::from_bytes(bytes);
                    let bytes = bytes.get_appropriate_unit(true);
                    format!("{}", bytes)
                },
            };

            // Store the opened ROM in the state
            // Update the rom_path in the AppState
            state.set_rom(path, rom, config);

            Ok(res)
        }
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub fn close_rom(state: AppState) {
    state.clear_rom();
}
