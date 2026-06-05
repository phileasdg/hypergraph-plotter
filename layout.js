import { Vec } from './geom.js';

/**
 * Manages the force-directed simulation for a bipartite representation of the hypergraph.
 * Bipartite graph: Original Vertices <-> Hyperedge Hubs
 */
export class BipartiteForceLayout {
  constructor(options = {}) {
    this.width = options.width || 800;
    this.height = options.height || 600;
    
    // Hypergraph physics coefficients
    this.kAttract = options.kAttract !== undefined ? options.kAttract : 0.2;
    this.kRepel = options.kRepel !== undefined ? options.kRepel : 10000;
    this.kHyperedgeRepel = options.kHyperedgeRepel !== undefined ? options.kHyperedgeRepel : 10000;
    this.kCenter = options.kCenter !== undefined ? options.kCenter : 0.004;
    this.restLength = options.restLength !== undefined ? options.restLength : 0;
    this.componentSpacing = options.componentSpacing !== undefined ? options.componentSpacing : 90;
    this.damping = options.damping !== undefined ? options.damping : 0.88;
    this.maxSpeed = options.maxSpeed !== undefined ? options.maxSpeed : 10;

    this.nodes = []; // All nodes (vertices + hubs)
    this.nodeMap = new Map(); // id -> node reference
    this.links = []; // bipartite links: { vertexId, hubId }
    this.draggedNodeId = null;
    this.fixedNodeIds = new Set();
  }

  /**
   * Initializes or updates the simulation nodes and links.
   * If nodes already exist, we preserve their positions for a smooth transition.
   * @param {Array} vertices - List of vertex objects: { id, label }
   * @param {Array} hyperedges - List of hyperedges: { id, vertices: [vId1, vId2, ...] }
   */
  setGraph(vertices, hyperedges) {
    const oldNodeMap = new Map(this.nodes.map(n => [n.id, n]));
    this.nodes = [];
    this.nodeMap.clear();
    this.links = [];

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Detect Connected Components of the hypergraph (bipartite BFS)
    const components = [];
    const visitedVertices = new Set();
    const vertexMap = new Map(vertices.map(v => [v.id, v]));

    // Build vertex-to-hyperedge adjacency list
    const adj = new Map();
    vertices.forEach(v => adj.set(v.id, new Set()));
    hyperedges.forEach(e => {
      e.vertices.forEach(vId => {
        if (adj.has(vId)) {
          adj.get(vId).add(e.id);
        }
      });
    });

    vertices.forEach(v => {
      if (visitedVertices.has(v.id)) return;

      const compVertices = [];
      const compEdges = new Set();
      const queue = [v.id];
      visitedVertices.add(v.id);

      while (queue.length > 0) {
        const currV = queue.shift();
        compVertices.push(currV);

        const edgeIds = adj.get(currV) || [];
        edgeIds.forEach(eId => {
          compEdges.add(eId);
          const edge = hyperedges.find(e => e.id === eId);
          if (edge) {
            edge.vertices.forEach(nextV => {
              if (vertexMap.has(nextV) && !visitedVertices.has(nextV)) {
                visitedVertices.add(nextV);
                queue.push(nextV);
              }
            });
          }
        });
      }

      components.push({
        vertices: compVertices,
        edges: Array.from(compEdges)
      });
    });

    // Sort components by size (vertices count) descending
    components.sort((a, b) => b.vertices.length - a.vertices.length);

    // Map each node ID to its initial spawn coordinate and component ID
    const nodeTargetCenters = new Map();
    const numComponents = components.length;

    // Use a pre-separation radius for components when spawning
    // Use componentSpacing if it's > 0, otherwise default to a reasonable value (e.g. 150)
    const R = this.componentSpacing > 0 ? this.componentSpacing : 150;

    components.forEach((comp, idx) => {
      // Angle on spawning circle
      const angle = numComponents <= 1 ? 0 : (idx / numComponents) * 2 * Math.PI;
      const spawnX = numComponents <= 1 ? centerX : centerX + R * Math.cos(angle);
      const spawnY = numComponents <= 1 ? centerY : centerY + R * Math.sin(angle);

      // Target centers for simulation is always the global center (centerX, centerY)
      comp.vertices.forEach(vId => nodeTargetCenters.set(vId, {
        spawnX,
        spawnY,
        targetX: centerX,
        targetY: centerY,
        componentId: idx
      }));
      comp.edges.forEach(eId => nodeTargetCenters.set(`_hub_${eId}`, {
        spawnX,
        spawnY,
        targetX: centerX,
        targetY: centerY,
        componentId: idx
      }));
    });

    // 1. Add Vertices
    vertices.forEach(v => {
      const oldNode = oldNodeMap.get(v.id);
      const target = nodeTargetCenters.get(v.id) || { spawnX: centerX, spawnY: centerY, targetX: centerX, targetY: centerY, componentId: 0 };

      // Spawn vertices in a ring around their COMPONENT spawn center instead of the global center
      // to start them pre-separated and prevent overlapping components on load.
      const angle = Math.random() * 2 * Math.PI;
      const radius = numComponents <= 1 ? (130 + Math.random() * 40) : (30 + Math.random() * 20);

      const node = {
        id: v.id,
        isHub: false,
        label: v.label || String(v.id),
        targetX: target.targetX,
        targetY: target.targetY,
        componentId: target.componentId !== undefined ? target.componentId : 0,
        x: oldNode ? oldNode.x : target.spawnX + Math.cos(angle) * radius,
        y: oldNode ? oldNode.y : target.spawnY + Math.sin(angle) * radius,
        vx: oldNode ? oldNode.vx : 0,
        vy: oldNode ? oldNode.vy : 0
      };
      this.nodes.push(node);
      this.nodeMap.set(v.id, node);
    });

    // 2. Add Hyperedge Hubs (Only for hyperedges containing more than one vertex)
    hyperedges.forEach(e => {
      if (e.vertices.length <= 1) return;
      const hubId = `_hub_${e.id}`;
      const oldNode = oldNodeMap.get(hubId);
      const target = nodeTargetCenters.get(hubId) || { x: centerX, y: centerY };

      // Initial position of hub is center of gravity of its vertices
      let initX = 0;
      let initY = 0;
      let count = 0;
      e.vertices.forEach(vId => {
        const vNode = this.nodeMap.get(vId);
        if (vNode) {
          initX += vNode.x;
          initY += vNode.y;
          count++;
        }
      });
      if (count > 0) {
        initX /= count;
        initY /= count;
      } else {
        initX = target.x;
        initY = target.y;
      }

      const node = {
        id: hubId,
        edgeId: e.id,
        isHub: true,
        label: '',
        targetX: target.targetX,
        targetY: target.targetY,
        componentId: target.componentId !== undefined ? target.componentId : 0,
        x: oldNode ? oldNode.x : initX,
        y: oldNode ? oldNode.y : initY,
        vx: oldNode ? oldNode.vx : 0,
        vy: oldNode ? oldNode.vy : 0
      };
      this.nodes.push(node);
      this.nodeMap.set(hubId, node);

      // Create links between each vertex and the hub
      e.vertices.forEach(vId => {
        if (this.nodeMap.has(vId)) {
          this.links.push({
            vertexId: vId,
            hubId: hubId
          });
        }
      });
    });
  }

