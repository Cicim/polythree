<script lang="ts">
    import type { HomePageContext } from "./HomePage";
    import { MapEditorContext } from "./MapEditor";

    export let context: HomePageContext;
</script>

<div class="view">
    <h1>Welcome to Polythree!</h1>

    <p>
        You can start by
        <!-- svelte-ignore a11y-missing-attribute -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <a
            href="#"
            on:click={() =>
                new MapEditorContext({
                    group: Math.floor(Math.random() * 255),
                    index: Math.floor(Math.random() * 255),
                }).create()}>opening a map</a
        >
    </p>
</div>

<style lang="scss">
</style>
