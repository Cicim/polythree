// import {
//     bCloseAllTabs, bCloseSavedTabs, bNextTab, bPrevTab, bReopenLastTab
// } from "src/components/app/TabBar.svelte";
import { get } from "svelte/store";
import { EditorContext, TabbedEditorContext, type ViewContext } from "./contexts";
import { activeView } from "./views";

// type KeyBinding = [name: string, shortcut: string, callback: (view: ViewContext | EditorContext) => void, condition: string];
enum ConditionType {
    /** Always true */
    AlwaysTrue,
    /** Checks if the active view is not null */
    ActiveNotNull,
    /** Checks if the active view is an instance of EditorContext */
    ActiveEditorContext,
    /** Checks if the active view has the specified property and it true */
    TrueProperty,
    /** Checks if the active view has the specified property and it false */
    FalseProperty,
    /** Checks if the active view has the specified property and it equals the specified value */
    EqualProperty,
    /** Checks if the active view has the specified property and it does not equal the specified value */
    NotEqualProperty,

    /** If you are in a modal window
     * usually, you want to use this as the first condition because it always checks if you in a modal, 
     * so this option specifies that the condition is only true if you are in a modal window
     */
    InModal,
};
type Condition = [ConditionType, string?, string?];
type Conditions = Condition[];
type BindingFunction = (view: ViewContext | EditorContext | TabbedEditorContext) => void | undefined;

class KeyBinding {
    public name: string;
    public shortcutCode: string;
    public binding: BindingFunction;
    public condition: Conditions;

    constructor(name: string, shortcut: string, callback: BindingFunction, condition: string) {
        this.name = name;
        this.shortcutCode = shortcut;
        this.binding = callback;
        this.condition = KeyBinding.parseConditions(condition);
    }

    public get shortcutPretty(): string {
        return this.shortcutCode.replaceAll("+", " + ");
    }

    /** Parsed a condition from the string
     Returns a list of parsed conditions, ready to be checked
    Here's a list of possible conditions: 
        - `"-"` - Always true
        - `"active !== null"` - Checks if the active view is not null
        - `"active instanceof EditorContext"` - Checks if the active view is an instance of EditorContext
        - `"active.{property}"` - Checks if the active view has the specified property and it true
        - `"!active.{property}"` - Checks if the active view has the specified property and it false
        - `"active.{property} === {value}"` - Checks if the active view has the specified property and it equals the specified value
        - `"active.{property} !== {value}"` - Checks if the active view has the specified property and it does not equal the specified value
        - `"inModal"` - If you are in a modal window, usually it's true if you aren't
    */
    private static parseConditions(condition: string): Conditions {
        const parts = condition.split("&&");
        let conditions = [];

        for (const part of parts) {
            const trimmed = part.trim();

            if (trimmed === "-") {
                conditions = [[ConditionType.AlwaysTrue]];
                break;
            }

            if (trimmed === "active !== null")
                conditions.push([ConditionType.ActiveNotNull]);
            else if (trimmed === "active instanceof EditorContext")
                conditions.push([ConditionType.ActiveEditorContext]);
            else if (trimmed.startsWith("!active."))
                conditions.push([ConditionType.FalseProperty, trimmed.split(".")[1]]);
            else if (trimmed.startsWith("active.")) {
                const [_, property] = trimmed.split(".");
                const other = property.split(" ");
                if (other.length === 0)
                    conditions.push([ConditionType.TrueProperty, property]);
                else {
                    const [property, operator, ...values] = other;
                    const value = this.parseValue(values.join(" "));

                    if (operator === "===")
                        conditions.push([ConditionType.EqualProperty, property, value]);
                    else if (operator === "!==")
                        conditions.push([ConditionType.NotEqualProperty, property, value]);
                    else throw new Error(`Invalid operator ${operator}`);
                }
            }
        }

        return conditions;
    }

    /** Parses a value */
    private static parseValue(value: string): string | number | boolean {
        if (value.startsWith("'"))
            return value.slice(1, -1);
        else if (value === "false" || value === "true")
            return Boolean(value);
        else if (!isNaN(parseFloat(value)))
            return parseFloat(value);
        throw new Error("Only literal values are supported in keybinding conditions");
    }

    static isModalOpen() {
        return !!document.querySelector(".modal[open]");
    }

