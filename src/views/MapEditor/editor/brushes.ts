export type BlockData = number;
type BlockHash = `${number},${number}`;

/** Methods offered by the MapEditor for painting */
export interface PainterMethods {
    /** Returns whether the given block is in bounds */
    inBounds(x: number, y: number): boolean;
    /** Set a block at the given coordinates */
    set(x: number, y: number, data: BlockData): void;
    /** Get a block at the given coordinates */
    get(x: number, y: number): BlockData;
    /** Update the screen */
    update(): void;
}

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

        if (this.get(x, y) === data) return;

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
            if (data === this.oldBlocks[hash]) {
                delete this.newBlocks[hash];
                delete this.oldBlocks[hash];
            }
        }
    }
}


export class Brush {
    public name = "Untitled Brush #";

    constructor(name?: string) {
        this.name = name ?? this.name;
    }

    public startStroke(state: PainterState, x: number, y: number) {
        // Set the 0 stuff here
        state.set(x, y, 0);
        state.update();
    }

    public moveStroke(state: PainterState, x: number, y: number) {
        // Set the 0 stuff here
        state.set(x, y, 0);
        state.update();
    }

    public endStroke(state: PainterState, x: number, y: number) {
        // Set the 0 stuff here
        state.clean();
    }
}

export class PencilBrush extends Brush {
    public name = "Pencil";
    public block: number;

    constructor(block: number) {
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
        for (let i = 0; i < steps; i++) {
            const stepX = this.lastX + dx * (i / steps);
            const stepY = this.lastY + dy * (i / steps);
            state.set(Math.round(stepX), Math.round(stepY), this.block);
        }
        if (steps) state.update();
        this.lastX = x;
        this.lastY = y;
    }

    public endStroke(state: PainterState, x: number, y: number) {
        this.lastX = null;
        this.lastY = null;
        state.clean();
    }
}