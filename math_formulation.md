# Mathematical Formulation of Hypergraph Plotter

This document summarizes the mathematical models, physics equations, and geometric algorithms utilized in the Hypergraph Plotter layout engine and rendering pipeline.

---

## 1. Hypergraphs & Bipartite Graph Representation

A mathematical **hypergraph** $H$ is defined as:
$$
H = (V, E)
$$
where $V = \{v_1, v_2, \dots, v_n\}$ is the set of **vertices**, and $E = \{e_1, e_2, \dots, e_m\}$ is the set of **hyperedges** (with each $e_j \subseteq V$).

To compute force-directed layouts, the visualizer maps $H$ to an equivalent **Bipartite Graph** $B = (V_B, E_B)$:
1. $V_B = V \cup E_H$, where $E_H$ represents virtual **hub nodes** (one hub $h_e$ is instantiated for each hyperedge $e \in E$ containing $\ge 2$ vertices).
2. $E_B = \{(v, h_e) \mid v \in V, \, e \in E, \, v \in e\}$ is the set of bipartite links connecting vertices to the hubs of the hyperedges in which they participate.

---

## 2. Node Geometry & Sizing (Aspect Ratio Model)

Under the `'name-labeled'` and `'detailed'` plot themes, nodes are represented as 2D shape boundaries enclosing or adjacent to their text labels. The shapes and text lines are determined dynamically to optimize the visual aspect ratio and prevent excessively large nodes:

### A. Label Truncation & Hover Tooltips
If a node's label exceeds 500 characters, it is truncated to 497 characters followed by an ellipsis (`...`) for layout, rendering, and bounding-box sizing:
$$
L_{\text{display}} = \begin{cases}
L & \text{if } |L| \le 500 \\
L[0..496] + \text{"..."} & \text{if } |L| > 500
\end{cases}
$$
The full original label $L$ is preserved inside a native SVG `<title>` element, allowing users to view the entire text as a tooltip on hover.

### B. Dynamic Character Wrap Threshold
To prevent long text labels from producing narrow, elongated columns, the wrap threshold (characters per line) $N^*$ is calculated for the display label $L_{\text{display}}$ to minimize the difference between the node's estimated width and height.

Theoretical square aspect-ratio model:
$$
N^* = \sqrt{|L_{\text{display}}| \cdot \frac{h_{\text{line}}}{w_{\text{char}}}}
$$
where:
* $|L_{\text{display}}|$ is the total character count of the display label.
* $h_{\text{line}} = 1.2 \cdot D_{\text{font}}$ is the estimated line height.
* $w_{\text{char}} = 0.55 \cdot D_{\text{font}}$ is the estimated average character width.
* $D_{\text{font}}$ is the label font size (px).

This reduces theoretically to:
$$
N^* = \sqrt{|L| \times 2.18}
$$

To favor more readable, wide-horizontal shapes, the layout engine adjusts the multiplier and clamps the result depending on the node type:

* **Vertex Nodes (name-labeled theme)**:
  $$
  N^*_{\text{vertex}} = \sqrt{|L| \times 3.5}
  $$
  $$
  \text{charsPerLine}_{\text{vertex}} = \max(8, \min(30, \lfloor N^*_{\text{vertex}} \rceil))
  $$
* **Hub Nodes (with labels shown)**:
  $$
  N^*_{\text{hub}} = \sqrt{|L| \times 4.5}
  $$
  $$
  \text{charsPerLine}_{\text{hub}} = \max(10, \min(45, \lfloor N^*_{\text{hub}} \rceil))
  $$

### C. Shape Selection and Sizing
Let $W_{\text{raw}} = \text{maxLineLength} \times (D_{\text{font}} \times 0.55)$ be the raw estimated width of the longest text line, and $W_{\text{est}} = \max(16, W_{\text{raw}})$.
1. **Circle**: If the label has a single line and fits inside the default vertex disk radius $r_v$ (with horizontal padding $p_c = 4$px):
   $$
   W_{\text{raw}} \le 2r_v - 2p_c
   $$
   The node shape is a **circle** with radius $r = \max(r_v, \frac{W_{\text{raw}}}{2} + p_c)$.
