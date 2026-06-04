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
    this.kAttract = options.kAttract !== undefined ? options.kAttract : 0.04;
    this.kRepel = options.kRepel !== undefined ? options.kRepel : 800;
    this.kCenter = options.kCenter !== undefined ? options.kCenter : 0.01;
    this.restLength = options.restLength !== undefined ? options.restLength : 60;
    this.damping = options.damping !== undefined ? options.damping : 0.85;
    this.maxSpeed = options.maxSpeed !== undefined ? options.maxSpeed : 12;

    this.nodes = []; // All nodes (vertices + hubs)
    this.nodeMap = new Map(); // id -> node reference
    this.links = []; // bipartite links: { vertexId, hubId }
    this.draggedNodeId = null;
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

    // 1. Add Vertices
    vertices.forEach(v => {
      const oldNode = oldNodeMap.get(v.id);
      const node = {
        id: v.id,
        isHub: false,
        label: v.label || String(v.id),
        x: oldNode ? oldNode.x : centerX + (Math.random() - 0.5) * 100,
        y: oldNode ? oldNode.y : centerY + (Math.random() - 0.5) * 100,
        vx: oldNode ? oldNode.vx : 0,
        vy: oldNode ? oldNode.vy : 0
      };
      this.nodes.push(node);
      this.nodeMap.set(v.id, node);
    });

    // 2. Add Hyperedge Hubs
    hyperedges.forEach(e => {
      const hubId = `_hub_${e.id}`;
      const oldNode = oldNodeMap.get(hubId);

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
        initX = centerX;
        initY = centerY;
      }

      const node = {
        id: hubId,
        edgeId: e.id,
        isHub: true,
        label: '',
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

        // Repulsion strength: soft repel at small distances to prevent division by zero
        // F = kRepel / (d + epsilon)
        const force = this.kRepel / (d * d);
        const fX = (dx / d) * force;
        const fY = (dy / d) * force;

        fx[i] += fX;
        fy[i] += fY;
        fx[j] -= fX;
        fy[j] -= fY;
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

    // 3. Gravity / Centering force (attraction to center)
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      
      fx[i] += dx * this.kCenter;
      fy[i] += dy * this.kCenter;
    }

    // 4. Update velocities and positions
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      if (node.id === this.draggedNodeId) {
        // Dragged node doesn't move due to forces
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
