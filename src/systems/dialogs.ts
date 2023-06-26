import type { SvelteComponent } from "svelte";
import { get } from "svelte/store";
import { openViews } from "./views";

import Dialog from "src/components/dialog/Dialog.svelte";

export async function spawnDialog(dialogType: typeof SvelteComponent, options: {} = {}) {
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