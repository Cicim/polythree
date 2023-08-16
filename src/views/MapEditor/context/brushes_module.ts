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

export class BrushesModule {
    private context: MapEditorContext;

    /** The list of brushes for the primary tileset */
    public primary: Writable<BrushMaterial[]> = writable([]);
    /** The list of brushes for the secondary tileset */
    public secondary: Writable<BrushMaterial[]> = writable([]);

    /** The brush that's being currently edited */
    public editing: Writable<BrushMaterial> = writable(null);
    /** The changes that are applied to the editing brush */
    public editingChanges: Writable<EditorChanges<null>> = writable(null);
    /** A clone of the brush you've just started editing right
     * before you made any edits to it */
    public editingClone: Writable<BrushMaterial> = writable(null);
    /** The state from which you entered brush editing */
    public editingEnteredFromState: SidebarState;
    /** The index of the editing brush within the brushes */
    public editingIndex: number;

    // ANCHOR Main Methods
    /**
     * 
     *  Function to load/reload the brushes
     * 
     */
    public async load(context: MapEditorContext = undefined) {
        // Set the context if there is one, otherwise use the old one
        if (context) this.context = context;

        if (!context) throw new Error("No context provided for loading brushes");

        // Sets the primary and secondary stores
        await this.loadBrushesForTilesets();

        // Set the currently editing brush
        this.editing.set(null);
        this.editingClone.set(null);
        this.editingChanges.set(null);
        this.editingEnteredFromState = null;
        this.editingIndex = null;
    }

    /** Function to save data for the brushes */
    public async save() {
        // No context was provided yet
        if (!this.context) return;

        this.saveBrushesForTilesets();
    }

    // ANCHOR Secondary Methods
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