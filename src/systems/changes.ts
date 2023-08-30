import { get, writable, type Writable } from "svelte/store";
import r, { type NavigatePath } from "./navigate";

type Data = Writable<Record<string, any>>;

export class EditorChanges {
    /** The current tab store */
    public currentTab?: Writable<string>;
    /** Whether or not the editor needs to be saved */
    public unsaved: Writable<boolean>;
    /** Whether or not the editor is currently saving */
    public saving: Writable<boolean>;
    /** The change stack */
    public stack: Change[] = [];
    /** Whether you can accept undos/redos at the moment */
    public locked: number;
    /** The index of the top of the stack */
    public top: number = 0;
    /** The last time the editor was saved */
    public lastSaved: Change | null = null;
    /** A store that is set when the state of the changes changes */
    public updateStore: Writable<any>;

    public queue: Change[] = [];

    public constructor(tabStore?: Writable<string>) {
        this.currentTab = tabStore ?? null;
        this.unsaved = writable(false);
        this.saving = writable(false);
        this.locked = 0;
        this.updateStore = writable({});
    }

    /** Pushes the change into the stack and applies it */
    public push(change: Change): Promise<void> {
        // Queue changes while the editor is saving
        if (this.locked) {
            this.queue.push(change);
            return Promise.resolve();
        }

        // Calculate the change's previous value
        const noUpdate = change.updatePrev(this);
        // If the change is invalid, return
        if (noUpdate) return;
        // Update the edit's tab if necessary
        if (this.currentTab)
            change.tab = get(this.currentTab)
        // Remove all changes after the top
        this.stack.splice(this.top);
        // Add the change to the stack
        this.stack.push(change);
        // Edit the top index
        this.top = this.stack.length;
        // Execute the change
        const applied = change.apply();

        this.updateChanges();
        return applied;
    }

    /** Pushes a change without applying it */
    public pushNoApply(change: Change) {
        // Remove all changes after the top
        this.stack.splice(this.top);
        // Add the change to the stack
        this.stack.push(change);
        // Edit the top index
        this.top = this.stack.length;

        this.updateChanges();
    }

    /** Pops the last change */
    public async pop(): Promise<void> {
        // Remove the last change
        this.stack.pop();
        // Update the top
        this.top--;
        // Update the changes
        this.updateChanges();
    }

    /** Undoes the last applied change */
    public async undo() {
        if (this.locked !== 0 || this.top === 0) return;

        const change = this.stack[--this.top];

        this.locked++;
        await change.revert();
        // Go to the edit's tab
        if (this.currentTab)
            this.currentTab.set(change.tab);

        this.locked--;

        this.updateChanges();
    }

    /** Redoes the last undone change */
    public async redo() {
        if (this.locked !== 0 || this.top === this.stack.length) return;
        const change = this.stack[this.top++];

        this.locked++;
        await change.apply();

        // Go to the edit's tab
        if (this.currentTab)
            this.currentTab.set(change.tab);

        this.locked--;

        this.updateChanges();
    }

    /** sets the last applied change as saved */
    public setSaved() {
        // Reset the dot icon
        this.unsaved.set(false);
        // Reset the loading icon
        this.saving.set(false);
        // Lock the editor
        this.locked--;
        // Update the last saved
        this.lastSaved = this.current();
        // Parse the queue
        this.processQueue();
    }

    private processQueue() {
        this.queue.forEach(change => this.push(change));
        this.queue = [];
    }

    /** Returns the current change */
    public current() {
        if (this.top === 0) return null;
        return this.stack.at(this.top - 1);
    }

    /** Updates the unsaved icon */
    public updateChanges() {
        this.unsaved.set(this.current() !== this.lastSaved);
        this.updateStore.set({});
    }

    // ANCHOR Quick methods
    /** Creates a ValueChange */
    public setValue(store: Data, edits: NavigatePath, value: any) {
        this.push(new ValueChange(store, edits, value));
    }
}

/** Base class for a generic Change */
export abstract class Change {
    /** The first free uid */
    private static idCounter = 0;
    /** Gets a new id for the Change */
    static getID() { return Change.idCounter++; }
    /** Name for these types of changes */
    static changeName: string = "??? Change";
    /** The date in which the change was created */
    protected timestamp: number = Date.now();
    /** An identificative number chosen at the moment of instantiation of the class. */
    protected id: number = Change.getID();
    /** The Tab the editor was in when the change was created. */
    public tab: string = null;

    /** Returns a simple HTML description for the change */
    public getName(): string {
        // @ts-ignore
        return this.constructor.changeName ?? Change.changeName;
    };

    /** A method that executes when pushing the change for the first time
     * @returns Whether or not the change is **invalid**
     * + By default it says to push the change without checking for anything. 
     * Override the method to change this behavior */
    public updatePrev(changes: EditorChanges): boolean { return true };
    /** Revert the values to how they were before this change was applied */
    public abstract revert(): Promise<void>;
    /** Applies the change, modifying */
    public abstract apply(): Promise<void>;
}

export class ValueChange<T> extends Change {
    static changeName = "Value Changed";
    /** A path to the value to edit in the store */
    protected edits: string[];
    /** The previous value from the store */
    public prevValue: T;

    public constructor(
        protected store: Data,
        edits: NavigatePath,
        public nextValue: T,
    ) {
        super();
        // Transforms the edits into a path if it is a string
        this.edits = r.getPath(edits);
    }

    public updatePrev(changes: EditorChanges): boolean {
        // Get the previous value
        this.prevValue = r.getStore(this.store, this.edits);
        // Exit immediately if the prevValue is the same as the nextValue
        if (this.prevValue === this.nextValue) return true;

        // Check to see if the last change was a value change
        const lastChange = changes.current();
        if (lastChange instanceof ValueChange) {
            if (
                // Check if the change edits the same field
                lastChange.edits.join(".") === this.edits.join(".") &&
                // Check if the last change was made within the last 5 seconds
                this.timestamp - lastChange.timestamp < 5000 &&
                changes.stack.length > 1
            ) {
                // Set the previous value to the last change's previous value
                // (A => B, B => C) => (A => C)
                this.prevValue = lastChange.prevValue;
                // Remove the last change
                changes.pop();
            }
        }

        return false;
    }

    public async revert() {
        r.setStore(this.store, this.edits, this.prevValue);
    }

    public async apply() {
        r.setStore(this.store, this.edits, this.nextValue);
    }

    public toString() {
        return `ValueChange(${this.edits.join(".")}, ${JSON.stringify(this.prevValue)} => ${JSON.stringify(this.nextValue)})`;
    }
}