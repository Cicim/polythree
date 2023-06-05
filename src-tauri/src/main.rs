// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use poly3lib::rom::{Rom, RomType};
use poly3lib::types::colors::GBAColor;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    let mut rom = Rom::new(vec![0; 0x10000], RomType::FireRed);
    rom.write_color(0, GBAColor::new(0x12, 0x34, 0x56))
        .expect("Why would writing a color fail?!");
    let color = rom.read_color(0).unwrap();

    format!(
        "Hello, {}! You've been greeted from Rust!\n
        Also, the color read from this random piece of data is 
        (r: {}, g: {}, b: {}), 
        just thought you should know",
        name,
        color.r().to_string(),
        color.g().to_string(),
        color.b().to_string()
    )
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
