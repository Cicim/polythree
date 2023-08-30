import type { PaintingMaterial } from "./materials";
import type { PainterState } from "./painter_state";

export enum EditorTool {
    Pencil = "pencil",
    Fill = "fill",
    Rectangle = "rectangle",
    Replace = "replace",
}

interface ToolOptions {
    /** Whether the shift key was pressed when the painting action started */
    shiftKey: boolean;
    /** Whether the ctrl key was pressed when the painting action started */
    ctrlKey: boolean;
    /** Whether you are editing permissions. */
    editingPermissions: boolean;
}

export class Tool {
    constructor(
        public state: PainterState,
        public material: PaintingMaterial,
        protected options: ToolOptions = null,
    ) { }

    public startStroke(x: number, y: number): void { };
    public moveStroke(x: number, y: number): void { };
    public endStroke(x: number, y: number): void { };
}

export class PencilTool extends Tool {
    private lastX: number = null;
    private lastY: number = null;

    public startStroke(x: number, y: number) {
        this.lastX = x;
        this.lastY = y;
        this.material.apply(this.state, x, y);
        this.state.update();
    }

    public moveStroke(x: number, y: number) {
        if (this.lastX === null || this.lastY === null) return;
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(dist);

        // This avoids calling the apply function with NaNs.
        if (steps === 0) return;

        for (let i = 0; i <= steps; i++) {
            const stepX = this.lastX + dx * (i / steps);
            const stepY = this.lastY + dy * (i / steps);
            this.material.apply(this.state, Math.round(stepX), Math.round(stepY));
        }
        this.state.update();
        this.lastX = x;
        this.lastY = y;
    }
}

export class SquareTool extends Tool {
    private startX: number = null;
    private startY: number = null;

    public startStroke(x: number, y: number) {
        this.startX = x;
        this.startY = y;
        this.material.apply(this.state, x, y);
        this.state.update();
    }

    public moveStroke(x: number, y: number) {
        if (this.startX === null || this.startY === null) return;

        // Revert the old blocks
        this.state.restore();

        // Draw the new blocks
        const minX = Math.min(this.startX, x);
        const maxX = Math.max(this.startX, x);
        const minY = Math.min(this.startY, y);
        const maxY = Math.max(this.startY, y);

        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                this.material.apply(this.state, cx, cy);
            }
        }
        this.state.update();
    }

    public endStroke(x: number, y: number) {
        this.startX = null;
        this.startY = null;
    }
}



enum FillPredicate {
    SameMetatile = 1,
    SamePermission = 2,
    SameMetatileAndPermission = 3,
}
function computeFillPredicate(options: ToolOptions): FillPredicate {
    if (options.shiftKey)
        return FillPredicate.SameMetatileAndPermission;
    else {
        if (options.editingPermissions)
            return FillPredicate.SamePermission;
        else return FillPredicate.SameMetatile;
    }
}
function canReplace(self: FillTool | ReplaceTool, metatile: number, permission: number) {
    switch (self.fillPredicate) {
        case FillPredicate.SameMetatile:
            return metatile === self.replaceMetatile;
        case FillPredicate.SamePermission:
            return permission === self.replacePermission;
        case FillPredicate.SameMetatileAndPermission:
            return metatile === self.replaceMetatile && permission === self.replacePermission;
    }
}

export class FillTool extends Tool {
    public fillPredicate: FillPredicate;
    public replaceMetatile: number;
    public replacePermission: number;

    constructor(
        state: PainterState,
        material: PaintingMaterial,
        options: ToolOptions,
    ) {
        super(state, material, options);
        this.fillPredicate = computeFillPredicate(options);
    }

    public startStroke(x: number, y: number) {
        if (!this.fillPredicate) return;

        // Save the metatile and permission we're replacing
        this.replaceMetatile = this.state.getMetatile(x, y);
        this.replacePermission = this.state.getPermission(x, y);
        // Initialize the set of visited blocks
        const visited = new Set<CoordinatesHash>();
        const toFill: [x: number, y: number][] = [];

        // Initialize the fill queue
        const queue = [[x, y]];

        while (queue.length > 0) {
            // Get the next point from the queue
            const [cx, cy] = queue.shift();

            // Skip it if it already has been visited
            if (visited.has(`${cx},${cy}`)) continue;
            // Mark it as visited
            visited.add(`${cx},${cy}`);

            // Skip it if it's out of bounds
            if (!this.state.methods.canPaint(cx, cy)) continue;

            const metatile = this.state.getMetatile(cx, cy);
            const permission = this.state.getPermission(cx, cy);
            if (canReplace(this, metatile, permission)) {
                // Fill this tile
                toFill.push([cx, cy]);

                // Add the neighbors to the queue
                queue.push([cx - 1, cy]);
                queue.push([cx + 1, cy]);
                queue.push([cx, cy - 1]);
                queue.push([cx, cy + 1]);
            }
        }

        // Visit all the tiles to replace them with the material
        for (const [x, y] of toFill)
            this.material.apply(this.state, x, y);
        this.state.update();
    }
}

export class ReplaceTool extends Tool {
    public fillPredicate: FillPredicate;
    public replaceMetatile: number;
    public replacePermission: number;

    constructor(
        state: PainterState,
        material: PaintingMaterial,
        options: ToolOptions,
    ) {
        super(state, material, options);
        this.fillPredicate = computeFillPredicate(options);
    }

    public startStroke(x: number, y: number) {
        if (!this.fillPredicate) return;

        // Save the metatile and permission we're replacing
        this.replaceMetatile = this.state.getMetatile(x, y);
        this.replacePermission = this.state.getPermission(x, y);

        const toReplace: [x: number, y: number][] = [];

        // Loop each tile on the map
        this.state.forEach((x, y, metatile, perm) => {
            if (canReplace(this, metatile, perm))
                toReplace.push([x, y]);
        });

        // Visit all the tiles to replace them with the material
        for (const [x, y] of toReplace)
            this.material.apply(this.state, x, y);
        this.state.update();
    }
}

export const toolFunctions: Record<EditorTool, typeof Tool> = {
    [EditorTool.Pencil]: PencilTool,
    [EditorTool.Fill]: FillTool,
    [EditorTool.Rectangle]: SquareTool,
    [EditorTool.Replace]: ReplaceTool,
}