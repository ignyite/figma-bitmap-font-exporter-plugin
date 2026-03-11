figma.showUI(__html__, { width: 600, height: 700 })

figma.ui.onmessage = async (msg) => {

    const format = msg.mode === "msdf" ? "SVG" : "PNG"

    if (msg.type === "exportGlyphs") {

        const nodes = figma.currentPage.selection

        if (!nodes.length) {
            figma.notify("Select glyph frames")
            return
        }

        const scale = msg.scale || 1

        const glyphs = []

        for (const node of nodes) {

            const png = await node.exportAsync({
                format: "PNG",
                constraint: {
                    type: "SCALE",
                    value: scale
                }
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

}