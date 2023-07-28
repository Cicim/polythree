import { closeTooltip, openTooltip, type TooltipOptions } from "src/components/app/Tooltip.svelte";

const defaultOptions: Partial<TooltipOptions> = {
    /** By default it's chosen depending on the node's position on the window */
    placement: "auto",
}

export function tooltip(node: Node, options: TooltipOptions) {
    const opts = { ...defaultOptions, ...options };

    function onMouseEnter() {
        openTooltip(node as HTMLElement, opts);
    }
    function onMouseLeave() {
        closeTooltip(node as HTMLElement);
    }

    // Add event listeners
    node.addEventListener('mouseenter', onMouseEnter);
    node.addEventListener('mouseleave', onMouseLeave);

    return {
        destroy() {
            node.removeEventListener('mouseenter', onMouseEnter);
            node.removeEventListener('mouseleave', onMouseLeave);
        }
    }
}