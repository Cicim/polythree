import type { SvelteComponent } from "svelte";
import { writable } from "svelte/store";

/** All of the currently open views */
export let openViews = writable<ViewContext[]>([]);
/** All of the views that have been closed */
export let lastClosedViews = writable<LastClosedContext[]>([]);

export interface LastClosedContext {
    /** The context's constructor */
    constructor: typeof ViewContext;
    /** The props that were passed to the context */
    props: Record<string, any>;
    /** The position of the context in the lastClosedViews store */
    position: number;
}

/** The ID of the view that is currently being dragged */
export let draggingId = writable<number | null>(null);

export abstract class ViewContext {
    /** The HTML element that the view is rendered in */
    public container: HTMLDivElement;
    /** The Svelte component for the view's view */
    protected component: SvelteComponent;
    /** The name of the view */
    public abstract name: string;
    /** The props that were passed to the view */
    public props: Record<string, any>;
    /** Whether or not the view is currently active */
    public selected: boolean = false;
    /** Whether or not the view is a valid dropzone for the currently dragged view */
    public activeDropzone: boolean = false;

    public constructor(ComponentClass: typeof SvelteComponent, props: Record<string, any>, position: number = null) {
        // Get the view element
        const viewContainer = document.getElementById("views");
        // Create the view's container
        this.container = document.createElement("div");
        this.container.classList.add("view", "hidden");
        viewContainer.appendChild(this.container);
        // Set the props
        this.props = props;
        // Create the svelte component
        this.component = new ComponentClass({
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
    }

    /** Function to run when the view is selected to be the active one */
    public select() {
        // Loop through all the open views
        openViews.update((views: ViewContext[]) => {
            for (const otherView of views) {
                // Hide all the views that aren't the selected one
                otherView.container.classList.add("hidden");
                otherView.selected = false;
            }
            // Show the selected view
            this.container.classList.remove("hidden");
            this.selected = true;
            return views;
        });
    }
    /** Function to run when the view is closed */
    public close() {
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

    public addToLastClosed(position: number) {
        // Save the view's position
        lastClosedViews.update(views => {
            views.push({
                //@ts-ignore
                Class: this.__proto__.constructor,
                props: this.props,
                position,
            });
            return views;
        });
    }
}

export function reopenLastClosedView() {
    lastClosedViews.update(ctx => {
        if (ctx.length > 0) {
            const lastClosed = ctx[ctx.length - 1];
            // @ts-ignore Do some class mumbo-jumbo to create a new instance of the view
            const view = new lastClosed.Class(lastClosed.props, lastClosed.position);
            // Select the view
            (<ViewContext>view).select();
            // Remove the view from the last closed store
            ctx.pop();
        }
        return ctx;
    });
}