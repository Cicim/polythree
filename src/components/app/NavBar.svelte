<script lang="ts">
    import "iconify-icon";
    import { openViews } from "src/systems/views";
</script>

<div
    class="navbar"
    class:border={!$openViews.find((view) => view.selected)
        ?._cosmeticHasSideTabs}
>
    <iconify-icon icon="quill:meatballs-v" />
</div>

<style lang="scss">
    .navbar {
        display: flex;
        width: 18px;
        height: 40px;
        align-items: center;
        padding: 0 6px 0 10px;

        float: right;

        background: var(--tabs-bg);
        color: var(--tabs-fg);

        &.border {
            box-shadow: inset 0 calc(var(--tab-border-width) * -1)
                var(--tab-selected-border);
        }

        iconify-icon {
            transform: scale(1.5);
            transition: transform 0.1s ease-out;
        }

        &:hover {
            iconify-icon {
                filter: drop-shadow(0 0 4px var(--hard-shadow));
                color: var(--strong-fg);
                transform: scale(1.8);
            }
        }
    }
</style>
