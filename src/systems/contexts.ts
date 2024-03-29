import type { SvelteComponent } from "svelte";
import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import { rom } from "./global";
import { spawnErrorDialog } from "src/components/dialog/ErrorDialog.svelte";
import { spawnSaveDialog } from "src/components/dialog/SaveDialog.svelte";
import { EditorChanges } from "./changes";
import { openViews, lastClosedViews, activeView } from "./views";


export abstract class ViewContext {
    /** This view's kind's icon */
    public icon: string;

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
    /** A quick getter if this view is the activeView */
    protected selected: boolean;

    /** Whether or not the view has side tabs
     * just a cosmetic flag for the Navbar
     */
    public _cosmeticHasSideTabs: boolean = false;

    /** The HTML element that the view is rendered in */
    public container: HTMLDivElement;
    /** Whether or not the tab is a valid dropzone for the currently dragged tab */
    public activeDropzone: boolean = false;

    /** A callback that is ran every time this tab is selected */
    public onSelect: () => void = () => { };
    /** A callback that is ran every time this tab is deselected */
    public onDeselect: () => void = () => { };
    /** The subtitle of the tab */
    public subtitle: Writable<string> = writable("");

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
                spawnErrorDialog("You must load a ROM before you can open this tab.", "No ROM Loaded");
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

    /** Destroy this view's component and container */
    public destroy() {
        this.component.$destroy();
        this.container.remove();
    }

    /** Deselect this view */
    public deselect() {
        // Run the onDeselect callback
        this.onDeselect();
        // Hide the this view
        this.container.classList.add("hidden");
        this.selected = false;
    }

    /** Select this view and deselect the active one */
    public select() {
        // Get the active view
        const active = get(activeView);
        // If this view is already active, return
        if (active === this) return;
        // Try to disable the active view
        active?.deselect();

        this.onSelect();

        // Show the selected view
        this.container.classList.remove("hidden");

        // Update the active view
        activeView.set(this);
        this.selected = true;
    }

    /** Close this view and select a new active one if necessary */
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

        // Deselect the view
        this.deselect();
        // Destroy the view
        this.destroy();

        // If this view was the active one, set the active view to null
        const active = get(activeView);
        activeView.update(active => {
            if (active === this) return null;
            return active;
        });

        if (active === this) {
            // Select the view to the right of this one if it exists
            const views = get(openViews);
            if (views.length > 0)
                if (index >= views.length)
                    views[views.length - 1].select();
                else
                    views[index].select();
        }

