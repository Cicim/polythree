import type { SvelteComponent } from "svelte";
import { get, writable, type Writable } from "svelte/store";
import { Bindings } from "./bindings";
import { rom } from "./global";
import { spawnDialog } from "./dialogs";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import SaveDialog from "src/components/dialog/SaveDialog.svelte";
import { EditorChanges } from "./changes";
import { openViews, lastClosedViews } from "./views";


export abstract class ViewContext {
    /** The name of the view */
    public abstract name: string;
    /** Whether you can open more than one tab of this type */
    public singularTab = false;
    /** Whether or not this view needs the ROM to be loaded */
    public needsRom = true;
    /** The class of the view's component */
    protected componentClass: typeof SvelteComponent;
    /** The data that identifies this editor */
    public identifier: Record<string, any>;
    /** The Svelte component for the view's view */
    protected component: SvelteComponent;
    /** The list of key-bindable actions for this editor */
    public actions: Record<string, () => void> = {};
    /** The list of key-bindable actions for this editor's tab */
    public tabActions: Record<string, () => void> = this.getTabActions();

    /** The HTML element that the view is rendered in */
    public container: HTMLDivElement;
    /** Whether or not the view is currently active */
    public selected: boolean = false;
    /** Whether or not the tab is a valid dropzone for the currently dragged tab */
    public activeDropzone: boolean = false;


    public onSelect: () => void = () => {};
    public onDeselect: () => void = () => {};

    public constructor(ComponentClass: typeof SvelteComponent, id: Record<string, any>) {
        // Set the identifiers
        this.identifier = id;
        // Set the component class
        this.componentClass = ComponentClass;
    }

    /** Creates the svelte component */
    public create(position: number = null): this {
        if (this.needsRom) {
            // Check if the ROM is loaded
            if (get(rom) === null) {
                // Send an alert message that the ROM is not loaded
                spawnDialog(AlertDialog, {
                    title: "No ROM Loaded",
                    message: "You must load a ROM before you can open this tab.",
                });
                return { select: () => { } } as this;
            }
        }

        if (this.singularTab) {
            // Find a tab of the same type and with the same identifiers
            // @ts-ignore
            let preexisting = get(openViews).find((view) => view instanceof this.__proto__.constructor && JSON.stringify(view.identifier) === JSON.stringify(this.identifier));

            if (preexisting) {
                preexisting.select();
                return preexisting as this;
            }
        }

        // Get the view element
        const viewContainer = document.getElementById("views");
        // Create the view's container
        this.container = document.createElement("div");
        this.container.classList.add("view-container", "hidden");
        viewContainer.appendChild(this.container);

        // Create the svelte component
        this.component = new this.componentClass({
            target: this.container,
            props: {
                context: this,
            }
        });
        // Update the view store
        openViews.update(views => {
            if (position === null)
                views.push(this);
            else views.splice(position, 0, this);

            return views;
        });

        return this;
    }
    /** Function to run when the view is selected to be the active one */
    public select() {
        // Loop through all the open views
        openViews.update((views: ViewContext[]) => {
            for (const otherView of views) {
                // Unregister all the other editor's actions
                Bindings.unregister(otherView.actions);
                Bindings.unregister(otherView.tabActions);

                otherView.onDeselect();
                // Hide all the views that aren't the selected one
                otherView.container.classList.add("hidden");
                otherView.selected = false;
            }

            // Register this editor's actions
            Bindings.register(this.actions);
            Bindings.register(this.tabActions);

            this.onSelect();

            // Show the selected view
            this.container.classList.remove("hidden");
            this.selected = true;

            return views;
        });
    }
    /** Function to run when the view is closed */
    public async close(): Promise<boolean> {
        // Find this view's position in the store
        let index = -1;
        openViews.update((views: ViewContext[]) => {
            index = views.indexOf(this);
            // Remove the view from the store
            views.splice(index, 1);
            // Add the view to the closed views store
            this.addToLastClosed(index);

            return views;
        });
        // Unregister the view's actions
        Bindings.unregister(this.actions);
        Bindings.unregister(this.tabActions);
        // Destroy the view
        this.component.$destroy();
        // Remove the view's container
        this.container.remove();
        openViews.update(views => {
            // Select the view to the right of this one if it exists
            if (views.length > 0) {
                if (index >= views.length) {
                    views[views.length - 1].select();
                } else {
                    views[index].select();
                }
            }

            return views;
        });

        return true;
    }

    public async askClose(): Promise<boolean> {
        return this.close();
    }

    /** Saves this editor to an object where startup information can be stored
     * in order to be able to quickly reopen this editor */
    public addToLastClosed(position: number) {
        // Save the view's position
        lastClosedViews.update(views => {
            views.push({
                //@ts-ignore
                Class: this.__proto__.constructor,
                indentifier: this.identifier,
                position,
            });
            return views;
        });
    }

    /** Returns the list of actions that are specific to the tab */
    protected getTabActions() {
        return {
            "tab/close": () => {
                this.close();
            }
        };
    }
}

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

    /** A promise that resolves once the editor is done saving */
    public savePromise: Promise<boolean>;

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
        return await spawnDialog(SaveDialog, { editorName: this.name });
    }

    /** Awaits for the editor to close */
    public async close() {
        const promptResult = await this.promptClose();

        if (promptResult === null) return false;

        // If the user wants to save, save it
        if (promptResult === true) {
            await this.save()
        }

        // If it's already closed, just return
        if (get(openViews).indexOf(this) === -1) return true;
        // If the save was successful, close it
        await super.close();
        return true;
    }

    /** Closes the editor, but does not stick around for it to finish closing */
    public async askClose(): Promise<boolean> {
        const promptResult = await this.promptClose();

        if (promptResult === null) return false;
        if (promptResult === true) {
            this.savePromise = this.save()
            this.savePromise.then(() => {
                super.close()
            });
            return true;
        }
        else super.close();
        return true;
    }
}
