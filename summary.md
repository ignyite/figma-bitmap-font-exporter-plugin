# Bitmap Font Exporter Plugin — Summary

## Overview

A Figma plugin that lets designers create and export bitmap/SDF (Signed Distance Field) fonts from glyph designs. It extracts character frames, packs them into a sprite atlas, and exports industry-standard **BMFont (.fnt)** metadata alongside a **WebP** atlas image.

---

## Key Features

- **Glyph Export** — Exports selected Figma frames as PNG images with configurable scale
- **Auto Character Generation** — "Split Selected Text" extracts unique characters from a text object and creates individual frames
- **Atlas Packing** — MaxRects algorithm packs glyphs into a sprite sheet (up to 4096×4096)
- **Export Formats** — PNG (bitmap), SVG (MSDF), WebP atlas, BMFont `.fnt` spec
- **Rendering Modes** — Bitmap, SDF, MSDF (multi-channel signed distance field)
- **Kerning** — Auto-calculates kerning pairs between character pairs
- **Preview** — Real-time atlas preview + per-character usage canvas

---

## Architecture

```
manifest.json    Plugin metadata and entry points
code.js          Figma backend — API calls, node manipulation, message passing
ui.html          Frontend UI — controls, canvas preview, atlas generation, export
```

**Communication:** UI ↔ backend via `parent.postMessage()` / `figma.ui.onmessage`.
Glyph image data flows from the Figma backend to the UI for processing.

---

## Core Algorithm — MaxRects Bin Packing

Located in `ui.html` ~line 380–487.

1. Start with a 128×128 canvas
2. Attempt to pack all glyphs using **best short side fit** heuristic
3. On failure, double one dimension (alternating width → height)
4. Repeat until all glyphs fit or the 4096×4096 limit is reached

---

## Main Data Structures

**Glyph**
```js
{ char, width, height, baseline, image: Uint8Array }
```

**Atlas Char**
```js
{ id, x, y, width, height, xoffset, yoffset, xadvance }
```

**Kerning Entry**
```js
{ first, second, amount }
```

---

## Export Format — BMFont `.fnt`

```
info face="fontname" size=60 bold=0 italic=0 ...
common lineHeight=66 base=60 scaleW=256 scaleH=256 pages=1 ...
page id=0 file="atlas.webp"
chars count=52
char id=65 x=0 y=0 width=40 height=50 xoffset=0 yoffset=0 xadvance=42 page=0 chnl=15
kernings count=5
kerning first=65 second=66 amount=-2
```

---

## UI Controls

| Control | Purpose |
|---|---|
| Font Mode | `bitmap` or `msdf` |
| Font Name | Output filename base |
| Scale | Global glyph scale factor |
| Distance Field Type | `none` / `sdf` / `msdf` |
| Distance Range | Field strength (min 4 for msdf, 8 for sdf) |
| Padding | Space around each glyph (auto-clamped to `distanceRange + 2`) |
| WebP Quality | 0.1–1.0 |
| Font Size | Metadata value in `.fnt` |
| Use Absolute Bounds | Export using absolute Figma coordinates |

---

## Notable Details

- Minimum padding enforced as `distanceRange + 2` to prevent rendering artifacts
- Unicode-safe character splitting (handles emojis via spread operator)
- Characters laid out in a 5-column grid when auto-generated
- Async image loading with Promises for non-blocking preview rendering
- Base64 encoding used for in-memory image handling before download

---

## File Sizes

| File | Lines |
|---|---|
| `code.js` | ~122 |
| `ui.html` | ~965 |

---

## Recent Changes (Git)

- Added absolute bounds export option
- Added "Split Selected Text" for auto character frame generation
- Added resize-to-grid in frame
- Font size metadata setting
- MSDF enabled by default
