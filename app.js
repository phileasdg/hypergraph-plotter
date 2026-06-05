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
  hasDragged: false,
  pinnedNodeIds: new Set(),
  pinOnDrag: true,

  // Customization Options
  canvasBg: 'transparent', // transparent, white, light-grey, dark-slate, custom
  canvasBgCustom: '#ffffff',
  layoutType: 'spring-embedding', // spring-embedding, radial-embedding, grid-layout
  vertexSize: 0.15,
  vertexOutlineWidth: 1.5,
  plotTheme: 'name-labeled', // name-labeled, detailed, clean
  nodeFillType: 'automatic', // automatic, custom
  nodeFillCustom: '#ffffff',
  labelFontFamily: 'sans-serif', // sans-serif, serif, monospace
  labelFontSize: 12,
  showSubsetBoundary: true,
  boundaryScale: 2.0,
  blobOpacity: 0.18,
  blobOutlineWidth: 1.5,
  showSubsetEdge: true,
  edgeWidth: 2.0,
  edgePalette: 'rainbow', // rainbow, grayscale, pastel, cool-ice
  edgeColorCustom: '#3b82f6',
  showHubs: false, // Default to hidden for cleaner academic visual output
  showGrid: false, // Show grid background by default
  gridColor: '#000000',
  gridOpacity: 0.04,
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
const gridPatternPath = document.getElementById('grid-pattern-path');

// UI Controls
const selectCanvasBg = document.getElementById('select-canvas-bg');
const inputCanvasBgCustom = document.getElementById('input-canvas-bg-custom');
const selectLayout = document.getElementById('select-layout');
const physicsSettings = document.getElementById('physics-settings');
const sliderAttraction = document.getElementById('slider-attraction');
const inputAttraction = document.getElementById('input-attraction');
const sliderRepulsion = document.getElementById('slider-repulsion');
const inputRepulsion = document.getElementById('input-repulsion');
const sliderRestLength = document.getElementById('slider-rest-length');
const inputRestLength = document.getElementById('input-rest-length');

const selectTheme = document.getElementById('select-theme');
const fontFamilyControlGroup = document.getElementById('font-family-control-group');
const fontSizeSliderContainer = document.getElementById('font-size-slider-container');
const selectFontFamily = document.getElementById('select-font-family');
const sliderLabelSize = document.getElementById('slider-label-size');
const inputLabelSize = document.getElementById('input-label-size');
const sliderVertexSize = document.getElementById('slider-vertex-size');
const inputVertexSize = document.getElementById('input-vertex-size');
const sliderVertexOutlineWidth = document.getElementById('slider-vertex-outline-width');
const inputVertexOutlineWidth = document.getElementById('input-vertex-outline-width');
const selectVertexFill = document.getElementById('select-vertex-fill');
const inputVertexFillCustom = document.getElementById('input-vertex-fill-custom');
const vertexFillCustomWrapper = document.getElementById('vertex-fill-custom-wrapper');

const switchBoundary = document.getElementById('switch-boundary');
const boundaryControlsSubgroup = document.getElementById('boundary-controls-subgroup');
const sliderBoundaryScale = document.getElementById('slider-boundary-scale');
const inputBoundaryScale = document.getElementById('input-boundary-scale');
const sliderBlobOpacity = document.getElementById('slider-blob-opacity');
const inputBlobOpacity = document.getElementById('input-blob-opacity');
const sliderBlobOutlineWidth = document.getElementById('slider-blob-outline-width');
const inputBlobOutlineWidth = document.getElementById('input-blob-outline-width');

const switchEdge = document.getElementById('switch-edge');
const edgeControlsSubgroup = document.getElementById('edge-controls-subgroup');
const sliderEdgeWidth = document.getElementById('slider-edge-width');
const inputEdgeWidth = document.getElementById('input-edge-width');

const selectEdgeStyle = document.getElementById('select-edge-style');
const edgeColorCustomWrapper = document.getElementById('edge-color-custom-wrapper');
const inputEdgeColorCustom = document.getElementById('input-edge-color-custom');
const switchHubs = document.getElementById('switch-hubs');
const switchGrid = document.getElementById('switch-grid');
const gridCustomControls = document.getElementById('grid-custom-controls');
const inputGridColor = document.getElementById('input-grid-color');
const sliderGridOpacity = document.getElementById('slider-grid-opacity');
const inputGridOpacity = document.getElementById('input-grid-opacity');
const switchPinOnDrag = document.getElementById('switch-pin-on-drag');
const btnUnpinAll = document.getElementById('btn-unpin-all');

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
const btnCopyWolfram = document.getElementById('btn-copy-wolfram');
const btnCopyJson = document.getElementById('btn-copy-json');
const btnImportData = document.getElementById('btn-import-data');

