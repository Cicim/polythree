use crate::data::{Color, Metatile, Tile, TilesetData};

const NORMAL: u8 = 0;
const COVERED: u8 = 1;
const SPLIT: u8 = 2;
const THREELAYERS: u8 = 3;

pub(crate) fn render(
    context: &TilesetData,

    bot_layer_image_data: &mut [Color],
    top_layer_image_data: &mut [Color],
    blocks_data: &[u16],
    blocks_width: usize,
    pixels_width: usize,

    start_x: usize,
    start_y: usize,
    end_x: usize,
    end_y: usize,
) {
    let metatiles_len = context.metatiles.len() as u16;

    // Loop through the blocks
    for by in start_y..end_y {
        for bx in start_x..end_x {
            // Get the block
            let index = (by * blocks_width + bx) as usize;
            let metatile_id = match blocks_data[index] {
                // Avoid drawing blocks you won't find in the metatiles table
                // and the 0xFFFF block, which is transparent
                id if id > metatiles_len => continue,
                // Convert the indices you'll draw to usize for indexing
                id => id as usize,
            };

            // Get the metatile from the corresponding array
            let Metatile { bot, top } = &context.metatiles[metatile_id];

            let offset_x = bx * 16;
            let offset_y = by * 16;

            macro_rules! clear_top_layer {
                () => {
                    draw_metatile_layer(
                        context,
                        top_layer_image_data,
                        offset_x,
                        offset_y,
                        &[0; 4],
                        pixels_width,
                        false,
                    );
                };
            }

            // Get the layer type
            match context.layer_types[metatile_id] {
                // TODO Change if you find the difference
                NORMAL => {
                    // Hero is covered by top layer
                    draw_metatile_layer(
                        context,
                        bot_layer_image_data,
                        offset_x,
                        offset_y,
                        bot,
                        pixels_width,
                        false,
                    );
                    draw_metatile_layer(
                        context,
                        top_layer_image_data,
                        offset_x,
                        offset_y,
                        top,
                        pixels_width,
                        false,
                    );
                }
                COVERED | SPLIT => {
                    // Hero cover whole block
                    draw_metatile_layer(
                        context,
                        bot_layer_image_data,
                        offset_x,
                        offset_y,
                        bot,
                        pixels_width,
                        false,
                    );
                    draw_metatile_layer(
                        context,
                        bot_layer_image_data,
                        offset_x,
                        offset_y,
                        top,
                        pixels_width,
                        true,
                    );
                    clear_top_layer!();
                }
                THREELAYERS => {
                    draw_metatile_layer(
                        context,
                        bot_layer_image_data,
                        offset_x,
                        offset_y,
                        bot,
                        pixels_width,
                        false,
                    );
                    draw_metatile_layer(
                        context,
                        bot_layer_image_data,
                        offset_x,
                        offset_y,
                        top,
                        pixels_width,
                        true,
                    );

                    // Get the next metatile
                    let next_metatile = match blocks_data[index + 1] {
                        id if id > metatiles_len => {
                            clear_top_layer!();
                            continue;
                        }
                        id => id as usize,
                    };
                    let Metatile { bot: _, top } = &context.metatiles[next_metatile];

                    draw_metatile_layer(
                        context,
                        top_layer_image_data,
                        offset_x,
                        offset_y,
                        top,
                        pixels_width,
                        false,
                    );
                }

                // This should not happen
                _ => unreachable!("The backend relies on an enum that has values only in 0..=3"),
            }
        }
    }
}

/// Draws a metatile layer (top or bottom) with or without transparency
/// at the given position in the given image data.
fn draw_metatile_layer(
    context: &TilesetData,
    buffer: &mut [Color],
    offset_x: usize,
    offset_y: usize,
    metatile_layer: &[u16; 4],
    pixels_width: usize,
    fall_through: bool,
) {
    // For each tile on this layer
    for (index, inner_x, inner_y) in [(0, 0, 0), (1, 8, 0), (2, 0, 8), (3, 8, 8)] {
        let tile_info = metatile_layer[index];
        let tile_id = (tile_info & 0x3FF) as usize;
        let palette = ((tile_info >> 12) & 0xF) as usize;
        let hflip = tile_info & 0x400 != 0;
        let vflip = tile_info & 0x800 != 0;

        // Get the tile
        if tile_id > context.tiles.len() {
            continue;
        }
        let tile: &Tile = &context.tiles[tile_id];

        for (y, row) in tile.iter().enumerate() {
            for (x, color_id) in row.iter().enumerate() {
                let color_id = *color_id as usize;

                // If you wanna use the fall-through, don't even compute the indices
                if color_id == 0 && fall_through {
                    continue;
                }

                // Get the actual x and y based on the flip
                let x = if hflip { 7 - x } else { x };
                let y = if vflip { 7 - y } else { y };
                let buffer_index = (offset_y + y + inner_y) * pixels_width + offset_x + x + inner_x;

                // Get the color
                let color = if color_id == 0 {
                    Color::default()
                } else {
                    context.palettes[palette][color_id & 0xF]
                };
                // Paste the color in the buffer
                buffer[buffer_index] = color;
            }
        }
    }
}
