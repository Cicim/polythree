import { ViewContext, EditorContext, TabbedEditorContext } from "./contexts";
import { get, writable, type Writable } from "svelte/store";

export type AnyContext = ViewContext | EditorContext | TabbedEditorContext<any>;
/** The currently active view */
export let activeView: Writable<AnyContext | null> = writable(null);
/** All of the currently open views */
export let openViews: Writable<AnyContext[]> = writable([]);
/** All of the views that have been closed */
export let lastClosedViews: Writable<LastClosedContext[]> = writable([]);

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

export function reopenLastClosedView() {
    lastClosedViews.update(ctx => {
        if (ctx.length > 0) {
            const lastClosed = ctx[ctx.length - 1];
            // Do some class mumbo-jumbo to create a new instance of the view
            const view = new (lastClosed.constructor as any)(lastClosed.indentifier, lastClosed.position);
            // Select the view
            (<ViewContext>view).create(lastClosed.position).select();
            // Remove the view from the last closed store
            ctx.pop();
        }
        return ctx;
    });
}

/** Tries to close all the specified views and ensures
 * that they are all closed before resolving.
 * If any view is not closed it returns false.
 * If all views are closed correctly, it returns true.
 */
export async function safeCloseViews(views: ViewContext[]) {
    const promises = [];
    for (const tab of views) {
        if (!(tab instanceof EditorContext)) continue;
        const result = await tab.askClose()

        if (!result) {
            return false;
        }

        if (tab.savePromise)
            promises.push(tab.savePromise);
    }
    const awaited = await Promise.all(promises);
    if (awaited.some(p => !p)) {
        return false;
    }

    return true;
}

/** Returns all the open views of the specified class */
export function* getAllViews<T>(type: any, filter?: (view: T) => boolean): Generator<T> {
    for (const view of get(openViews)) {
        if (!(view instanceof type) || (<EditorContext>view)?.isLoading) continue;
        if (filter && !filter(view as T)) continue;
        yield view as T;
    }
}


export { ViewContext, EditorContext };