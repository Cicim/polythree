<script lang="ts">
</script>

<div class="card">
    <span class="icon">
        <iconify-icon icon="mdi:alert-circle-outline" />
    </span>
    <span>
        <b>Warning: </b>
        <slot />
    </span>
</div>

<style lang="scss">
    .card {
        display: grid;
        grid-template-columns: min-content 1fr;
        gap: 1em;

        background: var(--warn-card-bg);
        color: var(--warn-card-fg);
        border: 1px solid var(--warn-card-border);

        border-radius: 0.5rem;
        padding: 0.5rem;
        margin: 4px;

        .icon {
            iconify-icon {
                font-size: 2rem;
                color: var(--warn-card-icon);
            }
        }
    }
</style>
