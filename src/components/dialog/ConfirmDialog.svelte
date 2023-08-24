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
