# Future Roadmap & TODOs

Here is a list of long-term goals and features planned for the Hypergraph Plotter:

## 1. Programmable JS Library
- Package the visualizer and layout algorithms (`geom.js`, `layout.js`, rendering logic) as a standalone JavaScript/npm library.
- Allow developers to programmatically import, configure, and render hypergraph layouts onto a custom DOM element/SVG container without needing the graphical website environment.
- Expose clear API methods for loading data, running layout iterations, adjusting themes, and triggering vector exports programmatically.

## 2. Interactive Embeds & Iframe Generator
- Enable users to generate a self-contained iframe snippet or embed code for their designed hypergraphs.
- Allow researchers to easily display interactive, pannable/zoomable hypergraph plots on their personal academic sites or blogs.
- Support reading configuration parameters from query parameters or serialized base64 string states directly in the embed URL.

## 3. Responsive Vertex Label Handling
- Improve visual handling of vertices with long labels.
- Adapt node outline frames or boundaries to dynamically size with text length to prevent text overflow or word cutting.
- Ensure that dynamic node sizing plays nicely with layout calculations (repulsion radius, hub curves, bounding box calculations).
- Wrap long names elegantly and keep the layout neat and legible.

## 4. Interactive Node Pinning/Locking
- Enable pinning/locking nodes in place to control layouts manually while the physics engine is running.
- Allow users to drag a node to a custom location and lock it in place upon dropping it (e.g. locking nodes a, b, c), while other unlocked nodes continue to dynamically adjust their positions based on spring embedding forces.
- Add visual indicators for locked nodes (e.g. a small pin badge or a dashed outline style).

## 5. Advanced Coordinate Control (Manual Node Positioning)
- Introduce an advanced settings panel or custom JSON schema option allowing users to specify the exact coordinates `(x, y)` of every node.
- Allow scientific researchers to lock positions to pre-computed coordinate grids or layouts generated in external environments (e.g. Mathematica, NetworkX, R).
- Provide a coordinate text table editor in the UI to inspect, copy, and edit exact position values programmatically.
