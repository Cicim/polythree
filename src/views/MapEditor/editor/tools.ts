import type { PaintingMaterial } from "./materials";
import type { PainterState } from "./painter_state";

export enum EditorTool {
    Pencil = "pencil",
    Fill = "fill",
    Rectangle = "rectangle",
    Replace = "replace",
}
export class Tool {
    constructor(
        public state: PainterState,
        public material: PaintingMaterial,
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
        for (let i = 0; i <= steps; i++) {
            const stepX = this.lastX + dx * (i / steps);
            const stepY = this.lastY + dy * (i / steps);
            this.material.apply(this.state, Math.round(stepX), Math.round(stepY));
        }
        this.state.update();
        this.lastX = x;
        this.lastY = y;
    }

    public endStroke(x: number, y: number) {
        this.lastX = null;
        this.lastY = null;
        this.state.clean();
    }
}

export const toolFunctions: Record<EditorTool, typeof Tool> = {
    [EditorTool.Pencil]: PencilTool,
    [EditorTool.Fill]: undefined,
    [EditorTool.Rectangle]: undefined,
    [EditorTool.Replace]: undefined
}