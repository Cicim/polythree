<script lang="ts">
    import { getContext } from "svelte";
    import { LEVEL_COLORS, LAYER_CHARS } from "../editor/consts";
    import type { MapEditorContext } from "src/views/MapEditor";
    import { PaletteMaterial } from "../editor/materials";
    import { tooltip } from "src/systems/tooltip";

    const context: MapEditorContext = getContext("context");
    const material = context.material;

    interface LevelCard {
        text: string;
        obstacle: boolean;
        color: string;
        level: number;
        layer: number;
    }

    let levels: LevelCard[] = [];
    let levelCount = 64;
    let selected: number = 0;

    for (let i = 0; i < levelCount; i++) {
        const layer = (i / 2) | 0;
        const obstacle = i % 2 === 1;
        const value = layer + (obstacle ? 256 : 0);
        levels.push({
            level: value,
            layer,
            text: obstacle ? LAYER_CHARS[layer] : layer.toString(),
            obstacle: i % 2 === 1,
            color: LEVEL_COLORS[value],
        });
    }

    let lastXOffset: number = 0;
    const LAST_Y_LEVEL = 7;
    function selectLevel(level: number) {
        selected = level;
        if (level !== null) {
            const level = (selected % 256) % 4;
            const obstacle = selected & 0x100;
            lastXOffset = level + obstacle;
        }
        buildMaterial();
    }

    function buildMaterial() {
        $material = new PaletteMaterial([[[null, selected]]]);
    }

    export function moveOnPalette(
        dirX: number,
        dirY: number,
        _select: boolean
    ) {
        if (selected === null) {
            if (dirY > 0) selectLevel(lastXOffset);
            else if (dirY < 0) selectLevel(LAST_Y_LEVEL * 4 + lastXOffset);
            else if (dirX < 0) selectLevel(LAST_Y_LEVEL * 4 + 256 + 3);
            else selectLevel(0);
        } else {
            const level = selected % 256;
            const isObstacle = selected & 0x100;
            if (dirX > 0) {
                if (level === 31 && isObstacle) return selectLevel(null);

                if (isObstacle) selectLevel(level + 1);
                else selectLevel(level + 256);
            } else if (dirX < 0) {
                if (level === 0 && !isObstacle) return selectLevel(null);

                if (isObstacle) selectLevel(level);
                else selectLevel(level + 255);
            } else if (dirY > 0) {
                if (Math.floor(level / 4) >= LAST_Y_LEVEL)
                    return selectLevel(null);
                selectLevel(selected + 4);
            } else if (dirY < 0) {
                if (Math.floor(level / 4) <= 0) return selectLevel(null);
                selectLevel(selected - 4);
            }
        }
    }

    $: $material,
        (() => {
            if ($material instanceof PaletteMaterial && $material.isSingular) {
                selected = $material.blocks[0][0]?.[1] ?? null;
            }
        })();
</script>

<div class="palette">
    <div class="palette-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="none-card any-level-card"
            class:selected={selected === null}
            on:click={() => selectLevel(null)}
            use:tooltip
            tooltip="Does not change the level"
        >
            <iconify-icon inline icon="mdi:eraser" /> NONE
        </div>
        {#each levels as { text, layer, color, level, obstacle } (level)}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="level-card any-level-card"
                class:obstacle
                class:selected={level === selected}
                style="background-color: {color}"
                on:mousedown={() => selectLevel(level)}
                use:tooltip
                tooltip={`${
                    layer === 0 ? "Junction Level" : `Level ${layer}`
                }, ${obstacle ? "Obstacle" : "Traversable"}`}
            >
                {text}
            </div>
        {/each}
    </div>
</div>

<style lang="scss">
    .palette {
        display: grid;
        height: 100%;
        place-content: center;
    }

    .palette-container {
        display: flex;
        flex-wrap: wrap;
        overflow-y: scroll;
        justify-content: center;
        width: 300px;
        gap: 4px;
        padding: 4px 0;
    }

    .any-level-card {
        cursor: pointer;

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
            cursor: default;
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
        letter-spacing: 1px;
        gap: 4px;

        &.selected {
            color: var(--weak-fg);
        }
    }
</style>
