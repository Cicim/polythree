import { writable, type Writable } from "svelte/store";

export interface Rom {
    path: string;
    type: string;
    size: number;
    sizePretty: string;
}

export interface Config {
    /** A map of layout numbers to layout name */
    layout_names: Record<number, string>;
    /** A map of tileset offsets to tileset name */
    tileset_names: Record<number, string>;
}

/** The curretly open ROM */
export const rom: Writable<Rom | null> = writable(null);

/** The current config */
export const config: Writable<Config> = writable(null);

/** The cached list of loaded map names */
export const mapNames: Writable<string[]> = writable(null);