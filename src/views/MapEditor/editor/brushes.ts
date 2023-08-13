import { get, writable } from "svelte/store";
import { BlocksData, NULL } from "./blocks_data";
import type { SerializedBrush, SerializedNinePatchBrush, SerializedSimpleBrush } from "./brush_serialization";
import { PaintingMaterial } from "./materials";
import type { PainterState } from "./painter_state";

export enum BrushType {
    Simple,
    NinePatch,
}

export abstract class BrushMaterial extends PaintingMaterial {
    static LAST_UID = 0;

    /** Name of the brush (as it appears in the preview) */
    public name = "Unnamed Brush";
    /** The brush's type */
    public readonly abstract type: BrushType;
    /** Whether the brush is pinned to the top in the brushes list */
    public pinned = writable(false);
    /** The blocks that are modified by MapCanvas in the BrushEditor */
    public blocks: BlocksData;
    /** Unique identifier for svelte each */
    public uid: number = BrushMaterial.LAST_UID++;

    constructor(public primary: number, public secondary?: number) {
        super();
    }

    /** This brush type's icon */
    static icon: string = "";
    /** This brush type's name */
    static typeName: string = "";

    public get width(): number {
        return this.blocks.width;
    }
    public get height(): number {
        return this.blocks.height;
    }
    public resizeBlocks(newWidth: number, newHeight: number) {
        this.blocks = this.blocks.resize(newWidth, newHeight);
    }

    /** Return the square metatile data matrix that appears in the thumbnail */
    public getThumbnailMetatile(): number[][] {
        const metatiles = [];
        let side = Math.min(this.width, this.height);

        for (let y = 0; y < side; y++) {
            metatiles[y] = [];
            for (let x = 0; x < side; x++)
                metatiles[y][x] = this.blocks.getMetatileInBounds(x, y) ?? 0;
        }
        return metatiles;
    }

    /** Returns the canvas with the rendered thumbnail */
    public renderThumbnail(botTiles: CanvasRenderingContext2D, topTiles: CanvasRenderingContext2D): HTMLCanvasElement {
        // Obtain the thumbnail metatile
        const metatiles = this.getThumbnailMetatile();
        const width = metatiles[0].length;
        const height = metatiles.length;

        // Create the canvas
        const canvas = document.createElement("canvas");
        canvas.width = width * 16;
        canvas.height = height * 16;
        const ctx = canvas.getContext("2d");

        const drawSingleMetatile = (source: CanvasImageSource,
            metatile: number, x: number, y: number
        ) => {
            ctx.drawImage(
                source,
                metatile * 16, 0,
                16, 16,
                x * 16, y * 16,
                16, 16
            );
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const metatile = metatiles[y][x];
                drawSingleMetatile(botTiles.canvas, metatile, x, y);
                drawSingleMetatile(topTiles.canvas, metatile, x, y);
            }
        }

        return canvas;
    }

    /** Creates a base64 image for preview */
    public createPreviewImage(botTiles: CanvasRenderingContext2D, topTiles: CanvasRenderingContext2D): string {
        // TODO: Use a different image than the thumbnail
        const canvas = this.renderThumbnail(botTiles, topTiles);
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

    public get brushName(): string {
        // @ts-ignore
        return this.constructor.typeName;
    }
    public get icon(): string {
        // @ts-ignore
        return this.constructor.icon;
    }

    /** Returns if this brush's blocks are all inside of the primary tileset given */
    public onlyUsesPrimaryTiles(tileset1Length: number): boolean {
        return !this.blocks.metatiles.some(mtid => mtid >= tileset1Length);
    }
    /** Serializes a brush into a storable object */
    public serialize(): SerializedBrush {
        return {
            blocks: this.blocks.toSerialized(),
            type: this.type,
            name: this.name,
            pinned: get(this.pinned),
            primary: this.primary,
            secondary: this.secondary
        };
    }

    public static deserialize(serialized: SerializedBrush): BrushMaterial {
        switch (serialized.type) {
            case BrushType.Simple:
                return SimpleBrush.deserialize(serialized as SerializedSimpleBrush);
            case BrushType.NinePatch:
                return NinePatchBrush.deserialize(serialized as SerializedNinePatchBrush);
        }
        throw new Error("Invalid Brush type for serialized object");
    }
}