  /**
   * Runs a single step of the force-directed layout.
   */
  tick() {
    const n = this.nodes.length;
    if (n === 0) return;

    // Reset forces (using vx, vy temporarily to accumulate forces, then apply them)
    const fx = new Array(n).fill(0);
    const fy = new Array(n).fill(0);

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // 1. Repulsion between all node pairs
    for (let i = 0; i < n; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < n; j++) {
        const n2 = this.nodes[j];
        
        let dx = n1.x - n2.x;
        let dy = n1.y - n2.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        
        if (d < 0.1) {
          // Break tie
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
          d = Math.sqrt(dx * dx + dy * dy);
        }

        let force = 0;
        let repelCoeff = this.kRepel;
        if (n1.isHub && n2.isHub) {
          repelCoeff = this.kHyperedgeRepel;
        } else if (n1.isHub || n2.isHub) {
          repelCoeff = (this.kRepel + this.kHyperedgeRepel) / 2;
        }

        if (n1.componentId === n2.componentId) {
          // Standard repulsion within the same component
          force = repelCoeff / (d * d);
        } else {
          const goal = this.componentSpacing;
          if (goal <= 0) {
            // No repulsion at all if componentSpacing is 0
            continue;
          }
          if (d < goal) {
            // Separation force pushes nodes from different components apart if closer than the goal
            let factor = 1.0;
            if (this.kRepel > 0) {
              factor = repelCoeff / this.kRepel;
            }
            force = 0.25 * factor * (goal - d);
          }
        }

        if (force > 0) {
          const fX = (dx / d) * force;
          const fY = (dy / d) * force;

          fx[i] += fX;
          fy[i] += fY;
          fx[j] -= fX;
          fy[j] -= fY;
        }
      }
    }

