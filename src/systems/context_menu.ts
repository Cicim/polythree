import { tick } from "svelte";
import { get, writable, type Writable } from "svelte/store";
import { getActionBindingAndShortcut } from "./bindings";
import { activeView } from "./views";

/** A context menu action definition */
export type ContextMenuAction = () => void;

/** A context menu definition */
export class Menu {
    /** False if this menu is not a submenu.
     * 
     * If this menu is a submenu, the option is the option that opens it.
     */
    public submenuOption: false | SubMenuOption = false;

    /** The currently selected option in the menu */
    public selectedOption: Writable<MenuItem | null> = writable(null);

    public get $selectedOption() { return get(this.selectedOption) }

    constructor(public items: MenuItem[] = []) {
        // Assign to each of the items an increasing id
        let counter = 0;
        for (const item of this.items) {
            item.id = counter++;
            item.parentMenu = this;
        }
    }

    /** Travels down the menu's items and closes open submenus */
    public closeOpenSubmenus(level: number = 0, currentLevel: number = 1): Menu {
        for (const item of this.items) {
            if (item instanceof SubMenuOption) {
                if (currentLevel > level)
                    item.isOpen.set(false);

                item.menu.closeOpenSubmenus(level, currentLevel + 1);
            }
        }
        return this;
    }

    /** Returns the first option that isn't a separator */
    private getFirstOption(): MenuItem {
        // Skip it if the item is a separator
        for (const item of this.items) {
            if (!(item instanceof Separator)) return item;
        }
        return null;
    }

    private getLastOption(): MenuItem {
        // Skip it if the item is a separator
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (!(item instanceof Separator)) return item;
        }
        return null;
    }

    public select(option: MenuItem) {
        this.selectedOption.set(option);
        ctxMenu.update((menu) => menu.closeOpenSubmenus(option.level));
        // If the option is a submenu
        if (option instanceof SubMenuOption) {
            // Open the submenu
            option.isOpen.set(true);
        }
    }

    /** Allows the user to move in the given direction */
    public navigate(dir: "up" | "down" | "left" | "right") {
        let selected = get(this.selectedOption);

        switch (dir) {
            case "down":
                // If there is no selected option
                if (!selected) {
                    // Select the first option
                    this.select(this.getFirstOption());
                    return;
                }
                const below = selected.getBelow();
                if (!below) {
                    // If there is no option below, select the first option
                    this.select(selected.parentMenu.getFirstOption());
                    return;
                }
                this.select(below);
                break;
            case "up":
                // If there is no selected option
                if (!selected) {
                    // Select the last option
                    this.select(this.getLastOption());
                    return;
                }
                const above = selected.getAbove();
                if (!above) {
                    // If there is no option above, select the last option
                    this.select(selected.parentMenu.getLastOption());
                    return;
                }
                this.select(above);
                break;
            case "right":
                // If there is no selected option
                if (!selected) {
                    // Select the first option
                    this.select(this.getFirstOption());
                    return;
                }
                const right = selected.getRight();
                if (!right) {
                    // If there is no option to the right, don't do anything
                    return;
                }
                this.select(right);
                break;
            case "left":
                // If there is no selected option
                if (!selected) {
                    // Select the last option
                    this.select(this.getLastOption());
                    return;
                }
                const left = selected.getLeft();
                if (!left) {
                    // If there is no option to the left, select the last option
                    this.select(this.getLastOption());
                    return;
                }
                this.select(left);
                break;
        }
    }

    public close() {
        this.selectedOption.set(null);
    }
}

/** A context menu item */
export abstract class MenuItem {
    /** This item's id in its parent menu */
    public id: number;
    /** This option's parent menu */
    public parentMenu: Menu;
    /** This option's level. Calculated by the svelte component */
    public level: number = 0;

    public constructor(public text: string) { }

    public getAbove(): MenuItem {
        const items = this.parentMenu.items;

        // Return the item above this that isn't a separator
        for (let i = this.id - 1; i >= 0; i--) {
            const item = items[i];
            if (!(item instanceof Separator)) return item;
        }
        return null;
    }

    public getBelow(): MenuItem {
        const items = this.parentMenu.items;

        // Return the item below this that isn't a separator
        for (let i = this.id + 1; i < items.length; i++) {
            const item = items[i];
            if (!(item instanceof Separator)) return item;
        }
        return null;
    }

    public getRight(): MenuItem {
        if (this instanceof SubMenuOption) {
            // Open the submenu
            return this.menu.items[0];
        }
        return null;
    }

