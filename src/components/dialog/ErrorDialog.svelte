<script lang="ts" context="module">
    import { spawnDialog, type DialogOptions } from "./Dialog.svelte";
    import ErrorDialog from "./ErrorDialog.svelte";

    interface ErrorDialogOptions extends DialogOptions {
        title: string;
        message: string;
    }

    type ErrorDialogResult = null;

    export async function spawnErrorDialog(
        message: string,
        title: string = "An Error has occurred"
    ): Promise<ErrorDialogResult> {
        return await spawnDialog(ErrorDialog, {
            message,
            title,
            animation: "spook",
        } as ErrorDialogOptions);
    }
</script>

<script lang="ts">
    import Button from "../Button.svelte";

    export let title: string = "Message";
    export let message: string = "";
    export let close: (value: any) => void;

    // Modify the message: replace : with :\n
    const paragraphs = message.split(":");
    const mainP = paragraphs.shift();
    message = paragraphs.join("\n");
</script>

<div class="dialog-content">
    <div class="title icon-title">
        <iconify-icon icon="bx:error" inline />
        {title}
    </div>
    <div class="content">
        <p>
            {mainP}
        </p>
        <pre>{message}</pre>
    </div>
    <div class="buttons">
        <Button on:click={() => close(null)}>Ok</Button>
    </div>
</div>

<style lang="scss">
    .title {
        color: var(--error-fg) !important;
        font-weight: 600;
    }
    p {
        margin: 0;
        margin-bottom: 0.5em;
        font-size: 1.2em;
    }
    pre {
        margin: 0;
    }
</style>
