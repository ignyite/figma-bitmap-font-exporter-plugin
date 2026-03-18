figma.showUI(__html__, { width: 600, height: 900 })

const selectedOnOpen = figma.currentPage.selection;
const textNodeOnOpen = selectedOnOpen.find(n => n.type === "TEXT");
figma.ui.postMessage({
    type: "init",
    fontSize: textNodeOnOpen ? textNodeOnOpen.fontSize : 0,
    hasText: !!textNodeOnOpen
});

figma.on("selectionchange", () => {
    const sel = figma.currentPage.selection;
    const hasText = sel.some(n => n.type === "TEXT");
    figma.ui.postMessage({ type: "selectionChange", hasText });
});

figma.ui.onmessage = async (msg) => {

    const format = msg.mode === "msdf" ? "SVG" : "PNG"

    if (msg.type === "exportGlyphs") {

        const nodes = figma.currentPage.selection

        if (!nodes.length) {
            figma.notify("Select glyph frames")
            return
        }

        const scale = msg.scale || 1
        const useAbsoluteBounds = msg.useAbsoluteBounds

        const glyphs = []

        for (const node of nodes) {

            const png = await node.exportAsync({
                format: "PNG",
                constraint: {
                    type: "SCALE",
                    value: scale,

                },
                useAbsoluteBounds: useAbsoluteBounds
            })

            glyphs.push({
                char: node.name,
                width: Math.round(node.width * scale),
                height: Math.round(node.height * scale),
                baseline: Math.round(node.height * scale),
                image: Array.from(png)
            })

        }

        figma.ui.postMessage({
            type: "glyphs",
            glyphs
        })

    }

    if (msg.type === "generateTextObjects") {
        // Get the currently selected node(s) to use as template
        const selectedNodes = figma.currentPage.selection;
        if (selectedNodes.length === 0) {
            figma.notify("Please select a text object to use as template");
            return;
        }

        // Use the first selected node as template
        const templateNode = selectedNodes[0];
        if (templateNode.type !== "TEXT") {
            figma.notify("Please select a text object to use as template");
            return;
        }

        // Get the text content from the selected text object
        const textToGenerate = templateNode.characters;
        if (!textToGenerate || textToGenerate.trim() === "") {
            figma.notify("Selected text object is empty");
            return;
        }

        // Create individual text nodes for each character in the text string
        const characters = [...textToGenerate]; // Use spread operator to handle emojis and special characters properly
        const uniqueCharacters = [...new Set(characters)]; // Remove duplicates to create unique symbols
        let paddingX = 0
        if(msg.charPaddingX) {
            paddingX  =msg.charPaddingX
        }
        let paddingY = 0;
        if(msg.charPaddingY)
        {
            paddingY = msg.charPaddingY;
        }
        const charsPerRow = 5; // Number of characters per row before wrapping
        const fontName = msg.fontName || "bitmap_font";

        // Create a frame to contain all the text objects
        const containerFrame = figma.createFrame();
        containerFrame.name = fontName;
        containerFrame.x = figma.viewport.center.x;
        containerFrame.y = figma.viewport.center.y;
        containerFrame.fills = []; // No fill for the container frame
        await figma.loadFontAsync(templateNode.fontName);

        let charIndex = 0;
        for (let i = 0; i < uniqueCharacters.length; i++) {
            const char = uniqueCharacters[i];
            if (char === ' ') continue; // Skip space characters

            // Clone the template text node
            const textNode = templateNode.clone();
            textNode.characters = char;
            textNode.name = char;
            textNode.x = paddingX;
            textNode.y = paddingY;

            // Create a frame for this character
            const charFrame = figma.createFrame();
            charFrame.name = char;
            charFrame.fills = [];
            charFrame.clipsContent = false;
            charFrame.resizeWithoutConstraints(textNode.width + paddingX * 2, textNode.height + paddingY * 2);
            charFrame.appendChild(textNode);
            charFrame.expanded = false;

            // Grid placement
            charFrame.x = (charIndex % charsPerRow) * (charFrame.width + 4);
            charFrame.y = Math.floor(charIndex / charsPerRow) * (charFrame.height + 4);

            containerFrame.appendChild(charFrame);
            charIndex++;
        }

        const bounds = containerFrame.children.reduce((acc, node) => {
            return {
                maxX: Math.max(acc.maxX, node.x + node.width),
                maxY: Math.max(acc.maxY, node.y + node.height)
            }
        }, { maxX: 0, maxY: 0 })

        containerFrame.resizeWithoutConstraints(bounds.maxX, bounds.maxY)

        // Add the container frame to the current page so it's visible
        figma.currentPage.appendChild(containerFrame);

        figma.notify(`Extracted ${uniqueCharacters.filter(c => c !== ' ').length} unique characters`);
    }

}
