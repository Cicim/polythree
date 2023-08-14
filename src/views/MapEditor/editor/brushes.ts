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
    // North
    [0, -1],
    // North-East
    [1, -1],
    // East
    [1, 0],
    // South-East
    [1, 1],
    // South
    [0, 1],
    // South-West
    [-1, 1],
    // West
    [-1, 0],
    // North-West
    [-1, -1]
]
/**  Returns an 8-bit mask of the bordering metatiles */
function getBorderMask(state: PainterState, x: number, y: number,
    predicate: (metatile: number) => boolean,
    fallback: boolean = false
): number {
    let mask = 0;

    let index = 8;
    for (const [i, j] of BORDER_VISIT_ORDER) {
        // The first bit you write is bit 7
        index--;

        const metatile = state.getMetatile(x + i, y + j);
        // Compute the predicate only if the metatile is not null
        const bit = (metatile !== NULL) ? predicate(metatile) : fallback;

        // Set the bit and proceed
        mask |= (bit ? 1 : 0) << index;
    }

    return mask;
}

/** 
 * Returns true if the bits set in `ones` are all ones in `mask` and the
 * bits set in `zero` are all zeros in `mask`.
 */
function maskMatches(mask: number, ones: number, zeros: number): boolean {
    // Basically, we need that (mask & ones) == ones and (mask & zeros) == 0
    return (mask & ones) === ones && (mask & zeros) === 0;
}

export class NinePatchBrush extends BrushMaterial {
    static typeName = "Nine Patch Brush";
    static icon = "icon-park-outline:nine-key";
    public blocks: BlocksData = new BlocksData(5, 3, 0, null);
    public readonly type = BrushType.NinePatch;

    public apply(state: PainterState, x: number, y: number): void {
        // Apply the rules to the first tile
        this.applyPatch(state, x, y, false);

        // Apply the rules to the surrounding tiles
        this.applyPatch(state, x - 1, y - 1);
        this.applyPatch(state, x, y - 1);
        this.applyPatch(state, x + 1, y - 1);
        this.applyPatch(state, x + 1, y);
        this.applyPatch(state, x + 1, y + 1);
        this.applyPatch(state, x, y + 1);
        this.applyPatch(state, x - 1, y + 1);
        this.applyPatch(state, x - 1, y);
    }

    private canReplace(metatile: number): boolean {
        return this.blocks.metatiles.includes(metatile) || metatile === 0;
    }

    /** 
     * Obtains the mask of blocks surrounding the given one and 
     * uses it to compute a block to put in its place. */
    private applyPatch(state: PainterState, x: number, y: number, side: boolean = true) {
        if (!this.canReplace(state.getMetatile(x, y)) && side) return;

        // Get the border masks
        const mask = getBorderMask(state, x, y, (metatile) => this.canReplace(metatile));

        // Get the block to put here based on the mask
        const [metatile, level] = this.getReplacement(mask);
        if (metatile === 0)
            state.set(x, y, ...this.CENTER());
        else
            state.set(x, y, metatile, level);
    }

