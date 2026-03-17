figma.showUI(__html__, { width: 600, height: 900 })

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
        const startX = figma.viewport.center.x;
        const startY = figma.viewport.center.y;
        const fontSize = templateNode.fontSize; // Use the template's font size to calculate spacing
        const spacing = fontSize * 1.2; // Spacing based on font size with slight padding
        const charsPerRow = 5; // Number of characters per row before wrapping

        // Create a frame to contain all the text objects
        const containerFrame = figma.createFrame();
        containerFrame.name = "Generated Characters";
        containerFrame.x = startX;
        containerFrame.y = startY;
        containerFrame.fills = []; // No fill for the container frame
        await figma.loadFontAsync(templateNode.fontName);
        
        for (let i = 0; i < uniqueCharacters.length; i++) {
            const char = uniqueCharacters[i];
            if (char === ' ') continue; // Skip space characters

            // Clone the template text node
            const clonedTextNode = templateNode.clone();
            
            // Update the character content and name
            clonedTextNode.characters = char;
            clonedTextNode.name = char; // Name the text object with the character it represents
            
            // Position the cloned text node within the frame based on font size
            clonedTextNode.x = (i % charsPerRow) * spacing;
            clonedTextNode.y = Math.floor(i / charsPerRow) * spacing;
            
            // Add the cloned text node to the container frame
            containerFrame.appendChild(clonedTextNode);
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

        figma.notify(`Extracted ${uniqueCharacters.length} unique characters: ${uniqueCharacters.filter(c => c !== ' ').join('')}`);
    }

}
