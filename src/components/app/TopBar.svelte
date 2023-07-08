<script lang="ts">
    import NavBar from "./NavBar.svelte";
    import TabBar from "./TabBar.svelte";
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div class="top-bar">
    <NavBar />
    <TabBar />
</div>

<style lang="scss">
    .top-bar {
        display: grid;
        width: 100vw;
        height: 40px;
        overflow-y: hidden;
        scroll-behavior: auto;
        user-select: none;

        grid-template-columns: max-content 1fr;
    }
</style>
