import type { BlocksData } from "./blocks_data";
import type { PainterState } from "./painter_state";

export abstract class PaintingMaterial {
    public name = "Untitled Material";

    constructor(name?: string) {
        this.name = name ?? this.name;
    }

    public apply(state: PainterState, x: number, y: number) { }
}

export class PaletteMaterial extends PaintingMaterial {
    public name = "Palette Material";
    public isPaletteMaterial = true;

    constructor(public blocks: BlocksData) {
        super();
    }

    public apply(state: PainterState, x: number, y: number): void {
        for (let j = 0; j < this.blocks.height; j++) {
            for (let i = 0; i < this.blocks.width; i++) {
                state.set(x + i, y + j,
                    this.blocks.metatiles[j * this.blocks.width + i],
                    this.blocks.permissions[j * this.blocks.width + i
                    ]);
            }
        }
    }

    public get isSingular(): boolean {
        return this.blocks.width === 1 && this.blocks.width === this.blocks.height;
    }
}

export class SelectionMaterial extends PaletteMaterial {
    public name = "Selection Material";
    public isPaletteMaterial = false;

    constructor(
        blocks: BlocksData,
        public metatileCanvas: HTMLCanvasElement,
        public permissionCanvas: HTMLCanvasElement
    ) {
        super(blocks);
    }
}
