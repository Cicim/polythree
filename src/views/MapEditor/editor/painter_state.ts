import { Change } from "src/systems/changes";

/** Methods offered by the MapEditor for painting */
export interface PainterMethods {
    /** Whether null levels are allowed */
    nullLevels: boolean;

    /** Loop over all blocks in the map */
    forEach(callback: (x: number, y: number, data: BlockData) => void): void;
    /** Returns whether the given block is in bounds */
    inBounds(x: number, y: number): boolean;
    /** Set a block at the given coordinates */
    set(x: number, y: number, data: BlockData): void;
    /** Get a block at the given coordinates */
    get(x: number, y: number): BlockData;
    /** Update the screen */
    update(): void;
}

type BlockHash = `${number},${number}`;

export class PainterState {
    /** Old value of the blocks from before that were modified */
    public oldBlocks: Record<BlockHash, BlockData> = {};
    /** New value of the blocks after they've been modified */
    public newBlocks: Record<BlockHash, BlockData> = {};
    /** If something was drawn during a movement */
    private drawn: boolean = false;

    public constructor(public methods: PainterMethods) { }

    /** Sets the given block and updates the chunk */
    public set(x: number, y: number, data: BlockData) {
        if (!this.methods.inBounds(x, y)) return;

        let oldData = this.get(x, y);

        // If null levels are not allowed, change the level value to
        // the one in the old block
        if (!this.methods.nullLevels && data[1] === null)
            data = [data[0], oldData[1]];

        // Storing null tiles is never supported, therefore if a
        // brush wants to set a null tile, it will be set to
        // the one in the old block
        if (data[0] === null)
            data = [oldData[0], data[1]];

        // If after all this, the new block is the same, don't do anything
        if (oldData[0] === data[0] && oldData[1] == data[1]) return;

        const hash = `${x},${y}`;

        // Never overwrite the old block if present
        if (this.oldBlocks[hash] === undefined)
            this.oldBlocks[hash] = this.methods.get(x, y);
        // Save the latest new block
        this.newBlocks[hash] = data;
        // Update the map editor
        this.methods.set(x, y, data);
        // Something was drawn
        this.drawn = true;
    }

    /** 
     * Gets the block `[metatile, level]` at the given coordinates.
     * 
     * Returns `null` if the coordinates are out of bounds.
     */
    public get(x: number, y: number): BlockData {
        if (!this.methods.inBounds(x, y)) return null;

        return this.methods.get(x, y);
    }

    /**
     * Loops over each block in the map with the callback function.
     */
    public forEach(callback: (x: number, y: number, data: BlockData) => void) {
        this.methods.forEach(callback);
    }

    /** Redraws the map editor with the new updates */
    public update() {
        if (this.drawn)
            this.methods.update();
    }
}

export class PaintChange extends Change {
    protected state: PainterState;

    /**
     * @param blocks The blocks in the mapEditor that was changed.
     * @param changedBlocks The blocks that were changed.
     */
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
            this.state.methods.set(x, y, data);
        }
        this.state.update();
    }

    public async revert() {
        for (const [hash, data] of Object.entries(this.state.oldBlocks)) {
            const [x, y] = hash.split(",").map(Number);
            this.state.methods.set(x, y, data);
        }
        this.state.update();
    }
}