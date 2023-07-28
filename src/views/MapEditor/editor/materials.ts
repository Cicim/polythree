import type { PainterState } from "./painter_state";

export abstract class PaintingMaterial {
    public name = "Untitled Material";

    constructor(name?: string) {
        this.name = name ?? this.name;
    }

    public apply(state: PainterState, x: number, y: number) { }
}

export class CustomMaterial extends PaintingMaterial {
    public name = "Brush";
}

export class PaletteMaterial extends PaintingMaterial {
    public name = "Palette Material";

    constructor(public blocks: BlockData[][]) {
        super();
        this.blocks = blocks;
    }

    public apply(state: PainterState, x: number, y: number): void {
        for (let j = 0; j < this.blocks.length; j++) {
            for (let i = 0; i < this.blocks[j].length; i++) {
                state.set(x + i, y + j, this.blocks[j][i]);
            }
        }
    }

    public get isSingular(): boolean {
        return this.blocks.length === 1 && this.blocks[0].length === 1;
    }
}

export class SelectionMaterial extends PaletteMaterial {
    public name = "Selection Material";

    constructor(
        tiles: BlockData[][],
        public metatileCanvas: HTMLCanvasElement,
        public levelCanvas: HTMLCanvasElement
    ) {
        super(tiles);
    }
}
