export const NULL_METATILE = 0xFFFF;
export const NULL_PERMISSION = 0xFF;

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


type MetatilesArray = Uint16Array;
type PermissionsArray = Uint8Array;

export class BlocksData {
    /** The blocks width */
    public width: number;
    /** The blocks height */
    public height: number;
    /** An `Uint16Array` of metatiles where non-existant metatiles are represented as `NULL` */
    public metatiles: MetatilesArray;
    /** An `Uint16Array` of permissions where non-existant permissions are represented as `NULL` */
    public permissions: PermissionsArray;

    // ANCHOR Construction
    /** Creates an blocksData from width, height and the values that will fill the metatiles and permissions
     * @param width The blocks width
     * @param height The blocks height
     * @param metaTilesFill The value that will fill the metatiles, null or undefined will fill with `NULL`
     * @param permissionsFill The value that will fill the permissions, null or undefined will fill with `NULL`
     */
    constructor(width: number, height: number, metaTilesFill: number = 0, permissionsFill: number = NULL_PERMISSION) {
        this.width = width;
        this.height = height;
        this.metatiles = new Uint16Array(width * height)
            .fill(metaTilesFill === null ? NULL_METATILE : metaTilesFill);
        this.permissions = new Uint8Array(width * height)
            .fill(permissionsFill === null ? NULL_PERMISSION : permissionsFill);
    }

    /** Creates a BlockData from a tuple of metatile and permission */
    public static fromBlockData(blockData: BlockData): BlocksData {
        return new BlocksData(1, 1, blockData[0], blockData[1]);
    }

    /** Creates a BlocksData from the imported blocks from rust */
    public static fromImportedBlockData(data: ImportedBlocksData): BlocksData {
        const blocks = new BlocksData(data.width, data.height);
        blocks.metatiles = Uint16Array.from(data.metatiles);
        blocks.permissions = Uint8Array.from(data.levels);
        return blocks;
    }

    /** Creates a BlocksData from the serialized blocks fo a brush */
    public static fromSerialized(blocks: SerializedBlocksData): BlocksData {
        const data = new BlocksData(blocks.width, blocks.height);
        data.metatiles = Uint16Array.from(blocks.metatiles);
        data.permissions = Uint8Array.from(blocks.permissions);
        return data;
    }

    // ANCHOR Checks
    /** Returns true if the block at (x, y) is null, aka `metatiles[x, y] === NULL` */
    public isNull(x: number, y: number) {
        return this.getMetatile(x, y) === NULL_METATILE;
    }
    /** Returns true if (x, y) is out of bounds */
    public outOfBounds(x: number, y: number) {
        return x < 0 || y < 0 || x >= this.width || y >= this.height;
    }
    /** Returns the index in the metatiles/permissions given the coordinates */
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
    public setMetatile(x: number, y: number, metatile: number = NULL_METATILE) {
        this.metatiles[this.width * y + x] = metatile;
    }
    /** Gets the permission at (x, y) */
    public getPermission(x: number, y: number): number {
        return this.permissions[this.width * y + x];
    }
    /** Gets the permission at (x, y) or undefined if the given position is out of bounds */
    public getPermissionInBounds(x: number, y: number): number | undefined {
        if (this.outOfBounds(x, y)) return undefined;
        return this.getPermission(x, y);
    }
    /** Sets the permission at (x, y) to permission. permission defaults to `NULL` */
    public setPermission(x: number, y: number, permission: number = NULL_PERMISSION): number {
        return this.permissions[this.width * y + x] = permission;
    }
    /** Sets both the metatile and permission at (x, y). both parameters default to `NULL` */
    public set(x: number, y: number, metatile: number = NULL_METATILE, permission: number = NULL_PERMISSION) {
        this.setMetatile(x, y, metatile);
        this.setPermission(x, y, permission);
    }
    /** Sets both the metatile and the permission from the given BlockData at (x, y) */
    public setFromBlockData(x: number, y: number, blockData: BlockData) {
        this.set(x, y, blockData[0], blockData[1]);
    }
    /** Returns the BlockData (aka [metatile, permission]) at (x, y) */
    public get(x: number, y: number): BlockData {
        return [this.getMetatile(x, y), this.getPermission(x, y)];
    }

    // ANCHOR Large Updates
    /** Sets the values in the metatiles to the ones in the given metatiles,
     *  inserting them from `start`, up to `length` */
    public updateMetatiles(metatiles: ArrayLike<number>, start: number = 0, length: number = metatiles.length) {
        for (let i = 0; i < length; i++) {
            this.metatiles[start + i] = metatiles[i];
        }
    }
    /** Sets the values in the permission to the ones in the given permissions,
     *  inserting them from `start`, up to `length` */
    public updatePermissions(permissions: ArrayLike<number>, start: number = 0, length: number = permissions.length) {
        for (let i = 0; i < length; i++) {
            this.permissions[start + i] = permissions[i];
        }
    }

    // ANCHOR Manipulation
    /** Creates a copy of this blocksData */
    public clone(): BlocksData {
        const blocks = new BlocksData(this.width, this.height);
        blocks.metatiles = this.metatiles.slice();
        blocks.permissions = this.permissions.slice();
        return blocks;
    }
    /** Creates a copy of this blockData with its dimensions changed */
    public resize(newWidth: number, newHeight: number, permission: number = NULL_PERMISSION): BlocksData {
        const blocks = new BlocksData(newWidth, newHeight, 0, permission);
        for (let y = 0; y < Math.min(newHeight, this.height); y++) {
            for (let x = 0; x < Math.min(newWidth, this.width); x++) {
                blocks.set(x, y, this.getMetatile(x, y), this.getPermission(x, y));
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
            permissions: Array.from(this.permissions),
        };
    }

    /** Updates the values of this blocks to the given blocks without updating any references */
    public update(newData: BlocksData) {
        this.width = newData.width;
        this.height = newData.height;
        this.metatiles = new Uint16Array(newData.metatiles.length);
        this.updateMetatiles(newData.metatiles, 0, newData.metatiles.length);
        this.permissions = new Uint8Array(newData.permissions.length)
        this.updatePermissions(newData.permissions, 0, newData.permissions.length);
        return this;
    }
}