2. **Capsule (Pill)**: If the wrapped label has a single line but is too wide for a circle:
   * Width $W = W_{\text{est}} + 2p_x$
   * Height $H = D_{\text{font}} + 2p_y$
   * Shape is a **capsule** with half-width $w_h = W/2$, half-height $h_h = H/2$, and bounding-circle radius $R_{\text{bound}} = \max(w_h, h_h)$.
3. **Rounded Rectangle**: If the wrapped label spans multiple lines:
   * Width $W = W_{\text{est}} + 2p_x$
   * Height $H = (k - 1) \cdot h_{\text{line}} + D_{\text{font}} + 2p_y$, where $k$ is the line count.
   * Shape is a **rounded rectangle** with half-width $w_h = W/2$, half-height $h_h = H/2$, and bounding-circle radius $R_{\text{bound}} = \max(w_h, h_h)$.

*(Default paddings: $p_x = 10\text{px}, p_y = 6\text{px}$.)*

---

## 3. Force-Directed Physics Engine

The layout simulation integrates three primary types of forces to position nodes dynamically.

### A. Link Attraction (Spring Force)
For every bipartite link $(v, h_e) \in E_B$, a spring force acts between the vertex and the hub. To give larger nodes sufficient spatial "slack" to repel each other and prevent them from overlapping the hub center, the spring rest length incorporates the vertex node's own boundary radius:
$$
\vec{F}_{\text{attract}}(v, h_e) = k_{\text{attract}} \cdot (d - L_{\text{rest-eff}}) \cdot \vec{u}
$$
where $d = \|\vec{x}_v - \vec{x}_{h_e}\|$, $\vec{u} = \frac{\vec{x}_{h_e} - \vec{x}_v}{d}$, and the effective rest length is $L_{\text{rest-eff}} = L_{\text{rest}} + r_v$ ($r_v$ is the vertex's isotropic bounding radius).

### B. Shape-Aware Node Repulsion
All node pairs experience a repulsive force. To handle shaped nodes accurately, the repulsion is computed using the **effective separation distance** $d_{\text{eff}}$, which depends on whether the nodes are in the same or different components.

#### 1. Stable Same-Component Repulsion
To prevent persistent oscillation and jiggliness within a connected component, the physics model applies the following rules:

1. **Member Self-Repulsion Skip**: Virtual hubs do not repel their own linked member vertices, allowing vertices to naturally center around their group hub without rotational conflict:
   $$
   \vec{F}_{\text{repel}}(v, h_e) = 0 \quad \text{for } (v, h_e) \in E_B
   $$
2. **Isotropic Bounding Geometry**: Same-component repulsion for unlinked nodes utilizes direction-independent isotropic bounding circles to prevent rotation-induced force jitter:
   * $r_i = R_{\text{bound}, i}$ (the constant bounding radius) for capsule and rect nodes.
   * $r_i = r_{v, i}$ for circles and hubs.
3. **Linear Overlap Spring Force**: When boundaries overlap ($d < R_{\text{repel}}$), a linear restoring force is applied that scales directly with the absolute overlap distance in pixels. This provides a non-saturating restoring force to push large nodes apart under link attraction:
   $$
   \vec{F}_{\text{repel}}(n_1, n_2) = \begin{cases} 
   \frac{k_{\text{repel-eff}}}{d_{\text{eff}}^2} \cdot \vec{u} & \text{if } d \ge R_{\text{repel}} \\
   \left( \frac{k_{\text{repel-eff}}}{576.0} + k_{\text{overlap}} \cdot (R_{\text{repel}} - d) \right) \cdot \vec{u} & \text{if } d < R_{\text{repel}}
   \end{cases}
   $$
   where $d_{\text{eff}} = d - R_{\text{repel}} + 24.0$, $R_{\text{repel}} = r_1 + r_2$, and the overlap spring constant is $k_{\text{overlap}} = \frac{k_{\text{repel-eff}}}{500}$. This avoids $1/d^2$ asymptotes at $d=0$ (preventing high-frequency jiggling) while growing arbitrarily strong to eliminate overlaps.

   The effective coefficient $k_{\text{repel-eff}}$ is defined as:
   * **Vertex-Vertex**: $k_{\text{repel-eff}} = k_{\text{repel}}$
   * **Hub-Hub**: $k_{\text{repel-eff}} = k_{\text{hyperedge-repel}}$
   * **Vertex-Hub**: $k_{\text{repel-eff}} = \frac{k_{\text{repel}} + k_{\text{hyperedge-repel}}}{2}$

#### 2. Geometry-Preserving Cross-Component Repulsion
For nodes in different connected components, boundary overlaps must be prevented precisely. Thus, cross-component repulsion uses direction-sensitive **ray-cast radii**:
* For capsule/rect nodes, the radius in the direction of the unit vector $\vec{u} = (u_x, u_y)$ is:
  $$
  r_i(\vec{u}) = \min\left( \frac{w_{h, i}}{\max(10^{-4}, |u_x|)}, \, \frac{h_{h, i}}{\max(10^{-4}, |u_y|)} \right)
  $$
* For circles and hubs, $r_i(\vec{u}) = r_i$.

### C. Cross-Component Blob Separation
To prevent visual overlap of hyperedge boundaries (blobs) belonging to disconnected components:
1. **Blob Reach**: Each hub $h$ computes its visual blob radius $R_{\text{reach}}^{(t)}$ on each tick, representing the distance to its farthest vertex plus the visual blob margin $M_{\text{blob}}$:
   $$
   R_{\text{reach, raw}} = \max_{(v, h) \in E_B} \left( \|\vec{x}_v - \vec{x}_h\| + r_v \right) + M_{\text{blob}}
   $$
2. **EMA Smoothing**: To avoid feedback oscillation, this reach is smoothed using an Exponential Moving Average (EMA):
   $$
   R_{\text{reach}}^{(t)} = 0.95 \cdot R_{\text{reach}}^{(t-1)} + 0.05 \cdot R_{\text{reach, raw}}
   $$
3. **Separation Goal**: For two hubs $h_1, h_2$ in different components, the target separation goal is:
   $$
   \text{goal} = \max\left( \text{componentSpacing}, \, R_{\text{reach}, 1} + R_{\text{reach}, 2} + G_{\text{blob}} \right)
   $$
   where $G_{\text{blob}} = 10\text{px}$ is a clearance gap. For a hub-vertex or vertex-vertex pair, the goal is:
   $$
   \text{goal} = \max\left( \text{componentSpacing}, \, (r_1(\vec{u}) + r_2(\vec{u})) + 2 M_{\text{blob}} + G_{\text{blob}} \right)
   $$
4. **Force Application**: If $d < \text{goal}$, a linear restorative force pushes them apart:
   $$
   \vec{F}_{\text{cross}}(n_1, n_2) = 0.2 \cdot \left(\frac{k_{\text{repel-eff}}}{k_{\text{repel}}}\right) \cdot (\text{goal} - d) \cdot \vec{u}
   $$

### D. Gravity & Integration
A weak centering gravity pulls all nodes toward their target component coordinate:
$$
\vec{F}_{\text{center}}(n) = k_{\text{center}} \cdot (\vec{x}_{\text{target}} - \vec{x}_n)
$$

Forces are integrated per tick using Euler-Verlet integration with velocity damping $\gamma$ and speed cap $v_{\text{max}}$:
$$
\vec{v}_n^{(t+1)} = \text{limit}\left( (\vec{v}_n^{(t)} + \sum \vec{F}_n) \cdot \gamma, \, v_{\text{max}} \right)
$$
$$
\vec{x}_n^{(t+1)} = \vec{x}_n^{(t)} + \vec{v}_n^{(t+1)}
$$

---

## 4. Boundary & Geometry Generation

### A. Convex Hull & Minkowski Sum
Visual enclosing blobs are generated by computing:
1. The **Convex Hull** of the vertices of a hyperedge using the Monotone Chain algorithm.
2. The boundary of the **Minkowski Sum** of this polygon with a disk of radius $R_{\text{blob}} = r_v \times \text{boundaryScale}$. This generates a rounded enclosing boundary composed of parallel offset lines and circular arc joints.

### B. Bundled Edges
Edges are rendered as quadratic Bezier curves using the hyperedge's central hub as the control point, visually bundling the lines to represent group membership.
