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
}

export interface SerializedSimpleBrush extends SerializedBrush {
    type: BrushType.Simple;
}

export interface SerializedNinePatchBrush extends SerializedBrush {
    type: BrushType.NinePatch;
    hasCorners: boolean;
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

export async function loadBrushesForTilesets(tileset1: number, tileset2: number): Promise<BrushMaterial[]> {
    let primaryTilesetBrushes = [];
    let secondaryTilesetBrushes = [];

    try {
        // Get the brushes for the primary tileset
        primaryTilesetBrushes = getPrimaryTilesetBrushes(tileset1);
        // Get the brushes for the secondary tileset
        secondaryTilesetBrushes = getSecondaryTilesetBrushes(tileset1, tileset2);
    }
    catch (err) {
        console.error("Could not load Brushes for these Tilesets", tileset1, tileset2);
    }
    finally {
        // Mix the two together
        const brushes = [...primaryTilesetBrushes, ...secondaryTilesetBrushes];
        // Deserialize the brushes
        const deserialized = brushes.map(serializedBrush => BrushMaterial.deserialize(serializedBrush))
            .filter(brush => brush !== null);

        return deserialized;
    }
}
export async function saveBrushesForTilesets(tileset1: number, tileset2: number, brushes: BrushMaterial[], tileset1Length: number) {
    const tileset1Brushes = [];
    const tileset2Brushes = [];

    // Sort the brushes based on their blocks
    for (const brush of brushes) {
        const serializedBrush = brush.serialize();

        if (brush.onlyUsesPrimaryTiles(tileset1Length))
            tileset1Brushes.push(serializedBrush);
        else tileset2Brushes.push(serializedBrush);
    }

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