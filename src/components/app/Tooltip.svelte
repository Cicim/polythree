<script lang="ts" context="module">
    export interface TooltipOptions {
        /** The tooltip's preferred placement relative to the element */
        placement?: "auto" | "top" | "bottom";
    }

    /** The tooltip div element */
    let tooltip: HTMLDivElement = null;
    /** The last targeted element */
    let lastTarget: HTMLElement = null;
    /** The timeout for opening */
    let openingTimeout: NodeJS.Timeout = null;

    let canInstaOpen: boolean = false;
    /** The timeout after which you cannot instantly open a tooltip anymore */
    let closingTimeout: NodeJS.Timeout = null;

    let mouseX = 0;

    function placeTooltip(
        target: HTMLElement,
        placement: TooltipOptions["placement"]
    ) {
        tooltip.style.top = "0px";
        tooltip.style.left = "0px";

        // Get the tooltip's bounding rect
        const tooltipRect = tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;
        // Get the target's bounding rect
        const targetRect = target.getBoundingClientRect();
        const targetWidth = targetRect.width;
        const targetHeight = targetRect.height;
        const targetX = targetRect.x;
        const targetY = targetRect.y;

        // Get the window's width and height
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Based on the preferred placement, place the tooltip
        if (placement === "auto") {
            // Get the placement based on the space above and below the target
            const spaceAbove = targetY;
            const spaceBelow = windowHeight - targetY - targetHeight;
            placement = spaceAbove > spaceBelow ? "top" : "bottom";
        }

        // Place the tooltip close to the mouseX
        let placementX = Math.max(
            0,
            Math.min(windowWidth - tooltipWidth, mouseX - tooltipWidth / 2)
        );
        // If the target is <= 200px center the tooltip on the target
        if (targetWidth <= 200) {
            placementX = targetX + targetWidth / 2 - tooltipWidth / 2;
            // If there isn't enough space to the left, move it to the right
            if (placementX < 0) placementX = 0;
            // If there isn't enough space to the right, move it to the left
            if (placementX + tooltipWidth > windowWidth)
                placementX = windowWidth - tooltipWidth;
        }

        const mouseOffset =
            targetWidth <= 200
                ? targetWidth / 2 + targetX
                : Math.max(8, Math.min(mouseX, windowWidth - 11));
        const arrowOffsetX = mouseOffset - placementX - tooltipWidth / 2;
        // Calculate the offset of the arrow
        tooltip.style.setProperty("--arrow-offset-x", `${arrowOffsetX}px`);

        if (placement === "top") {
            tooltip.style.top = `${targetY - tooltipHeight}px`;
            tooltip.style.left = `${placementX}px`;
            tooltip.classList.toggle("top", true);
            tooltip.classList.toggle("bottom", false);
        } else {
            tooltip.style.top = `${targetY + targetHeight}px`;
            tooltip.style.left = `${placementX}px`;
            tooltip.classList.toggle("top", false);
            tooltip.classList.toggle("bottom", true);
        }
    }

    export function openTooltip(target: HTMLElement, options: TooltipOptions) {
        // Close the tooltip if it's already open
        if (lastTarget) closeTooltip();
        // Updates the lastTarget
        lastTarget = target;

        const timeToOpen = canInstaOpen ? 0 : 500;

        // Start the timeout
        openingTimeout = setTimeout(() => {
            // Get the attribute for tooltip
            const tooltipAttribute = target.getAttribute("tooltip");

            if (tooltipAttribute === "") return;
            // Show the tooltip
            tooltip.style.display = "block";
            // If the attribute is a falsy value, return
            if (!tooltipAttribute) return;
            // Update the tooltip
            tooltip.innerHTML = tooltipAttribute;
            // Place the tooltip
            placeTooltip(target, options.placement);
        }, timeToOpen);
    }

    export function closeTooltip() {
        // Start a timeout, after which you will reset a variable
        canInstaOpen = true;

        closingTimeout = setTimeout(() => {
            canInstaOpen = false;
            clearTimeout(closingTimeout);
            closingTimeout = null;
        }, 400);

        // Clear the lastTarget
        lastTarget = null;
        // Clear the interval
        clearTimeout(openingTimeout);
        // Hide the tooltip
        tooltip.style.display = "none";
    }

    export function closeTooltipIfTarget(target: HTMLElement) {
        if (lastTarget === target) closeTooltip();
    }
</script>

<script lang="ts">
    import { onMount } from "svelte";

    let tooltipEl: HTMLDivElement = null;

    function updateMousePos(event: MouseEvent) {
        mouseX = event.clientX;
    }

    onMount(() => {
        tooltip = tooltipEl;
    });
</script>

<svelte:window on:mousemove={updateMousePos} />

<div id="tooltip" bind:this={tooltipEl}>Test tooltip text</div>

<style lang="scss">
    #tooltip {
        --arrow-offset-x: 0px;

        position: absolute;
        display: none;
        border-radius: 4px;
        padding: 4px 8px;
        top: 0;
        left: 0;
        min-width: 32px;

        text-align: center;
        background: var(--tooltip-bg);
        color: var(--tooltip-fg);
        border: 1px solid var(--tooltip-border);

        z-index: 10000;
        pointer-events: none;

        &:global(.top) {
            transform: translateY(-8px);

            &::after {
                position: absolute;
                top: calc(100% - 6px);
                right: calc(50% - 8px - var(--arrow-offset-x));

                font-size: 16px;
                color: var(--tooltip-bg);
                text-shadow: 0 1px 0 var(--tooltip-border);

                z-index: 10001;

                content: "▼";
            }
        }

        &:global(.bottom) {
            transform: translateY(8px);

            &::before {
                position: absolute;
                top: -1em;
                right: calc(50% - 8px - var(--arrow-offset-x));

                font-size: 16px;
                color: var(--tooltip-bg);
                text-shadow: 0 -2px 0 var(--tooltip-border);

                z-index: 10001;

                content: "▲";
            }
        }
    }
</style>
