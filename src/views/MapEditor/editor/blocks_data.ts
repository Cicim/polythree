export const NULL = 0xFFFF;

export interface BlocksChangedEvent {
    detail: {
        blocks: BlocksData;
        anyChanges: boolean;
        timestamp: number;
        oldBlocks: Record<CoordinatesHash, BlockData>;
        newBlocks: Record<CoordinatesHash, BlockData>;
    };
}

export interface ImportedBlocksData {
    width: number;
    height: number;
    metatiles: number[];
    levels: number[];
}

export type SerializedBlocksData = ImportedBlocksData;

export class BlocksData {
    /** The blocks width */
    public width: number;
    /** The blocks height */
    public height: number;
    /** An `Uint16Array` of metatiles where non-existant metatiles are represented as `NULL` */
    public metatiles: Uint16Array;
    /** An `Uint16Array` of levels where non-existant levels are represented as `NULL` */
    public levels: Uint16Array;

    // ANCHOR Construction
    /** Creates an blocksData from width, height and the values that will fill the metatiles and levels
     * @param width The blocks width
     * @param height The blocks height
     * @param metaTilesFill The value that will fill the metatiles, null or undefined will fill with `NULL`
     * @param levelsFill The value that will fill the levels, null or undefined will fill with `NULL`
     */
    constructor(width: number, height: number, metaTilesFill: number = 0, levelsFill: number = NULL) {
        this.width = width;
        this.height = height;
        this.metatiles = new Uint16Array(width * height)
            .fill(metaTilesFill === null ? NULL : metaTilesFill);
        this.levels = new Uint16Array(width * height)
            .fill(levelsFill === null ? NULL : levelsFill);
    }

    /** Creates a BlockData from a tuple of metatile and level */
    public static fromBlockData(blockData: BlockData): BlocksData {
        return new BlocksData(1, 1, blockData[0], blockData[1]);
    }

    /** Creates a BlocksData from the imported blocks from rust */
    public static fromImportedBlockData(data: ImportedBlocksData): BlocksData {
        const blocks = new BlocksData(data.width, data.height);
        blocks.metatiles = Uint16Array.from(data.metatiles);
        blocks.levels = Uint16Array.from(data.levels);
        return blocks;
    }

    /** Creates a BlocksData from the serialized blocks fo a brush */
    public static fromSerialized(blocks: SerializedBlocksData): BlocksData {
        const data = new BlocksData(blocks.width, blocks.height);
        data.metatiles = Uint16Array.from(blocks.metatiles);
        data.levels = Uint16Array.from(blocks.levels);
        return data;
    }

    // ANCHOR Checks
    /** Returns true if the block at (x, y) is null, aka `metatiles[x, y] === NULL` */
    public isNull(x: number, y: number) {
        return this.getMetatile(x, y) === NULL;
    }
    /** Returns true if (x, y) is out of bounds */
    public outOfBounds(x: number, y: number) {
        return x < 0 || y < 0 || x >= this.width || y >= this.height;
    }
    /** Returns the index in the metatiles/levels given the coordinates */
    public index(x: number, y: number): number {
        return this.width * y + x;
    }

    // ANCHOR Getters and Setters
    /** Returns the metatile at (x, y) */
    public getMetatile(x: number, y: number): number {
        return this.metatiles[this.width * y + x];
    }
    /** Returns the metatile at (x, y) or undefined if the given position is out of bounds */
    public getMetatileInBounds(x: number, y: number): number | undefined {
        if (this.outOfBounds(x, y)) return undefined;
        return this.getMetatile(x, y);
    }
    /** Sets the metatile at (x, y) to metatile. metaile defaults to `NULL` */
    public setMetatile(x: number, y: number, metatile: number = NULL) {
        this.metatiles[this.width * y + x] = metatile;
    }
    /** Gets the level at (x, y) */
    public getLevel(x: number, y: number): number {
        return this.levels[this.width * y + x];
    }
    /** Gets the level at (x, y) or undefined if the given position is out of bounds */
    public getLevelInBounds(x: number, y: number): number | undefined {
        if (this.outOfBounds(x, y)) return undefined;
        return this.getLevel(x, y);
    }
    /** Sets the level at (x, y) to level. level defaults to `NULL` */
    public setLevel(x: number, y: number, level): number {
        return this.levels[this.width * y + x] = level;
    }
    /** Sets both the metatile and level at (x, y). both parameters default to `NULL` */
    public set(x: number, y: number, metatile: number = NULL, level: number = NULL) {
        this.setMetatile(x, y, metatile);
        this.setLevel(x, y, level);
    }
    /** Sets both the metatile and the level from the given BlockData at (x, y) */
    public setFromBlockData(x: number, y: number, blockData: BlockData) {
        this.set(x, y, blockData[0], blockData[1]);
    }
    /** Returns the BlockData (aka [metatile, level]) at (x, y) */
    public get(x: number, y: number): BlockData {
        return [this.getMetatile(x, y), this.getLevel(x, y)];
    }

    // ANCHOR Large Updates
    public updateMetatiles(metatiles: ArrayLike<number>, start: number = 0, length: number = metatiles.length) {
        for (let i = 0; i < length; i++) {
            this.metatiles[start + i] = metatiles[i];
        }
    }

    public updateLevels(levels: ArrayLike<number>, start: number = 0, length: number = levels.length) {
        for (let i = 0; i < length; i++) {
            this.levels[start + i] = levels[i];
        }
    }

    // ANCHOR Manipulation
    /** Creates a copy of this blocksData */
    public clone(): BlocksData {
        const blocks = new BlocksData(this.width, this.height);
        blocks.metatiles = this.metatiles.slice();
        blocks.levels = this.levels.slice();
        return blocks;
    }
    /** Creates a copy of this blockData with its dimensions changed */
    public resize(newWidth: number, newHeight: number, level: number = NULL): BlocksData {
        const blocks = new BlocksData(newWidth, newHeight, 0, level);
        for (let y = 0; y < Math.min(newHeight, this.height); y++) {
            for (let x = 0; x < Math.min(newWidth, this.width); x++) {
                blocks.set(x, y, this.getMetatile(x, y), this.getLevel(x, y));
            }
        }
        return blocks;
    }
    /** Serializes the blocks to be stored in a JSON */
    public toSerialized(): SerializedBlocksData {
        return {
            width: this.width,
            height: this.height,
            metatiles: Array.from(this.metatiles),
            levels: Array.from(this.levels),
        };
    }

    /** Updates the values of this blocks to the given blocks without updating any references */
    public update(newData: BlocksData) {
        this.width = newData.width;
        this.height = newData.height;
        this.metatiles = new Uint16Array(newData.metatiles.length);
        this.updateMetatiles(newData.metatiles, 0, newData.metatiles.length);
        this.levels = new Uint16Array(newData.levels.length)
        this.updateLevels(newData.levels, 0, newData.levels.length);
        return this;
    }
}