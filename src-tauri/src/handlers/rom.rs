use poly3lib::rom::Rom;
use serde::Serialize;

#[derive(Serialize)]
pub enum RomOpenResponse {
    Success {
        rom_type: String,
        rom_size: usize,
        rom_size_fmt: String,
    },
    Error {
        message: String,
    },
}

#[tauri::command]
pub fn init_rom(path: String) -> RomOpenResponse {
    match Rom::load(&path) {
        Ok(mut rom) => {
            // Initialize the ROM's references so that
            // later operations will be faster
            if let Err(err) = rom.init_map() {
                return RomOpenResponse::Error {
                    message: format!("Failed to initialize references: {}", err),
                };
            }

            // Save the references
            if let Err(err) = rom.save_refs(&path) {
                return RomOpenResponse::Error {
                    message: format!("Failed to save references: {}", err),
                };
            }

            RomOpenResponse::Success {
                rom_type: rom.rom_type.to_string(),
                rom_size: rom.data.len(),
                rom_size_fmt: {
                    let bytes = rom.data.len() as u64;
                    let bytes = byte_unit::Byte::from_bytes(bytes);
                    let bytes = bytes.get_appropriate_unit(true);
                    format!("{}", bytes)
                },
            }
        }
        Err(err) => RomOpenResponse::Error {
            message: err.to_string(),
        },
    }
}
