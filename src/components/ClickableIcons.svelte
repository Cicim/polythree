<script lang="ts">
    interface Icon {
        icon: string;
        text: string;
        onclick?: (event: MouseEvent) => void;
    }

    export let icons: Icon[];
    export let horizontal_alignment: "left" | "right" = "right";
    export let vertical_alignment: "top" | "bottom" = "top";
</script>

<div
    class="container"
    style={`${horizontal_alignment}: 0.5rem; ${vertical_alignment}: 0.5rem;`}
>
    {#each icons as { icon, text, onclick }}
        <button class="icon-button" on:click|stopPropagation={onclick}>
            <span class="text">{text}</span>
            <span class="icon">
                <iconify-icon {icon} />
            </span>
        </button>
    {/each}
</div>

<style lang="scss">
    .container {
        display: flex;
        position: absolute;
        z-index: 10;
    }

    .icon-button {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 20px;

        border: none;
        background: transparent;
        color: var(--main-fg);

        padding: 0.25em 0.25em;
        border-radius: 8px;

        pointer-events: none;
        cursor: pointer;

        .text {
            display: none;
        }

        .icon {
            display: grid;
            pointer-events: all;
        }

        &:hover {
            background: var(--btn-secondary-bg);
            outline: 1px solid var(--btn-secondary-border);
            padding: 0.25em 0.5em !important;

            .text {
                display: flex;
                place-self: center;
                margin-right: 0.5em;
            }
        }

        &:active {
            background: var(--btn-secondary-bg-hover);
            color: var(--btn-secondary-fg-hover);
        }
    }
</style>
