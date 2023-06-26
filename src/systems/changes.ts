import { writable, type Writable } from "svelte/store";
import r, { type NavigatePath } from "./navigate";
import type { EditorContext } from "./editors";

type Data = Writable<Record<string, any>>;

export class EditorChanges {
    /** The data this class changes */
    public data: Data;
    /** Whether or not the editor needs to be saved */
    public unsaved: Writable<boolean>;
    /** Whether or not the editor is currently saving */
    public saving: Writable<boolean>;
    /** The context of the editor */
    public context: EditorContext;
    /** The change stack */
    public stack: Change[] = [];
    /** Whether you can accept undos/redos at the moment */
    public locked: boolean;
    /** The index of the top of the stack */
    public top: number = 0;
    /** The last time the editor was saved */
    public lastSaved: Change | null = null;

    public queue: Change[] = [];

    public constructor(data: Data) {
        this.data = data;
        this.unsaved = writable(false);
        this.saving = writable(false);
    }

    /** Pushes the change into the stack and applies it */
    public push(change: Change) {
        // Queue changes while the editor is saving
        if (this.locked)
            return this.queue.push(change);

        // Calculate the change's previous value
        const noUpdate = change.updatePrev(this);
        // If the change is invalid, return
        if (noUpdate) return;
        // Remove all changes after the top
        this.stack.splice(this.top);
        // Add the change to the stack
        this.stack.push(change);
        // Edit the top index
        this.top = this.stack.length;
        // Execute the change
        change.apply(this.data);

        this.updateChanges();
    }

    /** Undoes the last applied change */
    public async undo() {
        if (this.locked || this.top === 0) return;

        const change = this.stack[--this.top];
        change.revert(this.data);

        this.updateChanges();
    }

    /** Redoes the last undone change */
    public async redo() {
        if (this.locked || this.top === this.stack.length) return;

        const change = this.stack[this.top++];
        change.apply(this.data);

        this.updateChanges();
    }

    /** sets the last applied change as saved */
    public setSaved() {
        // Reset the dot icon
        this.unsaved.set(false);
        // Reset the loading icon
        this.saving.set(false);
        // Lock the editor
        this.locked = false;
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
    }

    // ANCHOR Quick methods
    /** Creates a ValueChange */
    public setValue(edits: NavigatePath, value: any) {
        this.push(new ValueChange(edits, value));
    }
}

export abstract class Change {
    static uid = 0;
    static getUID() {
        return this.uid++;
    }

    protected edits: string[];
    protected timestamp: number = Date.now();
    protected uid: number = Change.getUID();

    public constructor(
        /** The path to the data that was changed */
        edits: NavigatePath
    ) {
        this.edits = r.getPath(edits);
    }

    /** Updates the before value of this change
     * returns true if the change is invalid
     * and should not be added to the stack
     */
    public abstract updatePrev(changes: EditorChanges): boolean;

    public abstract revert(data: Data): Promise<void>;
    public abstract apply(data: Data): Promise<void>;
}

export class ValueChange extends Change {
    public prevValue: any;
    public constructor(
        edits: NavigatePath,
        public nextValue: any,
    ) {
        super(edits);
    }

    public updatePrev(changes: EditorChanges): boolean {
        const data = changes.data;
        const lastChange = changes.current();

        this.prevValue = r.getStore(data, this.edits);

        // Check to see if the last change was a value change
        if (lastChange instanceof ValueChange) {
            if (
                // Check if the change edits the same field
                lastChange.edits.join(".") === this.edits.join(".") &&
                // Check if the last change was made with the last 5 seconds
                this.timestamp - lastChange.timestamp < 5000 &&
                changes.stack.length > 1) {
                this.prevValue = lastChange.prevValue;

                // Remove the last change
                changes.stack.pop();
                changes.top--;
                changes.updateChanges();
            }
        }

        return this.prevValue === this.nextValue;
    }

    public async revert(data: Data) {
        r.setStore(data, this.edits, this.prevValue);
    }

    public async apply(data: Data) {
        r.setStore(data, this.edits, this.nextValue);
    }

    public toString() {
        return `ValueChange(${this.edits.join(".")}, ${JSON.stringify(this.prevValue)} => ${JSON.stringify(this.nextValue)})`;
    }
}