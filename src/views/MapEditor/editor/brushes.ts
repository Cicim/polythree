import { Change, EditorChanges } from "src/systems/changes";
import type { TilesetData } from "src/views/MapEditor";
import { get, writable, type Writable } from "svelte/store";
import { PaintingMaterial, PaletteMaterial } from "./materials";
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

    public equals(other: BrushMaterial): boolean {
        // Compare the type
        if (this.type !== other.type) return false;
        // Compare the name
        if (this.name !== other.name) return false;
        // Compare the pinned reference
        if (this.pinned !== other.pinned) return false;
        // Compare the blocks
        if (JSON.stringify(this.blocks) !== JSON.stringify(other.blocks)) return false;

        return true;
    }
}

export class SimpleBrush extends BrushMaterial {
    static MAX_WIDTH = 64;
    static MAX_HEIGHT = 64;

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
        brush._width = this._width;
        brush._height = this._height;
        brush.blocks = this.blocks.map((row) => row.map((block) => [...block]));
        brush.name = this.name;
        brush.pinned = this.pinned;
        return brush;
    }

    public equals(other: SimpleBrush): boolean {
        if (!super.equals(other)) return false;

        return this.width === other.width && this.height === other.height;
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
        brush.pinned = this.pinned;
        return brush;
    }

    public equals(other: NinePatchBrush): boolean {
        if (!super.equals(other)) return false;

        return this.hasCorners === other.hasCorners;
    }
}


// ANCHOR Changes
export type BrushesChangesData = [Writable<BrushMaterial[]>, Writable<PaintingMaterial>, () => BlockData];

export class AddBrushChange extends Change {
    protected addedBrush: BrushMaterial;
    protected position: number;

    constructor(public brush: BrushMaterial) {
        super();
        this.addedBrush = brush;
    }

    public updatePrev(changes: EditorChanges<BrushesChangesData>): boolean {
        // Get the data
        const brushes = get(changes.data[0]);
        // Get the position the brush would finish at
        this.position = brushes.length;
        // Add the change
        return false;
    }
    public async revert(data: BrushesChangesData) {
        data[0].update((brushes) => {
            brushes.splice(this.position, 1);
            return brushes;
        });
        // If the selection is the brush, remove it
        if (get(data[1]) === this.addedBrush) {
            // Set the data to 0,0
            data[1].set(new PaletteMaterial([[data[2]()]]));
        }
    }
    public async apply(data: BrushesChangesData) {
        data[0].update((brushes) => {
            brushes.push(this.addedBrush);
            return brushes;
        });
    }
}
export class DeleteBrushChange extends Change {
    public deletedBrush: BrushMaterial;
    public position: number;

    constructor(brush: BrushMaterial) {
        super();
        this.deletedBrush = brush;
    }

    public updatePrev(changes: EditorChanges<BrushesChangesData>): boolean {
        // Get the brushes
        const brushes = get(changes.data[0]);
        // Get the brush's position in the array
        this.position = brushes.indexOf(this.deletedBrush);
        // If you can't find the brush, return
        if (this.position === -1) return true;
    }
    public async revert(data: BrushesChangesData): Promise<void> {
        // Add the brush back
        data[0].update((brushes) => {
            brushes.splice(this.position, 0, this.deletedBrush);
            return brushes;
        });
        // Set the material to the selected brush if it isn't a brush already
        data[1].update(material => {
            if (!(material instanceof BrushMaterial)) {
                return this.deletedBrush;
            }
            return material;
        });
    }
    public async apply(data: BrushesChangesData): Promise<void> {
        // Delete the element at the position
        data[0].update((brushes) => {
            brushes.splice(this.position, 1);
            return brushes;
        });
        // Select the empty tile
        data[1].set(new PaletteMaterial([[data[2]()]]));
    }

}
/** The edit brush change, takes as input an old clone of the brush, 
 * taken before starting to edit and the current editing brush */
export class EditBrushChange extends Change {
    constructor(public prevBrush: BrushMaterial, public nextBrush: BrushMaterial, public index: number) {
        super();
    }

    public updatePrev(_changes: EditorChanges<BrushesChangesData>): boolean {
        // Return if the brushes are the same
        return this.prevBrush.equals(this.nextBrush);
    }

    /** Updates the brush at the index */
    private updateBrush(data: BrushesChangesData, toInsert: BrushMaterial) {
        data[0].update((brushes) => {
            brushes.splice(this.index, 1, toInsert.clone());
            return brushes;
        });
    }

    public async revert(data: BrushesChangesData) {
        this.updateBrush(data, this.prevBrush);
    }

    public async apply(data: BrushesChangesData) {
        this.updateBrush(data, this.nextBrush);
    }
}