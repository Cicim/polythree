import type { SvelteComponent } from "svelte";
import { writable, get, type Writable } from "svelte/store";

import { KeepChangesDialog } from "./dialogs";
import { ViewContext } from "./views";
import { EditorChanges } from "./changes";


/** The container for all of the editor's functionalities
 * that integrate with Svelte or the DOM.
 */
export abstract class EditorContext extends ViewContext {
    /** The changes made to the editor */
    public changes: EditorChanges;
    /** This editor's data, used for displaying information */
    public data: Writable<Record<string, any>>;
    /** Whether or not the editor is currently loading */
    public isLoading: Writable<boolean>;

    /** If this value is true, the editor will close 
     * as soon as it is done saving */
    protected slatedForClose: boolean = false;

    public tabActions = {
        ...super.getTabActions(),
        "editor/save": () => {
            this.save();
        },
        "editor/undo": () => {
            this.changes.undo();
        },
        "editor/redo": () => {
            this.changes.redo();
        }
    }

    public constructor(ComponentClass: typeof SvelteComponent,
        id: Record<string, any>) {
        super(ComponentClass, { ...id });

        this.data = writable({});
        this.changes = new EditorChanges(this.data);
        this.isLoading = writable(true);
    }

    /** Function to run when the editor needs saving */
    public abstract save(): Promise<boolean>;
    /** Function to run when the editor first opens */
    public abstract load(): Promise<void>;

    /** Signals the user the saving process has started */
    public startSaving() {
        if (!this.needsSaveNow) return true;
        this.changes.saving.set(true);
        this.changes.locked = true;
        return false;
    }

    /** Execute after saving. Reverts the icons to their original states */
    public doneSaving() {
        // Applies the changes
        this.changes.setSaved();
        // Close the editor if it was slated for closing
        if (this.slatedForClose) super.close();

        return true;
    }

    public select() {
        super.select();
    }


    public get needsSaveNow() {
        return get(this.changes.unsaved);
    }
    public get isSavingNow() {
        return get(this.changes.saving);
    }

    /** Asks the user for the needs save prompt and awaits for them to answer */
    public async promptClose() {
        (<HTMLInputElement>document.activeElement)?.blur();
        // If the editor is saving, just slate it to be closed later
        if (this.isSavingNow) {
            this.slatedForClose = true;
            // Don't close now, wait for it to be done saving
            return null;
        }
        // If it doesn't need saving, just close it
        if (!this.needsSaveNow) return false;
        // Otherwise, open the dialog
        this.select();
        return await new KeepChangesDialog().open();
    }

    /** Awaits for the editor to close */
    public async close() {
        const promptResult = await this.promptClose();

        if (promptResult === null) return;
        // If the user wants to save, save it
        if (promptResult === true)
            await this.save()
        // If the save was successful, close it
        await super.close();
    }

    /** Closes the editor, but does not stick around for it to finish closing */
    public async askClose(): Promise<void> {
        const promptResult = await this.promptClose();

        if (promptResult === null) return;
        if (promptResult === true)
            this.save().then(() => super.close());
        else super.close();
    }
}