        return true;
    }

    /** Closes the view, but does not stick around for it to finish closing */
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
                constructor: this.__proto__.constructor,
                indentifier: this.identifier,
                position,
            });
            return views;
        });
    }

    /** Returns whether there is another view, of the same type of this one 
     * (excluding this one), that matches the predicate */
    public anyOtherViewWhere<T extends this>(predicate: (view: T) => boolean): boolean {
        return get(openViews).some(view => {
            // Skip views that are not of this type
            if (!(view instanceof this.constructor)) return false;
            // Skip this view
            if (view === this) return false;
            return predicate(view as T);
        });
    }

    /** Returns a list of the other views of the same type that match the predicate */
    public *getOtherViews<T extends this>(predicate: (view: T) => boolean = () => true): Generator<T> {
        for (let view of get(openViews)) {
            // Skip views that are not of this type
            if (!(view instanceof this.constructor)) continue;
            // Skip this view
            if (view === this) continue;
            // Skip views that do not match the predicate
            if (!predicate(view as T)) continue;
            yield view as T;
        }
    }

    /** Subscribes to the activeView and runs the callback once the view is selected */
    public subscribeToSelection(onSelect: () => void, onDeselect: () => void): Unsubscriber {
        return activeView.subscribe((view) => {
            if (view === this)
                onSelect();
            else
                onDeselect();
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

    /** Common getter for view icon, gets it from the static definition in the child class */
    public get viewIcon(): string {
        // @ts-ignore
        return this.constructor.icon;
    }

}

/** The container for all of the editor's functionalities
 * that integrate with Svelte or the DOM.
 */
export abstract class EditorContext extends ViewContext {
    /** The changes made to the editor */
    public changes: EditorChanges;
    /** Whether or not the editor is currently loading */
    public loading: Writable<boolean>;
    /** A promise that resolves once the editor is done saving */
    public savePromise: Promise<boolean>;

    /** If this value is true, the editor will close 
     * as soon as it is done saving */
    protected slatedForClose: boolean = false;

    public constructor(ComponentClass: typeof SvelteComponent,
        id: Record<string, any>) {
        super(ComponentClass, { ...id });

        this.changes = (this instanceof TabbedEditorContext) ? null :
            new EditorChanges();

        this.loading = writable(true);
    }

    /** Function to run when the editor needs saving */
    public abstract save(): Promise<boolean>;
    /** Function to run when the editor first opens */
    public abstract load(): Promise<void>;

    /** Signals the user the saving process has started */
    public startSaving() {
        if (!this.hasUnsavedChanges) return true;
        this.changes.saving.set(true);
        this.changes.locked++;
        return false;
    }

    /** Execute after saving. Reverts the icons to their original states */
    public doneSaving() {
        // Applies the changes
        this.changes.setSaved();
        // Close the editor if it was slated for closing
        if (this.slatedForClose) this.onBeforeClose().then(() => super.close());

        return true;
    }

    public select() {
        super.select();
    }

    public get hasUnsavedChanges() {
        return get(this.changes.unsaved);
    }
    public get isSaving() {
        return get(this.changes.saving);
    }
    public get isLoading() {
        return get(this.loading);
    }

    /** Asks the user for the needs save prompt and awaits for them to answer */
    public async promptClose() {
        // TODO: Does not work now since Input elements override Ctrl+W functionality
        // Blur the selected element to trigger an onchange event and add the last save
        (<HTMLInputElement>document.activeElement)?.blur();

        // If the editor is saving, just slate it to be closed later
        if (this.isSaving) {
            this.slatedForClose = true;
            // Don't close now, wait for it to be done saving
            return null;
        }
        // If it doesn't need saving, just close it
        if (!this.hasUnsavedChanges) return false;
        // Otherwise, select the tab and open the save dialog
        this.select();
        return await spawnSaveDialog({ editorName: this.name });
    }

    /** An action that executes before the tab is closed */
    protected async onBeforeClose(): Promise<void> { }

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
        await this.onBeforeClose();
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
        } else {
            this.onBeforeClose().then(() => super.close());
        }
        return true;
    }

    /** Returns a list of the other views of the same type that match the predicate */
    public *getOtherViews<T extends this>(predicate: (view: T) => boolean = () => true): Generator<T> {
        for (const view of get(openViews)) {
            if (!(view instanceof this.constructor) || view === this || get((<T>view).loading)) continue;
            if (predicate(view as T)) yield view as T;
        }
    }

    /** Subscribes to the activeView and runs the appropriate callback once the view is selected or deselected.
     * If the editor is not loaded, waits for the editor to load before it runs either callback. */
    public subscribeToSelection(onSelect: () => void, onDeselect: () => void): Unsubscriber {
        return activeView.subscribe((view) => {
            if (view === this) {
                if (get(this.loading)) {
                    const unsubscribe = this.loading.subscribe((isLoading) => {
                        if (!isLoading) {
                            unsubscribe();
                            onSelect();
                        }
                    });
                }
                else onSelect();
            }
            else {
                if (get(this.loading)) {
                    const unsubscribe = this.loading.subscribe((isLoading) => {
                        if (!isLoading) {
                            unsubscribe();
                            onDeselect();
                        }
                    });
                }
                else onDeselect();
            }
        });
    }

    /** Undoes this editor's last applied change */
    public async undo() {
        this.changes.undo();
    }
    /** Redoes this editor's last undone change */
    public async redo() {
        this.changes.redo();
    }
}

export interface EditorSubTab {
    /** The tab's text */
    title: string;
    /** The tab's icon */
    icon: string;
    /** If the tab is locked */
    isLocked?: boolean;
}

export type TabbedEditorTabs<T extends string = string> = Record<T, EditorSubTab>;

/** A context that has multiple vertical tabs */
export abstract class TabbedEditorContext<T extends string> extends EditorContext {
    /** List of all this context's tabs */
    public tabs: TabbedEditorTabs<T>;
    /** A store containing the currently selected tab */
    public selectedTab: Writable<T> = writable(null);

    /** Quick and dirty variable to achieve removal of some contours while loading */
    public _cosmeticHasSideTabs = true;

    /** Getter for the selected tab's id, used in keybindings */
    public get tab(): T {
        return get(this.selectedTab);
    }

    /** Setter to quickly change tab */
    public set tab(tab: T) {
        this.changeTab(tab);
    }

    /** Changes the tab to the specified one */
    public changeTab(tab: T) {
        this.selectedTab.set(tab);
    }

    /** Creates the TabbedContext and sets the selected tab as the first one */
    constructor(ComponentClass: typeof SvelteComponent,
        id: Record<string, any>) {
        super(ComponentClass, { ...id });
        this.changes = new EditorChanges(this.selectedTab);
    }

    /** Creates the view's component */
    public create(): this {
        // If the selected tab is empty, set it to the first tab
        if (get(this.selectedTab) === null)
            this.selectedTab.set(Object.keys(this.tabs)[0] as T);
        return super.create();
    }
}