export class SimpleBrush extends BrushMaterial {
    static MAX_WIDTH = 64;
    static MAX_HEIGHT = 64;

    static typeName = "Simple Brush";
    static icon = "ep:brush-filled";
    public blocks: BlocksData = new BlocksData(1, 1, 0, null);
    public readonly type = BrushType.Simple;

    public apply(state: PainterState, x: number, y: number): void {
        const blocks = this.blocks;
        const width = blocks.width;
        const height = blocks.height;

        for (let dy = 0; dy < height; dy++)
            for (let dx = 0; dx < width; dx++)
                state.set(x + dx, y + dy, blocks.getMetatile(dx, dy), blocks.getLevel(dx, dy));
    }

    public clone(): SimpleBrush {
        const brush = new SimpleBrush(this.primary, this.secondary);
        brush.blocks = this.blocks.clone();
        brush.name = this.name;
        brush.pinned = this.pinned;
        return brush;
    }

    public equals(other: SimpleBrush): boolean {
        if (!super.equals(other)) return false;

        return this.width === other.width &&
            this.height === other.height;
    }

    public serialize(): SerializedSimpleBrush {
        return super.serialize() as SerializedSimpleBrush;
    }

    public static deserialize(serialized: SerializedSimpleBrush) {
        const brush = new SimpleBrush(serialized.primary, serialized.secondary);
        brush.blocks = BlocksData.fromSerialized(serialized.blocks);
        if (brush.width > SimpleBrush.MAX_WIDTH || brush.height > SimpleBrush.MAX_HEIGHT)
            return null;
        brush.name = serialized.name;
        brush.pinned = writable(serialized.pinned);
        return brush;
    }
}


// ANCHOR Nine patch brush
const BORDER_VISIT_ORDER: [dx: number, dy: number][] = [
    [-1, -1], [0, -1], [1, -1], [1, 0],
    [1, 1], [0, 1], [-1, 1], [-1, 0]
]
/** 
 * Returns a vector of true and false representing whether the blocks surrounding
 * the given coordinates match a given condition.
 * 
 * Blocks out of bounds return false by default, but it can be changed with the
 * `outOfBoundsBehavior` parameter.
 */
function getBorderMask(state: PainterState, x: number, y: number,
    predicate: (metatile: number, level: number) => boolean,
    fallback: boolean = false
): number {
    const mask = [fallback, fallback, fallback, fallback, fallback, fallback, fallback, fallback];

    let index = 0;
    for (const [i, j] of BORDER_VISIT_ORDER) {
        const metatile = state.getMetatile(x + i, y + j);
        if (metatile === NULL) { index++; continue; }
        const level = state.getLevel(x + i, y + j);
        mask[index++] = predicate(metatile, level);
    }

    // Transform it into an 8-bit mask
    let result = 0;
    for (let i = 0; i < 8; i++)
        result |= (mask[7 - i] ? 1 : 0) << i;
    return result;
}

export class NinePatchBrush extends BrushMaterial {
    static typeName = "Nine Patch Brush";
    static icon = "icon-park-outline:nine-key";
    public blocks: BlocksData = new BlocksData(3, 3, 0, null);
    public readonly type = BrushType.NinePatch;
    private _hasCorners = false;

    public set hasCorners(hasCorners) {
        if (this._hasCorners === hasCorners) return;

        this._hasCorners = hasCorners;
        // Resize the blocks
        this.blocks = this.blocks.resize(hasCorners ? 6 : 3, this.blocks.height);

        if (!hasCorners) return;

        // Fill all the new blocks
        // O O O X N N
        // O O O X N N
        // O O O X X X
        this.blocks.setMetatile(3, 0, NULL);
        this.blocks.setMetatile(3, 1, NULL);
        this.blocks.setMetatile(3, 2, NULL);
        this.blocks.setMetatile(4, 2, NULL);
        this.blocks.setMetatile(5, 2, NULL);

        const [metatile, level] = this.getBlock(1, 1);
        this.blocks.set(4, 0, metatile, level);
        this.blocks.set(5, 0, metatile, level);
        this.blocks.set(4, 1, metatile, level);
        this.blocks.set(5, 1, metatile, level);
    }
    public get hasCorners() {
        return this._hasCorners;
    }

