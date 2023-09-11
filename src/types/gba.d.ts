// ANCHOR Pointers
type PointedData<T> = {
    data?: T;
    offset: number;
} | number;

type VoidPointer = PointedData<null>;

interface GbaGraphic {
    offset: number,
    tiles: Vec<number[][]>,
    compressed: boolean,
    read_length: number,
    replace: boolean,
}

/** A string identifying a ROM Type */
type RomType = "Fire Red"
    | "Leaf Green"
    | "Ruby"
    | "Sapphire"
    | "Emerald";

// ANCHOR Config types
interface RomConfig {
    /** A map of layout numbers to layout name */
    layout_names: Record<number, string>;
    /** A map of tileset offsets to tileset name */
    tileset_names: Record<number, string>;
    /** A map of tileset offsets to a base64 representation of each tile's levels */
    tileset_levels: Record<number, string>;
    /** A Map of tileset to [secondary tileset | brushes] */
    brushes: BrushStore;
}

/** How the brushes are stored in the config file */
type BrushStore = Record<number, {
    brushes: SerializedBrush[];
    secondary: Record<number, SerializedBrush[]>;
}>;
