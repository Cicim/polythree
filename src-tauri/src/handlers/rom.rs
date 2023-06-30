use poly3lib::rom::{Rom, RomError};
use serde::Serialize;

#[derive(Serialize)]
pub enum RomOpenResponse {
    Success { rom_type: String, rom_size: usize },
    Error { message: String },
}

#[tauri::command]
pub fn init_rom(path: String) -> RomOpenResponse {
    match Rom::load(&path) {
        Ok(rom) => RomOpenResponse::Success {
            rom_type: rom.rom_type.to_string(),
            rom_size: rom.data.len(),
        },
        Err(err) => RomOpenResponse::Error {
            message: err.to_string(),
        },
    }
}
