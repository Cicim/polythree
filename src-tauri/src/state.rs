use std::sync::Mutex;

use poly3lib::rom::Rom;

pub trait AppStateFunctions {
    /// Set the ROM and path when opened.
    fn set_rom(&self, path: String, rom: Rom);
    /// Clear the ROM and path when closed.
    fn clear_rom(&self);
    /// Runs the function if a ROM is open, otherwise returns an error.
    ///
    /// The function is passed a mutable reference to the ROM.
    /// **The mutability should only be used to the extent of loading
    /// new references** or making non-breaking changes.
    ///
    /// If you want to make potentially breaking changes, you should
    /// use [`AppStateFunctions::save_rom`] instead.
    fn with_rom<T>(&self, callback: impl FnOnce(&mut Rom) -> AppResult<T>) -> AppResult<T>;

    /// Runs the function if a ROM is open, otherwise returns an error.
    ///
    /// After the function is run, the ROM is saved to disk to the
    /// same path it was opened from.
    ///
    /// If an error occurs while running the function, the ROM is
    /// reverted to its original state.
    fn update_rom<T>(&self, callback: impl FnOnce(&mut Rom) -> AppResult<T>) -> AppResult<T>;
}

pub struct RomData {
    /// The path to the ROM.
    path: String,
    /// The rom object itself
    rom: Rom,
}

pub struct PolythreeState {
    /// Info about the open ROM, if any.
    rom: Mutex<Option<RomData>>,
}

impl PolythreeState {
    pub fn new() -> Self {
        Self {
            rom: Mutex::new(None),
        }
    }
}

pub type AppState<'a> = tauri::State<'a, PolythreeState>;

pub type AppResult<T> = Result<T, String>;

impl AppStateFunctions for AppState<'_> {
    fn set_rom(&self, path: String, rom: Rom) {
        let mut rom_data = self.rom.lock().unwrap();
        *rom_data = Some(RomData { path, rom })
    }

    fn clear_rom(&self) {
        let mut rom_data = self.rom.lock().unwrap();
        *rom_data = None;
    }

    fn with_rom<T>(&self, callback: impl FnOnce(&mut Rom) -> AppResult<T>) -> AppResult<T> {
        // Unlock the ROM data
        let mut rom_data = self
            .rom
            .lock()
            .map_err(|_| "Failed to unlock the map data")?;

        // Get a mutable reference to the ROM data
        let rom_data = rom_data.as_mut().ok_or("No ROM is open")?;

        // Call the callback with the ROM
        callback(&mut rom_data.rom)
    }

    fn update_rom<T>(&self, callback: impl FnOnce(&mut Rom) -> AppResult<T>) -> AppResult<T> {
        // Unlock the ROM data
        let mut rom_data = self
            .rom
            .lock()
            .map_err(|_| "Failed to unlock the map data")?;

        let rom_data = rom_data.as_mut().ok_or("No ROM is open")?;

        // Clone the ROM so that we can revert it if an error occurs
        let mut rom = rom_data.rom.clone();

        // Call the callback with the ROM and save the result
        let res = callback(&mut rom)?;
        // Save the modified ROM to disk
        rom.save(&rom_data.path)
            .map_err(|err| format!("Failed to save ROM: {}", err))?;
        // Then, since everything succeeded, update the one in the state
        rom_data.rom = rom;

        Ok(res)
    }
}
