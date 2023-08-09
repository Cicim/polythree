import type { TilesetData } from "src/views/MapEditor";
import { get, writable } from "svelte/store";
import { BlocksData } from "./blocks_data";
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
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.blocks[y]?.[x]?.[0] >= tileset1Length)
                    return false;
            }
        }
        return true;
    }
    /** Serializes a brush into a storable object */
    public serialize(): SerializedBrush {
        return {
            blocks: this.blocks.toSerialized(),
            type: this.type,
            name: this.name,
            pinned: get(this.pinned),
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
        const brush = new SimpleBrush();
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
        const brush = new SimpleBrush();
        brush.blocks = BlocksData.fromSerialized(serialized.blocks);
        if (brush.width > SimpleBrush.MAX_WIDTH || brush.height > SimpleBrush.MAX_HEIGHT)
            return null;
        brush.name = serialized.name;
        brush.pinned = writable(serialized.pinned);
        return brush;
    }
}

export class NinePatchBrush extends BrushMaterial {
    static typeName = "Nine Patch Brush";
    static icon = "icon-park-outline:nine-key";
    public blocks: BlocksData = new BlocksData(3, 3, 0, null);
    public readonly type = BrushType.NinePatch;
    public hasCorners = false;

    public apply(state: PainterState, x: number, y: number): void {
        const blocks = this.blocks;
        const width = blocks.width;
        const height = blocks.height;

        for (let dy = 0; dy < height; dy++)
            for (let dx = 0; dx < width; dx++)
                state.set(x + dx, y + dy, blocks.getMetatile(dx, dy), blocks.getLevel(dx, dy));
    }

    public clone(): NinePatchBrush {
        const brush = new NinePatchBrush();
        brush.blocks = this.blocks.clone();
        brush.name = this.name;
        brush.hasCorners = this.hasCorners;
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
        const brush = new NinePatchBrush();
        brush.blocks = BlocksData.fromSerialized(serialized.blocks);
        brush.name = serialized.name;
        brush.hasCorners = serialized.hasCorners;
        brush.pinned = writable(serialized.pinned);
        return brush;
    }
}