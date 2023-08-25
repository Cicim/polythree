<script lang="ts" context="module">
    import { spawnDialog } from "./Dialog.svelte";
    import AlertDialog from "./AlertDialog.svelte";

    interface AlertDialogOptions {
        title: string;
        message: string;
    }

    type AlertDialogResult = null;

    export async function spawnAlertDialog(
        options: AlertDialogOptions
    ): Promise<AlertDialogResult> {
        return await spawnDialog(AlertDialog, options);
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
        <Button theme="secondary" on:click={() => close(null)}>Ok</Button>
    </div>
</div>
