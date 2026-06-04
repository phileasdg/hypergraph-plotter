import { Vec, getBlobPath } from './geom.js';
import { BipartiteForceLayout, circularLayout, gridLayout } from './layout.js';

// Application State
const state = {
  vertices: [],
  hyperedges: [],
  selectedVertexIds: new Set(),
  editingEdgeId: null, // Track which hyperedge is currently being edited

  // Canvas Transform
  pan: { x: 0, y: 0 },
  zoom: 1.0,

  // Dragging / Interaction State
  isPanning: false,
  panStart: { x: 0, y: 0 },
  draggedNodeId: null, // can be a vertex ID or a hub ID

  // Customization Options
  canvasBg: 'white', // white, transparent, light-grey, dark-slate
  layoutType: 'SpringEmbedding', // SpringEmbedding, RadialEmbedding, GridLayout
  vertexSize: 0.15,
  vertexOutlineWidth: 1.5,
  plotTheme: 'NameLabeled', // NameLabeled, Detailed, Clean
  labelFontFamily: 'sans-serif', // sans-serif, serif, monospace
  labelFontSize: 12,
  showSubsetBoundary: true,
  boundaryScale: 2.0,
  blobOpacity: 0.18,
  blobOutlineWidth: 1.5,
  showSubsetEdge: true,
  edgeWidth: 2.0,
  edgePalette: 'Rainbow', // Rainbow, Grayscale, Pastel, CoolIce
  showHubs: false, // Default to hidden for cleaner academic visual output
  showGrid: true, // Show grid background by default
  physicsPlaying: true
};

// Physics layout engine instance
let physicsLayout = null;
let animationFrameId = null;

// Element references
const canvas = document.getElementById('hypergraph-canvas');
const zoomLayer = document.getElementById('zoom-transform-layer');
const blobsLayer = document.getElementById('blobs-layer');
const edgesLayer = document.getElementById('edges-layer');
const hubsLayer = document.getElementById('hubs-layer');
const verticesLayer = document.getElementById('vertices-layer');
const labelsLayer = document.getElementById('labels-layer');

// UI Controls
const selectCanvasBg = document.getElementById('select-canvas-bg');
const selectLayout = document.getElementById('select-layout');
const physicsSettings = document.getElementById('physics-settings');
const sliderAttraction = document.getElementById('slider-attraction');
const valAttraction = document.getElementById('val-attraction');
const sliderRepulsion = document.getElementById('slider-repulsion');
const valRepulsion = document.getElementById('val-repulsion');
const sliderRestLength = document.getElementById('slider-rest-length');
const valRestLength = document.getElementById('val-rest-length');

const selectTheme = document.getElementById('select-theme');
const selectFontFamily = document.getElementById('select-font-family');
const sliderLabelSize = document.getElementById('slider-label-size');
const valLabelSize = document.getElementById('val-label-size');
const sliderVertexSize = document.getElementById('slider-vertex-size');
const valVertexSize = document.getElementById('val-vertex-size');
const sliderVertexOutlineWidth = document.getElementById('slider-vertex-outline-width');
const valVertexOutlineWidth = document.getElementById('val-vertex-outline-width');

const switchBoundary = document.getElementById('switch-boundary');
const boundaryControlsSubgroup = document.getElementById('boundary-controls-subgroup');
const sliderBoundaryScale = document.getElementById('slider-boundary-scale');
const valBoundaryScale = document.getElementById('val-boundary-scale');
const sliderBlobOpacity = document.getElementById('slider-blob-opacity');
const valBlobOpacity = document.getElementById('val-blob-opacity');
const sliderBlobOutlineWidth = document.getElementById('slider-blob-outline-width');
const valBlobOutlineWidth = document.getElementById('val-blob-outline-width');

const switchEdge = document.getElementById('switch-edge');
const edgeControlsSubgroup = document.getElementById('edge-controls-subgroup');
const sliderEdgeWidth = document.getElementById('slider-edge-width');
const valEdgeWidth = document.getElementById('val-edge-width');

const selectEdgeStyle = document.getElementById('select-edge-style');
const switchHubs = document.getElementById('switch-hubs');
const switchGrid = document.getElementById('switch-grid');

const btnPhysicsPlayPause = document.getElementById('btn-physics-play-pause');
const btnPhysicsStep = document.getElementById('btn-physics-step');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomFit = document.getElementById('btn-zoom-fit');
const btnRecenter = document.getElementById('btn-recenter');

const btnAddEdge = document.getElementById('btn-add-edge');
const hyperedgesListContainer = document.getElementById('hyperedges-list-container');

const btnModalImportExport = document.getElementById('btn-modal-import-export');
const btnExportSvg = document.getElementById('btn-export-svg');
const btnClearCanvas = document.getElementById('btn-clear-canvas');
const modalOverlay = document.getElementById('modal-import-export-overlay');
const btnModalClose = document.getElementById('btn-modal-close');
const modalTextarea = document.getElementById('modal-textarea');
const importErrorMsg = document.getElementById('import-error-msg');
const btnExportWolfram = document.getElementById('btn-export-wolfram');
const btnExportJSON = document.getElementById('btn-export-json');
const btnImportData = document.getElementById('btn-import-data');

