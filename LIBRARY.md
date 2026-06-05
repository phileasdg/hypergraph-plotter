# Hypergraph Plotter JavaScript Library Documentation

`HypergraphPlotter` is a standalone, client-side JavaScript library that computes force-directed spring layouts and renders mathematical hypergraphs as modular SVG layers. 

It is designed to be highly configurable, zero-dependency, and lightweight, making it easy to embed custom interactive hypergraphs on academic blogs, portfolio sites, and web applications.

---

## 1. Quickstart

To use the library on your website, import `HypergraphPlotter` as an ES Module:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Embed Hypergraph</title>
  <style>
    #canvas-container {
      width: 600px;
      height: 400px;
      border: 1px solid #e9ecef;
      background: #ffffff;
    }
  </style>
</head>
<body>

  <!-- Element container to mount the plotter -->
  <div id="canvas-container"></div>

  <script type="module">
    import { HypergraphPlotter } from './hypergraph-plotter.js';

    // 1. Instantiate the plotter on a container
    const plotter = new HypergraphPlotter('#canvas-container', {
      layoutType: 'spring-embedding',
      plotTheme: 'name-labeled',
      edgePalette: 'warm-sunset',
      showGrid: true
    });

    // 2. Load graph data (vertices & hyperedges)
    plotter.setData({
      vertices: [
        { id: 'A', label: 'Vertex A' },
        { id: 'B', label: 'Vertex B' },
        { id: 'C', label: 'Vertex C' },
        { id: 'D', label: 'Vertex D' }
      ],
      hyperedges: [
        { id: 1, vertices: ['A', 'B', 'C'] },
        { id: 2, vertices: ['C', 'D'] }
      ]
    });
  </script>
