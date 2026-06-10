import { HypergraphPlotter } from './hypergraph-plotter.js';

// Application Controller State
let plotter = null;
let editingEdgeId = null;

function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatVertexForInput(label) {
  if (!label) return '';
  const str = String(label);
  if (str.includes(',') || str.includes('"')) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

function parseCommaList(str) {
  if (!str) return [];
  const parts = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < str.length) {
    const char = str[i];
    if (char === '\\' && i + 1 < str.length && str[i + 1] === '"') {
      current += '"';
      i += 2;
    } else if (char === '"') {
      inQuotes = !inQuotes;
      i++;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  if (current.trim() || parts.length === 0) {
    parts.push(current.trim());
  }
  return parts.filter(Boolean);
}

// DOM Control References
const canvasElement = document.getElementById('hypergraph-canvas');

// Sidebar controls
const selectCanvasBg = document.getElementById('select-canvas-bg');
const inputCanvasBgCustom = document.getElementById('input-canvas-bg-custom');
const selectLayout = document.getElementById('select-layout');
const physicsSettings = document.getElementById('physics-settings');

const sliderAttraction = document.getElementById('slider-attraction');
const inputAttraction = document.getElementById('input-attraction');
const sliderRepulsion = document.getElementById('slider-repulsion');
const inputRepulsion = document.getElementById('input-repulsion');
const sliderHyperedgeRepulsion = document.getElementById('slider-hyperedge-repulsion');
const inputHyperedgeRepulsion = document.getElementById('input-hyperedge-repulsion');
const sliderRestLength = document.getElementById('slider-rest-length');
const inputRestLength = document.getElementById('input-rest-length');
const sliderComponentSpacing = document.getElementById('slider-component-spacing');
const inputComponentSpacing = document.getElementById('input-component-spacing');

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
const switchHyperedgeLabels = document.getElementById('switch-hyperedge-labels');
const switchGrid = document.getElementById('switch-grid');
const gridCustomControls = document.getElementById('grid-custom-controls');
const inputGridColor = document.getElementById('input-grid-color');
const sliderGridOpacity = document.getElementById('slider-grid-opacity');
const inputGridOpacity = document.getElementById('input-grid-opacity');
const switchPinOnDrag = document.getElementById('switch-pin-on-drag');
const btnPinOnDrag = document.getElementById('btn-pin-on-drag');
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
const btnCopyPython = document.getElementById('btn-copy-python');
const btnCopyJson = document.getElementById('btn-copy-json');
const btnImportData = document.getElementById('btn-import-data');

// Import/Export Modal Tabbed DOM references
const tabBtnData = document.getElementById('tab-btn-data');
const tabBtnEmbed = document.getElementById('tab-btn-embed');
const panelData = document.getElementById('panel-data');
const panelEmbed = document.getElementById('panel-embed');
const modalFooter = document.getElementById('modal-import-export-footer');

const embedIframeCode = document.getElementById('embed-iframe-code');
const btnCopyEmbedIframe = document.getElementById('btn-copy-embed-iframe');
const btnCopyEmbedUrl = document.getElementById('btn-copy-embed-url');

const embedOptUi = document.getElementById('embed-opt-ui');
const embedOptCamera = document.getElementById('embed-opt-camera');
const embedOptNodes = document.getElementById('embed-opt-nodes');
const embedOptControls = document.getElementById('embed-opt-controls');

let currentEmbedUrl = '';

/**
 * Parses Wolfram Language curly braces lists: e.g. {{1, 2}, {3, 4}}
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
 * Serializes the current graph data to Wolfram Language list format.
 */
function serializeToWolfram() {
  const edgeStrings = plotter.hyperedges.map(edge => {
    return '{' + edge.vertices.map(vId => {
      const vNode = plotter.vertices.find(v => v.id === vId);
      const label = vNode ? vNode.label : vId;
      if (/^[a-zA-Z0-9]+$/.test(label)) return label;
      return `"${label.replace(/"/g, '\\"')}"`;
    }).join(', ') + '}';
  });
  return '{' + edgeStrings.join(', ') + '}';
}

/**
 * Serializes the current graph data to Python list of lists format.
 */
function serializeToPython() {
  const edgeStrings = plotter.hyperedges.map(edge => {
    return '[' + edge.vertices.map(vId => {
      const vNode = plotter.vertices.find(v => v.id === vId);
      const label = vNode ? vNode.label : vId;
      if (/^[0-9]+$/.test(label)) return label;
      return `"${label.replace(/"/g, '\\"')}"`;
    }).join(', ') + ']';
  });
  return '[' + edgeStrings.join(', ') + ']';
}

/**
 * Serializes the current graph, options, and positions to a base64 encoded JSON string.
 */
function serializeState() {
  const verticesWithCoords = plotter.vertices.map(v => {
    const simNode = plotter.physicsLayout.nodeMap.get(v.id);
    const isPinned = plotter.pinnedNodeIds.has(v.id);
    return {
      id: v.id,
      label: v.label,
      x: simNode ? parseFloat(simNode.x.toFixed(2)) : undefined,
      y: simNode ? parseFloat(simNode.y.toFixed(2)) : undefined,
      pinned: isPinned ? true : undefined
    };
  });

  const state = {
    vertices: verticesWithCoords,
    hyperedges: plotter.hyperedges.map(e => ({
      id: e.id,
      vertices: e.vertices,
      color: e.color
    })),
    options: plotter.options
  };

  const jsonStr = JSON.stringify(state);
  // Safe base64 encoding supporting Unicode characters
  const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  // Convert standard base64 to URL-safe base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Restores the graph, options, and positions from a base64 encoded JSON string.
 */
function deserializeState(base64Str) {
  try {
    // Restore base64 padding and characters
    let base64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(base64), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const state = JSON.parse(jsonStr);
    
    if (state.options) {
      plotter.setOptions(state.options);
      syncCustomizationInputs();
    }
    
    // Clear and restore pinned node IDs
    plotter.pinnedNodeIds.clear();
    if (state.vertices) {
      state.vertices.forEach(v => {
        if (v.pinned) {
          plotter.pinnedNodeIds.add(v.id);
        }
      });
    }
    
    plotter.setData({
      vertices: state.vertices || [],
      hyperedges: state.hyperedges || []
    });
    
    return true;
  } catch (err) {
    console.error("Failed to deserialize state:", err);
    return false;
  }
}

/**
 * Generates the iframe and script embed codes based on current state.
 */
function updateEmbedCodes() {
  const stateStr = serializeState();
  const baseUrl = window.location.origin + window.location.pathname;
  
  let queryParts = ['embed=true'];
  if (embedOptUi && embedOptUi.checked) {
    queryParts.push('ui=true');
  }
  if (embedOptCamera && embedOptCamera.checked) {
    queryParts.push('camera=fixed');
  }
  if (embedOptNodes && embedOptNodes.checked) {
    queryParts.push('nodes=fixed');
  }
  if (embedOptControls && embedOptControls.checked) {
    queryParts.push('controls=true');
  }
  
  const iframeUrl = `${baseUrl}?${queryParts.join('&')}#state=${stateStr}`;
  currentEmbedUrl = iframeUrl;
  
  // IFrame Code
  embedIframeCode.value = `<iframe src="${iframeUrl}" width="100%" height="500" style="border: 1px solid var(--border-color, #ddd); border-radius: 8px;" allowfullscreen></iframe>`;
}


/**
 * Renders the sidebar list of defined hyperedges.
 */
function updateHyperedgesList() {
  hyperedgesListContainer.innerHTML = '';

  if (!plotter || plotter.hyperedges.length === 0) {
    hyperedgesListContainer.innerHTML = '<div class="list-item" style="color:var(--text-muted); justify-content:center;">No hyperedges defined</div>';
    hyperedgesListContainer.style.setProperty('--content-h', `${hyperedgesListContainer.scrollHeight}px`);
    return;
  }

  plotter.hyperedges.forEach((edge, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';

    const color = edge.color || plotter.getPaletteColor(idx, plotter.hyperedges.length, plotter.options.edgePalette);
    const isEditing = editingEdgeId !== null && String(editingEdgeId) === String(edge.id);

    if (isEditing) {
      const rawVerticesString = edge.vertices.map(vId => {
        const v = plotter.vertices.find(vn => vn.id === vId);
        return formatVertexForInput(v ? v.label : vId);
      }).join(', ');
      const currentName = edge.label || '';

      item.innerHTML = `
        <div class="list-item-content" style="flex-direction: column; align-items: stretch; gap: 4px; padding: 4px 0; width: 100%; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; width: 100%;">
            <div class="item-color-pill-wrapper" style="position: relative; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; cursor: pointer;" title="Choose custom edge color">
              <div class="item-color-pill" style="background-color: ${color}; width: 100%; height: 100%; border-radius: 2px;"></div>
              <input type="color" class="edge-color-picker" data-edge-color-id="${edge.id}" value="${color.startsWith('hsl') ? plotter.hslToHex(color) : color}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0;">
            </div>
            <span style="font-size: 0.72rem; color: var(--text-secondary); width: 35px; flex-shrink: 0;">Name:</span>
            <input type="text" class="list-item-name-input" data-edit-name-id="${edge.id}" value="${escapeHtmlAttr(currentName)}" placeholder="${idx + 1}" style="flex: 1; min-width: 0; height: 22px; font-size: 0.75rem; padding: 2px 4px; border: 1px solid var(--border-color); border-radius: 3px; background: var(--bg-base); color: var(--text-primary);">
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-left: 16px; width: calc(100% - 16px);">
            <span style="font-size: 0.72rem; color: var(--text-secondary); width: 35px; flex-shrink: 0;">Nodes:</span>
            <input type="text" class="list-item-edit-input" data-edit-input-id="${edge.id}" value="${escapeHtmlAttr(rawVerticesString)}" style="flex: 1; min-width: 0; height: 22px; font-size: 0.75rem; padding: 2px 4px; border: 1px solid var(--border-color); border-radius: 3px; background: var(--bg-base); color: var(--text-primary);">
          </div>
        </div>
        <div class="list-item-actions" style="align-self: center;">
          <button class="btn btn-primary btn-sm" style="padding:1px 5px; font-size:0.75rem;" data-save-edge-id="${edge.id}">✓</button>
          <button class="btn btn-secondary btn-sm" style="padding:1px 5px; font-size:0.75rem;" data-cancel-edit-id="${edge.id}">✕</button>
        </div>
      `;
    } else {
      const edgeName = edge.label || `${idx + 1}`;
      const labelString = `${edgeName}: {${edge.vertices.map(vId => {
        const v = plotter.vertices.find(vn => vn.id === vId);
        return v ? v.label : vId;
      }).join(', ')}}`;

      item.innerHTML = `
        <div class="list-item-content">
          <div class="item-color-pill-wrapper" style="position: relative; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; cursor: pointer;" title="Choose custom edge color">
            <div class="item-color-pill" style="background-color: ${color}; width: 100%; height: 100%; border-radius: 2px;"></div>
            <input type="color" class="edge-color-picker" data-edge-color-id="${edge.id}" value="${color.startsWith('hsl') ? plotter.hslToHex(color) : color}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0;">
          </div>
          <span class="item-text">${escapeHtmlAttr(labelString)}</span>
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

  // Attach dynamic list-item event listeners
  document.querySelectorAll('[data-del-edge-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-del-edge-id');
      removeHyperedge(id);
    });
  });

  document.querySelectorAll('.edge-color-picker').forEach(picker => {
    picker.addEventListener('change', (e) => {
      const id = picker.getAttribute('data-edge-color-id');
      const edge = plotter.hyperedges.find(e => String(e.id) === String(id));
      if (edge) {
        edge.color = e.target.value;
        updateHyperedgesList();
        plotter.draw();
      }
    });
  });

  document.querySelectorAll('[data-reset-edge-color-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-reset-edge-color-id');
      const edge = plotter.hyperedges.find(e => String(e.id) === String(id));
      if (edge) {
        delete edge.color;
        updateHyperedgesList();
        plotter.draw();
      }
    });
  });

  document.querySelectorAll('[data-edit-edge-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-edge-id');
      editingEdgeId = id;
      updateHyperedgesList();
    });
  });

  document.querySelectorAll('[data-cancel-edit-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      editingEdgeId = null;
      plotter.setData({
        vertices: plotter.vertices,
        hyperedges: plotter.hyperedges.filter(e => e.vertices.length > 0)
      });
      updateHyperedgesList();
    });
  });

  const saveAction = (id) => {
    const inputVertices = document.querySelector(`[data-edit-input-id="${id}"]`);
    const inputName = document.querySelector(`[data-edit-name-id="${id}"]`);
    if (inputVertices && inputName) {
      const nameVal = inputName.value.trim();
      const verticesVal = inputVertices.value.trim();
      const parts = parseCommaList(verticesVal);
      editingEdgeId = null;
      editHyperedge(id, nameVal, parts);
    }
  };

  document.querySelectorAll('[data-save-edge-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-save-edge-id');
      saveAction(id);
    });
  });

  document.querySelectorAll('[data-edit-input-id], [data-edit-name-id]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      const id = input.getAttribute('data-edit-input-id') || input.getAttribute('data-edit-name-id');
      if (e.key === 'Enter') {
        saveAction(id);
      } else if (e.key === 'Escape') {
        editingEdgeId = null;
        plotter.setData({
          vertices: plotter.vertices,
          hyperedges: plotter.hyperedges.filter(e => e.vertices.length > 0)
        });
        updateHyperedgesList();
      }
    });
  });

  // Update heights for CSS resizer variable
  hyperedgesListContainer.style.setProperty('--content-h', `${hyperedgesListContainer.scrollHeight}px`);

  // Auto-focus the active input field if we are editing or adding an edge
  if (editingEdgeId !== null) {
    setTimeout(() => {
      const input = document.querySelector(`[data-edit-input-id="${editingEdgeId}"]`);
      if (input) {
        input.focus();
        const val = input.value;
        input.value = '';
        input.value = val;
      }
    }, 50);
  }
}

/**
 * Removes isolated vertices that are no longer part of any hyperedges.
 */
function pruneUnusedVertices() {
  const activeVertexIds = new Set();
  plotter.hyperedges.forEach(edge => {
    edge.vertices.forEach(vId => activeVertexIds.add(vId));
  });

  plotter.vertices = plotter.vertices.filter(v => activeVertexIds.has(v.id));
  
  // Clean up pinned references
  for (const vId of plotter.pinnedNodeIds) {
    if (!activeVertexIds.has(vId) && !vId.startsWith('_hub_')) {
      plotter.pinnedNodeIds.delete(vId);
    }
  }
}

/**
 * Removes a hyperedge from the plotter state.
 */
function removeHyperedge(id) {
  const filteredEdges = plotter.hyperedges.filter(e => String(e.id) !== String(id));
  plotter.setData({
    vertices: plotter.vertices,
    hyperedges: filteredEdges
  });
  pruneUnusedVertices();
  plotter.setData({
    vertices: plotter.vertices,
    hyperedges: plotter.hyperedges
  });
  updateHyperedgesList();
}

/**
 * Modifies an existing hyperedge with new vertices, creating new ones if needed.
 */
function editHyperedge(id, name, vertexIdentifiers) {
  const edge = plotter.hyperedges.find(e => String(e.id) === String(id));
  if (!edge) return;

  if (vertexIdentifiers.length === 0) {
    alert("A hyperedge must have at least one vertex.");
    updateHyperedgesList();
    return;
  }

  const mappedIds = [];
  vertexIdentifiers.forEach(identifier => {
    const cleanId = String(identifier).trim();
    const found = plotter.vertices.find(v => v.label === cleanId || v.id === cleanId);
    if (found) {
      mappedIds.push(found.id);
    } else {
      const newId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      plotter.vertices.push({ id: newId, label: cleanId });
      mappedIds.push(newId);
    }
  });

  if (mappedIds.length === 0) return;

  edge.label = name.trim() || undefined;
  edge.vertices = Array.from(new Set(mappedIds));
  pruneUnusedVertices();

  plotter.setData({
    vertices: plotter.vertices,
    hyperedges: plotter.hyperedges
  });
  updateHyperedgesList();
}

/**
 * Appends a new blank hyperedge and enters edit mode.
 */
function addHyperedge() {
  const newId = Date.now() + Math.floor(Math.random() * 1000);
  plotter.hyperedges.push({
    id: newId,
    vertices: []
  });
  editingEdgeId = newId;
  updateHyperedgesList();
}

/**
 * Loads the default demonstration hypergraph (Multi-Component Benchmark).
 */
function loadDefaultGraph() {
  const edgeList = [
    // Standard structural components (numbers)
    ['9', '10', '1'],
    ['1', '2', '3'],
    ['3', '4', '5'],
    ['5', '6', '7'],
    ['7', '8', '9'],
    ['11', '12', '13'],
    ['14', '15', '16'],
    ['17', '18', '19'],
    ['13', '14'],
    ['16', '17'],
    ['19', '11'],
    ['21'],
    ['22', '23'],
    ['24', '25', '26'],
    ['27', '28', '29', '30'],
    ['31', '32', '33', '34', '35'],
    ['36', '37', '38', '39', '40', '41'],

    // Informative text components explaining the app (under 80 chars, structurally aligned)
    ['Interactive Canvas', 'Hypergraph Elements', 'Physics Simulation', 'User Interactions'],
    ['Hypergraph Elements', 'Vertices / Nodes', 'Bipartite Hubs', 'Enclosing Blobs'],
    ['Physics Simulation', 'Link attraction', 'Vertex Repulsion', 'Component Spacing'],
    ['User Interactions', 'Interactive Drag', 'Pan & Zoom Canvas', 'Pin Nodes'],
    ['Vertices / Nodes', 'Auto Text Wrapping', 'Dynamic Aspect Ratio', 'Hover Tooltips'],
    ['Auto Text Wrapping', 'Wolfram & Python Lists', 'SVG / JSON Exporters'],
    
    // Quick Start Guide (5-node component, all under 80 chars)
    [
      '1. Drag nodes. Toggle "Pin on drag" to lock coordinates automatically.',
      '2. Click any locked node to release it back into the simulation.',
      '3. Click "Release locked nodes" in the toolbar to unlock all nodes.',
      '4. Use sidebar sliders to fine-tune attraction, repulsion, and styles.',
      '5. Scroll the canvas to zoom, and drag the background to pan.'
    ]
  ];

  const uniqueVertices = new Set();
  edgeList.forEach(edge => {
    edge.forEach(v => uniqueVertices.add(v));
  });

  const defaultVertices = Array.from(uniqueVertices)
    .sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      const aIsNum = !isNaN(aNum) && String(aNum) === a;
      const bIsNum = !isNaN(bNum) && String(bNum) === b;
      if (aIsNum && bIsNum) return aNum - bNum;
      if (aIsNum) return -1;
      if (bIsNum) return 1;
      return a.localeCompare(b);
    })
    .map(v => ({ id: v, label: v }));

  const defaultEdges = edgeList.map((edge, idx) => ({
    id: idx + 1,
    vertices: edge
  }));

  plotter.pinnedNodeIds.clear();
  plotter.selectedVertexIds.clear();
  plotter.setData({
    vertices: defaultVertices,
    hyperedges: defaultEdges
  });
}

/**
 * Resizes adjacent number input boxes dynamically to fit custom text lengths.
 */
function resizeNumberInput(inputEl) {
  const valLength = String(inputEl.value).length;
  inputEl.style.width = `${Math.max(3.5, valLength * 0.95 + 1)}ch`;
}

/**
 * Hooks range sliders and number input boxes together in dynamic synchronization.
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

    slider.value = val;
    resizeNumberInput(numberInput);
    updateFn(val);
  };

  slider.addEventListener('input', handleSliderInput);
  numberInput.addEventListener('input', handleNumberInput);
  resizeNumberInput(numberInput);
}

/**
 * Synchronizes layout control forms in the sidebar to match current options parameters.
 */
function syncCustomizationInputs() {
  if (!plotter) return;

  const opt = plotter.options;

  sliderAttraction.value = opt.kAttract;
  inputAttraction.value = opt.kAttract;
  resizeNumberInput(inputAttraction);

  sliderRepulsion.value = opt.kRepel;
  inputRepulsion.value = opt.kRepel;
  resizeNumberInput(inputRepulsion);

  sliderHyperedgeRepulsion.value = opt.kHyperedgeRepel;
  inputHyperedgeRepulsion.value = opt.kHyperedgeRepel;
  resizeNumberInput(inputHyperedgeRepulsion);

  sliderRestLength.value = opt.restLength;
  inputRestLength.value = opt.restLength;
  resizeNumberInput(inputRestLength);

  sliderComponentSpacing.value = opt.componentSpacing;
  inputComponentSpacing.value = opt.componentSpacing;
  resizeNumberInput(inputComponentSpacing);

  sliderLabelSize.value = opt.labelFontSize;
  inputLabelSize.value = opt.labelFontSize;
  resizeNumberInput(inputLabelSize);

  sliderVertexSize.value = opt.vertexSize;
  inputVertexSize.value = opt.vertexSize;
  resizeNumberInput(inputVertexSize);

  sliderVertexOutlineWidth.value = opt.vertexOutlineWidth;
  inputVertexOutlineWidth.value = opt.vertexOutlineWidth;
  resizeNumberInput(inputVertexOutlineWidth);

  sliderBoundaryScale.value = opt.boundaryScale;
  inputBoundaryScale.value = opt.boundaryScale;
  resizeNumberInput(inputBoundaryScale);

  sliderBlobOpacity.value = opt.blobOpacity;
  inputBlobOpacity.value = opt.blobOpacity;
  resizeNumberInput(inputBlobOpacity);

  sliderBlobOutlineWidth.value = opt.blobOutlineWidth;
  inputBlobOutlineWidth.value = opt.blobOutlineWidth;
  resizeNumberInput(inputBlobOutlineWidth);

  sliderEdgeWidth.value = opt.edgeWidth;
  inputEdgeWidth.value = opt.edgeWidth;
  resizeNumberInput(inputEdgeWidth);

  // Sync toggles and select options
  selectCanvasBg.value = opt.canvasBg;
  inputCanvasBgCustom.value = opt.canvasBgCustom;
  selectLayout.value = opt.layoutType;
  selectTheme.value = opt.plotTheme;
  selectFontFamily.value = opt.labelFontFamily;
  selectVertexFill.value = opt.nodeFillType;
  inputVertexFillCustom.value = opt.nodeFillCustom;
  switchBoundary.checked = opt.showSubsetBoundary;
  switchEdge.checked = opt.showSubsetEdge;
  switchHubs.checked = opt.showHubs;
  switchHyperedgeLabels.checked = opt.showHyperedgeLabels;
  switchGrid.checked = opt.showGrid;
  inputGridColor.value = opt.gridColor;
  sliderGridOpacity.value = opt.gridOpacity;
  inputGridOpacity.value = opt.gridOpacity;
  resizeNumberInput(inputGridOpacity);
  switchPinOnDrag.checked = opt.pinOnDrag;
  if (btnPinOnDrag) {
    btnPinOnDrag.classList.toggle('active', opt.pinOnDrag);
  }

  // Toggle dynamic subsections visibilities
  physicsSettings.style.display = opt.layoutType === 'spring-embedding' ? 'flex' : 'none';
  gridCustomControls.style.display = opt.showGrid ? 'flex' : 'none';
  vertexFillCustomWrapper.style.display = opt.nodeFillType === 'custom' ? 'inline-flex' : 'none';
  edgeColorCustomWrapper.style.display = opt.edgePalette === 'custom-solid' ? 'inline-flex' : 'none';
  boundaryControlsSubgroup.style.display = opt.showSubsetBoundary ? 'flex' : 'none';
  edgeControlsSubgroup.style.display = opt.showSubsetEdge ? 'flex' : 'none';

  updateLabelControlsVisibility();
}

/**
 * Updates font custom settings panels visibilities depending on theme minimizing.
 */
function updateLabelControlsVisibility() {
  if (!plotter) return;
  const isMinimal = plotter.options.plotTheme === 'clean';
  fontFamilyControlGroup.style.display = isMinimal ? 'none' : 'block';
  fontSizeSliderContainer.style.display = isMinimal ? 'none' : 'flex';
}

/**
 * Exports current layout visualization as SVG file attachment.
 */
function triggerSVGExport() {
  if (!plotter) return;
  const svgString = plotter.getSVGString();
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `hypergraph_${plotter.options.layoutType.toLowerCase()}_${Date.now()}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Binds UI inputs changes event listeners.
 */
function initControllerEvents() {
  // Sync slider events
  linkSliderAndInput(sliderAttraction, inputAttraction, (val) => plotter.setOptions({ kAttract: val }));
  linkSliderAndInput(sliderRepulsion, inputRepulsion, (val) => plotter.setOptions({ kRepel: val }));
  linkSliderAndInput(sliderHyperedgeRepulsion, inputHyperedgeRepulsion, (val) => plotter.setOptions({ kHyperedgeRepel: val }));
  linkSliderAndInput(sliderRestLength, inputRestLength, (val) => plotter.setOptions({ restLength: val }));
  linkSliderAndInput(sliderComponentSpacing, inputComponentSpacing, (val) => plotter.setOptions({ componentSpacing: val }));
  linkSliderAndInput(sliderLabelSize, inputLabelSize, (val) => plotter.setOptions({ labelFontSize: val }));
  linkSliderAndInput(sliderVertexSize, inputVertexSize, (val) => plotter.setOptions({ vertexSize: val }));
  linkSliderAndInput(sliderVertexOutlineWidth, inputVertexOutlineWidth, (val) => plotter.setOptions({ vertexOutlineWidth: val }));
  linkSliderAndInput(sliderBoundaryScale, inputBoundaryScale, (val) => plotter.setOptions({ boundaryScale: val }));
  linkSliderAndInput(sliderBlobOpacity, inputBlobOpacity, (val) => plotter.setOptions({ blobOpacity: val }));
  linkSliderAndInput(sliderBlobOutlineWidth, inputBlobOutlineWidth, (val) => plotter.setOptions({ blobOutlineWidth: val }));
  linkSliderAndInput(sliderEdgeWidth, inputEdgeWidth, (val) => plotter.setOptions({ edgeWidth: val }));
  linkSliderAndInput(sliderGridOpacity, inputGridOpacity, (val) => plotter.setOptions({ gridOpacity: val }));

  // Dropdown background triggers
  selectCanvasBg.addEventListener('change', (e) => {
    const val = e.target.value;
    let customVal = plotter.options.canvasBgCustom;
    if (val === 'white') customVal = '#ffffff';
    else if (val === 'light-grey') customVal = '#f8f9fa';
    else if (val === 'dark-slate') customVal = '#1a1e24';
    
    inputCanvasBgCustom.value = customVal;
    plotter.setOptions({ canvasBg: val, canvasBgCustom: customVal });
  });

  inputCanvasBgCustom.addEventListener('input', (e) => {
    plotter.setOptions({ canvasBgCustom: e.target.value });
  });

  // Layout algorithm trigger
  selectLayout.addEventListener('change', (e) => {
    const val = e.target.value;
    physicsSettings.style.display = val === 'spring-embedding' ? 'flex' : 'none';
    plotter.setOptions({ layoutType: val });
  });

  // Font selections and themes
  selectTheme.addEventListener('change', (e) => {
    const val = e.target.value;
    plotter.setOptions({ plotTheme: val });
    updateLabelControlsVisibility();
  });

  selectFontFamily.addEventListener('change', (e) => {
    plotter.setOptions({ labelFontFamily: e.target.value });
  });

  selectVertexFill.addEventListener('change', (e) => {
    const val = e.target.value;
    vertexFillCustomWrapper.style.display = val === 'custom' ? 'inline-flex' : 'none';
    plotter.setOptions({ nodeFillType: val });
  });

  inputVertexFillCustom.addEventListener('input', (e) => {
    plotter.setOptions({ nodeFillCustom: e.target.value });
  });

  // Boundary toggles
  switchBoundary.addEventListener('change', (e) => {
    const val = e.target.checked;
    boundaryControlsSubgroup.style.display = val ? 'flex' : 'none';
    plotter.setOptions({ showSubsetBoundary: val });
  });

  switchEdge.addEventListener('change', (e) => {
    const val = e.target.checked;
    edgeControlsSubgroup.style.display = val ? 'flex' : 'none';
    plotter.setOptions({ showSubsetEdge: val });
  });

  switchHubs.addEventListener('change', (e) => {
    plotter.setOptions({ showHubs: e.target.checked });
  });

  switchHyperedgeLabels.addEventListener('change', (e) => {
    plotter.setOptions({ showHyperedgeLabels: e.target.checked });
  });

  switchGrid.addEventListener('change', (e) => {
    const val = e.target.checked;
    gridCustomControls.style.display = val ? 'flex' : 'none';
    if (val) {
      plotter.setOptions({ showGrid: val, gridOpacity: 0.1 });
      syncCustomizationInputs();
    } else {
      plotter.setOptions({ showGrid: val });
    }
  });

  inputGridColor.addEventListener('input', (e) => {
    plotter.setOptions({ gridColor: e.target.value });
  });

  // Pinning settings
  switchPinOnDrag.addEventListener('change', (e) => {
    const checked = e.target.checked;
    if (btnPinOnDrag) btnPinOnDrag.classList.toggle('active', checked);
    plotter.setOptions({ pinOnDrag: checked });
  });

  if (btnPinOnDrag) {
    btnPinOnDrag.addEventListener('click', () => {
      const active = !plotter.options.pinOnDrag;
      btnPinOnDrag.classList.toggle('active', active);
      if (switchPinOnDrag) switchPinOnDrag.checked = active;
      plotter.setOptions({ pinOnDrag: active });
    });
  }

  btnUnpinAll.addEventListener('click', () => {
    plotter.pinnedNodeIds.clear();
    plotter.draw();
  });

  // Global edge palette
  selectEdgeStyle.addEventListener('change', (e) => {
    const val = e.target.value;
    edgeColorCustomWrapper.style.display = val === 'custom-solid' ? 'inline-flex' : 'none';
    plotter.setOptions({ edgePalette: val });
    updateHyperedgesList();
  });

  inputEdgeColorCustom.addEventListener('input', (e) => {
    plotter.setOptions({ edgeColorCustom: e.target.value });
    updateHyperedgesList();
  });

  // Action Buttons
  btnPhysicsPlayPause.addEventListener('click', () => {
    const isPlaying = !plotter.options.physicsPlaying;
    btnPhysicsPlayPause.className = isPlaying ? 'active' : '';
    plotter.setOptions({ physicsPlaying: isPlaying });
  });

  btnPhysicsStep.addEventListener('click', () => {
    if (!plotter.options.physicsPlaying) {
      plotter.physicsLayout.tick();
      plotter.draw();
    }
  });

  btnZoomIn.addEventListener('click', () => {
    const rect = canvasElement.getBoundingClientRect();
    plotter.adjustZoom(1.15, rect.width / 2 + rect.left, rect.height / 2 + rect.top);
  });

  btnZoomOut.addEventListener('click', () => {
    const rect = canvasElement.getBoundingClientRect();
    plotter.adjustZoom(0.85, rect.width / 2 + rect.left, rect.height / 2 + rect.top);
  });

  btnZoomFit.addEventListener('click', () => plotter.zoomToFit());
  btnRecenter.addEventListener('click', () => plotter.recenter());

  // Edit tools
  btnAddEdge.addEventListener('click', addHyperedge);

  btnClearCanvas.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
      plotter.setData({ vertices: [], hyperedges: [] });
      plotter.pinnedNodeIds.clear();
      updateHyperedgesList();
    }
  });

  // Import / Export Modals bindings
  btnModalImportExport.addEventListener('click', () => {
    importErrorMsg.style.display = 'none';
    modalTextarea.value = serializeToWolfram();
    
    // Reset active tab to "Data"
    tabBtnData.classList.add('active');
    tabBtnEmbed.classList.remove('active');
    panelData.style.display = 'flex';
    panelEmbed.style.display = 'none';
    modalFooter.style.display = 'flex';
    
    // Generate embed codes immediately
    updateEmbedCodes();

    modalOverlay.classList.add('active');
  });

  btnModalClose.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  });

  btnCopyWolfram.addEventListener('click', () => {
    const content = `ResourceFunction["HypergraphPlot"][${serializeToWolfram()}]`;
    navigator.clipboard.writeText(content).then(() => {
      const origText = btnCopyWolfram.textContent;
      btnCopyWolfram.textContent = 'Copied!';
      btnCopyWolfram.style.backgroundColor = 'var(--success-color, #10b981)';
      btnCopyWolfram.style.color = '#ffffff';
      setTimeout(() => {
        btnCopyWolfram.textContent = origText;
        btnCopyWolfram.style.backgroundColor = '';
        btnCopyWolfram.style.color = '';
      }, 1500);
    });
  });

  btnCopyPython.addEventListener('click', () => {
    const content = serializeToPython();
    navigator.clipboard.writeText(content).then(() => {
      const origText = btnCopyPython.textContent;
      btnCopyPython.textContent = 'Copied!';
      btnCopyPython.style.backgroundColor = 'var(--success-color, #10b981)';
      btnCopyPython.style.color = '#ffffff';
      setTimeout(() => {
        btnCopyPython.textContent = origText;
        btnCopyPython.style.backgroundColor = '';
        btnCopyPython.style.color = '';
      }, 1500);
    });
  });

  btnCopyJson.addEventListener('click', () => {
    const data = {
      vertices: plotter.vertices,
      hyperedges: plotter.hyperedges
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      const origText = btnCopyJson.textContent;
      btnCopyJson.textContent = 'Copied!';
      btnCopyJson.style.backgroundColor = 'var(--success-color, #10b981)';
      btnCopyJson.style.color = '#ffffff';
      setTimeout(() => {
        btnCopyJson.textContent = origText;
        btnCopyJson.style.backgroundColor = '';
        btnCopyJson.style.color = '';
      }, 1500);
    });
  });

  btnExportSvg.addEventListener('click', () => {
    triggerSVGExport();
  });

  btnImportData.addEventListener('click', () => {
    let val = modalTextarea.value.trim();
    if (!val) return;

    // Remove backslash line continuations
    val = val.replace(/\\\s*\r?\n\s*/g, '');

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
      let importedVertices = [];
      let importedEdges = [];

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

          importedVertices = Array.from(uniqueVertices).map(vId => ({ id: vId, label: vId }));
          importedEdges = parsed.map((edge, idx) => {
            const edgeArr = Array.isArray(edge) ? edge : [edge];
            return {
              id: idx + 1,
              vertices: Array.from(new Set(edgeArr.map(v => String(v))))
            };
          });
        } else {
          throw new Error("Must be a list of lists representing hyperedges");
        }
      } else {
        const parsed = JSON.parse(val.replace(/'/g, '"'));
        if (parsed.vertices && parsed.hyperedges) {
          importedVertices = parsed.vertices;
          importedEdges = parsed.hyperedges.map(edge => ({
            ...edge,
            vertices: Array.from(new Set(edge.vertices))
          }));
        } else if (Array.isArray(parsed)) {
          const uniqueVertices = new Set();
          parsed.forEach(edge => {
            edge.forEach(v => uniqueVertices.add(String(v)));
          });
          importedVertices = Array.from(uniqueVertices).map(vId => ({ id: vId, label: vId }));
          importedEdges = parsed.map((edge, idx) => ({
            id: idx + 1,
            vertices: Array.from(new Set(edge.map(v => String(v))))
          }));
        } else {
          throw new Error("JSON structure must contain 'vertices' and 'hyperedges' lists");
        }
      }

      plotter.pinnedNodeIds.clear();
      plotter.selectedVertexIds.clear();
      plotter.setData({
        vertices: importedVertices,
        hyperedges: importedEdges
      });

      updateHyperedgesList();
      modalOverlay.classList.remove('active');
      setTimeout(() => {
        plotter.zoomToFit();
      }, 150);
    } catch (err) {
      importErrorMsg.textContent = `Error parsing data: ${err.message}`;
      importErrorMsg.style.display = 'block';
    }
  });

  // Modal tab switching listeners
  tabBtnData.addEventListener('click', () => {
    tabBtnData.classList.add('active');
    tabBtnEmbed.classList.remove('active');
    panelData.style.display = 'flex';
    panelEmbed.style.display = 'none';
    modalFooter.style.display = 'flex';
  });

  tabBtnEmbed.addEventListener('click', () => {
    tabBtnEmbed.classList.add('active');
    tabBtnData.classList.remove('active');
    panelEmbed.style.display = 'flex';
    panelData.style.display = 'none';
    modalFooter.style.display = 'none';
  });

  const setupClipboardCopy = (btn, textarea) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        const origText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.backgroundColor = 'var(--success-color, #10b981)';
        btn.style.color = '#ffffff';
        setTimeout(() => {
          btn.textContent = origText;
          btn.style.backgroundColor = '';
          btn.style.color = '';
        }, 1500);
      });
    });
  };

  setupClipboardCopy(btnCopyEmbedIframe, embedIframeCode);

  if (embedOptUi) {
    const onEmbedOptChange = () => updateEmbedCodes();
    embedOptUi.addEventListener('change', onEmbedOptChange);
    embedOptCamera.addEventListener('change', onEmbedOptChange);
    embedOptNodes.addEventListener('change', onEmbedOptChange);
    embedOptControls.addEventListener('change', onEmbedOptChange);
  }

  btnCopyEmbedUrl.addEventListener('click', () => {
    navigator.clipboard.writeText(currentEmbedUrl).then(() => {
      const origText = btnCopyEmbedUrl.textContent;
      btnCopyEmbedUrl.textContent = 'Copied!';
      btnCopyEmbedUrl.style.backgroundColor = 'var(--success-color, #10b981)';
      btnCopyEmbedUrl.style.color = '#ffffff';
      setTimeout(() => {
        btnCopyEmbedUrl.textContent = origText;
        btnCopyEmbedUrl.style.backgroundColor = '';
        btnCopyEmbedUrl.style.color = '';
      }, 1500);
    });
  });

  // Collapsible sidebar sections
  document.querySelectorAll('.sidebar-section:not(#citation-section) .section-title').forEach(title => {
    title.addEventListener('click', () => {
      const section = title.closest('.sidebar-section');
      section.classList.toggle('collapsed');
    });
  });

  window.addEventListener('resize', () => {
    const w = canvasElement.clientWidth || 800;
    const h = canvasElement.clientHeight || 600;
    plotter.setOptions({ width: w, height: h });
  });
}

