# Future Roadmap & TODOs

Here is a list of long-term goals and features planned for the Hypergraph Plotter:

## 1. Interactive embeds & iframe generator
- Enable users to generate a self-contained iframe snippet or embed code for their designed hypergraphs.
- Allow researchers to easily display interactive, pannable/zoomable hypergraph plots on their personal academic sites or blogs.
- Support reading configuration parameters from query parameters or serialized base64 string states directly in the embed URL.

## 2. Responsive vertex label handling
- Improve visual handling of vertices with long labels.
- Adapt node outline frames or boundaries to dynamically size with text length to prevent text overflow or word cutting.
- Ensure that dynamic node sizing plays nicely with layout calculations (repulsion radius, hub curves, bounding box calculations).
- Wrap long names elegantly and keep the layout neat and legible.

## 3. Advanced coordinate control (manual node positioning)
- Introduce an advanced settings panel or custom JSON schema option allowing users to specify the exact coordinates `(x, y)` of every node.
- Allow scientific researchers to lock positions to pre-computed coordinate grids or layouts generated in external environments (e.g. Mathematica, NetworkX, R).
- Provide a coordinate text table editor in the UI to inspect, copy, and edit exact position values programmatically.

## 4. Mobile optimization
- Adapt the web app to work well on mobile.

## 5. Multilayer visualization
- Add an option to visualize a hypergraph as a multilayer, where each layer contains hyperedges of a given order.

## 6. Hyperedge labeling
- Add the option to name hyperedges, and show hyperedge labels.

## 7. Outline highlight on hover
- Add an outline highlight on hover over interactive parts of the hypergraph.

## 8. Hyperedge default names and toggling
- Mechanism to label hyperedges (with a default name for each hyperedge), which should be toggled off display-wise by default.

## 9. Selectable and modifiable hyperedges
- Make the hyperedges selectable by clicking hyperedge blobs. Selected blobs should be modifiable (allowing users to change the name/label and color of the blob).