import type { EditorChanges } from "src/systems/changes";
import type { MapEditorContext } from "src/views/MapEditor";
import type { BrushMaterial } from "../editor/brushes";
import type { SidebarState } from "../layout/LayoutSidebar.svelte";
import { get, writable, type Writable } from "svelte/store";
import {
    loadBrushesForPrimaryTileset,
    loadBrushesForSecondaryTileset,
    saveBrushesForTilesets
} from "../editor/brush_serialization";
import { spawnErrorDialog } from "src/systems/dialogs";
import type MapCanvas from "../editor/MapCanvas.svelte";

export class BrushesModule {
    private context: MapEditorContext;

    /** The list of brushes for the primary tileset */
    public primary: Writable<BrushMaterial[]>;
    /** The list of brushes for the secondary tileset */
    public secondary: Writable<BrushMaterial[]>;

    /** The brush that's being currently edited */
    public editing: Writable<BrushMaterial> = writable(null);
    /** The changes that are applied to the editing brush */
    public editingChanges: Writable<EditorChanges<null>> = writable(null);
    /** A clone of the brush you've just started editing right
     * before you made any edits to it */
    public editingClone: Writable<BrushMaterial> = writable(null);
    /** The state from which you entered brush editing */
    public editingEnteredFromState: SidebarState = null;
    /** The index of the editing brush within the brushes */
    public editingIndex: number = null;
    /** The Map Canvas of the currently edited blocks */
    public editingCanvas: Writable<MapCanvas> = writable(null);
    /** If you are editing a newly created brush */
    public brushNew: Writable<boolean> = writable(false);

    /** All the brushes that are currently being edited anywhere */
    static editingList: Writable<BrushMaterial[]> = writable([]);

    /** If the brushes are currently loading */
    public loading: Writable<boolean> = writable(false);

    // ANCHOR Main Methods
    constructor(context: MapEditorContext) {
        this.context = context;
    }
    /**
     * 
     *  Function to load/reload the brushes
     * 
     */
    public async load() {
        this.loading.set(true);
        // Reset everything before loading
        this.primary = writable([]);
        this.secondary = writable([]);

        // Sets the primary and secondary stores
        await this.loadBrushesForTilesets();
        this.loading.set(false);
    }

    /** Function to save data for the brushes */
    public async save() {
        try {
            // Close the brush currently being edited
            this.notifyClosedEditedBrush();
            await this.saveBrushesForTilesets();
        }
        catch (err) {
            await spawnErrorDialog(err, "Error while saving Brushes");
        }
    }

    // ANCHOR Other view updating
    /** Loops through all other MapEditors and pushes this brush into the editing ones */
    public notifyBrushEditingStarted(brush: BrushMaterial) {
        BrushesModule.editingList.update(list => {
            list.push(brush);
            return list;
        });
    }
    /** Loops through all other MapEditors and removes this brush from the editing ones */
    public notifyBrushEditingDone(brush: BrushMaterial) {
        BrushesModule.editingList.update(list => {
            list.splice(list.findIndex((b) => b === brush), 1);
            return list;
        });
    }
    /** Returns if the given brush is being edited inside any other MapEditor */
    public brushIsBeingEditedAnywhere(brush: BrushMaterial) {
        const list = get(BrushesModule.editingList);
        for (const b of list) {
            if (b.equals(brush)) return true;
        }
        return false;
    }
    private notifyClosedEditedBrush() {
        if (!get(this.editing)) return;
        this.notifyBrushEditingDone(get(this.editing));
    }

    // ANCHOR Changes Methods
    public undoBrushChanges() {
        this.$editingChanges.undo();
    }
    public redoBrushChanges() {
        this.$editingChanges.redo();
    }

    // ANCHOR Getters
    private get tileset1Offset() { return this.context.tileset1Offset }
    private get tileset2Offset() { return this.context.tileset2Offset }
    private get $editingChanges() { return get(this.editingChanges) }
    public get isEditing() {
        return this.$editingChanges !== null;
    }

    // ANCHOR Private Methods
    private async loadBrushesForTilesets() {
        let sameT1 = false;
        let sameT1AndT2 = false;

        // Look for another MapEditor with either of these tilesets
        for (const view of this.context.getOtherViews()) {
            // Check if the tilesets are the same
            if (view.tileset1Offset === this.tileset1Offset) {
                sameT1 = true;
                this.primary = view.brushes.primary;

                if (view.tileset2Offset === this.tileset2Offset) {
                    sameT1AndT2 = true;
                    this.secondary = view.brushes.secondary;
                }
            }
        };

        // If you didn't find a MapEditor with this tileset open, load the configs yourself
        if (!sameT1)
            this.primary = writable(await loadBrushesForPrimaryTileset(this.tileset1Offset));
        if (!sameT1AndT2)
            this.secondary = writable(
                await loadBrushesForSecondaryTileset(this.tileset1Offset, this.tileset2Offset)
            );
    }

    private async saveBrushesForTilesets() {
        await saveBrushesForTilesets(
            this.tileset1Offset,
            this.tileset2Offset,
            get(this.primary),
            get(this.secondary)
        );
    }
}