/**
 * Main Controller Initializer
 */
function init() {
  // Detect and apply embed mode settings
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbed = urlParams.get('embed') === 'true';
  const showUI = urlParams.get('ui') === 'true';
  const showControls = urlParams.get('controls') === 'true';
  
  if (isEmbed) {
    document.body.classList.add('embed-mode');
    const appRoot = document.getElementById('app-root');
    if (appRoot) appRoot.classList.add('embed-mode');
    const sidebar = document.getElementById('control-sidebar');
    if (sidebar) sidebar.style.display = showUI ? 'flex' : 'none';
    const helpTooltip = document.getElementById('canvas-help-tooltip');
    if (helpTooltip) helpTooltip.style.display = 'none';
    const floatingControls = document.getElementById('floating-physics-controls');
    if (floatingControls) floatingControls.style.display = showControls ? 'flex' : 'none';
  }

  const w = canvasElement.clientWidth || 800;
  const h = canvasElement.clientHeight || 600;

  // Instantiate the library class on the SVG container element
  plotter = new HypergraphPlotter(canvasElement, {
    width: w,
    height: h
  });

  // Handle data-sync callback back to sidebar list
  plotter.onDataChanged = updateHyperedgesList;

  // Attempt to load external slider configurations
  fetch('config.json')
    .then(response => {
      if (!response.ok) throw new Error('Not found');
      return response.json();
    })
    .then(config => {
      plotter.setOptions(config);
      syncCustomizationInputs();
    })
    .catch(() => {
      // Fallback silently if config.json is missing or offline
      syncCustomizationInputs();
    })
    .finally(() => {
      // Initialize UI controls
      initControllerEvents();

      // Check if hash contains serialized state, otherwise load default graph
      let loadedFromHash = false;
      const hash = window.location.hash;
      if (hash.startsWith('#state=')) {
        const base64Str = hash.substring(7);
        loadedFromHash = deserializeState(base64Str);
      }

      if (!loadedFromHash) {
        loadDefaultGraph();
      }

      // Apply URL parameter overrides for camera and nodes
      const cameraParam = urlParams.get('camera');
      if (cameraParam === 'fixed') {
        plotter.setOptions({ allowPan: false, allowZoom: false });
      }
      const nodesParam = urlParams.get('nodes');
      if (nodesParam === 'fixed') {
        plotter.setOptions({ physicsPlaying: false, allowDrag: false, hidePinDashes: true });
        plotter.vertices.forEach(v => {
          plotter.pinnedNodeIds.add(v.id);
        });
      }

      // Force a framing zoom calculation once the view has fully rendered
      setTimeout(() => {
        plotter.zoomToFit();
      }, 50);
    });
}

window.addEventListener('DOMContentLoaded', init);
