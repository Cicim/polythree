extern crate console_error_panic_hook;

use std::mem::transmute;

use wasm_bindgen::prelude::*;

mod draw;

#[repr(C)]
#[derive(Copy, Clone)]
struct Color {
    r: u8,
    g: u8,
    b: u8,
    a: u8,
}

#[repr(C)]
struct Metatile {
    bot: [u16; 4],
    top: [u16; 4],
}

type Palette = [Color; 16];

type Tile = [[u8; 8]; 8];

struct DrawingData<'a> {
    /// The metatiles
    metatiles: &'a [Metatile],
    /// The metatile layer type
    layer_types: &'a [u8],
    /// The palette to use
    palettes: &'a [Palette],
    /// The tiles to use
    tiles: &'a [Tile],

    /// The blocks width in pixels
    pixels_width: usize,
}

#[wasm_bindgen]
/// Renders the blocks data to two image datas obtained by a canvas.
///
/// Takes as input:
/// + `bottom_layer_image_data`: the image data of the bottom layer
///   (the one the player is in front of).
/// + `top_layer_image_data`: the image data of the top layer
///   (the one the player is covered by).
/// + `blocks_data`: the blocks data to render. Its length must be
///   equal to `blocks_width * blocks_height`. Each element represents
///   the metatile id to write in that position. If the value is `0xFFFF`
///   nothing is drawn in that position.
/// + `blocks_width`: the width of the blocks data.
/// + `blocks_height`: the height of the blocks data.
///
/// + `metatiles`: the metatiles palette composed for both tilesets.
/// + `metatiles_layer_type`: the layer type of each metatile in the palette.
/// + `tiles`: the tiles palette composed for both tilesets.
/// + `palette`: the color palette composed for both tilesets in RGB form.
///
///
/// Every slice that represents a 2d array is expected to be in row-major order
///  (i.e. the first `blocks_width` elements are the first row, the
///  next `blocks_width` elements are the second row, etc.).
///
pub fn render_blocks_data(
    bottom_layer_image_data: &mut [u8],
    top_layer_image_data: &mut [u8],
    blocks_data: &[u16],
    blocks_width: u32,
    blocks_height: u32,

    metatiles: &[u16],
    metatiles_layer_type: &[u8],
    tiles: &[u8],
    palettes: &[u8],

    start_x: u32,
    start_y: u32,
    end_x: u32,
    end_y: u32,
) {
    console_error_panic_hook::set_once();

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
    let bot_layer_image_data: &mut [Color] = unsafe { transmute(bottom_layer_image_data) };
    let top_layer_image_data: &mut [Color] = unsafe { transmute(top_layer_image_data) };

    // Make sure the blocks data is the correct size
    assert!(
        blocks_data.len() == (blocks_width * blocks_height) as usize,
        "blocks_data has wrong size"
    );

    // Make sure the palette is of the correct size
    assert!(palettes.len() == 16 * 16 * 4, "wrong number of palettes");

    // Convert the metatiles to the correct type
    let metatiles: &[Metatile] = unsafe { transmute(metatiles) };
    // Convert the tiles to the correct type
    let tiles: &[Tile] = unsafe { transmute(tiles) };
    // Convert the palette to the correct type
    let palettes: &[Palette] = unsafe { transmute(palettes) };

    let context = DrawingData {
        metatiles,
        layer_types: metatiles_layer_type,
        palettes,
        tiles,
        pixels_width: blocks_width as usize * 16,
    };

    draw::render(
        &context,
        bot_layer_image_data,
        top_layer_image_data,
        blocks_data,
        blocks_width as usize,
        blocks_height as usize,
        start_x as usize,
        start_y as usize,
        end_x as usize,
        end_y as usize,
    );
}
