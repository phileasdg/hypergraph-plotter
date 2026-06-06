# Mathematical Formulation of Hypergraph Plotter

This document summarizes the mathematical models and geometric algorithms utilized in the Hypergraph Plotter for layout simulation and visualization.

---

## 1. Hypergraphs & Bipartite Graph Conversion

A mathematical **hypergraph** $H$ is defined as a pair:
$$H = (V, E)$$
where:
* $V = \{v_1, v_2, \dots, v_n\}$ is a set of elements called **vertices**.
* $E = \{e_1, e_2, \dots, e_m\}$ is a set of non-empty subsets of $V$, called **hyperedges** ($e_i \subseteq V$). Unlike standard graphs, a hyperedge can contain any number of vertices.

To compute force-directed layouts, the visualizer maps the hypergraph to an equivalent **Bipartite Graph** $B$:
$$B = (V_B, E_B)$$
where:
1. $V_B = V \cup E_H$, where $E_H$ represents virtual **hub nodes** (one hub $h_e$ is instantiated for each hyperedge $e \in E$ containing $\ge 2$ vertices).
2. $E_B = \{(v, h_e) \mid v \in V, \, e \in E, \, v \in e\}$ consists of links connecting vertices to the hub of the hyperedges they participate in.

This bipartite representation simplifies the hypergraph force-directed layout computation to standard node-to-node forces.

---

## 2. Force-Directed Layout Physics Engine

The layout engine executes a discrete numerical physics simulation over coordinate space $\mathbb{R}^2$ using the following forces:

### A. Link Attraction (Spring Force)
For every bipartite link $(v, h_e) \in E_B$ (connecting a vertex to a hyperedge hub), a spring-like attractive force acts on both nodes along their line of sight:
$$\vec{F}_{\text{attract}}(n_1, n_2) = k_{\text{attract}} \cdot (d - L_{\text{rest}}) \cdot \vec{u}$$
where:
* $d = \|\vec{x}_1 - \vec{x}_2\|$ is the Euclidean distance between the nodes.
* $L_{\text{rest}}$ is the spring equilibrium **rest length** (user-configurable).
* $k_{\text{attract}}$ is the spring stiffness coefficient.
* $\vec{u} = \frac{\vec{x}_2 - \vec{x}_1}{d}$ is the unit direction vector.

### B. Node Repulsion (Coulomb-like Force)
All nodes within the same connected component repel one another. The repulsive force is inversely proportional to the square of their distance:
$$\vec{F}_{\text{repel}}(n_1, n_2) = \frac{k_{\text{repel-eff}}}{d^2} \cdot \vec{u}$$
where $k_{\text{repel-eff}}$ is the effective repulsion coefficient determined by the node types:
* **Vertex-Vertex**: $k_{\text{repel-eff}} = k_{\text{repel}}$
* **Hub-Hub**: $k_{\text{repel-eff}} = k_{\text{hyperedge-repel}}$
* **Vertex-Hub**: $k_{\text{repel-eff}} = \frac{k_{\text{repel}} + k_{\text{hyperedge-repel}}}{2}$

### C. Centering Gravity Force
To prevent nodes from drifting infinitely and keep components organized near the center, a weak gravitational force pulls every node toward the global canvas center or a pre-spaced component target $\vec{x}_{\text{target}}$:
$$\vec{F}_{\text{center}}(n) = k_{\text{center}} \cdot (\vec{x}_{\text{target}} - \vec{x}_n)$$

### D. Inter-Component Separation
Connected components are identified using a Breadth-First Search (BFS) on the bipartite representation. To keep disjoint components from overlapping, they are initially spawned in a circle of radius $R = \text{componentSpacing}$ around the canvas center.

During simulation, if nodes $n_1$ and $n_2$ belong to **different** connected components and their distance $d < R$, they experience a linear separation barrier force pushing them apart:
$$\vec{F}_{\text{sep}}(n_1, n_2) = 0.25 \cdot \left(\frac{k_{\text{repel-eff}}}{k_{\text{repel}}}\right) \cdot (R - d) \cdot \vec{u}$$

### E. Numerical Integration
In each simulation step (tick), forces are integrated into velocities and positions using Euler-Verlet integration with a damping decay factor $\gamma \in [0, 1]$ and speed limit $v_{\text{max}}$:
$$\vec{v}_n^{(t+1)} = \text{limit}\left( (\vec{v}_n^{(t)} + \sum \vec{F}_n) \cdot \gamma, \, v_{\text{max}} \right)$$
$$\vec{x}_n^{(t+1)} = \vec{x}_n^{(t)} + \vec{v}_n^{(t+1)}$$

---

## 3. Boundary & Geometry Generation

Once the node coordinates settle, the engine renders hyperedges visually using the following geometric constructs:

### A. Quadratic Bezier Edges
If subset edges are enabled, curves linking the vertices in a hyperedge are drawn as quadratic Bezier curves. For a hyperedge with vertices $v_1, v_2, \dots, v_k$ and virtual hub $h$, a curve is drawn from $v_1$ to $v_i$ (for $i \in \{2, \dots, k\}$) using $h$ as the control point:
$$\vec{B}(t) = (1-t)^2 \vec{x}_{v_1} + 2(1-t)t \vec{x}_h + t^2 \vec{x}_{v_i}, \quad t \in [0, 1]$$
This forces the individual lines to bend and "bundle" through the hub center, visually unifying the hyperedge.

### B. Convex Hull
To enclose the vertices of a hyperedge with a boundary blob, the engine first computes the **Convex Hull** of the vertex points. It uses the **Monotone Chain (Andrew's) algorithm** (sorting coordinates and checking orientation via the 2D cross product sign):
$$\text{Cross}(\vec{o}, \vec{a}, \vec{b}) = (x_a - x_o)(y_b - y_o) - (y_a - y_o)(x_b - x_o)$$
* If $\text{Cross} > 0$, the turn $\vec{o} \to \vec{a} \to \vec{b}$ is counter-clockwise.
* If $\text{Cross} \le 0$, the point is discarded from the active hull boundary.

### C. Minkowski Sum (Rounded Hulls/Blobs)
To create smooth, rounded boundaries enclosing the vertices instead of sharp polygons, the engine computes the boundary of the **Minkowski Sum** of the convex hull polygon $P$ and a disk $D_R$ of radius $R = \text{vertexRadius} \times \text{boundaryScale}$:
$$\text{Blob}(P) = \partial (P \oplus D_R)$$

Mathematically, this boundary consists of:
1. **Parallel Offset Lines**: For each polygon edge segment $\vec{x}_i \to \vec{x}_{i+1}$, a line segment is drawn parallel to it, offset outward along the edge normal vector $\vec{n} = (t_y, -t_x)$ by distance $R$.
2. **Circular Arcs**: At each vertex $\vec{x}_i$, a circular arc of radius $R$ is drawn to connect the adjacent parallel offset lines, sweeping through the angle representing the vertex's exterior angle.
