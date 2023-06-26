/** A hashed keyboard combination */
type KeyHash = string;
/** The name of an action */
export type ActionName = string;
/** The function bound to the action */
type Action = () => void;
/** A map of actions to their names */
type ActionMap = Record<ActionName, Action>;
/** A map of key hashes to their actions */
type KeypressMap = Record<KeyHash, Action>;
/** A map of action names to their key hashes */
type BindingMap = Record<ActionName, KeyHash>;

function isModalOpen() {
    return !!document.querySelector(".modal[open]");
}

export class Bindings {
    static active: KeypressMap = {};
    static stored: ActionMap[] = [];
    static defaults: BindingMap = {
        "tabbar/reopen_last": "Ctrl+Shift+T",
        "tabbar/close_saved": "Ctrl+Shift+Q",
        "tabbar/close_all": "Ctrl+Shift+W",
        "tabbar/next": "Ctrl+Tab",
        "tabbar/prev": "Ctrl+Shift+Tab",

        "editor/save": "Ctrl+S",
        "editor/undo": "Ctrl+Z",
        "editor/redo": "Ctrl+Y",
        "tab/close": "Ctrl+W",

        "home_page/open_last_project": "Alt+O",
        "map_editor/print_group": "Alt+O",
    };

    // ANCHOR Loading
    static loadDefaults() {
    }
    /** Loads all the keybindings to the `activeBindings`
     * in an easy to reference map */
    static register(bindings: ActionMap) {
        // Add the bindings to activeBindings
        for (const actionName in bindings) {
            // Get the binding from the default bindings
            const binding = this.defaults[actionName];
            // Add the binding to activeBindings
            this.active[binding] = bindings[actionName];
        }
        // Register the bindings
        this.stored.push(bindings);
    }

    // ANCHOR Events
    static isAlphanumeric(event: KeyboardEvent) {
        return event.code.startsWith("Key") || event.code.startsWith("Digit");
    }
    /** Returns the key hash from the given key */
    static getKeyHash(event: KeyboardEvent) {
        // Get the key hash
        let keyHash = "";
        if (event.ctrlKey) keyHash += "Ctrl+";
        if (event.shiftKey) keyHash += "Shift+";
        if (event.altKey) keyHash += "Alt+";

        if (this.isAlphanumeric(event)) keyHash += event.key.toUpperCase();
        else keyHash += event.code;
        return keyHash;
    }

    /** Handles a keypress event */
    static handleKeypress(event: KeyboardEvent) {
        if (isModalOpen()) return;
        // Get the key hash
        const keyHash = Bindings.getKeyHash(event);
        // Check if the key hash is in activeBindings
        if (keyHash in Bindings.active) {
            // Prevent the default action
            event.preventDefault();
            // Run the action
            Bindings.active[keyHash]();
        }
    }

    // ANCHOR Unloading
    /** Unregisters all the keybindings from the given list
     * if they were added previously */
    static unregister(bindings: ActionMap) {
        // Check if the bindings have been previously registered
        const index = this.stored.indexOf(bindings);
        if (index !== -1) {
            // Remove the bindings from activeBindings
            for (const actionName in bindings) {
                // Get the binding from the default bindings
                const binding = this.defaults[actionName];
                // Remove the binding from activeBindings
                delete this.active[binding];
            }
            // Remove the bindings from storedActionMaps
            this.stored.splice(index, 1);
        }
    }

    // ANCHOR Utility
    /** Returns a pretty version of the given keybinding */
    static formatBinding(keybinding: string) {
        // Split the keybinding into parts
        return keybinding.replaceAll("+", " + ");
    }
    /** Returns the action from the given action name */
    static getActionFromName(actionName: ActionName) {
        // Get the action from the active bindings
        return this.active[this.defaults[actionName]];
    }
}