    public apply(state: PainterState, x: number, y: number): void {
        this.applyPatch(state, x, y, false);
        this.applyPatch(state, x - 1, y - 1);
        this.applyPatch(state, x, y - 1);
        this.applyPatch(state, x + 1, y - 1);
        this.applyPatch(state, x + 1, y);
        this.applyPatch(state, x + 1, y + 1);
        this.applyPatch(state, x, y + 1);
        this.applyPatch(state, x - 1, y + 1);
        this.applyPatch(state, x - 1, y);
    }

    private applyPatch(state: PainterState, x: number, y: number, side: boolean = true) {
        if (!this.blocks.metatiles.includes(state.getMetatile(x, y)) && side) return;

        // Get the border masks
        const mask = getBorderMask(state, x, y, (metatile, _) => {
            return this.blocks.metatiles.includes(metatile);
        });

        // Get the block to put here based on the mask
        const [metatile, level] = this.getReplacement(mask);
        state.set(x, y, metatile, level);
    }


    private getReplacement(mask: number): [number, number] {
        if (mask === 0) return this.getBlock(1, 1);

        if (this.hasCorners) {
            // North-west corner
            if (mask === 0b01111111) return this.getCorner(0, 0);
            // North-east corner
            if (mask === 0b11011111) return this.getCorner(1, 0);
            // South-east corner
            if (mask === 0b11110111) return this.getCorner(1, 1);
            // South-west corner
            if (mask === 0b11111101) return this.getCorner(0, 1);
        }

        // North-west side
        if ((mask & 0b11000001) === 0) return this.getBlock(0, 0);
        // Sout-west side
        if ((mask & 0b00000111) === 0) return this.getBlock(0, 2);
        // North-east side
        if ((mask & 0b01110000) === 0) return this.getBlock(2, 0);
        // South-east side
        if ((mask & 0b00011100) === 0) return this.getBlock(2, 2);

        // North side
        if ((mask & 0b01000000) === 0) return this.getBlock(1, 0);
        // West side
        if ((mask & 0b00000001) === 0) return this.getBlock(0, 1);
        // South side
        if ((mask & 0b00000100) === 0) return this.getBlock(1, 2);
        // East side
        if ((mask & 0b00010000) === 0) return this.getBlock(2, 1);

        return this.getBlock(1, 1);
    }


    private getBlock(x: number, y: number): [number, number] {
        return [this.blocks.getMetatile(x, y), this.blocks.getLevel(x, y)];
    }
    private getCorner(x: number, y: number) {
        if (!this.hasCorners) return this.getBlock(1, 1);
        return this.getBlock(4 + x, y);
    }


    public clone(): NinePatchBrush {
        const brush = new NinePatchBrush(this.primary, this.secondary);
        brush.blocks = this.blocks.clone();
        brush.name = this.name;
        brush._hasCorners = this._hasCorners;
        brush.pinned = this.pinned;
        return brush;
    }

    public equals(other: NinePatchBrush): boolean {
        if (!super.equals(other)) return false;

        return this.hasCorners === other.hasCorners;
    }

    public serialize(): SerializedNinePatchBrush {
        return { ...super.serialize(), hasCorners: this.hasCorners } as SerializedNinePatchBrush;
    }

    public static deserialize(serialized: SerializedNinePatchBrush) {
        const brush = new NinePatchBrush(serialized.primary, serialized.secondary);
        brush.blocks = BlocksData.fromSerialized(serialized.blocks);
        brush.name = serialized.name;
        brush._hasCorners = serialized.hasCorners;
        brush.pinned = writable(serialized.pinned);
        return brush;
    }
}