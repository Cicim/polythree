/** Information about a single block (metatile and level) */
export type BlockData = [metatile: number, level: number];

/** Methods offered by the MapEditor for painting */
export interface PainterMethods {
    /** Whether null levels are allowed */
    nullLevels: boolean;

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
    private oldBlocks: Record<BlockHash, BlockData> = {};
    /** New value of the blocks after they've been modified */
    private newBlocks: Record<BlockHash, BlockData> = {};
    /** If something was drawn during a movement */
    private drawn: boolean = false;

    public constructor(private methods: PainterMethods, private brush: Brush) { }

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

    /** Gets the given block */
    public get(x: number, y: number): BlockData {
        if (!this.methods.inBounds(x, y)) return null;

        return this.methods.get(x, y);
    }

    /** Redraws the map editor with the new updates */
    public update() {
        if (this.drawn)
            this.methods.update();
    }

    /** Removes all changes that didn't do anything */
    public clean() {
        for (const [hash, data] of Object.entries(this.newBlocks)) {
            if (data[0] === this.oldBlocks[hash][0] && data[1] === this.oldBlocks[hash][1]) {
                delete this.newBlocks[hash];
                delete this.oldBlocks[hash];
            }
        }
    }
}


export abstract class Brush {
    public name = "Untitled Brush #";

    constructor(name?: string) {
        this.name = name ?? this.name;
    }

    public startStroke(state: PainterState, x: number, y: number) { }
    public moveStroke(state: PainterState, x: number, y: number) { }
    public endStroke(state: PainterState, x: number, y: number) { }
}

export class PencilBrush extends Brush {
    public name = "Pencil";
    public block: BlockData;

    constructor(block: BlockData) {
        super();
        this.block = block;
    }

    private lastX: number = null;
    private lastY: number = null;

    public startStroke(state: PainterState, x: number, y: number) {
        this.lastX = x;
        this.lastY = y;
        state.set(x, y, this.block);
        state.update();
    }

    public moveStroke(state: PainterState, x: number, y: number) {
        if (this.lastX === null || this.lastY === null) return;
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(dist);
        for (let i = 0; i <= steps; i++) {
            const stepX = this.lastX + dx * (i / steps);
            const stepY = this.lastY + dy * (i / steps);
            state.set(Math.round(stepX), Math.round(stepY), this.block);
        }
        state.update();
        this.lastX = x;
        this.lastY = y;
    }

    public endStroke(state: PainterState, x: number, y: number) {
        this.lastX = null;
        this.lastY = null;
        state.clean();
    }
}