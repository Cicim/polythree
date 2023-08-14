extern crate console_error_panic_hook;

use wasm_bindgen::prelude::*;

use crate::data::{Color, Metatile, Palette, Tile, TilesetData};
use std::{cell::OnceCell, collections::HashMap, mem::transmute};

mod data;
mod draw;

// Global variable for the context
static mut LOADED_TILESETS: OnceCell<HashMap<(u32, u32), TilesetData>> = OnceCell::new();

#[wasm_bindgen]
/// Renders the blocks data to two image datas obtained by a canvas.
pub unsafe fn render_blocks_data(
    bottom_layer_image_data: &mut [u8],
    top_layer_image_data: &mut [u8],
    blocks_data: &[u16],
    blocks_width: u32,
    blocks_height: u32,

    primary_offset: u32,
    secondary_offset: u32,

    start_x: u32,
    start_y: u32,
    end_x: u32,
    end_y: u32,
) {
    // Make sure the image data are the correct size
    let expected_image_data_size = blocks_width * 16 * blocks_height * 16 * 4;
    assert!(
        bottom_layer_image_data.len() == expected_image_data_size as usize,
        "bottom_layer_image_data has wrong size"
    );
    assert!(
        top_layer_image_data.len() == expected_image_data_size as usize,
        "top_layer_image_data has wrong size"
    );

    // Transmute the data so that it matches the correct type
    let bot_layer_image_data: &mut [Color] = transmute(bottom_layer_image_data);
    let top_layer_image_data: &mut [Color] = transmute(top_layer_image_data);

    // Make sure the blocks data is the correct size
    assert!(
        blocks_data.len() == (blocks_width * blocks_height) as usize,
        "blocks_data has wrong size"
    );

    // Get the data for this context
    let context = LOADED_TILESETS
        .get()
        .unwrap()
        .get(&(primary_offset, secondary_offset))
        .unwrap();

    draw::render(
        context,
        bot_layer_image_data,
        top_layer_image_data,
        blocks_data,
        blocks_width as usize,
        blocks_width as usize * 16,
        start_x as usize,
        start_y as usize,
        end_x as usize,
        end_y as usize,
    );
}

#[wasm_bindgen]
pub unsafe fn load_tileset(
    primary_offset: u32,
    secondary_offset: u32,
    metatiles: &[u16],
    layer_types: &[u8],
    tiles: &[u8],
    palettes: &[u8],
) {
    // Make sure that the hashmap exists and that the tileset is not already loaded
    if LOADED_TILESETS
        .get_or_init(|| HashMap::new())
        .contains_key(&(primary_offset, secondary_offset))
    {
        return;
    }

    console_error_panic_hook::set_once();

    // Make sure the palette is of the correct size
    assert!(palettes.len() == 16 * 16 * 4, "wrong number of palettes");

    // Transmute each input to its final type
    let metatiles: &[Metatile] = transmute(metatiles);
    let palettes: &[Palette] = transmute(palettes);
    let tiles: &[Tile] = transmute(tiles);

    // Convert everything to a vector
    let metatiles = metatiles.to_vec();
    let layer_types = layer_types.to_vec();
    let palettes = palettes.to_vec();
    let tiles = tiles.to_vec();

    // Create the context
    let tileset_data = TilesetData {
        metatiles,
        layer_types,
        palettes,
        tiles,
    };

    // Insert the context map
    LOADED_TILESETS
        .get_mut()
        .unwrap()
        .insert((primary_offset, secondary_offset), tileset_data);
}
