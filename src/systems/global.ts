import { writable, type Writable } from "svelte/store";


export interface Rom {
    path: string;
    type: RomType;
    size: number;
    sizePretty: string;
}

/** The curretly open ROM */
export const rom: Writable<Rom | null> = writable(null);

/** The current config */
export const config: Writable<RomConfig> = writable(null);