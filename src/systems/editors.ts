import type { SvelteComponent } from "svelte";
import { KeepChangesDialog } from "./dialogs";
import { ViewContext } from "./views";
import { writable, get, type Writable } from "svelte/store";


/** The container for all of the editor's functionalities
 * that integrate with Svelte or the DOM.
 */
export abstract class EditorContext extends ViewContext {
    public data: Writable<Record<string, any>>;
    /** Whether or not the editor needs to be saved */
    public needsSave: Writable<boolean>;
    /** Whether or not the editor is currently saving */
    public isSaving: Writable<boolean>;
    /** Whether or not the editor is currently loading */
    public isLoading: Writable<boolean>;

    /** If this value is true, the editor will close 
     * as soon as it is done saving */
    protected slatedForClose: boolean = false;

    public tabActions = {
        ...super.getTabActions(),
        "editor/save": () => {
            this.save();
        }
    }

    public constructor(ComponentClass: typeof SvelteComponent,
        id: Record<string, any>) {
        super(ComponentClass, { ...id });

        this.data = writable({});
        this.needsSave = writable(false);
        this.isSaving = writable(false);
        this.isLoading = writable(true);
    }

    /** Function to run when the editor needs saving */
    public abstract save(): Promise<boolean>;
    /** Function to run when the editor first opens */
    public abstract load(): Promise<void>;

    /** Signals the user the saving process has started */
    public startSaving() {
        this.isSaving.set(true);
    }

    /** Execute after saving. Reverts the icons to their original states */
    public doneSaving() {
        // Reset the dot icon
        this.needsSave.set(false);
        // Reset the loading icon
        this.isSaving.set(false);
        // Close the editor if it was slated for closing
        if (this.slatedForClose) super.close();

        return true;
    }

    public select() {
        super.select();
    }


    public get needsSaveNow() {
        return get(this.needsSave);
    }
    public get isSavingNow() {
        return get(this.isSaving);
    }

    /** Asks the user for the needs save prompt and awaits for them to answer */
    public async promptClose() {
        // If the editor is saving, just slate it to be closed later
        if (this.isSavingNow) {
            this.slatedForClose = true;
            return false;
        }
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