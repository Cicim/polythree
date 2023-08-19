<script lang="ts">
    import { getContext } from "svelte";
    import { LEVEL_COLORS, LAYER_CHARS } from "../editor/consts";
    import type { MapEditorContext } from "src/views/MapEditor";
    import { PaletteMaterial } from "../editor/materials";
    import { tooltip } from "src/systems/tooltip";
    import { BlocksData, NULL } from "../editor/blocks_data";

    const context: MapEditorContext = getContext("context");
    const material = context.material;

    interface PermissionCard {
        text: string;
        obstacle: boolean;
        color: string;
        permission: number;
        layer: number;
    }

    let permissions: PermissionCard[] = [];
    let permissionsCount = 32;
    let selected: number = 0;

    for (let p = 0; p < permissionsCount; p++) {
        const layer = p >> 1;
        const obstacle = !!(p & 1);
        permissions.push({
            permission: p,
            layer,
            text: obstacle ? LAYER_CHARS[layer] : layer.toString(),
            obstacle: p % 2 === 1,
            color: LEVEL_COLORS[p],
        });
    }

    let lastXOffset: number = 0;
    const ROW_WIDTH = 8;
    const LAST_ROW = 3;

    function selectPermission(permission: number) {
        selected = permission;
        if (permission !== NULL) lastXOffset = permission % ROW_WIDTH;
        buildMaterial();
    }

    function buildMaterial() {
        $material = new PaletteMaterial(new BlocksData(1, 1, null, selected));
    }

    $: $material,
        (() => {
            if ($material instanceof PaletteMaterial && $material.isSingular) {
                const permission = $material.blocks.levels[0];
                selected = permission;
                if (permission !== NULL) lastXOffset = permission % ROW_WIDTH;
            }
        })();

    export function moveOnPalette(
        dirX: number,
        dirY: number,
        _select: boolean
    ) {
        const GO_DOWN = dirY > 0;
        const GO_UP = dirY < 0;
        const GO_RIGHT = dirX > 0;
        const GO_LEFT = dirX < 0;

        if (selected === NULL) {
            if (GO_DOWN) selectPermission(lastXOffset);
            else if (GO_UP)
                selectPermission(LAST_ROW * ROW_WIDTH + lastXOffset);
            else if (GO_LEFT) selectPermission(LAST_ROW * ROW_WIDTH + 7);
            else selectPermission(0);
        } else {
            if (GO_UP) {
                // If you're on the first row select NULL
                if (selected < ROW_WIDTH) selectPermission(NULL);
                // Else, go up a row
                else selectPermission(selected - ROW_WIDTH);
            } else if (GO_DOWN) {
                // If you're on the last row select NULL
                if (selected >= ROW_WIDTH * LAST_ROW) selectPermission(NULL);
                // Else, go down a row
                else selectPermission(selected + ROW_WIDTH);
            } else if (GO_LEFT) {
                // If you're on first tile select NULL
                if (selected === 0) selectPermission(NULL);
                // Else, go left with wrapping
                else selectPermission(selected - 1);
            } else if (GO_RIGHT) {
                // If you're on the last tile select NULL
                if (selected === (LAST_ROW + 1) * ROW_WIDTH - 1)
                    selectPermission(NULL);
                // Else, go right with wrapping
                else selectPermission(selected + 1);
            }
        }
    }
</script>

<div class="palette">
    <div class="palette-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="none-card any-perm-card"
            class:selected={selected === NULL}
            on:click={() => selectPermission(NULL)}
            use:tooltip
            tooltip="Does not change the permission"
        >
            <iconify-icon inline icon="mdi:eraser" /> NONE
        </div>
        {#each permissions as { text, layer, color, permission, obstacle } (permission)}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="perm-card any-perm-card"
                class:obstacle
                class:selected={permission === selected}
                style="background-color: {color}"
                on:mousedown={() => selectPermission(permission)}
                use:tooltip
                tooltip={`${
                    layer === 0
                        ? "Junction Level"
                        : layer === 15
                        ? "Special Level"
                        : `Level ${layer}`
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

    .any-perm-card {
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

    .perm-card {
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
