import type { TilesetData } from "src/views/MapEditor";
import { get, writable } from "svelte/store";
import type { SerializedBrush, SerializedNinePatchBrush, SerializedSimpleBrush } from "./brush_serialization";
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
    public readonly abstract type: BrushType;
    /** Whether the brush is pinned to the top in the brushes list */
    public pinned = writable(false);
    /** The blocks that are modified by MapCanvas in the BrushEditor */
    public blocks: BlockData[][];
    /** This brush type's icon */
    static icon: string = "";
    /** This brush type's name */
    static typeName: string = "";


    public get width(): number {
        return this.blocks?.[0]?.length ?? 0;
    }

    public set width(value: number) {
        // Add or remove columns
        if (value > this.width) {
            // Add new columns
            this.blocks = this.blocks.map((row) =>
                [...row, ...new Array(value - this.width)
                    .fill(0).map(_ => [0, null] as BlockData)]
            );
        } else {
            // Remove Columns
            this.blocks = this.blocks.map((row) => row.slice(0, value));
        }
    }

    public get height(): number {
        return this.blocks?.length ?? 0;
    }

    public set height(value: number) {
        // Add or remove rows
        if (value > this.height) {
            // Add new rows
            this.blocks = [...this.blocks, ...new Array(value - this.height)
                .fill(0).map(_ => new Array(this.width)
                    .fill(0).map(_ => [0, null] as BlockData))];
        }
        else {
            // Remove rows
            this.blocks = this.blocks.slice(0, value);
        }
    }

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
            blocks: this.blocks,
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
    public blocks: BlockData[][] = [[[42, null]]];
    public readonly type = BrushType.Simple;

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
        brush.name = this.name;
        brush.pinned = this.pinned;
        return brush;
    }

    public equals(other: SimpleBrush): boolean {
        if (!super.equals(other)) return false;

        return this.width === other.width && this.height === other.height;
    }

    public serialize(): SerializedSimpleBrush {
        return super.serialize() as SerializedSimpleBrush;
    }

    public static deserialize(serialized: SerializedSimpleBrush) {
        const brush = new SimpleBrush();
        brush.blocks = serialized.blocks.map((row) => row.map((block) => [...block]));
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
    public blocks: BlockData[][] = [
        [
            [42, null], [42, null], [42, null],
            [42, null], [42, null], [42, null],
            [42, null], [42, null], [42, null],
        ],
    ];
    public readonly type = BrushType.NinePatch;
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

    public serialize(): SerializedNinePatchBrush {
        return { ...super.serialize(), hasCorners: this.hasCorners } as SerializedNinePatchBrush;
    }

    public static deserialize(serialized: SerializedNinePatchBrush) {
        const brush = new NinePatchBrush();
        brush.blocks = serialized.blocks.map((row) => row.map((block) => [...block]));
        brush.name = serialized.name;
        brush.hasCorners = serialized.hasCorners;
        brush.pinned = writable(serialized.pinned);
        return brush;
    }
}