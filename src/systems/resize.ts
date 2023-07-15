function setWidth(node: HTMLElement, width: number) {
    node.style.width = `${width}px`;
}

function defaultMaxWidth(nodeWidth: number) {
    return window.innerWidth;
}


interface ResizeXOptions {
    startWidth: number;
    maxWidth: ((nodeWidth: number) => number) | number;
}

/** Adds the listeners for resizing an element
 * @param node The element to resize
 * @param startWidth The width to start with
 * @param maxWidth The maximum width to resize to. Can be a number or a function that returns a number
 */
export function resizeX(node: HTMLElement, { startWidth, maxWidth }: ResizeXOptions) {
    // The width of the node
    let nodeWidth = startWidth ?? node.getBoundingClientRect().width;
    // The max width is a function that returns the max width, but it can be passed as a number as well
    const getMaxWidth = maxWidth == null ? defaultMaxWidth : // maxWidth is undefined, return a default () => window.innerWidth
        maxWidth instanceof Function ? maxWidth : // maxWidth is a function, return itself
            () => maxWidth; // maxWidth is a number, return a function that returns that number

    // The offset of the mouse from the left side of the node
    let resizeOffsetX: number;
    // Whether the mouse is down
    let isResizing = false;

    let lastChosenWidth = nodeWidth;

    function startResizing(event: MouseEvent) {
        // Get the mouse's position on the node
        const rect = node.getBoundingClientRect();
        const offset = rect.x - event.clientX;
        if (offset > 0) {
            resizeOffsetX = offset;
            isResizing = true;
        }
    }
    function stopResizing() {
        isResizing = false;
        lastChosenWidth = nodeWidth;
    }
    function resize(event: MouseEvent) {
        // Check if the mouse is down
        if (isResizing) {
            nodeWidth = Math.min(
                window.innerWidth - event.clientX - resizeOffsetX,
                getMaxWidth(nodeWidth)
            );
            setWidth(node, nodeWidth);
        }
    }
    function onWindowResize() {
        // Try to keep the width to the last chosen width
        nodeWidth = lastChosenWidth;
        // Cap the sidebarWidth to getMaxWidth()
        nodeWidth = Math.min(
            nodeWidth,
            getMaxWidth(nodeWidth)
        );
        setWidth(node, nodeWidth);
    }

    node.addEventListener("mousedown", startResizing);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("mouseleave", stopResizing);
    window.addEventListener("mousemove", resize);
    window.addEventListener("resize", onWindowResize);

    return {
        destroy() {
            node.removeEventListener("mousedown", startResizing);
            window.removeEventListener("mouseup", stopResizing);
            window.removeEventListener("mouseleave", stopResizing);
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("resize", onWindowResize);
        }
    }
}