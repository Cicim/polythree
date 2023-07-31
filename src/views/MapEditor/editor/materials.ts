import type { TilesetData } from "src/views/MapEditor";
import { writable } from "svelte/store";
import type { PainterState } from "./painter_state";

export abstract class PaintingMaterial {
    public name = "Untitled Material";

    constructor(name?: string) {
        this.name = name ?? this.name;
    }

    public apply(state: PainterState, x: number, y: number) { }
}

export class PaletteMaterial extends PaintingMaterial {
    public name = "Palette Material";
    public isPaletteMaterial = true;

    constructor(public blocks: BlockData[][]) {
        super();
        this.blocks = blocks;
    }

    public apply(state: PainterState, x: number, y: number): void {
        for (let j = 0; j < this.blocks.length; j++) {
            for (let i = 0; i < this.blocks[j].length; i++) {
                state.set(x + i, y + j, this.blocks[j][i]);
            }
        }
    }

    public get isSingular(): boolean {
        return this.blocks.length === 1 && this.blocks[0].length === 1;
    }
}

export class SelectionMaterial extends PaletteMaterial {
    public name = "Selection Material";
    public isPaletteMaterial = false;

    constructor(
        tiles: BlockData[][],
        public metatileCanvas: HTMLCanvasElement,
        public levelCanvas: HTMLCanvasElement
    ) {
        super(tiles);
    }
}

export abstract class BrushMaterial extends PaintingMaterial {
    /** Name of the brush (as it appears in the preview) */
    public name = "Unnamed Brush";
    /** Whether the brush is pinned to the top in the brushes list */
    public pinned = writable(false);
    /** The blocks that are modified by MapCanvas in the BrushEditor */
    public blocks: BlockData[][];

    /** Return the square metatile data matrix that appears in the thumbnail */
    public getThumbnailMetatile(): number[][] {
        const metatiles = [];
        let side = Math.min(this.blocks.length, this.blocks[0].length);

        for (let y = 0; y < side; y++) {
            metatiles[y] = [];
            for (let x = 0; x < side; x++)
                metatiles[y][x] = this.blocks?.[y]?.[x]?.[0] ?? 0;
        }
        return metatiles;
    }

    /** Returns the canvas with the rendered thumbnail */
    public renderThumbnail(tilesetData: TilesetData): HTMLCanvasElement {
        // Obtain the thumbnail metatile
        const metatiles = this.getThumbnailMetatile();
        const width = metatiles[0].length;
        const height = metatiles.length;

        // Create the canvas
        const canvas = document.createElement("canvas");
        canvas.width = width * 16;
        canvas.height = height * 16;
        const ctx = canvas.getContext("2d");

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const metatile = metatiles[y][x];
                const [bottom, top] = tilesetData[metatile];
                ctx.drawImage(bottom, x * 16, y * 16);
                ctx.drawImage(top, x * 16, y * 16);
            }
        }

        return canvas;
    }
}

export class TestBrush extends BrushMaterial {
    public name = "Test Brush";
    public blocks: BlockData[][] = [[[42, null]]];

    public apply(state: PainterState, x: number, y: number): void {
        state.set(x, y, [42, null]);
    }
}