// Presets removed per user request

/**
 * Color Generator based on Palette
 */
function getPaletteColor(index, total, palette) {
  if (total <= 0) return 'hsl(0, 0%, 20%)';
  const ratio = index / Math.max(1, total);

  switch (palette) {
    case 'Grayscale': {
      // Clean publication grayscale: distributes values evenly between dark gray and solid black
      const grayVal = Math.round(ratio * 55);
      return `hsl(0, 0%, ${grayVal}%)`;
    }
    case 'Pastel': {
      const hue = (index * 137.5) % 360;
      return `hsl(${hue}, 80%, 55%)`;
    }
    case 'CoolIce': {
      const hue = 180 + ratio * 90;
      return `hsl(${hue}, 85%, 50%)`;
    }
    case 'Rainbow':
    default: {
      const hue = ratio * 280;
      return `hsl(${hue}, 85%, 45%)`;
    }
  }
}

/**
 * Mathematica list parser
 */
function parseMathematicaList(str) {
  let jsonLike = str.replace(/\{/g, '[').replace(/\}/g, ']');
  const tokenRegex = /\[|\]|,|"[^"]*"|'[^']*'|[^[\],'"\s]+/g;
  const tokens = jsonLike.match(tokenRegex) || [];

  const parsedTokens = tokens.map(t => {
    if (t === '[' || t === ']' || t === ',') return t;
    if (t.startsWith('"') || t.startsWith("'")) return t;
    if (!isNaN(t)) return t;

    const escaped = t.replace(/"/g, '\\"');
    return `"${escaped}"`;
  });

  const jsonText = parsedTokens.join('');
  return JSON.parse(jsonText);
}

/**
 * Serializes current hyperedges state to Wolfram Language list format.
 */
function serializeToWolfram() {
  const edgeStrings = state.hyperedges.map(edge => {
    return '{' + edge.vertices.map(vId => {
      const vNode = state.vertices.find(v => v.id === vId);
      const label = vNode ? vNode.label : vId;
      if (/^[a-zA-Z0-9]+$/.test(label)) return label;
      return `"${label.replace(/"/g, '\\"')}"`;
    }).join(', ') + '}';
  });
  return '{' + edgeStrings.join(', ') + '}';
}

/**
 * Updates the CSS transformation matrix of the SVG zoom layer.
 */
function applyTransform() {
  zoomLayer.setAttribute('transform', `translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})`);
}

/**
 * Scales the baseline vertex size according to settings.
 */
function getVertexRadius() {
  return 12 * (state.vertexSize / 0.15);
}

/**
 * Calculates current bounding box of nodes to fit them within screen.
 */
function zoomToFit() {
  if (state.vertices.length === 0) return;

  const svgRect = canvas.getBoundingClientRect();
  const width = svgRect.width || 800;
  const height = svgRect.height || 600;

  const layoutNodes = physicsLayout.nodes;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  layoutNodes.forEach(node => {
    if (node.isHub && !state.showSubsetEdge && !state.showSubsetBoundary) return;
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  });

  const graphW = maxX - minX;
  const graphH = maxY - minY;

  if (graphW <= 0 || graphH <= 0) return;

  const padding = 80;
  const scaleX = (width - padding * 2) / graphW;
  const scaleY = (height - padding * 2) / graphH;
  const targetZoom = Math.max(0.1, Math.min(2.5, Math.min(scaleX, scaleY)));

  const graphCenterX = minX + graphW / 2;
  const graphCenterY = minY + graphH / 2;

  state.zoom = targetZoom;
  state.pan.x = width / 2 - graphCenterX * targetZoom;
  state.pan.y = height / 2 - graphCenterY * targetZoom;

  applyTransform();
}

/**
 * Pans the canvas viewport to center the layout centroid in the middle of the screen
 * without modifying the current zoom level of the viewer.
 */
function recenterGraph() {
  if (state.vertices.length === 0) return;

  const svgRect = canvas.getBoundingClientRect();
  const width = svgRect.width || 800;
  const height = svgRect.height || 600;

  // Compute graph layout bounding box coordinates
  const layoutNodes = physicsLayout.nodes;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  layoutNodes.forEach(node => {
    // Skip virtual hubs if they are not active in rendering
    if (node.isHub && !state.showSubsetEdge && !state.showSubsetBoundary) return;
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  });

  const graphW = maxX - minX;
  const graphH = maxY - minY;

  if (graphW <= 0 || graphH <= 0) return;

  // Calculate coordinates of the center point of the graph bounding box
  const graphCenterX = minX + graphW / 2;
  const graphCenterY = minY + graphH / 2;

  // Translate coordinates to center the centroid based on current zoom
  state.pan.x = width / 2 - graphCenterX * state.zoom;
  state.pan.y = height / 2 - graphCenterY * state.zoom;

  applyTransform();
  draw();
}

