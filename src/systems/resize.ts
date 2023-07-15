function setWidth(node: HTMLElement, width: number) {
    node.style.width = `${width}px`;
}


/** Adds the listeners for resizing an element
 * @param node The element to click to start resizing
 * @param node The element to resize
 */
export function resizeX(node: HTMLElement, startWidth: number) {
    let nodeWidth = startWidth;
    let resizeOffsetX: number;
    let resizing = false;

    function startResizing(event: MouseEvent) {
        // Get the mouse's position on the node
        const rect = node.getBoundingClientRect();
        const offset = rect.x - event.clientX;
        if (offset > 0) {
            resizeOffsetX = offset;
            resizing = true;
        }
    }
    function stopResizing() {
        resizing = false;
    }
    function resize(event: MouseEvent) {
        // Check if the mouse is down
        if (resizing) {
            nodeWidth = Math.min(
                window.innerWidth - event.clientX - resizeOffsetX,
                Math.round(window.innerWidth * 0.5)
            );
            setWidth(node, nodeWidth);
        }
    }
    function onWindowResize() {
        // Cap the sidebarWidth to Math.round(window.innerWidth * 0.5)
        nodeWidth = Math.min(
            nodeWidth,
            Math.round(window.innerWidth * 0.5)
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