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

    constructor(private tiles: BlockData[][]) {
        super();
        this.tiles = tiles;
    }

    public apply(state: PainterState, x: number, y: number): void {
        for (let j = 0; j < this.tiles.length; j++) {
            for (let i = 0; i < this.tiles[j].length; i++) {
                state.set(x + i, y + j, this.tiles[j][i]);
            }
        }
    }
}