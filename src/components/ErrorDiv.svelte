<script lang="ts">
</script>

<div class="card">
    <span class="icon">
        <iconify-icon icon="codicon:error" />
    </span>
    <span>
        <b>Error: </b>
        <slot />
    </span>
</div>

<style lang="scss">
    .card {
        display: grid;
        grid-template-columns: min-content 1fr;
        gap: 1em;

        background: var(--error-card-bg);
        color: var(--error-card-fg);
        border: 1px solid var(--error-card-border);

        border-radius: 0.5rem;
        padding: 0.5rem;
        margin: 4px;

        .icon {
            iconify-icon {
                font-size: 2rem;
                color: var(--error-card-icon);
            }
        }
    }
</style>
