import { Change, type EditorChanges } from "src/systems/changes";
import { type Writable, get } from "svelte/store";
import type { BlocksData } from "./blocks_data";
import { BrushMaterial } from "./brushes";
import { type PaintingMaterial, PaletteMaterial } from "./materials";

export type BrushesChangesData = [Writable<BrushMaterial[]>, Writable<PaintingMaterial>, () => BlocksData];

export class AddBrushChange extends Change {
    protected addedBrush: BrushMaterial;
    protected position: number;

    constructor(public brush: BrushMaterial) {
        super();
        this.addedBrush = brush.clone();
    }

    public updatePrev(changes: EditorChanges<BrushesChangesData>): boolean {
        // Get the data
        const brushes = get(changes.data[0]);
        // Get the position the brush would finish at
        this.position = brushes.length;
        // Add the change
        return false;
    }
    // Remove from brushes
    public async revert(data: BrushesChangesData) {
        data[0].update((brushes) => {
            brushes.splice(this.position, 1);
            return brushes;
        });
        // If the selection is the brush, remove it
        if (get(data[1]) === this.addedBrush) {
            // Set the data to 0,0
            data[1].set(new PaletteMaterial(data[2]()));
        }
    }
    // Adds to brushes
    public async apply(data: BrushesChangesData) {
        data[0].update((brushes) => {
            brushes.push(this.addedBrush.clone());
            return brushes;
        });
    }
}
export class DeleteBrushChange extends Change {
    public deletedBrush: BrushMaterial;
    public position: number;

    constructor(brush: BrushMaterial) {
        super();
        this.deletedBrush = brush;
    }

    public updatePrev(changes: EditorChanges<BrushesChangesData>): boolean {
        // Get the brushes
        const brushes = get(changes.data[0]);
        // Get the brush's position in the array
        this.position = brushes.indexOf(this.deletedBrush);
        // If you can't find the brush, return
        if (this.position === -1) return true;
    }
    // Adds to brushes
    public async revert(data: BrushesChangesData): Promise<void> {
        const clonedBrush = this.deletedBrush.clone();
        // Add the brush back
        data[0].update((brushes) => {
            brushes.splice(this.position, 0, clonedBrush);
            return brushes;
        });
        // Set the material to the selected brush if it isn't a brush already
        data[1].update(material => {
            if (!(material instanceof BrushMaterial)) {
                return clonedBrush;
            }
            return material;
        });
    }
    // Removes from brushes
    public async apply(data: BrushesChangesData): Promise<void> {
        // Delete the element at the position
        data[0].update((brushes) => {
            brushes.splice(this.position, 1);
            return brushes;
        });
        // Select the empty tile
        data[1].set(new PaletteMaterial(data[2]()));
    }

}
/** The edit brush change, takes as input an old clone of the brush, 
 * taken before starting to edit and the current editing brush */
export class EditBrushChange extends Change {
    constructor(public prevBrush: BrushMaterial, public nextBrush: BrushMaterial, public index: number) {
        super();
    }

    public updatePrev(_changes: EditorChanges<BrushesChangesData>): boolean {
        // Return if the brushes are the same
        return this.prevBrush.equals(this.nextBrush);
    }

    /** Updates the brush at the index */
    private updateBrush(data: BrushesChangesData, toInsert: BrushMaterial) {
        data[0].update((brushes) => {
            brushes[this.index] = toInsert.clone();
            return brushes;
        });
    }

    public async revert(data: BrushesChangesData) {
        this.updateBrush(data, this.prevBrush);
    }

    public async apply(data: BrushesChangesData) {
        this.updateBrush(data, this.nextBrush);
    }
}