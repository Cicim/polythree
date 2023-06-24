<script lang="ts">
    import "iconify-icon";
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
    <div class="icon">
        <iconify-icon icon="fxemoji:warningsign" width="32px" />
    </div>
    <div class="title">
        Do you want to save the changes you made to the {editorName}?
    </div>
    <div class="subtext">Your changes will be lost if you don't save them.</div>
    <div class="buttons">
        <Button on:click={() => close(true)} color="secondary"
            ><u>S</u>ave</Button
        >
        <Button on:click={() => close(false)}>Do<u>n</u>'t Save</Button>
        <Button on:click={() => close(null)}>Cancel</Button>
    </div>
</div>

<style type="scss">
    .dialog-content {
        display: grid;
        grid-template-columns: 50px 1fr;
        grid-column-gap: 10px;
        grid-row-gap: 5px;
        grid-template-areas: "icon title" "subtext subtext" "buttons buttons";
    }

    .icon {
        grid-area: icon;
        margin: auto;
    }

    .title {
        grid-area: title;
        font-size: 1.2em;
        font-weight: 300;
        color: var(--accent-fg);
        max-width: 320px;
    }

    .subtext {
        grid-area: subtext;
        font-weight: 300;
        color: var(--main-fg);
        padding: 1.5em 1em;
    }

    .buttons {
        grid-area: buttons;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        width: 100%;
    }
</style>
