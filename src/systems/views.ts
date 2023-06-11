import type { SvelteComponent } from "svelte";
import { writable } from "svelte/store";

/** All of the currently open views */
export let openViews = writable<ViewContext[]>([]);

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

    public constructor(ComponentClass: typeof SvelteComponent, props: Record<string, any>) {
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
        openViews.update(views => [...views, this]);
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
        // Remove the view from the store
        openViews.update(views => views.filter(view => view !== this));
        // Destroy the view
        this.component.$destroy();
        // Remove the view's container
        this.container.remove();
        // Set the next view as selected
        openViews.update(views => {
            if (views.length > 0) {
                views[0].select();
            }
            return views;
        });
    }
}