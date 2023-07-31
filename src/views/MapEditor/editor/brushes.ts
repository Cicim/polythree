import type { TilesetData } from "src/views/MapEditor";
import { writable } from "svelte/store";
import { PaintingMaterial } from "./materials";
import type { PainterState } from "./painter_state";

export enum BrushType {
    Simple,
    NinePatch,
}

export abstract class BrushMaterial extends PaintingMaterial {
    /** Name of the brush (as it appears in the preview) */
    public name = "Unnamed Brush";
    /** The brush's type */
    public abstract type: BrushType;
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

    /** Creates a base64 image for preview */
    public createPreviewImage(tilesetData: TilesetData): string {
        const canvas = this.renderThumbnail(tilesetData);
        return canvas.toDataURL();
    }

    public abstract clone(): BrushMaterial;
}

export class SimpleBrush extends BrushMaterial {
    public name = "Simple Brush";
    public blocks: BlockData[][] = [[[42, null]]];
    public type = BrushType.Simple;
    public _width = 1;
    public _height = 1;

    public get width(): number {
        return this._width;
    }

    public set width(value: number) {
        // Add or remove columns
        if (value > this._width) {
            // Add new columns
            this.blocks = this.blocks.map((row) =>
                [...row, ...new Array(value - this._width)
                    .fill(0).map(_ => [0, null] as BlockData)]
            );
        } else {
            // Remove Columns
            this.blocks = this.blocks.map((row) => row.slice(0, value));
        }
        this._width = value;
    }

    public get height(): number {
        return this._height;
    }

    public set height(value: number) {
        // Add or remove rows
        if (value > this._height) {
            // Add new rows
            this.blocks = [...this.blocks, ...new Array(value - this._height)
                .fill(0).map(_ => new Array(this._width)
                    .fill(0).map(_ => [0, null] as BlockData))];
        }
        else {
            // Remove rows
            this.blocks = this.blocks.slice(0, value);
        }
        this._height = value;
    }

    public apply(state: PainterState, x: number, y: number): void {
        const blocks = this.blocks;
        const width = blocks[0].length;
        const height = blocks.length;

        for (let dy = 0; dy < height; dy++)
            for (let dx = 0; dx < width; dx++)
                state.set(x + dx, y + dy, blocks[dy][dx]);
    }

    public clone(): SimpleBrush {
        const brush = new SimpleBrush();
        brush.blocks = this.blocks.map((row) => row.map((block) => [...block]));
        brush.width = this.width;
        brush.height = this.height;
        brush.name = this.name;
        return brush;
    }
}

export class NinePatchBrush extends BrushMaterial {
    public name = "Nine Patch Brush";
    public blocks: BlockData[][] = [
        [
            [42, null], [42, null], [42, null],
            [42, null], [42, null], [42, null],
            [42, null], [42, null], [42, null],
        ],
    ];
    public type = BrushType.NinePatch;
    public hasCorners = false;

    public apply(state: PainterState, x: number, y: number): void {
        const blocks = this.blocks;
        const width = blocks[0].length;
        const height = blocks.length;

        for (let dy = 0; dy < height; dy++)
            for (let dx = 0; dx < width; dx++)
                state.set(x + dx, y + dy, blocks[dy][dx]);
    }

    public clone(): NinePatchBrush {
        const brush = new NinePatchBrush();
        brush.blocks = this.blocks.map((row) => row.map((block) => [...block]));
        brush.name = this.name;
        brush.hasCorners = this.hasCorners;
        return brush;
    }
}