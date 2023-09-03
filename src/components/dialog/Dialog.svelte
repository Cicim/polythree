<script lang="ts" context="module">
    import Dialog from "./Dialog.svelte";
    import { spawnAlertDialog } from "./AlertDialog.svelte";

    const dialogAnimationTypes = [
        /** Dialog starts at center, .85 size, in .5 seconds goes reaches default */
        "scale",
        /** Dialog stars out of bounds down, slides in in .5 seconds until default*/
        "slide-up",
        "slide-left",
        "slide-down",
        "slide-right",
        /** Dialog starts at center, .85 size, grows in .5 seconds while shaking horizontally */
        "spook",
    ] as const;

    type DialogAnimationType = (typeof dialogAnimationTypes)[number];

    export interface DialogOptions {
        /** The animation of the dialog. Defaults to scale */
        animation?: DialogAnimationType;
    }

    /** Spawns a dialog component with the specified content and returns
     * the return value when the dialog closes. */
    export async function spawnDialog(
        contentComponent: typeof SvelteComponent,
        options: Record<string, any>
    ): Promise<any> {
        // The Dialog's parent element
        const parent = document.body;

        return new Promise(async (resolve) => {
            // Create the dialog component
            const component = new Dialog({
                target: parent,
                props: {
                    dialogComponent: contentComponent,
                    close: (value) => {
                        // Destroy the component
                        component.$destroy();
                        // Return the value
                        resolve(value);
                    },
                    ...options,
                },
            });

            const dialog = component.getDialog();
            dialog.showModal();
        });
    }
</script>

<script lang="ts">
    import type { SvelteComponent } from "svelte";

    /** The component of the dialog content */
    export let dialogComponent: typeof SvelteComponent;
    /** The close function that returns a value in the Promise */
    export let close: (value: unknown) => any;
    /** The dialog's animation. Taken from the configs, defaults to scale */
    export let animation: DialogAnimationType = "scale";

    /** The dialog element */
    let dialogElement: HTMLDialogElement;
    /** The dialog content container element */
    let contentElement: SvelteComponent;

    export function getDialog() {
        return dialogElement;
    }

    /**
     * When pressing the escape key.
     * Closes the dialog, unless the content has the `noEscapeClose` prop set to `true`.
     */
    function closeOnEscape(event: KeyboardEvent) {
        if (dialogElement.open && contentElement?.noEscapeClose) return;

        if (event.code === "Escape") {
            close(null);
        }
    }

    /**
     * When clicking outside of the dialog window.
     * Closes it, unless the content has the `noOutsideClose` prop set to `true`.
     */
    function closeOnClickOutside(event: MouseEvent) {
        if (dialogElement.open && contentElement?.noOutsideClose) return;

        const { x, y, width, height } = (<HTMLDialogElement>(
            dialogElement.children[0]
        )).getBoundingClientRect();

        if (
            event.clientX < x - 8 ||
            event.clientX > x + width + 8 ||
            event.clientY < y - 4 ||
            event.clientY > y + height + 4
        ) {
            close(null);
        }
    }
</script>

<!-- The dialog -->
<dialog
    class="dialog modal anim-{animation}"
    bind:this={dialogElement}
    on:keydown={closeOnEscape}
    on:mousedown={closeOnClickOutside}
>
    <!-- The dialog content container -->
    <svelte:component
        this={dialogComponent}
        bind:this={contentElement}
        {close}
        {...$$restProps}
    />
</dialog>

<style lang="scss">
    @keyframes scale {
        0% {
            transform: scale(0.85);
        }
        100% {
            transform: scale(1);
        }
    }

    @mixin slide($animName, $x, $y) {
        @keyframes #{"slide" + $animName} {
            0% {
                transform: translate($x, $y);
            }
            100% {
                transform: translate(0, 0);
            }
        }
        animation: #{"slide" + $animName} 0.5s cubic-bezier(
                0.165,
                0.84,
                0.44,
                1
            ) forwards;
    }

    @keyframes spook {
        $amount: 2px;

        0% {
            transform: scale(0.85);
        }
        25% {
            transform: scale(1.25);
        }
        100% {
            transform: scale(1);
        }
    }

    dialog {
        background: var(--dialog-bg);
        padding: 0.25em 0.5em;
        border: 1px solid var(--dialog-border);
        border-radius: 4px;

        box-shadow: 5px 5px 10px var(--dialog-shadow);

        &.anim-scale {
            animation: scale 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
        }
        &.anim-slide-up {
            @include slide("Up", 0, 100%);
        }
        &.anim-slide-left {
            @include slide("Left", 100%, 0);
        }
        &.anim-slide-down {
            @include slide("Down", 0, -100%);
        }
        &.anim-slide-right {
            @include slide("Right", -100%, 0);
        }
        &.anim-spook {
            animation: spook 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
        }

        &::backdrop {
            background: #0008;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }

        &:focus {
            outline: none;
        }
    }
</style>
