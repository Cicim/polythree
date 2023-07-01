import type { SvelteComponent } from "svelte";
import { get, writable } from "svelte/store";
import { Bindings } from "./bindings";
import { rom } from "./rom";
import { spawnDialog } from "./dialogs";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";

/** All of the currently open views */
export let openViews = writable<ViewContext[]>([]);
/** All of the views that have been closed */
export let lastClosedViews = writable<LastClosedContext[]>([]);

export interface LastClosedContext {
    /** The context's constructor */
    constructor: typeof ViewContext;
    /** The data that identifies this context */
    indentifier: Record<string, any>;
    /** The position of the context in the lastClosedViews store */
    position: number;
}

/** The ID of the view that is currently being dragged */
export let draggingId = writable<number | null>(null);

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
            // @ts-ignore
            let preexisting = get(openViews).find((view) => view instanceof this.__proto__.constructor);

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
            else views.splice(position, 0, this)

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
                // Hide all the views that aren't the selected one
                otherView.container.classList.add("hidden");
                otherView.selected = false;
            }

            // Register this editor's actions
            Bindings.register(this.actions);
            Bindings.register(this.tabActions);

            // Show the selected view
            this.container.classList.remove("hidden");
            this.selected = true;

            return views;
        });
    }
    /** Function to run when the view is closed */
    public async close(): Promise<void> {
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
    }

    public async askClose(): Promise<void> {
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
        }
    }
}

export function reopenLastClosedView() {
    lastClosedViews.update(ctx => {
        if (ctx.length > 0) {
            const lastClosed = ctx[ctx.length - 1];
            // @ts-ignore Do some class mumbo-jumbo to create a new instance of the view
            const view = new lastClosed.Class(lastClosed.indentifier, lastClosed.position);
            // Select the view
            (<ViewContext>view).create(lastClosed.position).select();
            // Remove the view from the last closed store
            ctx.pop();
        }
        return ctx;
    });
}