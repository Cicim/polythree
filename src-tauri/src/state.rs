use std::sync::Mutex;

use poly3lib::rom::Rom;

pub trait AppStateFunctions {
    /// Update the rom path in the [`AppState`].
    fn set_rom_path(&self, path: Option<String>);
    /// Returns the currently loaded [`Rom`], if any.
    fn get_rom(&self) -> AppResult<Rom>;
}

pub struct PolythreeState {
    rom_path: Mutex<Option<String>>,
}

impl PolythreeState {
    pub fn new() -> Self {
        Self {
            rom_path: Mutex::new(None),
        }
    }
}

pub type AppState<'a> = tauri::State<'a, PolythreeState>;

pub type AppResult<T> = Result<T, String>;

impl AppStateFunctions for AppState<'_> {
    fn set_rom_path(&self, path: Option<String>) {
        let mut rom_path = self.rom_path.lock().unwrap();
        *rom_path = path;
    }

    fn get_rom(&self) -> AppResult<Rom> {
        // Get the rom_path through the mutex
        let rom_path = match self.rom_path.lock() {
            Ok(rom_path) => rom_path,
            Err(_) => {
                return Err("Unable to obtain the lock to the rom_path".to_string());
            }
        };

        // Extract the path from the Option
        let rom_path = match rom_path.as_ref() {
            Some(rom_path) => rom_path,
            None => {
                return Err("No ROM is currently loaded".to_string());
            }
        };

        // Load the ROM
        Rom::load(rom_path).map_err(|err| err.to_string())
    }
}
