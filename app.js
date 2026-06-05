import { HypergraphPlotter } from './hypergraph-plotter.js';

// Application Controller State
let plotter = null;
let editingEdgeId = null;

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
    const isEditing = editingEdgeId === edge.id;

    if (isEditing) {
      const rawVerticesString = edge.vertices.map(vId => {
        const v = plotter.vertices.find(vn => vn.id === vId);
        return v ? v.label : vId;
      }).join(', ');

      item.innerHTML = `
        <div class="list-item-content">
          <div class="item-color-pill-wrapper" style="position: relative; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; cursor: pointer;" title="Choose custom edge color">
            <div class="item-color-pill" style="background-color: ${color}; width: 100%; height: 100%; border-radius: 2px;"></div>
            <input type="color" class="edge-color-picker" data-edge-color-id="${edge.id}" value="${color.startsWith('hsl') ? plotter.hslToHex(color) : color}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0;">
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
        const v = plotter.vertices.find(vn => vn.id === vId);
        return v ? v.label : vId;
      }).join(', ')}}`;

      item.innerHTML = `
        <div class="list-item-content">
          <div class="item-color-pill-wrapper" style="position: relative; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; cursor: pointer;" title="Choose custom edge color">
            <div class="item-color-pill" style="background-color: ${color}; width: 100%; height: 100%; border-radius: 2px;"></div>
            <input type="color" class="edge-color-picker" data-edge-color-id="${edge.id}" value="${color.startsWith('hsl') ? plotter.hslToHex(color) : color}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0;">
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

  // Attach dynamic list-item event listeners
  document.querySelectorAll('[data-del-edge-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-del-edge-id'));
      removeHyperedge(id);
    });
  });

  document.querySelectorAll('.edge-color-picker').forEach(picker => {
    picker.addEventListener('change', (e) => {
      const id = parseInt(picker.getAttribute('data-edge-color-id'));
      const edge = plotter.hyperedges.find(e => e.id === id);
      if (edge) {
        edge.color = e.target.value;
        updateHyperedgesList();
        plotter.draw();
      }
    });
  });

  document.querySelectorAll('[data-reset-edge-color-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-reset-edge-color-id'));
      const edge = plotter.hyperedges.find(e => e.id === id);
      if (edge) {
        delete edge.color;
        updateHyperedgesList();
        plotter.draw();
      }
    });
  });

  document.querySelectorAll('[data-edit-edge-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-edit-edge-id'));
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
    const input = document.querySelector(`[data-edit-input-id="${id}"]`);
    if (input) {
      const val = input.value.trim();
      const parts = val.split(',').map(s => s.trim()).filter(Boolean);
      editingEdgeId = null;
      editHyperedge(id, parts);
    }
  };

  document.querySelectorAll('[data-save-edge-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-save-edge-id'));
      saveAction(id);
    });
  });

  document.querySelectorAll('[data-edit-input-id]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      const id = parseInt(input.getAttribute('data-edit-input-id'));
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
  const filteredEdges = plotter.hyperedges.filter(e => e.id !== id);
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
function editHyperedge(id, vertexIdentifiers) {
  const edge = plotter.hyperedges.find(e => e.id === id);
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
 * Loads the default demonstration hypergraph (Modular Network).
 */
function loadDefaultGraph() {
  const defaultVertices = [
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
  const defaultEdges = [
    { id: 1, vertices: ['1', '2', '3'] },
    { id: 2, vertices: ['4', '5', '6'] },
    { id: 3, vertices: ['7', '8', '9'] },
    { id: 4, vertices: ['3', '4'] },
    { id: 5, vertices: ['6', '7'] },
    { id: 6, vertices: ['9', '1'] }
  ];

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

  sliderRestLength.value = opt.restLength;
  inputRestLength.value = opt.restLength;
  resizeNumberInput(inputRestLength);

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
  switchBoundary.value = opt.showSubsetBoundary;
  switchEdge.value = opt.showSubsetEdge;
  switchHubs.value = opt.showHubs;
  switchGrid.value = opt.showGrid;
  inputGridColor.value = opt.gridColor;
  sliderGridOpacity.value = opt.gridOpacity;
  inputGridOpacity.value = opt.gridOpacity;
  resizeNumberInput(inputGridOpacity);
  switchPinOnDrag.checked = opt.pinOnDrag;

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
  linkSliderAndInput(sliderRestLength, inputRestLength, (val) => plotter.setOptions({ restLength: val }));
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

  switchGrid.addEventListener('change', (e) => {
    const val = e.target.checked;
    gridCustomControls.style.display = val ? 'flex' : 'none';
    plotter.setOptions({ showGrid: val });
  });

  inputGridColor.addEventListener('input', (e) => {
    plotter.setOptions({ gridColor: e.target.value });
  });

  // Pinning settings
  switchPinOnDrag.addEventListener('change', (e) => {
    plotter.setOptions({ pinOnDrag: e.target.checked });
  });

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
    btnPhysicsPlayPause.textContent = isPlaying ? '⏸' : '▶';
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
        const parsed = JSON.parse(val);
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
  const w = canvasElement.clientWidth || 800;
  const h = canvasElement.clientHeight || 600;

  // Instantiate the library class on the SVG container element
  plotter = new HypergraphPlotter(canvasElement, {
    width: w,
    height: h,
    initialZoom: 1.5
  });

  // Handle data-sync callback back to sidebar list
  plotter.onDataChanged = updateHyperedgesList;

  // Initialize UI controls
  syncCustomizationInputs();
  initControllerEvents();
  loadDefaultGraph();
}

window.addEventListener('DOMContentLoaded', init);