    /** Checks if this keybinding's condition is true at the moment of execution */
    public checkCondition(view: ViewContext) {
        // Check if the condition wants to be in a modal
        // Assuming it's the first condition
        if (this.condition[0][0] === ConditionType.InModal && !KeyBinding.isModalOpen()) {
            return false;
        }
        else if (KeyBinding.isModalOpen()) return false;


        for (const condition of this.condition) {
            switch (condition[0]) {
                case ConditionType.InModal:
                case ConditionType.AlwaysTrue:
                    break;
                case ConditionType.ActiveNotNull:
                    if (view === null) return false;
                    break;
                case ConditionType.ActiveEditorContext:
                    if (!(view instanceof EditorContext)) return false;
                    break;
                case ConditionType.TrueProperty:
                    if (!view[condition[1]]) return false;
                    break;
                case ConditionType.FalseProperty:
                    if (view[condition[1]]) return false;
                    break;
                case ConditionType.EqualProperty:
                    // console.log(`view["${condition[1]}"] === "${condition[2]}" => ${view[condition[1]] === condition[2]}`);
                    if (view[condition[1]] !== condition[2]) return false;
                    break;
                case ConditionType.NotEqualProperty:
                    if (view[condition[1]] === condition[2]) return false;
                    break;
                default:
                    break;
            }
        }
        return true;
    }

    public redefineBinding(binding: BindingFunction) {
        this.binding = binding;
    }
}

const keybindings: Record<string, KeyBinding> = {
    "prevent_print": new KeyBinding("Prevents Printing", "Ctrl+P", () => { }, "-"),
    "tab/close": new KeyBinding("Close Tab", "Ctrl+W", (view: ViewContext) => view.close(), "active !== null"),
    "tabbar/reopen_last": new KeyBinding("Reopen Last Closed Tab", "Ctrl+Shift+T", undefined, "-"),
    "tabbar/close_saved": new KeyBinding("Close Saved Tabs", "Ctrl+Shift+Q", undefined, "-"),
    "tabbar/close_all": new KeyBinding("Close All Tabs", "Ctrl+Shift+W", undefined, "-"),
    "tabbar/next": new KeyBinding("Next Tab", "Ctrl+Tab", undefined, "-"),
    "tabbar/prev": new KeyBinding("Previous Tab", "Ctrl+Shift+Tab", undefined, "-"),
    "editor/save": new KeyBinding("Save", "Ctrl+S", (editor: EditorContext) => editor.save(), "active instanceof EditorContext"),
    "editor/undo": new KeyBinding("Undo", "Ctrl+Z", (editor: EditorContext) => editor.undo(), "active instanceof EditorContext"),
    "editor/redo": new KeyBinding("Redo", "Ctrl+Y", (editor: EditorContext) => editor.redo(), "active instanceof EditorContext"),
    "maplist/refresh": new KeyBinding("Refresh", "F5", undefined, "active.name === 'Map List'"),
    "maplist/focus_search": new KeyBinding("Focus Search", "Ctrl+F", undefined, "active.name === 'Map List'"),
    "maplist/clear_and_focus_search": new KeyBinding("Clear and Focus Search", "Ctrl+G", undefined, "active.name === 'Map List'"),
    "maplist/delete_selected": new KeyBinding("Delete Selected", "Delete", undefined, "active.name === 'Map List'"),
    "maplist/new_map": new KeyBinding("New Map", "Ctrl+N", undefined, "active.name === 'Map List'"),
    "map_editor/select_layout": new KeyBinding("Select Layout", "Ctrl+1", undefined, "active.name === 'Map Editor'"),
    "map_editor/select_level": new KeyBinding("Select Level", "Ctrl+2", undefined, "active.name === 'Map Editor'"),
    "map_editor/select_scripts": new KeyBinding("Select Scripts", "Ctrl+3", undefined, "active.name === 'Map Editor'"),
    "map_editor/select_connections": new KeyBinding("Select Connections", "Ctrl+4", undefined, "active.name === 'Map Editor'"),
    "map_editor/select_encounters": new KeyBinding("Select Encounters", "Ctrl+5", undefined, "active.name === 'Map Editor'"),
    "map_editor/select_header": new KeyBinding("Select Header", "Ctrl+6", undefined, "active.name === 'Map Editor'"),
    "layout_editor/pick_pencil": new KeyBinding("Pick Pencil", "P", () => console.log("Picked Pencil in layout"), "active.name === 'Map Editor' && active.tab === 'layout'"),
    "permissions_editor/pick_pencil": new KeyBinding("Pick Pencil", "P", () => console.log("Picked Pencil in level"), "active.name === 'Map Editor' && active.tab === 'level'"),
    "map_editor/zoom_in": new KeyBinding("Zoom In", "Ctrl++", undefined, "active.name === 'Map Editor' && active.tab === 'layout'"),
    "map_editor/zoom_out": new KeyBinding("Zoom Out", "Ctrl+-", undefined, "active.name === 'Map Editor' && active.tab === 'layout'"),
    "map_editor/undo_tileset_level_changes": new KeyBinding("Undo Tileset Level Changes", "Ctrl+Shift+Z", undefined, "active.name === 'Map Editor' && active.tab === 'level'"),
    "map_editor/redo_tileset_level_changes": new KeyBinding("Redo Tileset Level Changes", "Ctrl+Shift+Y", undefined, "active.name === 'Map Editor' && active.tab === 'level'"),
};