// Presets removed per user request

/**
 * Color Generator based on Palette
 */
function getPaletteColor(index, total, palette) {
  if (total <= 0) return 'hsl(0, 0%, 20%)';
  const ratio = index / Math.max(1, total);

  switch (palette) {
    case 'grayscale': {
      // Clean publication grayscale: distributes values evenly between dark gray and solid black
      const grayVal = Math.round(ratio * 55);
      return `hsl(0, 0%, ${grayVal}%)`;
    }
    case 'pastel': {
      const hue = (index * 137.5) % 360;
      return `hsl(${hue}, 80%, 55%)`;
    }
    case 'cool-ice': {
      const hue = 180 + ratio * 90;
      return `hsl(${hue}, 85%, 50%)`;
    }
    case 'warm-sunset': {
      const hue = (330 + ratio * 90) % 360;
      return `hsl(${Math.round(hue)}, 90%, 50%)`;
    }
    case 'ocean-breeze': {
      const hue = 160 + ratio * 100;
      return `hsl(${hue}, 85%, 45%)`;
    }
    case 'forest-earth': {
      const hue = 80 + ratio * 60;
      return `hsl(${hue}, 55%, 40%)`;
    }
    case 'neon-glow': {
      const hue = (index * 137.5) % 360;
      return `hsl(${hue}, 100%, 50%)`;
    }
    case 'viridis': {
      const hue = 280 - ratio * 220;
      const lightness = 35 + ratio * 15;
      return `hsl(${hue}, 85%, ${lightness}%)`;
    }
    case 'plasma': {
      const hue = (240 + ratio * 170) % 360;
      const lightness = 40 + ratio * 15;
      return `hsl(${hue}, 85%, ${lightness}%)`;
    }
    case 'cividis': {
      const hue = 225 - ratio * 165;
      const saturation = 60 - Math.sin(ratio * Math.PI) * 45;
      const lightness = 30 + ratio * 35;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    case 'magma': {
      // Magma: purple -> pink -> orange -> yellow
      let h, s, l;
      if (ratio < 0.3) {
        const t = ratio / 0.3;
        h = 260 + t * 40; // 260 to 300
        s = 60 + t * 10;  // 60% to 70%
        l = 15 + t * 20;  // 15% to 35%
      } else if (ratio < 0.6) {
        const t = (ratio - 0.3) / 0.3;
        h = 300 + t * 40; // 300 to 340
        s = 70 + t * 15;  // 70% to 85%
        l = 35 + t * 15;  // 35% to 50%
      } else if (ratio < 0.9) {
        const t = (ratio - 0.6) / 0.3;
        h = 340 + t * 40; // 340 to 380 (20)
        s = 85 + t * 10;  // 85% to 95%
        l = 50 + t * 10;  // 50% to 60%
      } else {
        const t = (ratio - 0.9) / 0.1;
        h = 20 + t * 30;  // 20 to 50
        s = 95 + t * 5;   // 95% to 100%
        l = 60 + t * 15;  // 60% to 75%
      }
      return `hsl(${Math.round(h) % 360}, ${Math.round(s)}%, ${Math.round(l)}%)`;
    }
    case 'inferno': {
      // Inferno: dark purple -> red -> orange -> yellow
      let h, s, l;
      if (ratio < 0.3) {
        const t = ratio / 0.3;
        h = 260 + t * 80; // 260 to 340
        s = 70 + t * 15;  // 70% to 85%
        l = 12 + t * 18;  // 12% to 30%
      } else if (ratio < 0.6) {
        const t = (ratio - 0.3) / 0.3;
        h = 340 + t * 35; // 340 to 375 (15)
        s = 85 + t * 10;  // 85% to 95%
        l = 30 + t * 20;  // 30% to 50%
      } else if (ratio < 0.9) {
        const t = (ratio - 0.6) / 0.3;
        h = 15 + t * 30;  // 15 to 45
        s = 95 + t * 5;   // 95% to 100%
        l = 50 + t * 15;  // 50% to 65%
      } else {
        const t = (ratio - 0.9) / 0.1;
        h = 45 + t * 15;  // 45 to 60
        s = 100;
        l = 65 + t * 15;  // 65% to 80%
      }
      return `hsl(${Math.round(h) % 360}, ${Math.round(s)}%, ${Math.round(l)}%)`;
    }
    case 'cyberpunk': {
      const colors = [
        'hsl(320, 100%, 50%)', // Neon Pink
        'hsl(180, 100%, 45%)', // Neon Cyan
        'hsl(280, 100%, 50%)', // Neon Purple
        'hsl(45, 100%, 50%)',  // Neon Yellow
        'hsl(210, 100%, 50%)'  // Electric Blue
      ];
      return colors[index % colors.length];
    }
    case 'aurora': {
      const colors = [
        'hsl(150, 80%, 40%)', // Emerald
        'hsl(175, 75%, 45%)', // Mint / Teal
        'hsl(195, 85%, 40%)', // Deep Teal
        'hsl(230, 80%, 50%)', // Royal Blue
        'hsl(275, 75%, 45%)', // Purple
        'hsl(295, 80%, 50%)'  // Magenta/Violet
      ];
      return colors[index % colors.length];
    }
    case 'desert-sand': {
      const colors = [
        'hsl(20, 55%, 45%)',  // Terracotta
        'hsl(35, 60%, 40%)',  // Ochre / Gold
        'hsl(12, 50%, 35%)',  // Rust
        'hsl(140, 20%, 40%)', // Sage
        'hsl(45, 40%, 55%)',  // Sand
        'hsl(330, 30%, 45%)'  // Muted Rose
      ];
      return colors[index % colors.length];
    }
    case 'botanical': {
      const colors = [
        'hsl(130, 30%, 35%)', // Forest green
        'hsl(85, 35%, 40%)',  // Olive green
        'hsl(160, 25%, 42%)', // Sage / Eucalyptus
        'hsl(110, 20%, 45%)', // Moss
        'hsl(40, 30%, 50%)',  // Muted Gold
        'hsl(200, 20%, 45%)'  // Slate Blue
      ];
      return colors[index % colors.length];
    }
    case 'berry-wine': {
      const colors = [
        'hsl(340, 65%, 35%)', // Cranberry
        'hsl(310, 50%, 30%)', // Plum
        'hsl(355, 60%, 45%)', // Raspberry
        'hsl(280, 45%, 40%)', // Mulberry
        'hsl(325, 55%, 45%)', // Deep Rose
        'hsl(250, 40%, 40%)'  // Boysenberry
      ];
      return colors[index % colors.length];
    }
    case 'academic-bold': {
      const colors = [
        'hsl(350, 75%, 45%)', // Crimson
        'hsl(217, 85%, 45%)', // Navy
        'hsl(152, 70%, 35%)', // Emerald
        'hsl(35, 85%, 40%)',  // Amber
        'hsl(270, 70%, 45%)', // Violet
        'hsl(190, 85%, 35%)'  // Teal
      ];
      return colors[index % colors.length];
    }
    case 'academic-set1': {
      const colors = [
        'hsl(359, 79%, 50%)',  // Red
        'hsl(207, 54%, 47%)',  // Blue
        'hsl(118, 41%, 49%)',  // Green
        'hsl(292, 35%, 47%)',  // Purple
        'hsl(30, 100%, 50%)',  // Orange
        'hsl(60, 100%, 40%)',  // Dark Yellow
        'hsl(22, 61%, 40%)',   // Brown
        'hsl(329, 87%, 74%)',  // Pink
        'hsl(0, 0%, 60%)'      // Grey
      ];
      return colors[index % colors.length];
    }
    case 'academic-set2': {
      const colors = [
        'hsl(161, 44%, 58%)',  // Teal-green
        'hsl(17, 97%, 69%)',   // Orange
        'hsl(222, 38%, 67%)',  // Blue-grey
        'hsl(323, 62%, 72%)',  // Pink
        'hsl(83, 62%, 59%)',   // Light green
        'hsl(49, 100%, 59%)',  // Yellow
        'hsl(35, 62%, 74%)',   // Mauve
        'hsl(0, 0%, 70%)'      // Grey
      ];
      return colors[index % colors.length];
    }
    case 'academic-dark': {
      const colors = [
        'hsl(162, 71%, 36%)',  // Teal-green
        'hsl(26, 98%, 43%)',   // Orange
        'hsl(245, 31%, 57%)',  // Purple
        'hsl(329, 80%, 53%)',  // Pink
        'hsl(88, 69%, 38%)',   // Lime-olive
        'hsl(44, 98%, 45%)',   // Yellow-gold
        'hsl(39, 70%, 38%)',   // Brown
        'hsl(0, 0%, 40%)'      // Dark Grey
      ];
      return colors[index % colors.length];
    }
    case 'academic-paired': {
      const colors = [
        'hsl(201, 53%, 77%)',  // Light Blue
        'hsl(204, 70%, 41%)',  // Dark Blue
        'hsl(90, 56%, 71%)',   // Light Green
        'hsl(116, 56%, 40%)',  // Dark Green
        'hsl(0, 91%, 79%)',    // Light Red
        'hsl(359, 79%, 50%)',  // Dark Red
        'hsl(34, 98%, 71%)',   // Light Orange
        'hsl(30, 100%, 50%)',  // Dark Orange
        'hsl(281, 28%, 77%)',  // Light Purple
        'hsl(269, 43%, 42%)',  // Dark Purple
        'hsl(60, 100%, 80%)',  // Light Yellow
        'hsl(21, 63%, 42%)'    // Dark Brown
      ];
      return colors[index % colors.length];
    }
    case 'custom-solid': {
      return state.edgeColorCustom || '#3b82f6';
    }
    case 'rainbow':
    default: {
      const hue = ratio * 280;
      return `hsl(${hue}, 85%, 45%)`;
    }
  }
}

/**
 * Converts an HSL string to a Hex color string.
 */
function hslToHex(hsl) {
  const matches = hsl.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*\)/);
  if (!matches) return '#000000';
  let h = parseFloat(matches[1]);
  let s = parseFloat(matches[2]) / 100;
  let l = parseFloat(matches[3]) / 100;

  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
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

  // 1.5 Remove stroke-dasharray from vertex circles so pinned nodes look regular in export
  clonedSvg.querySelectorAll('.vertex circle').forEach(circle => {
    circle.removeAttribute('stroke-dasharray');
  });

  // 2. Set dimensions and namespaces
  const rect = canvas.getBoundingClientRect();
  clonedSvg.setAttribute('width', rect.width);
  clonedSvg.setAttribute('height', rect.height);
  clonedSvg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // 3. Inject solid background rectangle if not transparent
  let bgFill = 'none';
  if (state.canvasBg === 'white') bgFill = '#ffffff';
  else if (state.canvasBg === 'light-grey') bgFill = '#f8f9fa';
  else if (state.canvasBg === 'dark-slate') bgFill = '#1a1e24';
  else if (state.canvasBg === 'custom') bgFill = state.canvasBgCustom || '#ffffff';

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
 * Helper to determine if a hex color is dark or light using YIQ luminance formula.
 */
