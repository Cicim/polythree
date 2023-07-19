import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import { spawnDialog } from "src/systems/dialogs";

/** Information about a single block (metatile and level) */
export type BlockData = [metatile: number, level: number];

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

    /** Removes all changes that didn't do anything */
    public clean() {
        spawnDialog(AlertDialog, {
            "title": "This was called?",
            "message": "Cleaned the changes that didn't do anything.",
        });

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

export class FillBucketBrush extends Brush {
    public name = "Fill Bucket";
    public replacement: BlockData;

    constructor(metatile: BlockData) {
        super();
        this.replacement = metatile;
    }

    /** Decides whether you can replace a block with the replacement */
    canReplace(block1: BlockData, block2: BlockData) {
        // If it fills the level only, then it discerns what to replace
        // based on the level only.
        if (this.replacement[0] === null)
            return block1[1] === block2[1];

        // In any other case, it discerns what to replace based on the
        // metatile only.
        return block1[0] === block2[0];
    }

    public startStroke(state: PainterState, x: number, y: number) {
        const current = state.get(x, y);
        state.set(x, y, this.replacement);
        state.update();
        if (this.canReplace(current, this.replacement)) return;

        const visited: Record<BlockHash, boolean> = {};
        // We cannot start at the given block, otherwise we'd stop immediately
        const queue: [number, number][] = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
        ];

        while (queue.length > 0) {
            // Extract the first element from the queue
            const [x, y] = queue.shift();
            const hash = `${x},${y}`;

            // Continue only if it can be replaced
            const block = state.get(x, y);
            // Continue if out of bounds
            if (block === null) continue;

            // If the block has already already visited, skip it
            if (visited[hash]) continue;
            visited[hash] = true;

            // Since current is never undefined, this also
            if (!this.canReplace(block, current)) continue;
            state.set(x, y, this.replacement);

            // Add the adjacent blocks to the queue
            queue.push([x - 1, y]);
            queue.push([x + 1, y]);
            queue.push([x, y - 1]);
            queue.push([x, y + 1]);

        }

        state.update();
    }
}

export class ReplaceBrush extends Brush {
    public name = "Replace";
    public replacement: BlockData;

    constructor(metatile: BlockData) {
        super();
        this.replacement = metatile;
    }

    canReplace(block1: BlockData, block2: BlockData) {
        // If working on level, only replace levels.
        if (this.replacement[0] === null)
            return block1[1] === block2[1];

        // In any other case, replace the tile.
        return block1[0] === block2[0];
    }

    public startStroke(state: PainterState, x: number, y: number) {
        const current = state.get(x, y);
        if (this.canReplace(current, this.replacement)) return;

        state.forEach((x, y, data) => {
            if (this.canReplace(data, current))
                state.set(x, y, this.replacement);
        });

        state.update();
    }
}
