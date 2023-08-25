<script lang="ts" context="module">
    import { spawnDialog, type DialogOptions } from "./Dialog.svelte";
    import ConfirmDialog from "./ConfirmDialog.svelte";
    export interface ConfirmDialogOptions extends DialogOptions {
        /** The name of the editor you're trying to close */
        editorName: string;
    }

    export async function spawnConfirmDialog(
        options: ConfirmDialogOptions
    ): Promise<null | false | true> {
        return await spawnDialog(ConfirmDialog, options);
    }
</script>

<script lang="ts">
    import Button from "../Button.svelte";

    export let title: string = "Message";
    export let message: string = "";
    export let close: (value: any) => void;
</script>

<div class="dialog-content">
    <div class="title">
        {title}
    </div>
    <div class="content">{message}</div>
    <div class="buttons">
        <Button theme="secondary" on:click={() => close(true)}>Yes</Button>
        <Button theme="primary" on:click={() => close(false)}>No</Button>
    </div>
</div>

<style lang="scss">
</style>