function isDarkColor(hex) {
  if (!hex || hex === 'transparent') return false;
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq < 128;
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
  const isDarkCanvas = state.canvasBg === 'dark-slate' || (state.canvasBg === 'custom' && isDarkColor(state.canvasBgCustom));
  const labelColor = isDarkCanvas ? '#f8f9fa' : '#212529';
  const nodeStrokeColor = isDarkCanvas ? '#e9ecef' : '#212529';
  const nodeFillColor = state.nodeFillType === 'custom' ? state.nodeFillCustom : (isDarkCanvas ? '#2c3036' : '#ffffff');

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

      const blobColor = edge.color || getPaletteColor(idx, state.hyperedges.length, palette);

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

      const edgeColor = edge.color || getPaletteColor(idx, state.hyperedges.length, palette);

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

      const edgeColor = edge.color || getPaletteColor(idx, state.hyperedges.length, palette);
      const isHubPinned = state.pinnedNodeIds.has(hubNode.id);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'hub');
      circle.setAttribute('cx', String(hubNode.x));
      circle.setAttribute('cy', String(hubNode.y));
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', edgeColor);
      circle.setAttribute('stroke', isHubPinned ? 'var(--primary)' : '#ffffff');
      circle.setAttribute('stroke-width', isHubPinned ? '1.5px' : '1px');
      if (isHubPinned) {
        circle.setAttribute('stroke-dasharray', '2,1');
      }
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
    const isPinned = state.pinnedNodeIds.has(v.id);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'vertex');
    g.setAttribute('data-id', v.id);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(simNode.x));
    circle.setAttribute('cy', String(simNode.y));

    // Inline structural attributes
    circle.setAttribute('stroke', isSelected ? 'var(--primary)' : nodeStrokeColor);
    circle.setAttribute('stroke-width', `${isSelected ? state.vertexOutlineWidth + 1.5 : state.vertexOutlineWidth}px`);

    let currentRadius = vertexRadius;
    if (theme === 'clean') {
      currentRadius = vertexRadius;
      circle.setAttribute('r', String(currentRadius));
      circle.setAttribute('fill', isSelected ? 'var(--primary)' : '#495057');
    } else if (theme === 'detailed') {
      currentRadius = Math.max(4, vertexRadius * 0.4);
      circle.setAttribute('r', String(currentRadius));
      circle.setAttribute('fill', isSelected ? 'var(--primary)' : '#000000');
    } else {
      // name-labeled (Default)
      currentRadius = vertexRadius;
      circle.setAttribute('r', String(currentRadius));
      circle.setAttribute('fill', isSelected ? '#e9ecef' : nodeFillColor);
    }

    if (isPinned) {
      circle.setAttribute('stroke-dasharray', '3,2');
    }
    g.appendChild(circle);

    verticesLayer.appendChild(g);

    // 5. Draw Labels
    if (theme !== 'clean') {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = v.label;

      // Inline styles for text elements
      text.setAttribute('font-family', fontFamilyStr);
      text.setAttribute('font-size', `${state.labelFontSize}px`);
      text.setAttribute('fill', labelColor);
      text.setAttribute('font-weight', '500');
      text.setAttribute('pointer-events', 'none');

      if (theme === 'detailed') {
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
    hyperedgesListContainer.style.setProperty('--content-h', `${hyperedgesListContainer.scrollHeight}px`);
    return;
  }

  state.hyperedges.forEach((edge, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';

    const color = edge.color || getPaletteColor(idx, state.hyperedges.length, state.edgePalette);
    const isEditing = state.editingEdgeId === edge.id;

    if (isEditing) {
      const rawVerticesString = edge.vertices.map(vId => {
        const v = state.vertices.find(vn => vn.id === vId);
        return v ? v.label : vId;
      }).join(', ');

      item.innerHTML = `
        <div class="list-item-content">
          <div class="item-color-pill-wrapper" style="position: relative; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; cursor: pointer;" title="Choose custom edge color">
            <div class="item-color-pill" style="background-color: ${color}; width: 100%; height: 100%; border-radius: 2px;"></div>
            <input type="color" class="edge-color-picker" data-edge-color-id="${edge.id}" value="${color.startsWith('hsl') ? hslToHex(color) : color}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0;">
          </div>
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
          <div class="item-color-pill-wrapper" style="position: relative; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; cursor: pointer;" title="Choose custom edge color">
            <div class="item-color-pill" style="background-color: ${color}; width: 100%; height: 100%; border-radius: 2px;"></div>
            <input type="color" class="edge-color-picker" data-edge-color-id="${edge.id}" value="${color.startsWith('hsl') ? hslToHex(color) : color}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0;">
          </div>
          <span class="item-text">${labelString}</span>
        </div>
        <div class="list-item-actions">
          ${edge.color ? `<button class="btn btn-secondary btn-sm" style="padding:1px 5px; font-size:0.75rem;" data-reset-edge-color-id="${edge.id}" title="Reset to palette color">↺</button>` : ''}
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

  // Attach edge color picker listeners
  document.querySelectorAll('.edge-color-picker').forEach(picker => {
    picker.addEventListener('change', (e) => {
      const id = parseInt(picker.getAttribute('data-edge-color-id'));
      const edge = state.hyperedges.find(e => e.id === id);
      if (edge) {
        edge.color = e.target.value;
        updateHyperedgesList();
        draw();
      }
    });
  });

  // Attach reset color listeners
  document.querySelectorAll('[data-reset-edge-color-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-reset-edge-color-id'));
      const edge = state.hyperedges.find(e => e.id === id);
      if (edge) {
        delete edge.color;
        updateHyperedgesList();
        draw();
      }
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

  // Set the CSS variable for content height to support dragging/resizing up to all hyperedges
  hyperedgesListContainer.style.setProperty('--content-h', `${hyperedgesListContainer.scrollHeight}px`);
}

/**
 * Main layout simulation loop (Animation Frame).
 */
function runLayoutLoop() {
  if (state.layoutType === 'spring-embedding' && state.physicsPlaying) {
    physicsLayout.tick();
    draw();
  }
  animationFrameId = requestAnimationFrame(runLayoutLoop);
}

/**
 * Resizes a number input to dynamically fit its content length.
 */
function resizeNumberInput(input) {
  const valLength = input.value.length || 1;
  input.style.width = `calc(${valLength}ch + 20px)`;
}

/**
 * Links a range slider and a number input, syncing their values.
 * Allows entering numbers outside the slider's default min/max ranges.
 */
function linkSliderAndInput(slider, numberInput, updateFn) {
  const handleSliderInput = () => {
    numberInput.value = slider.value;
    resizeNumberInput(numberInput);
    updateFn(parseFloat(slider.value));
  };

  const handleNumberInput = () => {
    let val = parseFloat(numberInput.value);
    if (isNaN(val)) return;

    // Sync slider (range input will clamp it to min/max automatically)
    slider.value = val;
    
    // Update width
    resizeNumberInput(numberInput);
    
    // Update state with exact typed value
    updateFn(val);
  };

  slider.addEventListener('input', handleSliderInput);
  numberInput.addEventListener('input', handleNumberInput);
  
  // Initial resize
  resizeNumberInput(numberInput);
}

/**
 * Synchronizes all inputs (sliders and number inputs) with current state and layout values.
 */
function syncCustomizationInputs() {
  if (physicsLayout) {
    sliderAttraction.value = physicsLayout.kAttract;
    inputAttraction.value = physicsLayout.kAttract;
    resizeNumberInput(inputAttraction);

    sliderRepulsion.value = physicsLayout.kRepel;
    inputRepulsion.value = physicsLayout.kRepel;
    resizeNumberInput(inputRepulsion);

    sliderRestLength.value = physicsLayout.restLength;
    inputRestLength.value = physicsLayout.restLength;
    resizeNumberInput(inputRestLength);
  }

  sliderLabelSize.value = state.labelFontSize;
  inputLabelSize.value = state.labelFontSize;
  resizeNumberInput(inputLabelSize);

  sliderVertexSize.value = state.vertexSize;
  inputVertexSize.value = state.vertexSize;
  resizeNumberInput(inputVertexSize);

  sliderVertexOutlineWidth.value = state.vertexOutlineWidth;
  inputVertexOutlineWidth.value = state.vertexOutlineWidth;
  resizeNumberInput(inputVertexOutlineWidth);

  sliderBoundaryScale.value = state.boundaryScale;
  inputBoundaryScale.value = state.boundaryScale;
  resizeNumberInput(inputBoundaryScale);

  sliderBlobOpacity.value = state.blobOpacity;
  inputBlobOpacity.value = state.blobOpacity;
  resizeNumberInput(inputBlobOpacity);

  sliderBlobOutlineWidth.value = state.blobOutlineWidth;
  inputBlobOutlineWidth.value = state.blobOutlineWidth;
  resizeNumberInput(inputBlobOutlineWidth);

  sliderEdgeWidth.value = state.edgeWidth;
  inputEdgeWidth.value = state.edgeWidth;
  resizeNumberInput(inputEdgeWidth);

  inputGridColor.value = state.gridColor;
  sliderGridOpacity.value = state.gridOpacity;
  inputGridOpacity.value = state.gridOpacity;
  resizeNumberInput(inputGridOpacity);
  gridCustomControls.style.display = state.showGrid ? 'flex' : 'none';
  const gridRect = document.getElementById('grid-rect');
  if (gridRect) {
    gridRect.style.display = state.showGrid ? 'inline' : 'none';
  }

  // Sync custom node fill controls
  selectVertexFill.value = state.nodeFillType;
  inputVertexFillCustom.value = state.nodeFillCustom;
  vertexFillCustomWrapper.style.display = state.nodeFillType === 'custom' ? 'inline-flex' : 'none';

  // Sync custom solid edge controls
  selectEdgeStyle.value = state.edgePalette;
  inputEdgeColorCustom.value = state.edgeColorCustom;
  edgeColorCustomWrapper.style.display = state.edgePalette === 'custom-solid' ? 'inline-flex' : 'none';

  updateGridStyling();
  updateLabelControlsVisibility();
}

/**
 * Updates the background SVG grid pattern styling based on current state.
 */
function updateGridStyling() {
  if (gridPatternPath) {
    gridPatternPath.setAttribute('stroke', state.gridColor);
    gridPatternPath.setAttribute('stroke-opacity', String(state.gridOpacity));
  }
}

/**
 * Updates the visibility of font family and font size customization controls
 * based on whether the plot theme is set to minimal ('clean').
 */
function updateLabelControlsVisibility() {
  const isMinimal = state.plotTheme === 'clean';
  fontFamilyControlGroup.style.display = isMinimal ? 'none' : 'flex';
  fontSizeSliderContainer.style.display = isMinimal ? 'none' : 'flex';
}

/**
 * Re-computes layouts on state changes.
 */
function triggerLayoutRecompute(resetPositions = false) {
  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 600;

  if (state.layoutType === 'spring-embedding') {
    physicsSettings.style.display = 'flex';
    if (resetPositions) {
      physicsLayout.setGraph(state.vertices, state.hyperedges);
    }
  } else {
    physicsSettings.style.display = 'none';

    let posMap;
    if (state.layoutType === 'radial-embedding') {
      posMap = circularLayout(state.vertices, state.hyperedges, w, h);
    } else if (state.layoutType === 'grid-layout') {
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

  // Clean up pinned items set
  for (const vId of state.pinnedNodeIds) {
    if (!activeVertexIds.has(vId) && !vId.startsWith('_hub_')) {
      state.pinnedNodeIds.delete(vId);
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
  state.pinnedNodeIds.clear();

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
 * Updates the canvas SVG background color dynamically.
 */
function updateCanvasBackground() {
  if (state.canvasBg === 'white') {
    canvas.style.backgroundColor = '#ffffff';
    inputCanvasBgCustom.value = '#ffffff';
  } else if (state.canvasBg === 'light-grey') {
    canvas.style.backgroundColor = '#f8f9fa';
    inputCanvasBgCustom.value = '#f8f9fa';
  } else if (state.canvasBg === 'dark-slate') {
    canvas.style.backgroundColor = '#1a1e24';
    inputCanvasBgCustom.value = '#1a1e24';
  } else if (state.canvasBg === 'custom') {
    canvas.style.backgroundColor = state.canvasBgCustom || '#ffffff';
    inputCanvasBgCustom.value = state.canvasBgCustom || '#ffffff';
  } else {
    canvas.style.backgroundColor = 'transparent';
    inputCanvasBgCustom.value = '#ffffff';
  }
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
      state.hasDragged = true;
      const coords = getCanvasCoords(e);
      const node = physicsLayout.nodeMap.get(state.draggedNodeId);
      if (node) {
        node.x = coords.x;
        node.y = coords.y;
        node.vx = 0;
        node.vy = 0;

        if (!state.physicsPlaying || state.layoutType !== 'spring-embedding') {
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
    if (state.draggedNodeId && state.hasDragged) {
      if (state.pinOnDrag) {
        state.pinnedNodeIds.add(state.draggedNodeId);
        draw();
      }
    }
    state.isPanning = false;
    state.draggedNodeId = null;
    state.hasDragged = false;
    if (physicsLayout) {
      physicsLayout.draggedNodeId = null;
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    adjustZoom(factor, e.clientX, e.clientY);
  }, { passive: false });

  // Double-click to toggle pin state of nodes
  canvas.addEventListener('dblclick', (e) => {
    e.preventDefault();
    const target = e.target;
    const vertexGroup = target.closest('.vertex');
    if (vertexGroup) {
      const vId = vertexGroup.getAttribute('data-id');
      if (state.pinnedNodeIds.has(vId)) {
        state.pinnedNodeIds.delete(vId);
      } else {
        state.pinnedNodeIds.add(vId);
      }
      draw();
      return;
    }
    const hubElement = target.closest('.hub');
    if (hubElement) {
      const hubId = hubElement.getAttribute('data-hub-id');
      if (state.pinnedNodeIds.has(hubId)) {
        state.pinnedNodeIds.delete(hubId);
      } else {
        state.pinnedNodeIds.add(hubId);
      }
      draw();
      return;
    }
  });

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
    updateCanvasBackground();
    draw();
  });

  inputCanvasBgCustom.addEventListener('input', (e) => {
    state.canvasBg = 'custom';
    state.canvasBgCustom = e.target.value;
    selectCanvasBg.value = 'custom';
    updateCanvasBackground();
    draw();
  });

  selectLayout.addEventListener('change', (e) => {
    state.layoutType = e.target.value;
    triggerLayoutRecompute(true);
  });

  linkSliderAndInput(sliderAttraction, inputAttraction, (val) => {
    if (physicsLayout) physicsLayout.kAttract = val;
    if (!state.physicsPlaying) draw();
  });

  linkSliderAndInput(sliderRepulsion, inputRepulsion, (val) => {
    if (physicsLayout) physicsLayout.kRepel = val;
    if (!state.physicsPlaying) draw();
  });

  linkSliderAndInput(sliderRestLength, inputRestLength, (val) => {
    if (physicsLayout) physicsLayout.restLength = val;
    if (!state.physicsPlaying) draw();
  });

  selectTheme.addEventListener('change', (e) => {
    state.plotTheme = e.target.value;
    updateLabelControlsVisibility();
    draw();
  });

  selectFontFamily.addEventListener('change', (e) => {
    state.labelFontFamily = e.target.value;
    draw();
  });

  linkSliderAndInput(sliderLabelSize, inputLabelSize, (val) => {
    state.labelFontSize = val;
    draw();
  });

  linkSliderAndInput(sliderVertexSize, inputVertexSize, (val) => {
    state.vertexSize = val;
    draw();
  });

  linkSliderAndInput(sliderVertexOutlineWidth, inputVertexOutlineWidth, (val) => {
    state.vertexOutlineWidth = val;
    draw();
  });

  selectVertexFill.addEventListener('change', (e) => {
    state.nodeFillType = e.target.value;
    vertexFillCustomWrapper.style.display = state.nodeFillType === 'custom' ? 'inline-flex' : 'none';
    draw();
  });

  inputVertexFillCustom.addEventListener('input', (e) => {
    state.nodeFillCustom = e.target.value;
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
    gridCustomControls.style.display = state.showGrid ? 'flex' : 'none';
  });

  inputGridColor.addEventListener('input', (e) => {
    state.gridColor = e.target.value;
    updateGridStyling();
  });

  linkSliderAndInput(sliderGridOpacity, inputGridOpacity, (val) => {
    state.gridOpacity = val;
    updateGridStyling();
  });

  switchPinOnDrag.addEventListener('change', (e) => {
    state.pinOnDrag = e.target.checked;
  });

  btnUnpinAll.addEventListener('click', () => {
    state.pinnedNodeIds.clear();
    draw();
  });

  linkSliderAndInput(sliderBoundaryScale, inputBoundaryScale, (val) => {
    state.boundaryScale = val;
    draw();
  });

  linkSliderAndInput(sliderBlobOpacity, inputBlobOpacity, (val) => {
    state.blobOpacity = val;
    draw();
  });

  linkSliderAndInput(sliderBlobOutlineWidth, inputBlobOutlineWidth, (val) => {
    state.blobOutlineWidth = val;
    draw();
  });

  switchEdge.addEventListener('change', (e) => {
    state.showSubsetEdge = e.target.checked;
    edgeControlsSubgroup.style.display = state.showSubsetEdge ? 'flex' : 'none';
    draw();
  });

  linkSliderAndInput(sliderEdgeWidth, inputEdgeWidth, (val) => {
    state.edgeWidth = val;
    draw();
  });

  selectEdgeStyle.addEventListener('change', (e) => {
    state.edgePalette = e.target.value;
    edgeColorCustomWrapper.style.display = state.edgePalette === 'custom-solid' ? 'inline-flex' : 'none';
    updateHyperedgesList();
    draw();
  });

  inputEdgeColorCustom.addEventListener('input', (e) => {
    state.edgeColorCustom = e.target.value;
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
    if (state.layoutType === 'spring-embedding') {
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
      state.pinnedNodeIds.clear();
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

  if (btnCopyWolfram) {
    btnCopyWolfram.addEventListener('click', () => {
      const wlCode = `ResourceFunction["HypergraphPlot"][${serializeToWolfram()}]`;
      navigator.clipboard.writeText(wlCode).then(() => {
        const origText = btnCopyWolfram.textContent;
        btnCopyWolfram.textContent = 'Copied!';
        btnCopyWolfram.style.backgroundColor = 'var(--accent-emerald)';
        btnCopyWolfram.style.color = '#ffffff';
        setTimeout(() => {
          btnCopyWolfram.textContent = origText;
          btnCopyWolfram.style.backgroundColor = '';
          btnCopyWolfram.style.color = '';
        }, 1500);
      }).catch(err => {
        console.error("Clipboard copy failed: ", err);
      });
    });
  }

  if (btnCopyJson) {
    btnCopyJson.addEventListener('click', () => {
      const data = {
        vertices: state.vertices,
        hyperedges: state.hyperedges
      };
      const jsonStr = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        const origText = btnCopyJson.textContent;
        btnCopyJson.textContent = 'Copied!';
        btnCopyJson.style.backgroundColor = 'var(--accent-emerald)';
        btnCopyJson.style.color = '#ffffff';
        setTimeout(() => {
          btnCopyJson.textContent = origText;
          btnCopyJson.style.backgroundColor = '';
          btnCopyJson.style.color = '';
        }, 1500);
      }).catch(err => {
        console.error("Clipboard copy failed: ", err);
      });
    });
  }

  btnImportData.addEventListener('click', () => {
    let val = modalTextarea.value.trim();
    if (!val) return;

    // Support extracting the inner list from ResourceFunction["HypergraphPlot"][...] or HypergraphPlot[...] wrappers
    if (val.startsWith('ResourceFunction["HypergraphPlot"][')) {
      const firstBracket = val.indexOf('[');
      const lastBracket = val.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        val = val.slice(firstBracket + 1, lastBracket).trim();
      }
    } else if (val.startsWith('HypergraphPlot[')) {
      const firstBracket = val.indexOf('[');
      const lastBracket = val.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        val = val.slice(firstBracket + 1, lastBracket).trim();
      }
    }

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
              vertices: Array.from(new Set(edgeArr.map(v => String(v))))
            };
          });
        } else {
          throw new Error("Must be a list of lists");
        }
      } else {
        const parsed = JSON.parse(val);
        if (parsed.vertices && parsed.hyperedges) {
          state.vertices = parsed.vertices;
          state.hyperedges = parsed.hyperedges.map(edge => ({
            ...edge,
            vertices: Array.from(new Set(edge.vertices))
          }));
        } else if (Array.isArray(parsed)) {
          const uniqueVertices = new Set();
          parsed.forEach(edge => {
            edge.forEach(v => uniqueVertices.add(String(v)));
          });
          state.vertices = Array.from(uniqueVertices).map(vId => ({ id: vId, label: vId }));
          state.hyperedges = parsed.map((edge, idx) => ({
            id: idx + 1,
            vertices: Array.from(new Set(edge.map(v => String(v))))
          }));
        } else {
          throw new Error("Invalid format structure");
        }
      }

      state.selectedVertexIds.clear();
      state.pinnedNodeIds.clear();
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
  physicsLayout.fixedNodeIds = state.pinnedNodeIds;

  syncCustomizationInputs();
  updateCanvasBackground();
  initEvents();
  loadDefaultGraph();
  runLayoutLoop();
}

window.addEventListener('DOMContentLoaded', init);
