import type { SerializedBrush } from "src/views/MapEditor/editor/brush_serialization";
import { writable, type Writable } from "svelte/store";

/** How the brushes are stored in the config file */
type BrushStore = Record<number, {
    brushes: SerializedBrush[];
    secondary: Record<number, SerializedBrush[]>;
}>;

export interface Rom {
    path: string;
    type: RomType;
    size: number;
    sizePretty: string;
}

export interface Config {
    /** A map of layout numbers to layout name */
    layout_names: Record<number, string>;
    /** A map of tileset offsets to tileset name */
    tileset_names: Record<number, string>;
    /** A map of tileset offsets to a base64 representation of each tile's levels */
    tileset_levels: Record<number, string>;
    /** A Map of tileset to [secondary tileset | brushes] */
    brushes: BrushStore;
}

/** The curretly open ROM */
export const rom: Writable<Rom | null> = writable(null);

/** The current config */
export const config: Writable<Config> = writable(null);

/** The cached list of loaded map names */
export const mapNames: Writable<string[]> = writable(null);