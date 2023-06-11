import { ViewContext } from "./views";


/** The container for all of the editor's functionalities
 * that integrate with Svelte or the DOM.
 */
export abstract class EditorContext extends ViewContext {
    /** Whether or not the editor needs to be saved */
    public needsSave: boolean = false;

    /** Function to run when the editor needs saving */
    public abstract save(): boolean;

    public close() {
        if (this.needsSave) {
            if (!confirm("You have unsaved changes. Are you sure you want to close this editor?")) {
                return;
            }
        }
        super.close();
    }
}