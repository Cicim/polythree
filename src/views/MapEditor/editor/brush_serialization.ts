import { invoke } from "@tauri-apps/api";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import { spawnDialog } from "src/systems/dialogs";
import { config } from "src/systems/global";
import { get } from "svelte/store";
import type { SerializedBlocksData } from "./blocks_data";
import { BrushMaterial, type BrushType } from "./brushes";

export interface SerializedBrush {
    /** The brushe's type */
    type: BrushType;
    /** The brush name */
    name: string;
    /** The serialized blocks */
    blocks: SerializedBlocksData;
    /** The current pinned state */
    pinned: boolean;
    /** The brush's primary tileset offset */
    primary: number;
    /** The brush's secondary tileset offeset (or undefined) */
    secondary?: number;
}

export interface SerializedSimpleBrush extends SerializedBrush {
    type: BrushType.Simple;
}

export interface SerializedNinePatchBrush extends SerializedBrush {
    type: BrushType.NinePatch;
}

function getPrimaryTilesetBrushes(tileset1: number): SerializedBrush[] {
    // If no configs were loaded for the tileset1
    if (!get(config).brushes[tileset1]) {
        // Update the configs object
        config.update(config => {
            config.brushes[tileset1] = {
                brushes: [],
                secondary: {}
            }
            return config;
        });

        return [];
    }
    return get(config).brushes[tileset1].brushes;
}

function getSecondaryTilesetBrushes(tileset1: number, tileset2: number): SerializedBrush[] {
    // If no secondary tileset exists for this primary one, create it and return empty []
    if (!get(config).brushes[tileset1].secondary[tileset2]) {
        // Update the configs object
        config.update(config => {
            config.brushes[tileset1].secondary[tileset2] = [];
            return config;
        });

        return [];
    }
    return get(config).brushes[tileset1].secondary[tileset2];
}

/** Loads the brushes for the given primary tileset from the configs */
export async function loadBrushesForPrimaryTileset(tilesetOffset: number): Promise<BrushMaterial[]> {
    let primaryTilesetBrushes = [];

    try {
        // Get the brushes for the primary tileset
        primaryTilesetBrushes = getPrimaryTilesetBrushes(tilesetOffset);
    }
    catch (err) {
        console.error("Could not load Brushes for this Tileset", tilesetOffset);
    }
    finally {
        // Deserialize the brushes
        const deserialized = primaryTilesetBrushes.map(serializedBrush => BrushMaterial.deserialize(serializedBrush))
            .filter(brush => brush !== null);

        return deserialized;
    }
}

/** Loads the brushes for the given [primary, secondary] tileset pair from the configs */
export async function loadBrushesForSecondaryTileset(primaryOffset: number, tilesetOffset: number): Promise<BrushMaterial[]> {
    let secondaryTilesetBrushes = [];

    try {
        // Get the brushes for the secondary tileset
        secondaryTilesetBrushes = getSecondaryTilesetBrushes(primaryOffset, tilesetOffset);
    }
    catch (err) {
        console.error("Could not load Brushes for this Tileset", tilesetOffset);
    }
    finally {
        // Deserialize the brushes
        const deserialized = secondaryTilesetBrushes.map(serializedBrush => BrushMaterial.deserialize(serializedBrush))
            .filter(brush => brush !== null);

        return deserialized;
    }
}

export async function saveBrushesForTilesets(
    tileset1: number, tileset2: number,
    primaryBrushes: BrushMaterial[], secondaryBrushes: BrushMaterial[]
) {
    const tileset1Brushes = primaryBrushes.map(brush => brush.serialize());
    const tileset2Brushes = secondaryBrushes.map(brush => brush.serialize());

    // Update the brushes in the configs
    config.update(config => {
        config.brushes[tileset1].brushes = tileset1Brushes;
        config.brushes[tileset1].secondary[tileset2] = tileset2Brushes;
        return config;
    })

    try {
        // Save the brushes in the file
        await invoke("update_brushes", {
            tileset1, tileset2, tileset1Brushes, tileset2Brushes
        });
    }
    catch (err) {
        await spawnDialog(AlertDialog, {
            title: "Failed to save brushes",
            message: err
        });
    }
}