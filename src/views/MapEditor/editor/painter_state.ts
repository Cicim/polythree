import { Change } from "src/systems/changes";
import { NULL_METATILE, NULL_PERMISSION } from "src/views/MapEditor/editor/blocks_data";

/** Methods offered by the MapEditor for painting */
export interface PainterMethods {
    /** Whether null permission are allowed */
    nullPermissions: boolean;

    /** Loop over all blocks in the map */
    forEach(callback: (x: number, y: number, metatile: number, permission: number) => void): void;
    /** Returns whether you can paint on the given block */
    canPaint(x: number, y: number): boolean;
    /** Set a metatile and permission at the given coordinates */
    set(x: number, y: number, metatile: number, permission: number): void;
    /** Get a metatile at the given coordinates */
    getMetatile(x: number, y: number): number;
    /** Get a permission at the given coordinates */
    getPermission(x: number, y: number): number;
    /** Update the screen */
    update(): void;
    /** Returns whether you can write on the metatiles part of the blocks */
    canUpdateMetatiles(): boolean;
}

export class PainterState {
    /** Old value of the blocks from before that were modified */
    public oldBlocks: Record<CoordinatesHash, BlockData> = {};
    /** New value of the blocks after they've been modified */
    public newBlocks: Record<CoordinatesHash, BlockData> = {};
    /** If something was drawn during a movement */
    private drawn: boolean = false;

    public constructor(public methods: PainterMethods) { }

    /** Sets the given block and updates the chunk */
    public set(x: number, y: number, metatile: number, permission: number) {
        if (!this.methods.canPaint(x, y)) return;

        // If editing metatiles is not allowed, set the input to NULL
        // so that it won't overwrite the current metatile
        if (!this.methods.canUpdateMetatiles())
            metatile = NULL_METATILE;

        const oldMetatile = this.getMetatile(x, y);
        const oldPermission = this.getPermission(x, y);
        let updatedMetatile = metatile, updatedPermission = permission;

        // If null permissions are not allowed, change the permission value to
        // the one in the old block
        if (!this.methods.nullPermissions && permission === NULL_PERMISSION) {
            updatedPermission = oldPermission;
        }

        // Storing null tiles is never supported, therefore if a
        // brush wants to set a null tile, it will be set to
        // the one in the old block
        if (metatile === NULL_METATILE) {
            updatedMetatile = oldMetatile;
        }

        // If after all this, the new block is the same, don't do anything
        if (oldMetatile === updatedMetatile && oldPermission == updatedPermission) return;

        // Calculate an hash
        const hash: CoordinatesHash = `${x},${y}`;

        // Never overwrite the old block if present
        if (this.oldBlocks[hash] === undefined)
            this.oldBlocks[hash] = [oldMetatile, oldPermission];
        // Save the latest new block
        this.newBlocks[hash] = [updatedMetatile, updatedPermission];
        // Update the map editor
        this.methods.set(x, y, updatedMetatile, updatedPermission);
        // Something was drawn
        this.drawn = true;
    }

    public getMetatile(x: number, y: number): number {
        return this.methods.getMetatile(x, y);
    }
    public getPermission(x: number, y: number): number {
        return this.methods.getPermission(x, y);
    }

    /**
     * Loops over each block in the map with the callback function.
     */
    public forEach(callback: (x: number, y: number, metatile: number, level: number) => void) {
        this.methods.forEach(callback);
    }

    /** Redraws the map editor with the new updates */
    public update() {
        if (this.drawn)
            this.methods.update();
    }

    /** Restores the old blocks */
    public restore() {
        for (const [hash, data] of Object.entries(this.oldBlocks)) {
            const [x, y] = hash.split(",").map(Number);
            this.methods.set(x, y, data[0], data[1]);
        }

        // Clear the new blocks
        this.newBlocks = {};
        this.oldBlocks = {};
    }
}

export class PaintChange extends Change {
    static changeName = "Brush Stroke";
    protected state: PainterState;

    constructor(state: PainterState) {
        super();
        this.state = state;
    }

    public updatePrev(): boolean {
        return Object.values(this.state.newBlocks).length === 0;
    }

    public async apply() {
        for (const [hash, data] of Object.entries(this.state.newBlocks)) {
            const [x, y] = hash.split(",").map(Number);
            this.state.methods.set(x, y, data[0], data[1]);
        }
        this.state.update();
    }

    public async revert() {
        for (const [hash, data] of Object.entries(this.state.oldBlocks)) {
            const [x, y] = hash.split(",").map(Number);
            this.state.methods.set(x, y, data[0], data[1]);
        }
        this.state.update();
    }
}