<script lang="ts">
    import { LEVEL_COLORS, LAYER_CHARS } from "../editor/consts";

    interface LevelCard {
        name: string;
        obstacle: boolean;
        color: string;
        value: number;
    }

    let levels: LevelCard[] = [];
    let levelCount = 64;
    let selected: number = 0;

    for (let i = 0; i < levelCount; i++) {
        const layer = (i / 2) | 0;
        const obstacle = i % 2 === 1;
        levels.push({
            value: i,
            name: obstacle ? LAYER_CHARS[layer] : layer.toString(),
            obstacle: i % 2 === 1,
            color: LEVEL_COLORS[layer],
        });
    }
</script>

<div class="palette">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="none-card any-level-card"
        class:selected={selected === null}
        on:click={() => (selected = null)}
    />
    {#each levels as { name, color, value, obstacle }, i (value)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="level-card any-level-card"
            class:obstacle
            class:selected={i === selected}
            style="background-color: {color}"
            on:mousedown={() => (selected = value)}
        >
            {name}
        </div>
    {/each}
</div>

<style lang="scss">
    .palette {
        display: flex;
        flex-wrap: wrap;
        overflow-y: scroll;
        justify-content: center;
        gap: 4px;
        padding: 4px 0;

        container-type: inline-size;
    }

    .any-level-card {
        &:not(.selected) {
            color: white;

            &:hover {
                box-shadow: inset 0 0 100px #fff8;
                color: black;
            }
            &:active {
                box-shadow: none;
            }
        }
        &.selected {
            color: black;
            outline: 2px solid var(--accent-fg);
            box-shadow: 0px 0px 30px var(--hard-shadow);
            z-index: 100;
        }
    }

    .level-card {
        width: 30px;
        height: 30px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 20px;

        color: white;
        border-radius: 4px;

        &.obstacle {
            border-radius: 16px;
            font-size: 24px;
        }
    }

    .none-card {
        width: 268px;
        height: 30px;
        background-color: var(--weak-bg);
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 20px;
        border-radius: 4px;

        &:after {
            content: "NONE";
        }
        &.selected {
            color: var(--weak-fg);
        }
    }

    @container (min-width: 308px) {
        .none-card {
            width: 30px;
            &:after {
                content: "○";
                display: flex;
            }
        }
    }
</style>
