<script lang="ts">
    interface Icon {
        icon: string;
        text: string;
        onclick?: (event: MouseEvent) => void;
    }

    export let size: string = "11pt";
    export let icons: Icon[];
    export let horizontal_alignment: "left" | "right" = "right";
    export let vertical_alignment: "top" | "bottom" = "top";
</script>

<div
    class="icons-container"
    style={`
        font-size: ${size}; 
        ${horizontal_alignment}: 0.5rem; 
        ${vertical_alignment}: 0.5rem;
    `}
>
    {#each icons as { icon, text, onclick }}
        <button
            class="icon-button"
            on:click|stopPropagation={onclick}
            on:dblclick|stopPropagation
            style={`font-size: ${size}`}
        >
            <span class="text">{text}</span>
            <span class="icon">
                {#key icon}
                    <iconify-icon {icon} />
                {/key}
            </span>
        </button>
    {/each}
</div>

<style lang="scss">
    .icons-container {
        display: flex;
        position: absolute;
        z-index: 10;

        transition: ease-in-out 1s;
    }

    .icon-button {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 20px;

        border: none;
        background: transparent;
        padding: 0.25em 0.5em !important;
        border-radius: 8px;

        color: var(--main-fg);
        pointer-events: none;
        cursor: pointer;

        .text {
            display: none;
        }

        .icon {
            display: grid;
            pointer-events: all;
            align-items: center;
            position: relative;

            ::after {
                content: "";
                display: block;
                position: absolute;
                bottom: -3px;
                right: 0;
                width: 33px;
                height: 20px;
                background: transparent;
            }
        }

        &:hover {
            background: var(--btn-secondary-bg);
            outline: 1px solid var(--btn-secondary-border);

            .text {
                display: flex;
                place-self: center;
                margin-right: 0.5em;
                padding-left: 0.25em;
                pointer-events: none;
            }
        }

        &:focus {
            outline: 1px solid var(--outline);
            outline-offset: 1px;
        }

        &:active {
            background: var(--btn-secondary-bg-hover);
            color: var(--btn-secondary-fg-hover);
        }
    }
</style>