</body>
</html>
```

---

## 2. API Reference

### `new HypergraphPlotter(container, options)`
Constructor. Creates and mounts the SVG canvas.
- **`container`**: A query selector string (e.g., `'#canvas-container'`) or a DOM Element (typically a `<div>` or `<svg>`).
- **`options`**: An optional configuration object (see [Configurations](#3-configurations)).

---

### Public Methods

#### `setData(data)`
Loads vertices and hyperedges into the plotter and triggers layout recalculation.
- **`data`**: An object structure:
  ```json
  {
    "vertices": [
      { "id": "v1", "label": "Label 1" }
    ],
    "hyperedges": [
      { "id": 1, "vertices": ["v1", "v2"], "color": "#ff0000" }
    ]
  }
  ```
  *(Note: An optional per-edge `"color"` property overrides the palette color).*

#### `setOptions(options)`
Dynamically updates options parameters and redraws the canvas.
- **`options`**: Custom configurations object.

#### `startSimulation()`
Starts the force-directed layout simulation animation loop. (Automatically called upon instantiation).

#### `stopSimulation()`
Cancels the force animation frame loop.

#### `recenter()`
Translates the viewport to center the graph without altering the current zoom level.

#### `zoomToFit(padding = null)`
Rescales the viewport zoom level and centers the view bounding box to fit all active nodes.
- **`padding`**: Optional number override for boundary margins around the graph. If not provided, it defaults to a responsive padding equal to `Math.min(width * 0.33, height * 0.33)` (with a minimum limit of 40px) to keep the graph size comfortable inside the viewport.

#### `getSVGString()`
Returns a standalone, self-contained SVG string representing the current graph state. Visual styling is inlined as presentation attributes (making it perfect for direct file downloads or vector editing tools like Illustrator or Inkscape).

#### `destroy()`
Cancels the simulation loops and removes the SVG canvas from the DOM container.

---

### Callback Hooks

Attach callbacks directly to the instance properties:

* **`plotter.onSelectionChanged = (selectedIds) => { ... }`**
  Triggered when a vertex or node is clicked and selection changes.
* **`plotter.onNodeDragged = (nodeId, stage, coords) => { ... }`**
  Fires during node interaction. `stage` will be `'start'`, `'drag'`, or `'end'`.
* **`plotter.onDataChanged = () => { ... }`**
  Fires when the dataset is loaded or modified.

---

## 3. Configurations

Configure layouts and styles by passing these keys in the options object or using `setOptions(opts)`:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`width`** | *Number* | `800` | Fallback width of simulation space if container is not measured. |
| **`height`** | *Number* | `600` | Fallback height of simulation space if container is not measured. |
| **`layoutType`** | *String* | `'spring-embedding'` | Layout algorithm: `'spring-embedding'`, `'radial-embedding'`, or `'grid-layout'`. |
| **`plotTheme`** | *String* | `'name-labeled'` | Visual theme: `'name-labeled'` (default with text labels), `'detailed'` (text labels outside nodes), or `'clean'` (no text labels). |
| **`canvasBg`** | *String* | `'transparent'` | Canvas background color: `'transparent'`, `'white'`, `'light-grey'`, `'dark-slate'`, or `'custom'`. |
| **`canvasBgCustom`** | *String* | `'#ffffff'` | Hex color used when `canvasBg` is set to `'custom'`. |
| **`vertexSize`** | *Number* | `0.15` | Sizing scale for node circles. |
| **`vertexOutlineWidth`**| *Number* | `1.5` | Outline border thickness of vertices (px). |
| **`nodeFillType`** | *String* | `'automatic'` | Node circle fill: `'automatic'` (contrasted to background) or `'custom'`. |
| **`nodeFillCustom`** | *String* | `'#ffffff'` | Hex color used when `nodeFillType` is set to `'custom'`. |
| **`labelFontFamily`** | *String* | `'sans-serif'` | Label typography: `'sans-serif'`, `'serif'`, or `'monospace'`. |
| **`labelFontSize`** | *Number* | `12` | Label font size (px). |
| **`showSubsetBoundary`**| *Boolean*| `true` | If true, draws rounded enclosing hulls (blobs) around hyperedge nodes. |
| **`boundaryScale`** | *Number* | `2.0` | Outer padding scale of hyperedge boundary blobs. |
| **`blobOpacity`** | *Number* | `0.18` | Transparency value for hyperedge blobs (0.0 to 1.0). |
| **`blobOutlineWidth`** | *Number* | `1.5` | Outline border thickness of blobs. |
| **`showSubsetEdge`** | *Boolean*| `true` | If true, renders Bezier curves linking vertices to their hyperedge hub centers. |
| **`edgeWidth`** | *Number* | `2.0` | Bezier curve edge line thickness (px). |
| **`edgePalette`** | *String* | `'rainbow'` | Edge color maps: `'rainbow'`, `'grayscale'`, `'pastel'`, `'cool-ice'`, `'warm-sunset'`, `'ocean-breeze'`, `'forest-earth'`, `'neon-glow'`, `'viridis'`, `'plasma'`, `'cividis'`, `'magma'`, `'inferno'`, `'cyberpunk'`, `'aurora'`, `'desert-sand'`, `'botanical'`, `'berry-wine'`, `'academic-bold'`, `'academic-set1'`, `'academic-set2'`, `'academic-dark'`, `'academic-paired'`, or `'custom-solid'`. |
| **`edgeColorCustom`** | *String* | `'#3b82f6'` | Hex color globally applied to all edges when `edgePalette` is set to `'custom-solid'`. |
| **`showHubs`** | *Boolean*| `false` | Displays the virtual force centers (hubs) as interactive handles. |
| **`showGrid`** | *Boolean*| `false` | Renders a background coordinate alignment grid. |
| **`gridColor`** | *String* | `'#000000'` | Hex color of the grid overlay. |
| **`gridOpacity`** | *Number* | `0.04` | Opacity value of grid lines (0.0 to 0.5). |
| **`physicsPlaying`** | *Boolean*| `true` | Toggles whether force calculations are running. |
| **`pinOnDrag`** | *Boolean*| `true` | Automatically sets dragged nodes to fixed coordinates (pinned state). |

### Layout Physics Options

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`kAttract`** | *Number* | `0.07` | Link attraction coefficient (spring stiffness). |
| **`kRepel`** | *Number* | `2400` | Inter-node repulsion coefficient. |
| **`kCenter`** | *Number* | `0.004` | Center-of-gravity attraction coefficient. |
| **`restLength`** | *Number* | `35` | Equilibrium rest length of spring link lines. |
| **`componentSpacing`** | *Number* | `180` | Distance radius separating targets of disconnected connected components. |
| **`damping`** | *Number* | `0.88` | Damping coefficient (velocity decay rate). |
| **`maxSpeed`** | *Number* | `10` | Maximum speed limit of vertices per layout tick step. |
