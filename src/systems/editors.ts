import { Bindings } from "./bindings";
import { ViewContext, openViews } from "./views";
import { writable, type Writable } from "svelte/store";


/** The container for all of the editor's functionalities
 * that integrate with Svelte or the DOM.
 */
export abstract class EditorContext extends ViewContext {
    /** Whether or not the editor needs to be saved */
    public needsSave: Writable<boolean> = writable(false);
    
    public tabActions = {
        ...super.getTabActions(),
        "editor/save": () => {
            this.save();
        }
    }

    /** Function to run when the editor needs saving */
    public abstract save(): boolean;

    public select() {
        super.select();
    }

    public close() {
        this.needsSave.update((needsSave) => {
            if (!needsSave) super.close();
            return needsSave;
        });
    }
}