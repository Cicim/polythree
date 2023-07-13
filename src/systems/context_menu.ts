import { tick } from "svelte";
import { writable } from "svelte/store";
import { type ActionName, getActionsShortcut } from "./bindings";

/** A context menu action definition */
export type ContextMenuAction = () => void;

/** A context menu definition */
export class Menu {
    public items: MenuItem[] = [];

    public addItem(item: MenuItem) {
        this.items.push(item);
    }

    public addSeparator() {
        this.items.push(new Separator());
    }

    constructor(items: MenuItem[] = []) {
        this.items = items;
    }

    /** Shakes the menu, removing open submenus */
    public shake(level: number = 0, currentLevel: number = 1): Menu {
        for (const item of this.items) {
            if (item instanceof SubMenuOption) {
                if (currentLevel > level)
                    item.isVisible = false;

                item.menu.shake(level, currentLevel + 1);
            }
        }
        return this;
    }
}

/** A context menu item */
export abstract class MenuItem {
}

/** A context menu separator */
export class Separator extends MenuItem {
    public constructor(public text: string = null) {
        super();
    }
}

/** A context menu text only button */
export class TextOption extends MenuItem {
    /** The button's text */
    public text: string;
    /** The buttons's action */
    public action: ContextMenuAction;
    /** The action's associated keybinding */
    public keybinding: string;

    public constructor(text: string, action: ActionName | ContextMenuAction) {
        super();
        this.text = text;
        if (typeof action === "string") {
            const [binding, shortcut, _] = getActionsShortcut(action);
            this.action = binding as ContextMenuAction;
            this.keybinding = shortcut;
        }
        else {
            this.action = action
            this.keybinding = "";
        };
    }
}

/** A context menu icon and text button */
export class IconOption extends MenuItem {
    /** The button's text */
    public text: string;
    /** The button's icon */
    public icon: string;
    /** The button's action */
    public action: ContextMenuAction;
    /** The action's associated keybinding */
    public keybinding: string;

    public constructor(text: string, icon: string, action: ActionName | ContextMenuAction) {
        super();
        this.text = text;
        this.icon = icon;
        if (typeof action === "string") {
            const [binding, shortcut, _] = getActionsShortcut(action);
            this.action = binding as ContextMenuAction;
            this.keybinding = shortcut;
        }
        else {
            this.action = action
            this.keybinding = "";
        };
    }
}

/** A context menu button with a submenu */
export class SubMenuOption extends MenuItem {
    /** The button's text */
    public text: string;
    /** The button's submenu */
    public menu: Menu;
    /** If the submenu has been opened */
    public isVisible = false;

    public constructor(text: string, menu: Menu) {
        super();
        this.text = text;
        this.menu = menu;
    }
}

export const ctxMenu = writable<Menu>(new Menu());

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

export function showContextMenu(e: MouseEvent, menu: Menu) {
    e.preventDefault();
    e.stopPropagation();
    // Get the menu
    const ctx: HTMLDialogElement = getMenu();
    // If you are clicking on the body of the ctx menu, don't do anything
    if (isBody(e)) return;
    // Update the menu
    ctxMenu.set(menu.shake());
    // Close the menu, in case it was already open
    ctx.close();
    // Open the menu
    ctx.showModal();
    // Set the position of the menu
    setContextMenuPosition(ctx, e.clientX, e.clientY);
}

export function closeContextMenu(e?: MouseEvent) {
    // If the target is the list, don't do anything
    if (!e || !isBody(e)) getMenu().close();
}