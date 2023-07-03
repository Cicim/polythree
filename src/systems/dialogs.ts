import type { SvelteComponent } from "svelte";

import Dialog from "src/components/dialog/Dialog.svelte";
import type AlertDialog from "src/components/dialog/AlertDialog.svelte";
import type ConfirmDialog from "src/components/dialog/ConfirmDialog.svelte";


interface AlertDialogOptions {
    title: string;
    message: string;
}
type AlertDialogResult = null;

interface ConfirmDialogOptions extends AlertDialogOptions { }
type ConfirmDialogResult = true | false | null;

/** Spawn a dialog */
export async function spawnDialog(
    dialogType: typeof SvelteComponent,
    options: Record<string, any>
): Promise<any>;
// Alert
export async function spawnDialog(
    dialogType: typeof AlertDialog, options: AlertDialogOptions
): Promise<AlertDialogResult>;
// Confirm
export async function spawnDialog(
    dialogType: typeof ConfirmDialog, options: ConfirmDialogOptions
): Promise<ConfirmDialogResult>;


export async function spawnDialog(
    dialogType: typeof SvelteComponent,
    options: Record<string, any>
): Promise<any> {
    const parent = document.body;

    return new Promise(async (resolve, _reject) => {
        // Create the dialog component
        const component = new Dialog({
            target: parent,
            props: {
                dialogComponent: dialogType,
                close: (value) => {
                    // Close the dialog
                    component.getDialog().close();
                    // Destroy the component
                    component.$destroy();
                    // Return the value
                    resolve(value);
                },
                ...options
            }
        });

        const dialog = component.getDialog();
        dialog.showModal();
    })
}