/**
 * Exports the current SVG canvas as a standalone, vector-graphics SVG file.
 * Inlined presentation styles guarantee render fidelity in vector editors (Illustrator, Inkscape).
 */
function exportSVG() {
  const clonedSvg = canvas.cloneNode(true);

  // 1. Remove editor helper elements
  const grid = clonedSvg.querySelector('#grid-rect');
  if (grid) grid.remove();

  const hubs = clonedSvg.querySelector('#hubs-layer');
  if (hubs) hubs.remove();

  // 2. Set dimensions and namespaces
  const rect = canvas.getBoundingClientRect();
  clonedSvg.setAttribute('width', rect.width);
  clonedSvg.setAttribute('height', rect.height);
  clonedSvg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // 3. Inject solid background rectangle if not transparent
  let bgFill = '#ffffff';
  if (state.canvasBg === 'light-grey') bgFill = '#f8f9fa';
  else if (state.canvasBg === 'dark-slate') bgFill = '#1a1e24';
  else if (state.canvasBg === 'transparent') bgFill = 'none';

  if (bgFill !== 'none') {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', bgFill);
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
  }

  // 4. Generate XML string and trigger download
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `hypergraph_${state.layoutType.toLowerCase()}_${Date.now()}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main render function representing the state on the SVG canvas.
 * Elements are styled using presentation attributes for clean export.
 */
function draw() {
  // Clear layers
  blobsLayer.innerHTML = '';
  edgesLayer.innerHTML = '';
  hubsLayer.innerHTML = '';
  verticesLayer.innerHTML = '';
  labelsLayer.innerHTML = '';

  const vertexRadius = getVertexRadius();
  const palette = state.edgePalette;
  const theme = state.plotTheme;

  // Resolve theme-specific background contrasts
  const isDarkCanvas = state.canvasBg === 'dark-slate';
  const labelColor = isDarkCanvas ? '#f8f9fa' : '#212529';
  const nodeStrokeColor = isDarkCanvas ? '#e9ecef' : '#212529';
  const nodeFillColor = isDarkCanvas ? '#2c3036' : '#ffffff';

  // Font mapping
  let fontFamilyStr = '"Outfit", sans-serif';
  if (state.labelFontFamily === 'serif') {
    fontFamilyStr = '"Times New Roman", Times, "Century Schoolbook", serif';
  } else if (state.labelFontFamily === 'monospace') {
    fontFamilyStr = '"JetBrains Mono", Consolas, Monaco, monospace';
  }

  // 1. Draw Subset Boundaries (Blobs)
  if (state.showSubsetBoundary) {
    state.hyperedges.forEach((edge, idx) => {
      const coords = edge.vertices.map(vId => {
        const simNode = physicsLayout.nodeMap.get(vId);
        return simNode ? { x: simNode.x, y: simNode.y } : null;
      }).filter(Boolean);

      if (coords.length === 0) return;

      const hubNode = physicsLayout.nodeMap.get(`_hub_${edge.id}`);
      if (hubNode) {
        coords.push({ x: hubNode.x, y: hubNode.y });
      }

      const blobRadius = vertexRadius * state.boundaryScale;
      const pathData = getBlobPath(coords, blobRadius);

      if (!pathData) return;

      const blobColor = getPaletteColor(idx, state.hyperedges.length, palette);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);

      // Inline styles for vector graphics compliance
      path.setAttribute('fill', blobColor);
      path.setAttribute('stroke', blobColor);
      path.setAttribute('fill-opacity', String(state.blobOpacity));
      path.setAttribute('stroke-opacity', state.blobOutlineWidth > 0 ? '0.7' : '0');
      path.setAttribute('stroke-width', `${state.blobOutlineWidth}px`);
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('data-id', edge.id);
      blobsLayer.appendChild(path);
    });
  }

  // 2. Draw Subset Edges (Hub curves)
  if (state.showSubsetEdge) {
    state.hyperedges.forEach((edge, idx) => {
      const hubNode = physicsLayout.nodeMap.get(`_hub_${edge.id}`);
      if (!hubNode || edge.vertices.length < 1) return;

      const edgeColor = getPaletteColor(idx, state.hyperedges.length, palette);

      if (edge.vertices.length === 1) {
        const vNode = physicsLayout.nodeMap.get(edge.vertices[0]);
        if (!vNode) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(vNode.x));
        line.setAttribute('y1', String(vNode.y));
        line.setAttribute('x2', String(hubNode.x));
        line.setAttribute('y2', String(hubNode.y));
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', edgeColor);
        line.setAttribute('stroke-width', `${state.edgeWidth * 0.75}px`);
        line.setAttribute('stroke-dasharray', '3,3');
        line.setAttribute('opacity', '0.6');
        edgesLayer.appendChild(line);
      } else {
        const v0 = physicsLayout.nodeMap.get(edge.vertices[0]);
        if (!v0) return;

        for (let i = 1; i < edge.vertices.length; i++) {
          const vi = physicsLayout.nodeMap.get(edge.vertices[i]);
          if (!vi) continue;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const pathData = `M ${v0.x} ${v0.y} Q ${hubNode.x} ${hubNode.y} ${vi.x} ${vi.y}`;
          path.setAttribute('d', pathData);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', edgeColor);
          path.setAttribute('stroke-width', `${state.edgeWidth}px`);
          path.setAttribute('opacity', '0.85');
          edgesLayer.appendChild(path);
        }
      }
    });
  }

  // 3. Draw Hub Centers (visible for user control/structure visualization if enabled)
  if (state.showHubs) {
    state.hyperedges.forEach((edge, idx) => {
      const hubNode = physicsLayout.nodeMap.get(`_hub_${edge.id}`);
      if (!hubNode) return;

      const edgeColor = getPaletteColor(idx, state.hyperedges.length, palette);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(hubNode.x));
      circle.setAttribute('cy', String(hubNode.y));
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', edgeColor);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1px');
      circle.setAttribute('fill-opacity', '0.5');
      circle.setAttribute('data-hub-id', hubNode.id);
      circle.style.cursor = 'pointer';
      hubsLayer.appendChild(circle);
    });
  }

  // 4. Draw Vertices (Circles)
  state.vertices.forEach(v => {
    const simNode = physicsLayout.nodeMap.get(v.id);
    if (!simNode) return;

    const isSelected = state.selectedVertexIds.has(v.id);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'vertex');
    g.setAttribute('data-id', v.id);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(simNode.x));
    circle.setAttribute('cy', String(simNode.y));

    // Inline structural attributes
    circle.setAttribute('stroke', isSelected ? 'var(--primary)' : nodeStrokeColor);
    circle.setAttribute('stroke-width', `${isSelected ? state.vertexOutlineWidth + 1.5 : state.vertexOutlineWidth}px`);

    if (theme === 'Clean') {
      circle.setAttribute('r', String(vertexRadius));
      circle.setAttribute('fill', isSelected ? 'var(--primary)' : '#495057');
    } else if (theme === 'Detailed') {
      circle.setAttribute('r', String(Math.max(4, vertexRadius * 0.4)));
      circle.setAttribute('fill', isSelected ? 'var(--primary)' : '#000000');
    } else {
      // NameLabeled (Default)
      circle.setAttribute('r', String(vertexRadius));
      circle.setAttribute('fill', isSelected ? '#e9ecef' : nodeFillColor);
    }

    g.appendChild(circle);
    verticesLayer.appendChild(g);

    // 5. Draw Labels
    if (theme !== 'Clean') {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = v.label;

      // Inline styles for text elements
      text.setAttribute('font-family', fontFamilyStr);
      text.setAttribute('font-size', `${state.labelFontSize}px`);
      text.setAttribute('fill', labelColor);
      text.setAttribute('font-weight', '500');
      text.setAttribute('pointer-events', 'none');

      if (theme === 'Detailed') {
        text.setAttribute('x', String(simNode.x + Math.max(8, vertexRadius * 0.5)));
        text.setAttribute('y', String(simNode.y - Math.max(8, vertexRadius * 0.5)));
        text.setAttribute('text-anchor', 'start');
      } else {
        text.setAttribute('x', String(simNode.x));
        text.setAttribute('y', String(simNode.y + (state.labelFontSize * 0.35))); // dynamic vertical center align
        text.setAttribute('text-anchor', 'middle');
      }
      labelsLayer.appendChild(text);
    }
  });
}

/**
 * Populates the side list of hyperedges.
 */
function updateHyperedgesList() {
  hyperedgesListContainer.innerHTML = '';

  if (state.hyperedges.length === 0) {
    hyperedgesListContainer.innerHTML = '<div class="list-item" style="color:var(--text-muted); justify-content:center;">No hyperedges defined</div>';
    return;
  }

  state.hyperedges.forEach((edge, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';

    const color = getPaletteColor(idx, state.hyperedges.length, state.edgePalette);
    const isEditing = state.editingEdgeId === edge.id;

    if (isEditing) {
      const rawVerticesString = edge.vertices.map(vId => {
        const v = state.vertices.find(vn => vn.id === vId);
        return v ? v.label : vId;
      }).join(', ');

      item.innerHTML = `
        <div class="list-item-content">
          <div class="item-color-pill" style="background-color: ${color}"></div>
          <input type="text" class="list-item-edit-input" data-edit-input-id="${edge.id}" value="${rawVerticesString}">
        </div>
        <div class="list-item-actions">
          <button class="btn btn-primary btn-sm" style="padding:1px 5px; font-size:0.75rem;" data-save-edge-id="${edge.id}">✓</button>
          <button class="btn btn-secondary btn-sm" style="padding:1px 5px; font-size:0.75rem;" data-cancel-edit-id="${edge.id}">✕</button>
        </div>
      `;
    } else {
      const labelString = `{${edge.vertices.map(vId => {
        const v = state.vertices.find(vn => vn.id === vId);
        return v ? v.label : vId;
      }).join(', ')}}`;

      item.innerHTML = `
        <div class="list-item-content">
          <div class="item-color-pill" style="background-color: ${color}"></div>
          <span class="item-text">${labelString}</span>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-secondary btn-sm" style="padding:1px 5px; font-size:0.75rem;" data-edit-edge-id="${edge.id}">✎</button>
          <button class="btn btn-danger btn-sm" style="padding:1px 5px; font-size:0.75rem;" data-del-edge-id="${edge.id}">✕</button>
        </div>
      `;
    }
    hyperedgesListContainer.appendChild(item);
  });

  // Attach delete listeners
  document.querySelectorAll('[data-del-edge-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.getAttribute('data-del-edge-id'));
      removeHyperedge(id);
    });
  });

  // Attach edit listeners
  document.querySelectorAll('[data-edit-edge-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-edit-edge-id'));
      state.editingEdgeId = id;
      updateHyperedgesList();
    });
  });

  // Attach cancel listeners
  document.querySelectorAll('[data-cancel-edit-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editingEdgeId = null;
      state.hyperedges = state.hyperedges.filter(e => e.vertices.length > 0);
      updateHyperedgesList();
    });
  });

  // Attach save listeners
  document.querySelectorAll('[data-save-edge-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-save-edge-id'));
      const input = document.querySelector(`[data-edit-input-id="${id}"]`);
      if (input) {
        const val = input.value.trim();
        const parts = val.split(',').map(s => s.trim()).filter(Boolean);
        state.editingEdgeId = null;
        editHyperedge(id, parts);
      }
    });
  });

  // Attach keydown listener on the edit input for saving on 'Enter' and cancelling on 'Escape'
  document.querySelectorAll('[data-edit-input-id]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const id = parseInt(input.getAttribute('data-edit-input-id'));
        const val = input.value.trim();
        const parts = val.split(',').map(s => s.trim()).filter(Boolean);
        state.editingEdgeId = null;
        editHyperedge(id, parts);
      } else if (e.key === 'Escape') {
        state.editingEdgeId = null;
        state.hyperedges = state.hyperedges.filter(e => e.vertices.length > 0);
        updateHyperedgesList();
      }
    });
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  });
}

/**
 * Main layout simulation loop (Animation Frame).
 */
function runLayoutLoop() {
  if (state.layoutType === 'SpringEmbedding' && state.physicsPlaying) {
    physicsLayout.tick();
    draw();
  }
  animationFrameId = requestAnimationFrame(runLayoutLoop);
}

/**
 * Sets layout configuration parameters in physics engine.
 */
function updatePhysicsParameters() {
  if (!physicsLayout) return;
  physicsLayout.kAttract = parseFloat(sliderAttraction.value);
  physicsLayout.kRepel = parseFloat(sliderRepulsion.value);
  physicsLayout.restLength = parseFloat(sliderRestLength.value);

  valAttraction.textContent = sliderAttraction.value;
  valRepulsion.textContent = sliderRepulsion.value;
  valRestLength.textContent = sliderRestLength.value;
}

/**
 * Re-computes layouts on state changes.
 */
function triggerLayoutRecompute(resetPositions = false) {
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 600;

  if (state.layoutType === 'SpringEmbedding') {
    physicsSettings.style.display = 'flex';
    if (resetPositions) {
      physicsLayout.setGraph(state.vertices, state.hyperedges);
    }
  } else {
    physicsSettings.style.display = 'none';

    let posMap;
    if (state.layoutType === 'RadialEmbedding') {
      posMap = circularLayout(state.vertices, state.hyperedges, w, h);
    } else if (state.layoutType === 'GridLayout') {
      posMap = gridLayout(state.vertices, state.hyperedges, w, h);
    }

    if (posMap) {
      physicsLayout.setGraph(state.vertices, state.hyperedges);
      physicsLayout.nodes.forEach(node => {
        const targetPos = posMap.get(node.id);
        if (targetPos) {
          node.x = targetPos.x;
          node.y = targetPos.y;
          node.vx = 0;
          node.vy = 0;
        }
      });
    }
  }

  draw();
}


/**
 * Scans all hyperedges in the state and deletes any vertices that are no longer part
 * of any remaining hyperedge. Also cleans up selection states for pruned vertices.
 */
function pruneUnusedVertices() {
  const activeVertexIds = new Set();
  state.hyperedges.forEach(edge => {
    edge.vertices.forEach(vId => {
      activeVertexIds.add(vId);
    });
  });

  // Keep only vertices that are present in at least one hyperedge
  state.vertices = state.vertices.filter(v => activeVertexIds.has(v.id));

  // Clean up selected items set
  for (const vId of state.selectedVertexIds) {
    if (!activeVertexIds.has(vId)) {
      state.selectedVertexIds.delete(vId);
    }
  }
}

function removeVertex(id) {
  state.vertices = state.vertices.filter(v => v.id !== id);
  state.selectedVertexIds.delete(id);
  
  state.hyperedges.forEach(edge => {
    edge.vertices = edge.vertices.filter(vId => vId !== id);
  });
  state.hyperedges = state.hyperedges.filter(edge => edge.vertices.length > 0);

  physicsLayout.setGraph(state.vertices, state.hyperedges);
  triggerLayoutRecompute();
  updateHyperedgesList();
}

function removeHyperedge(id) {
  state.hyperedges = state.hyperedges.filter(e => e.id !== id);
  pruneUnusedVertices();
  physicsLayout.setGraph(state.vertices, state.hyperedges);
  triggerLayoutRecompute();
  updateHyperedgesList();
}

/**
 * Modifies an existing hyperedge with new vertices. Creates new vertex node objects
 * dynamically for any identifier labels that do not already exist, and clears out
 * any isolated vertices that are left unused after editing.
 * @param {number} id - The ID of the hyperedge to edit.
 * @param {Array<string>} vertexIdentifiers - List of vertex names (e.g. ['1', '2', 'A']).
 */
function editHyperedge(id, vertexIdentifiers) {
  const edge = state.hyperedges.find(e => e.id === id);
  if (!edge) return;

  // Prevent saving empty hyperedges
  if (vertexIdentifiers.length === 0) {
    alert("A hyperedge must have at least one vertex.");
    updateHyperedgesList();
    return;
  }

  const mappedIds = [];
  vertexIdentifiers.forEach(identifier => {
    const cleanId = String(identifier).trim();
    const found = state.vertices.find(v => v.label === cleanId || v.id === cleanId);
    if (found) {
      mappedIds.push(found.id);
    } else {
      // Create a new vertex dynamically if it does not exist
      const newId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      state.vertices.push({ id: newId, label: cleanId });
      mappedIds.push(newId);
    }
  });

  if (mappedIds.length === 0) return;

  // Update hyperedge vertices, remove duplicate references, and clean up isolated nodes
  edge.vertices = Array.from(new Set(mappedIds));
  pruneUnusedVertices();

  // Rebuild forces bipartite model and restart layout embedding
  physicsLayout.setGraph(state.vertices, state.hyperedges);
  triggerLayoutRecompute();
  updateHyperedgesList();
}

function loadDefaultGraph() {
  state.vertices = [
    { id: '1', label: '1' },
    { id: '2', label: '2' },
    { id: '3', label: '3' },
    { id: '4', label: '4' },
    { id: '5', label: '5' },
    { id: '6', label: '6' },
    { id: '7', label: '7' },
    { id: '8', label: '8' },
    { id: '9', label: '9' }
  ];
  state.hyperedges = [
    { id: 1, vertices: ['1', '2', '3'] },
    { id: 2, vertices: ['4', '5', '6'] },
    { id: 3, vertices: ['7', '8', '9'] },
    { id: 4, vertices: ['3', '4'] },
    { id: 5, vertices: ['6', '7'] },
    { id: 6, vertices: ['9', '1'] }
  ];
  state.selectedVertexIds.clear();

  physicsLayout.setGraph(state.vertices, state.hyperedges);

  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 600;
  const posMap = circularLayout(state.vertices, state.hyperedges, w, h);
  physicsLayout.nodes.forEach(node => {
    const pos = posMap.get(node.id);
    if (pos) {
      node.x = pos.x;
      node.y = pos.y;
    }
  });

  triggerLayoutRecompute();
  updateHyperedgesList();

  setTimeout(zoomToFit, 100);
}

/**
 * Coordinate space translation from Screen offset to SVG coordinate system.
 */
function getCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left - state.pan.x) / state.zoom;
  const y = (event.clientY - rect.top - state.pan.y) / state.zoom;
  return { x, y };
}

/**
 * Adjust Zoom helper
 */
function adjustZoom(factor, clientX = null, clientY = null) {
  const oldZoom = state.zoom;
  state.zoom = Math.max(0.1, Math.min(10.0, state.zoom * factor));

  if (clientX !== null && clientY !== null) {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const localX = (mx - state.pan.x) / oldZoom;
    const localY = (my - state.pan.y) / oldZoom;

    state.pan.x = mx - localX * state.zoom;
    state.pan.y = my - localY * state.zoom;
  }

  applyTransform();
  draw();
}

/**
 * Event Listeners & Binding
 */
function initEvents() {

  // 1. Zoom and Pan event listeners on SVG
  canvas.addEventListener('mousedown', (e) => {
    const target = e.target;

    const vertexGroup = target.closest('.vertex');
    if (vertexGroup) {
      const vId = vertexGroup.getAttribute('data-id');
      state.draggedNodeId = vId;
      physicsLayout.draggedNodeId = vId;
      return;
    }

    const hubElement = target.closest('.hub');
    if (hubElement) {
      const hubId = hubElement.getAttribute('data-hub-id');
      state.draggedNodeId = hubId;
      physicsLayout.draggedNodeId = hubId;
      return;
    }

    state.isPanning = true;
    state.panStart = {
      x: e.clientX - state.pan.x,
      y: e.clientY - state.pan.y
    };
  });

  window.addEventListener('mousemove', (e) => {
    if (state.draggedNodeId) {
      const coords = getCanvasCoords(e);
      const node = physicsLayout.nodeMap.get(state.draggedNodeId);
      if (node) {
        node.x = coords.x;
        node.y = coords.y;
        node.vx = 0;
        node.vy = 0;

        if (!state.physicsPlaying || state.layoutType !== 'SpringEmbedding') {
          draw();
        }
      }
    } else if (state.isPanning) {
      state.pan.x = e.clientX - state.panStart.x;
      state.pan.y = e.clientY - state.panStart.y;
      applyTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    state.isPanning = false;
    state.draggedNodeId = null;
    if (physicsLayout) {
      physicsLayout.draggedNodeId = null;
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    adjustZoom(factor, e.clientX, e.clientY);
  }, { passive: false });

  // Double-click vertex creation disabled per user request

  // Right-click vertex deletion disabled per user request



  btnAddEdge.addEventListener('click', () => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    state.hyperedges.push({
      id: newId,
      vertices: []
    });
    state.editingEdgeId = newId;
    updateHyperedgesList();
  });

  // 3. Settings updates
  selectCanvasBg.addEventListener('change', (e) => {
    state.canvasBg = e.target.value;
    // Set background colors dynamically
    if (state.canvasBg === 'white') {
      canvas.style.backgroundColor = '#ffffff';
    } else if (state.canvasBg === 'light-grey') {
      canvas.style.backgroundColor = '#f8f9fa';
    } else if (state.canvasBg === 'dark-slate') {
      canvas.style.backgroundColor = '#1a1e24';
    } else {
      canvas.style.backgroundColor = 'transparent';
    }
    draw();
  });

  selectLayout.addEventListener('change', (e) => {
    state.layoutType = e.target.value;
    triggerLayoutRecompute(true);
  });

  sliderAttraction.addEventListener('input', updatePhysicsParameters);
  sliderRepulsion.addEventListener('input', updatePhysicsParameters);
  sliderRestLength.addEventListener('input', updatePhysicsParameters);

  selectTheme.addEventListener('change', (e) => {
    state.plotTheme = e.target.value;
    draw();
  });

  selectFontFamily.addEventListener('change', (e) => {
    state.labelFontFamily = e.target.value;
    draw();
  });

  sliderLabelSize.addEventListener('input', (e) => {
    state.labelFontSize = parseInt(e.target.value);
    valLabelSize.textContent = `${e.target.value}px`;
    draw();
  });

  sliderVertexSize.addEventListener('input', (e) => {
    state.vertexSize = parseFloat(e.target.value);
    valVertexSize.textContent = e.target.value;
    draw();
  });

  sliderVertexOutlineWidth.addEventListener('input', (e) => {
    state.vertexOutlineWidth = parseFloat(e.target.value);
    valVertexOutlineWidth.textContent = `${parseFloat(e.target.value).toFixed(1)}px`;
    draw();
  });

  switchBoundary.addEventListener('change', (e) => {
    state.showSubsetBoundary = e.target.checked;
    boundaryControlsSubgroup.style.display = state.showSubsetBoundary ? 'flex' : 'none';
    draw();
  });

  switchHubs.addEventListener('change', (e) => {
    state.showHubs = e.target.checked;
    draw();
  });

  switchGrid.addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    const gridRect = document.getElementById('grid-rect');
    if (gridRect) {
      gridRect.style.display = state.showGrid ? 'inline' : 'none';
    }
  });

  sliderBoundaryScale.addEventListener('input', (e) => {
    state.boundaryScale = parseFloat(e.target.value);
    valBoundaryScale.textContent = parseFloat(e.target.value).toFixed(1);
    draw();
  });

  sliderBlobOpacity.addEventListener('input', (e) => {
    state.blobOpacity = parseFloat(e.target.value);
    valBlobOpacity.textContent = parseFloat(e.target.value).toFixed(2);
    draw();
  });

  sliderBlobOutlineWidth.addEventListener('input', (e) => {
    state.blobOutlineWidth = parseFloat(e.target.value);
    valBlobOutlineWidth.textContent = `${parseFloat(e.target.value).toFixed(1)}px`;
    draw();
  });

  switchEdge.addEventListener('change', (e) => {
    state.showSubsetEdge = e.target.checked;
    edgeControlsSubgroup.style.display = state.showSubsetEdge ? 'flex' : 'none';
    draw();
  });

  sliderEdgeWidth.addEventListener('input', (e) => {
    state.edgeWidth = parseFloat(e.target.value);
    valEdgeWidth.textContent = `${parseFloat(e.target.value).toFixed(1)}px`;
    draw();
  });

  selectEdgeStyle.addEventListener('change', (e) => {
    state.edgePalette = e.target.value;
    updateHyperedgesList();
    draw();
  });

  // 4. Floating control buttons
  btnPhysicsPlayPause.addEventListener('click', () => {
    state.physicsPlaying = !state.physicsPlaying;
    btnPhysicsPlayPause.textContent = state.physicsPlaying ? '⏸' : '▶';
    btnPhysicsPlayPause.className = state.physicsPlaying ? 'active' : '';
  });

  btnPhysicsStep.addEventListener('click', () => {
    if (state.layoutType === 'SpringEmbedding') {
      physicsLayout.tick();
      draw();
    }
  });

  btnZoomIn.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    adjustZoom(1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  btnZoomOut.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    adjustZoom(0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  btnZoomFit.addEventListener('click', zoomToFit);
  btnRecenter.addEventListener('click', recenterGraph);

  // 5. Action Buttons (Clear, Import/Export modal, Export SVG)
  btnExportSvg.addEventListener('click', exportSVG);

  btnClearCanvas.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
      state.vertices = [];
      state.hyperedges = [];
      state.selectedVertexIds.clear();
      physicsLayout.setGraph([], []);
      triggerLayoutRecompute();
      updateHyperedgesList();
    }
  });

  btnModalImportExport.addEventListener('click', () => {
    modalTextarea.value = serializeToWolfram();
    importErrorMsg.style.display = 'none';
    modalOverlay.classList.add('active');
  });

  btnModalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
  });

  btnExportWolfram.addEventListener('click', () => {
    const code = `HypergraphPlot[${serializeToWolfram()}]`;
    modalTextarea.value = code;

    // Copy to Clipboard
    navigator.clipboard.writeText(code).then(() => {
      const origText = btnExportWolfram.textContent;
      btnExportWolfram.textContent = 'Copied!';
      btnExportWolfram.style.backgroundColor = 'var(--accent-emerald)';
      btnExportWolfram.style.color = '#ffffff';
      setTimeout(() => {
        btnExportWolfram.textContent = origText;
        btnExportWolfram.style.backgroundColor = '';
        btnExportWolfram.style.color = '';
      }, 1500);
    }).catch(err => {
      console.error("Clipboard copy failed: ", err);
    });
  });

  btnExportJSON.addEventListener('click', () => {
    const data = {
      vertices: state.vertices,
      hyperedges: state.hyperedges
    };
    const jsonStr = JSON.stringify(data, null, 2);
    modalTextarea.value = jsonStr;

    // Trigger download
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hypergraph_data_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  btnImportData.addEventListener('click', () => {
    const val = modalTextarea.value.trim();
    if (!val) return;

    try {
      if (val.startsWith('{')) {
        const parsed = parseMathematicaList(val);
        if (Array.isArray(parsed)) {
          const uniqueVertices = new Set();
          parsed.forEach(edge => {
            if (Array.isArray(edge)) {
              edge.forEach(v => uniqueVertices.add(String(v)));
            } else {
              uniqueVertices.add(String(edge));
            }
          });

          state.vertices = Array.from(uniqueVertices).map(vId => ({ id: vId, label: vId }));
          state.hyperedges = parsed.map((edge, idx) => {
            const edgeArr = Array.isArray(edge) ? edge : [edge];
            return {
              id: idx + 1,
              vertices: edgeArr.map(v => String(v))
            };
          });
        } else {
          throw new Error("Must be a list of lists");
        }
      } else {
        const parsed = JSON.parse(val);
        if (parsed.vertices && parsed.hyperedges) {
          state.vertices = parsed.vertices;
          state.hyperedges = parsed.hyperedges;
        } else if (Array.isArray(parsed)) {
          const uniqueVertices = new Set();
          parsed.forEach(edge => {
            edge.forEach(v => uniqueVertices.add(String(v)));
          });
          state.vertices = Array.from(uniqueVertices).map(vId => ({ id: vId, label: vId }));
          state.hyperedges = parsed.map((edge, idx) => ({
            id: idx + 1,
            vertices: edge.map(v => String(v))
          }));
        } else {
          throw new Error("Invalid format structure");
        }
      }

      state.selectedVertexIds.clear();
      physicsLayout.setGraph(state.vertices, state.hyperedges);

      const w = canvas.clientWidth || 800;
      const h = canvas.clientHeight || 600;
      physicsLayout.nodes.forEach(node => {
        node.x = w / 2 + (Math.random() - 0.5) * 200;
        node.y = h / 2 + (Math.random() - 0.5) * 200;
      });

      triggerLayoutRecompute();
      updateHyperedgesList();
      modalOverlay.classList.remove('active');
      setTimeout(zoomToFit, 100);
    } catch (err) {
      importErrorMsg.textContent = `Error parsing data: ${err.message}`;
      importErrorMsg.style.display = 'block';
    }
  });

  // Presets listeners removed

  window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (physicsLayout) {
      physicsLayout.width = w;
      physicsLayout.height = h;
    }
  });
}

/**
 * Initialization function
 */
function init() {
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 600;

  physicsLayout = new BipartiteForceLayout({
    width: w,
    height: h
  });

  updatePhysicsParameters();
  initEvents();
  loadDefaultGraph();
  runLayoutLoop();
}

window.addEventListener('DOMContentLoaded', init);
