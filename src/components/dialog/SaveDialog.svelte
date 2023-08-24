<script lang="ts">
    import Button from "../Button.svelte";

    export let close: (value: unknown) => any;
    export let editorName: string;

    function handleShortCuts({ code }) {
        if (code === "KeyS") {
            close(true);
        } else if (code === "KeyN") {
            close(false);
        }
    }
</script>

<svelte:window on:keydown={handleShortCuts} />

<div class="dialog-content">
    <div class="icon-title">
        <iconify-icon icon="fxemoji:warningsign" width="32px" />
        <span
            >Do you want to save the changes you made to the {editorName}?</span
        >
    </div>
    <div class="content">Your changes will be lost if you don't save them.</div>
    <div class="buttons">
        <Button on:click={() => close(true)} theme="secondary"
            ><u>S</u>ave</Button
        >
        <Button on:click={() => close(false)}>Do<u>n</u>'t Save</Button>
        <Button on:click={() => close(null)}>Cancel</Button>
    </div>
</div>

<style lang="scss">
</style>
