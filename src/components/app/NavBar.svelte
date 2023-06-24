<script lang="ts">
    import "iconify-icon";
</script>

<div class="navbar">
    <iconify-icon icon="quill:meatballs-v" width="24px" />
</div>

<style lang="scss">
    .navbar {
        display: flex;
        height: 40px;
        align-items: center;
        padding: 0 8px;

        float: right;

        box-shadow: -4px 0 1px -4px var(--medium-shadow);
        background: var(--tabs-bg);
        color: var(--tabs-fg);

        &:hover {
            background: var(--light-shadow);
        }
    }
</style>