    /** Applies the rules (heavily documented inside) to produce a new block based on the mask */
    private getReplacement(mask: number): BlockData {
        // 1. All bordering tiles are part of the path
        if (mask === 0b11111111) return this.CENTER();
        // 2. All non-diagonally bordering tiles are part of the path
        if (mask === 0b10101010) return this.FOUR_CORNERS();
        // 3. Only the tile itself is part of the path
        if (maskMatches(mask, 0, 0b10101010)) return this.FOUR_SIDES();

        // Compute four masks by rotating the original one by 90 degrees
        const maskNorth = mask;
        const maskEast = (mask >> 6) | ((mask & 0b111111) << 2);
        const maskSouth = (mask >> 4) | ((mask & 0b1111) << 4);
        const maskWest = (mask >> 2) | ((mask & 0b11) << 6);
        const masks = [[0, maskNorth], [1, maskEast], [2, maskSouth], [3, maskWest]];

        // 4. Side (without corners)
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b00111110, 0b10000000))
                return this.SIDE(index);
        // 5. Two perpendicular sides (without corners)
        //    These are the blocks at the edges of a 3x3 square
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b00111000, 0b10000010))
                return this.SIDES_PERPENDICULAR(index);
        // 6. Two opposite sides (without corners)
        //    These are the blocks at the sides of a 3x3 square
        if (maskMatches(maskNorth, 0b10001000, 0b00100010)) return this.SIDES_OPPOSITE(0);
        if (maskMatches(maskEast, 0b10001000, 0b00100010)) return this.SIDES_OPPOSITE(1);
        // 7. Three sides (without corners)
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b00001000, 0b10100010))
                return this.THREE_SIDES(index);

        // 8. Corner (without sides)
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b11111110, 0b0000001)) return this.CORNER(index);
        // 9. Two adjacent corners (without sides)
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b10111110, 0b01000001))
                return this.CORNERS_ADJACENT(index);
        // 10. Two opposite corners (without sides)
        if (maskMatches(maskNorth, 0b11101110, 0b00010001)) return this.CORNERS_OPPOSITE(0);
        if (maskMatches(maskEast, 0b11101110, 0b00010001)) return this.CORNERS_OPPOSITE(1);
        // 11. Three corners (without sides)
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b10111010, 0b01000101))
                return this.CORNERS_THREE(index);

        // 12. Adjacent sides with corners
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b00101000, 0b10010010))
                return this.TWO_SIDES_WITH_CORNERS(index);
        // 13. Side with two corners
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b00101010, 0b10010100))
                return this.SIDE_WITH_TWO_CORNERS(index);
        // 14. Side with one corner (clockwise)
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b00101110, 0b10010000))
                return this.SIDE_WITH_CLOCKWISE_CORNER(index);
        // 15. Side with one corner (counterclockwise)
        for (const [index, mask] of masks)
            if (maskMatches(mask, 0b00111010, 0b10000100))
                return this.SIDE_WITH_COUNTERCLOCKWISE_CORNER(index);
    }
    private CENTER() { return this.blocks.get(1, 1); }
    private FOUR_CORNERS() { return [0, NULL] as BlockData; }
    private FOUR_SIDES() { return [0, NULL] as BlockData; }
    private SIDE(index: number) {
        if (index === 0) return this.blocks.get(1, 0);
        if (index === 1) return this.blocks.get(2, 1);
        if (index === 2) return this.blocks.get(1, 2);
        if (index === 3) return this.blocks.get(0, 1);
    }
    private SIDES_PERPENDICULAR(index: number) {
        if (index === 0) return this.blocks.get(0, 0);
        if (index === 1) return this.blocks.get(2, 0);
        if (index === 2) return this.blocks.get(2, 2);
        if (index === 3) return this.blocks.get(0, 2);
    }
    private SIDES_OPPOSITE(arg0: number) { return [0, NULL] as BlockData; }
    private THREE_SIDES(index: number) { return [0, NULL] as BlockData; }
    private CORNER(index: number) {
        if (index === 0) return this.blocks.get(4, 0);
        if (index === 1) return this.blocks.get(5, 0);
        if (index === 2) return this.blocks.get(5, 1);
        if (index === 3) return this.blocks.get(4, 1);
    }
    private CORNERS_ADJACENT(index: number) { return [0, NULL] as BlockData; }
    private CORNERS_OPPOSITE(arg0: number) { return [0, NULL] as BlockData; }
    private CORNERS_THREE(index: number) { return [0, NULL] as BlockData; }
    private TWO_SIDES_WITH_CORNERS(index: number) { return [0, NULL] as BlockData; }
    private SIDE_WITH_TWO_CORNERS(index: number) { return [0, NULL] as BlockData; }
    private SIDE_WITH_CLOCKWISE_CORNER(index: number) { return [0, NULL] as BlockData; }
    private SIDE_WITH_COUNTERCLOCKWISE_CORNER(index: number) { return [0, NULL] as BlockData; }


    public clone(): NinePatchBrush {
        const brush = new NinePatchBrush(this.primary, this.secondary);
        brush.blocks = this.blocks.clone();
        brush.name = this.name;
        brush.pinned = this.pinned;
        return brush;
    }

    public serialize(): SerializedNinePatchBrush {
        return super.serialize() as SerializedNinePatchBrush;
    }

    public static deserialize(serialized: SerializedNinePatchBrush) {
        const brush = new NinePatchBrush(serialized.primary, serialized.secondary);
        brush.blocks = BlocksData.fromSerialized(serialized.blocks);
        brush.name = serialized.name;
        brush.pinned = writable(serialized.pinned);
        return brush;
    }
}