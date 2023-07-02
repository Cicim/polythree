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
            <span class="icon">
                <iconify-icon {icon} />
            </span>
            <span class="text">{text}</span>
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

        border: none;
        background: transparent;
        color: var(--main-fg);

        padding: 0.25em 0.3em;
        border-radius: 8px;

        pointer-events: all;
        cursor: pointer;

        .text {
            display: none;
        }

        .icon {
            display: flex;

            iconify-icon {
                place-self: center;
            }
        }

        &:hover {
            background: var(--btn-secondary-bg);
            outline: 1px solid var(--btn-secondary-border);
            padding: 0.25em 0.5em;

            .text {
                display: flex;
                place-self: center;
                margin-left: 0.5em;
            }
        }

        &:active {
            background: var(--btn-secondary-bg-hover);
            color: var(--btn-secondary-fg-hover);
        }
    }
</style>