    public getLeft(): MenuItem {
        // If this option's parent is a submenu
        const submenu = this.parentMenu.submenuOption;
        if (submenu) {
            // Go to the submenu's parent
            return submenu;
        }
        return null;
    }

    public callAction() {
        ctxMenu.update((menu) => menu.closeOpenSubmenus(0));
        closeContextMenu();
    }
}

/** A context menu separator */
export class Separator extends MenuItem {
    public constructor(text: string = null) {
        super(text);
    }
}

/** A context menu option with a submenu */
export class SubMenuOption extends MenuItem {
    /** The button's submenu */
    public menu: Menu;
    /** If the submenu has been opened */
    public isOpen = writable(false);

    public constructor(text: string, menu: Menu | MenuItem[]) {
        super(text);
        this.menu = menu instanceof Menu ? menu : new Menu(menu);
        this.menu.submenuOption = this;
    }
}

/** A menu option that can has an action or onclick associated to its click event */
export class MenuOption extends MenuItem {
    /** The buttons's onclick callback */
    public action: ContextMenuAction;
    /** The action's associated keybinding */
    public keybinding: string;
    /** The action's name */
    public actionId: string;

    public constructor(text: string, action: string | ContextMenuAction) {
        super(text);
        if (typeof action === "string") {
            this.actionId = action;
            const [binding, shortcutPretty] = getActionBindingAndShortcut(action);
            this.action = () => binding(get(activeView));
            this.keybinding = shortcutPretty;
        }
        else {
            this.action = action
            this.keybinding = "";
            this.actionId = null;
        };
    }

    public callAction() {
        this.action();
        // Close the menu right after
        super.callAction();
    }
}

/** A context menu option without an icon */
export class TextOption extends MenuOption { }

/** A context menu option with an icon */
export class IconOption extends MenuOption {
    public constructor(text: string, public icon: string, action: string | ContextMenuAction) {
        super(text, action);
    }
}

export const ctxMenu = writable<Menu>(new Menu());
export const ctxMenuRecreated = writable({});

export function getMenu(): HTMLDialogElement {
    return document.getElementById("ctx-menu") as HTMLDialogElement;
}
function getList(): HTMLDivElement {
    return document.getElementById("ctx-list") as HTMLDivElement;
}
/** Returns true if the element is or is a child of the list */
function isBody(e: MouseEvent) {
    return getList().contains(e.target as Node);
}
/** Places the given element on the screen, careful not to make it 
 * overflow outside of the page */
async function setContextMenuPosition(target: HTMLElement, x: number, y: number) {
    target.style.left = "0px";
    target.style.top = "0px";
    target.style.removeProperty("width");
    target.style.removeProperty("height");
    await tick();
    // Get the width and height of the target
    const width = target.offsetWidth;
    const height = target.offsetHeight;
    // Get the width and height of the screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // If the target is too far to the right, move it to the left
    if (x + width > screenWidth) {
        x -= width;
    }
    // If the target is too far to the bottom, move it to the top
    if (y + height > screenHeight) {
        y -= height + 2;
    }
    // Set the position of the target
    target.style.left = x + "px";
    target.style.top = y + "px";

    // If the target clips out of bounds on the top, resize it
    if (y < 0) {
        target.style.top = "20px";
        target.style.height = (height + y - 20) + "px";
    }
    // If the target clips out of bounds on the left, resize it
    if (x < 0) {
        target.style.left = "20px";
        target.style.width = (width + x - 20) + "px";
    }
}

export function showContextMenu(e: MouseEvent | HTMLElement | EventTarget, menu: Menu) {
    const isEvent = e instanceof MouseEvent;
    ctxMenuRecreated.set({});

    // Get the menu
    const ctx: HTMLDialogElement = getMenu();
    if (isEvent) {
        e.preventDefault();
        e.stopPropagation();
        // If you are clicking on the body of the ctx menu, don't do anything
        if (isBody(e)) return;
    }
    // Update the menu
    ctxMenu.set(menu.closeOpenSubmenus());
    // Close the menu, in case it was already open
    ctx.close();
    // Open the menu
    ctx.showModal();
    // Set the position of the menu
    if (isEvent) {
        setContextMenuPosition(ctx, e.clientX, e.clientY);
    } else {
        const rect = (<HTMLElement>e).getBoundingClientRect();
        setContextMenuPosition(ctx, rect.left, rect.bottom);
    }
}

export function closeContextMenu(e?: MouseEvent) {
    get(ctxMenu).close();
    // If the target is the list, don't do anything
    if (!e || !isBody(e)) getMenu().close();
}