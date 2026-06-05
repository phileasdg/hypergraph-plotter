import { BipartiteForceLayout } from '../layout.js';

class NoHubsOverlapLayout extends BipartiteForceLayout {
  constructor(options = {}) {
    super(options);
    this.kComponentOverlap = options.kComponentOverlap !== undefined ? options.kComponentOverlap : 0.25;
  }

  tick() {
    const n = this.nodes.length;
    if (n === 0) return;

    const fx = new Array(n).fill(0);
    const fy = new Array(n).fill(0);

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < n; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < n; j++) {
        const n2 = this.nodes[j];
        
        let dx = n1.x - n2.x;
        let dy = n1.y - n2.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        
        if (d < 0.1) {
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
          d = Math.sqrt(dx * dx + dy * dy);
        }

        let force = 0;
        if (n1.componentId === n2.componentId) {
          force = this.kRepel / (d * d);
        } else {
          // Inter-component repulsion: Skip hubs!
          if (n1.isHub || n2.isHub) continue;

          const goal = this.componentSpacing;
          if (goal <= 0) continue;
          if (d < goal) {
            force = this.kComponentOverlap * (goal - d);
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
      const force = this.kAttract * (d - this.restLength);
      const fX = (dx / d) * force;
      const fY = (dy / d) * force;
      fx[idxV] -= fX;
      fy[idxV] -= fY;
      fx[idxH] += fX;
      fy[idxH] += fY;
    });

    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      fx[i] += dx * this.kCenter;
      fy[i] += dy * this.kCenter;
    }

    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      if (node.id === this.draggedNodeId || (this.fixedNodeIds && this.fixedNodeIds.has(node.id))) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx += fx[i];
      node.vy += fy[i];
      node.vx *= this.damping;
      node.vy *= this.damping;
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > this.maxSpeed) {
        node.vx = (node.vx / speed) * this.maxSpeed;
        node.vy = (node.vy / speed) * this.maxSpeed;
      }
      node.x += node.vx;
      node.y += node.vy;
    }
  }
}

const defaultGraph = {
  vertices: [
    { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' },
    { id: '4', label: '4' }, { id: '5', label: '5' }, { id: '6', label: '6' },
    { id: '7', label: '7' }, { id: '8', label: '8' }, { id: '9', label: '9' },
    { id: '10', label: '10' }, { id: '11', label: '11' }, { id: '12', label: '12' },
    { id: '13', label: '13' }, { id: '14', label: '14' }, { id: '15', label: '15' },
    { id: '16', label: '16' }, { id: '17', label: '17' }, { id: '18', label: '18' },
    { id: '19', label: '19' }, { id: '21', label: '21' }, { id: '22', label: '22' },
    { id: '23', label: '23' }, { id: '24', label: '24' }, { id: '25', label: '25' },
    { id: '26', label: '26' }, { id: '27', label: '27' }, { id: '28', label: '28' },
    { id: '29', label: '29' }, { id: '30', label: '30' }, { id: '31', label: '31' },
    { id: '32', label: '32' }, { id: '33', label: '33' }, { id: '34', label: '34' },
    { id: '35', label: '35' }, { id: '36', label: '36' }, { id: '37', label: '37' },
    { id: '38', label: '38' }, { id: '39', label: '39' }, { id: '40', label: '40' },
    { id: '41', label: '41' }
  ],
  hyperedges: [
    { id: 1, vertices: ['9', '10', '1'] },
    { id: 2, vertices: ['1', '2', '3'] },
    { id: 3, vertices: ['3', '4', '5'] },
    { id: 4, vertices: ['5', '6', '7'] },
    { id: 5, vertices: ['7', '8', '9'] },
    { id: 6, vertices: ['11', '12', '13'] },
    { id: 7, vertices: ['14', '15', '16'] },
    { id: 8, vertices: ['17', '18', '19'] },
    { id: 9, vertices: ['13', '14'] },
    { id: 10, vertices: ['16', '17'] },
    { id: 11, vertices: ['19', '11'] },
    { id: 12, vertices: ['21'] },
    { id: 13, vertices: ['22', '23'] },
    { id: 14, vertices: ['24', '25', '26'] },
    { id: 15, vertices: ['27', '28', '29', '30'] },
    { id: 16, vertices: ['31', '32', '33', '34', '35'] },
    { id: 17, vertices: ['36', '37', '38', '39', '40', '41'] }
  ]
};

function runTest(coeff) {
  const layout = new NoHubsOverlapLayout({
    width: 800,
    height: 600,
    kAttract: 0.07,
    kRepel: 2400,
    kCenter: 0.004,
    restLength: 35,
    componentSpacing: 180,
    damping: 0.88,
    maxSpeed: 10,
    kComponentOverlap: coeff
  });

  layout.setGraph(defaultGraph.vertices, defaultGraph.hyperedges);

  console.log(`\nTesting Linear No-Hubs Model Convergence (Coeff: ${coeff}):`);
  for (let tick = 1; tick <= 500; tick++) {
    layout.tick();
    if (tick === 100 || tick === 200 || tick === 300 || tick === 400 || tick === 500) {
      let totalSpeed = 0;
      layout.nodes.forEach(n => {
        totalSpeed += Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      });
      const avgSpeed = totalSpeed / layout.nodes.length;
      console.log(`Tick ${tick.toString().padStart(3)} | Avg Node Speed: ${avgSpeed.toFixed(6)} px/frame`);
    }
  }

  // Calculate final min inter-component distance
  const compNodes = {};
  layout.nodes.filter(n => !n.isHub).forEach(node => {
    if (!compNodes[node.componentId]) compNodes[node.componentId] = [];
    compNodes[node.componentId].push(node);
  });
  const compIds = Object.keys(compNodes);

  let minInterDist = Infinity;
  for (let i = 0; i < compIds.length; i++) {
    for (let j = i + 1; j < compIds.length; j++) {
      const c1 = compNodes[compIds[i]];
      const c2 = compNodes[compIds[j]];
      for (const n1 of c1) {
        for (const n2 of c2) {
          const dist = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
          minInterDist = Math.min(minInterDist, dist);
        }
      }
    }
  }
  console.log(`Min Inter-Component Distance: ${Math.round(minInterDist)}px`);
}

runTest(0.8);
runTest(0.25);
runTest(0.15);
runTest(0.08);
