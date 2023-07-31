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

export class BrushMaterial extends PaintingMaterial {
    public name = "Unnamed Brush";
    public pinned = writable(false);
    public blocks: BlockData[][] = [[[0, null]]];

    public exportThumbnail(tilesetData: TilesetData): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 48, 48);

        // Draw the brush
        ctx.drawImage(tilesetData[104][0], 0, 0, 16, 16);
        ctx.drawImage(tilesetData[104][1], 0, 0, 16, 16);
        ctx.drawImage(tilesetData[105][0], 16, 0, 16, 16);
        ctx.drawImage(tilesetData[105][1], 16, 0, 16, 16);
        ctx.drawImage(tilesetData[106][0], 32, 0, 16, 16);
        ctx.drawImage(tilesetData[106][1], 32, 0, 16, 16);

        ctx.drawImage(tilesetData[112][0], 0, 16, 16, 16);
        ctx.drawImage(tilesetData[112][1], 0, 16, 16, 16);
        ctx.drawImage(tilesetData[113][0], 16, 16, 16, 16);
        ctx.drawImage(tilesetData[113][1], 16, 16, 16, 16);
        ctx.drawImage(tilesetData[114][0], 32, 16, 16, 16);
        ctx.drawImage(tilesetData[114][1], 32, 16, 16, 16);

        ctx.drawImage(tilesetData[120][0], 0, 32, 16, 16);
        ctx.drawImage(tilesetData[120][1], 0, 32, 16, 16);
        ctx.drawImage(tilesetData[121][0], 16, 32, 16, 16);
        ctx.drawImage(tilesetData[121][1], 16, 32, 16, 16);
        ctx.drawImage(tilesetData[122][0], 32, 32, 16, 16);
        ctx.drawImage(tilesetData[122][1], 32, 32, 16, 16);

        return canvas;
    }
}