    // 2. Attraction along links (springs between Vertices <-> Hubs)
    this.links.forEach(link => {
      const vNode = this.nodeMap.get(link.vertexId);
      const hNode = this.nodeMap.get(link.hubId);
      if (!vNode || !hNode) return;

      const idxV = this.nodes.indexOf(vNode);
      const idxH = this.nodes.indexOf(hNode);

      const dx = vNode.x - hNode.x;
      const dy = vNode.y - hNode.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.1) return;

      // Spring force: F = kAttract * (d - restLength)
      const force = this.kAttract * (d - this.restLength);
      const fX = (dx / d) * force;
      const fY = (dy / d) * force;

      fx[idxV] -= fX;
      fy[idxV] -= fY;
      fx[idxH] += fX;
      fy[idxH] += fY;
    });

    // 3. Gravity / Centering force (attraction to component center target)
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const targetX = node.targetX !== undefined ? node.targetX : centerX;
      const targetY = node.targetY !== undefined ? node.targetY : centerY;
      const dx = targetX - node.x;
      const dy = targetY - node.y;
      
      fx[i] += dx * this.kCenter;
      fy[i] += dy * this.kCenter;
    }

    // 4. Update velocities and positions
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      if (node.id === this.draggedNodeId || (this.fixedNodeIds && this.fixedNodeIds.has(node.id))) {
        // Dragged or fixed node doesn't move due to forces
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      // Add forces to velocity
      node.vx += fx[i];
      node.vy += fy[i];

      // Damping
      node.vx *= this.damping;
      node.vy *= this.damping;

      // Cap speed
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > this.maxSpeed) {
        node.vx = (node.vx / speed) * this.maxSpeed;
        node.vy = (node.vy / speed) * this.maxSpeed;
      }

      // Update position
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  /**
   * Runs the layout simulation synchronously for a number of iterations.
   * Useful for a non-animated layout computation.
   */
  runStatic(iterations = 150) {
    for (let i = 0; i < iterations; i++) {
      this.tick();
    }
  }
}

/**
 * Arranges vertices in a circle. Hubs are placed at the center of gravity of their vertices.
 */
export function circularLayout(vertices, hyperedges, width, height, radius = null) {
  const n = vertices.length;
  if (n === 0) return new Map();

  const centerX = width / 2;
  const centerY = height / 2;
  const r = radius || Math.min(width, height) * 0.35;
  const positions = new Map();

  // Position original vertices
  vertices.forEach((v, idx) => {
    const angle = (idx / n) * 2 * Math.PI;
    positions.set(v.id, {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    });
  });

  // Position hubs at the average position of their vertices
  hyperedges.forEach(e => {
    const hubId = `_hub_${e.id}`;
    let avgX = 0;
    let avgY = 0;
    let count = 0;
    
    e.vertices.forEach(vId => {
      const pos = positions.get(vId);
      if (pos) {
        avgX += pos.x;
        avgY += pos.y;
        count++;
      }
    });

    if (count > 0) {
      positions.set(hubId, { x: avgX / count, y: avgY / count });
    } else {
      positions.set(hubId, { x: centerX, y: centerY });
    }
  });

  return positions;
}

/**
 * Arranges vertices in a grid layout. Hubs are placed at the center of gravity of their vertices.
 */
export function gridLayout(vertices, hyperedges, width, height) {
  const n = vertices.length;
  if (n === 0) return new Map();

  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  
  const paddingX = width / (cols + 1);
  const paddingY = height / (rows + 1);
  const positions = new Map();

  // Position original vertices
  vertices.forEach((v, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    positions.set(v.id, {
      x: paddingX * (col + 1),
      y: paddingY * (row + 1)
    });
  });

  // Position hubs at the average position of their vertices
  hyperedges.forEach(e => {
    const hubId = `_hub_${e.id}`;
    let avgX = 0;
    let avgY = 0;
    let count = 0;
    
    e.vertices.forEach(vId => {
      const pos = positions.get(vId);
      if (pos) {
        avgX += pos.x;
        avgY += pos.y;
        count++;
      }
    });

    if (count > 0) {
      positions.set(hubId, { x: avgX / count, y: avgY / count });
    } else {
      positions.set(hubId, { x: width / 2, y: height / 2 });
    }
  });

  return positions;
}
