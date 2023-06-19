import { KeepChangesDialog } from "./dialogs";
import { ViewContext } from "./views";
import { writable, type Writable } from "svelte/store";


/** The container for all of the editor's functionalities
 * that integrate with Svelte or the DOM.
 */
export abstract class EditorContext extends ViewContext {
    /** Whether or not the editor needs to be saved */
    public needsSave: Writable<boolean> = writable(false);
    /** Whether or not the editor is currently saving */
    public isSaving: Writable<boolean> = writable(false);

    public tabActions = {
        ...super.getTabActions(),
        "editor/save": () => {
            this.save();
        }
    }

    /** Function to run when the editor needs saving */
    public abstract save(): Promise<boolean>;

    /** Signals the user the saving process has started */
    public startSaving() {
        this.isSaving.set(true);
    }

    /** Reverts the icons to their original states */
    public doneSaving() {
        this.needsSave.set(false);
        this.isSaving.set(false);
    }

    public select() {
        super.select();
    }

    public get needsSaveNow() {
        let needsSave: boolean;
        this.needsSave.update((value) =>
            (needsSave = value, value));
        return needsSave;
    }
    public get isSavingNow() {
        let isSaving: boolean;
        this.isSaving.update((value) =>
            (isSaving = value, value));
        return isSaving;
    }

    /** Asks the user for the needs save prompt and awaits for them to answer */
    public async promptClose() {
        // Skip if the editor is in the process of saving
        if (this.isSavingNow) return;
        // If it doesn't need saving, just close it
        if (!this.needsSaveNow) return super.close();
        this.select();
        // Otherwise, open the dialog
        return await new KeepChangesDialog().open();
    }

    /** Awaits for the editor to close */
    public async close() {
        if (await this.promptClose()) {
            // If the user wants to save, save it
            if (await this.save()) {
                // If the save was successful, close it
                await super.close();
            }
        }
    }

    /** Closes the editor, but does not stick around for it to finish closing */
    public async askClose(): Promise<void> {
        if (await this.promptClose())
            this.save().then(() => super.close());
    }
}