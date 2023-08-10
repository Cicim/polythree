#[repr(C)]
#[derive(Copy, Clone)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

#[repr(C)]
#[derive(Copy, Clone)]
pub struct Metatile {
    pub bot: [u16; 4],
    pub top: [u16; 4],
}

pub type Palette = [Color; 16];

pub type Tile = [[u8; 8]; 8];

pub struct TilesetData {
    /// The metatiles
    pub metatiles: Vec<Metatile>,
    /// The metatile layer type
    pub layer_types: Vec<u8>,
    /// The palette to use
    pub palettes: Vec<Palette>,
    /// The tiles to use
    pub tiles: Vec<Tile>,
}