/** The object containing all the existing shortcuts */
const shortcutCodeToKeybindings: Record<string, KeyBinding[]> = {};

// Compose the shortcut to id list
for (const id in keybindings) {
    // Get the binding
    const binding: KeyBinding = keybindings[id];
    const shortcut: string = binding.shortcutCode;

    // Add it to the list under the shortcut
    if (shortcutCodeToKeybindings[shortcut]) {
        shortcutCodeToKeybindings[shortcut] = [binding, ...shortcutCodeToKeybindings[shortcut]];
    } else
        shortcutCodeToKeybindings[shortcut] = [binding];
}

/** Updates multiple bindings functions */
export function redefineBindings(toUpdate: { [id: string]: BindingFunction }) {
    for (const id in toUpdate)
        redefineBinding(id, toUpdate[id]);
}

/** Updates the specified keybinding's binding function */
export function redefineBinding(id: string, callback: BindingFunction) {
    if (id in keybindings)
        keybindings[id].redefineBinding(callback);
    else throw new Error(`Binding ${id} does not exist`);
}

/** Given an id, returns the keybinding's shortcut (good for printing) and whether the action is active or not */
export function getActionsShortcut(id: string): [binding: BindingFunction, shortcut: string, active: boolean] {
    const keybinding = keybindings[id];
    if (!keybinding) throw Error(`Invalid keybinding ${id}`);
    return [keybinding.binding, keybinding.shortcutPretty, keybinding.checkCondition(get(activeView))];
}


/** Window keydown event listener */
export function handleKeydown(event: KeyboardEvent) {
    // If you are writing in an input, return
    if (document.activeElement instanceof HTMLInputElement) return;
    // Get the shortcut pressed
    const shortcutCode = getShortcutCode(event);
    // Get the bindings from the shortcutCode
    const keybindings = shortcutCodeToKeybindings[shortcutCode];
    // Exit if the keybindings were not defined
    if (keybindings === undefined) return;


    const active = get(activeView);

    // Loop through all the possible keybindings
    for (const keybinding of keybindings) {
        const valid = keybinding.checkCondition(active);
        // If the conditions are valid, execute the binding if it exists
        if (valid && keybinding.binding) {
            event.preventDefault();
            keybinding.binding(active);
        }
    }
}

/** Returns the shortcut's code from the KeyboardEvent */
function getShortcutCode(event: KeyboardEvent) {
    // Get the key hash
    let shortcutCode = "";
    if (event.ctrlKey) shortcutCode += "Ctrl+";
    if (event.shiftKey) shortcutCode += "Shift+";
    if (event.altKey) shortcutCode += "Alt+";

    switch (event.key) {
        case "Control":
        case "Shift":
        case "Alt":
            return shortcutCode.slice(0, -1);
    }

    return shortcutCode + event.key[0].toUpperCase() + event.key.slice(1);
}

/** Returns true if the given event's code is a letter or a number */
function isAlphanumeric(event: KeyboardEvent) {
    return event.code.startsWith("Key") || event.code.startsWith("Digit");
}