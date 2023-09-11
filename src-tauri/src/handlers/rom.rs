use serde::Serialize;
use tauri::AppHandle;

use poly3lib::Rom;

use crate::{
    config::RomConfig,
    state::{AppResult, AppState, AppStateFunctions},
};

#[derive(Serialize)]
pub struct OpenRom {
    rom_base: String,
    rom_size: usize,
    rom_size_fmt: String,
}

#[tauri::command]
pub fn init_rom(state: AppState, handle: AppHandle, path: String) -> AppResult<OpenRom> {
    println!("Loading ROM: {}", path);

    match Rom::load(&path) {
        Ok(mut rom) => {
            // Initialize the ROM's references
            // TODO Return any warning to the user.
            rom.init_maps_tables();

            // Save the references so that you won't have to load
            // them again next time.
            if let Err(err) = rom.save_refs(&path) {
                return Err(format!("Failed to save references: {}", err));
            }

            // Check if you have the config file near the ROM.
            // If you don't, create it.
            let config = RomConfig::init(handle, &path, &rom.base())?;

            // Prepare the response
            let res = OpenRom {
                rom_base: rom.base().to_string(),
                rom_size: rom.data.size(),
                rom_size_fmt: {
                    // REVIEW Remove byte_unit as a dependency?
                    let bytes = rom.data.size() as u64;
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
