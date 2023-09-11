use std::{io::Cursor, sync::Mutex};

use base64::{engine::general_purpose, Engine};
use image::{ImageFormat, RgbaImage};

use poly3lib::Rom;

use crate::config::RomConfig;

pub trait AppStateFunctions {
    /// Set the ROM and path when opened.
    fn set_rom(&self, path: String, rom: Rom, config: RomConfig);
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

pub struct RomWithPath {
    /// The path to the ROM.
    path: String,
    /// The rom object itself
    rom: Rom,
}

pub struct PolythreeState {
    /// Info about the open ROM, if any.
    rom: Mutex<Option<RomWithPath>>,
    /// Open Rom configuration
    pub(crate) config: Mutex<Option<RomConfig>>,
}

impl PolythreeState {
    pub fn new() -> Self {
        Self {
            rom: Mutex::new(None),
            config: Mutex::new(None),
        }
    }
}

pub type AppState<'a> = tauri::State<'a, PolythreeState>;

pub type AppResult<T> = Result<T, String>;

impl AppStateFunctions for AppState<'_> {
    fn set_rom(&self, path: String, rom: Rom, config: RomConfig) {
        let mut rom_data = self.rom.lock().unwrap();
        *rom_data = Some(RomWithPath { path, rom });

        let mut config_data = self.config.lock().unwrap();
        *config_data = Some(config);
    }

    fn clear_rom(&self) {
        let mut rom_data = self.rom.lock().unwrap();
        *rom_data = None;
        let mut config_data: std::sync::MutexGuard<'_, Option<RomConfig>> =
            self.config.lock().unwrap();
        *config_data = None;
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

pub fn get_rom_path(state: &AppState) -> AppResult<String> {
    let rom_data = state
        .rom
        .lock()
        .map_err(|_| "Failed to unlock the map data")?;

    let rom_data = rom_data.as_ref().ok_or("No ROM is open")?;

    Ok(rom_data.path.clone())
}

/// Serializes a [`RgbaImage`] to a base64 string for use in HTML.
pub fn rgba_image_to_base64(image: &RgbaImage) -> String {
    // Create a buffer that looks like a file (a cursor over a vector)
    let mut buffer = Cursor::new(Vec::new());
    // Write the image as png to that buffer
    image.write_to(&mut buffer, ImageFormat::Png).unwrap();
    // Encode the buffer as base64
    let b64 = general_purpose::STANDARD.encode(&buffer.into_inner());

    // Return the base64 string with the header
    format!("data:image/png;base64,{}", b64)
}
