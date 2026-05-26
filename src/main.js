// ============== RoboRoute v3.0 — Pure Path Planner ===============

// ============== Constants ===============
const RR_CANVAS_WIDTH = 800;
const RR_CANVAS_HEIGHT = 800;
const RR_VEX_MIN = -72;
const RR_VEX_MAX = 72;
const DEFAULT_FIELD_IMAGE = "../assets/fields/override-matches.png";

// ============== Canvas Setup ===============
const rrCanvas = document.getElementById("pathCanvas");
const rrCtx = rrCanvas.getContext("2d");
const drawingCanvas = document.getElementById('drawing-canvas');
const drawingCtx = drawingCanvas.getContext('2d');

// ============== Path Planning State ===============
let rrPoints = [];
let rrHistory = { past: [], future: [] };
let rrMode = "linear";
let rrSelectedPoint = null;
let rrSelectedPointIndex = null;
let rrDeleteMode = false;
let rrInsertMode = false;
let rrTrimMode = false;
let rrIsDraggingPoint = false;
let rrHoverPoint = null;
let rrPointCreationEnabled = true;
let rrJustDeletedPoint = false;

// Zoom / Pan
let rrScale = 1.0;
let rrOffsetX = 0;
let rrOffsetY = 0;
let rrIsPanning = false;
let rrPanStartX = 0;
let rrPanStartY = 0;
let rrPanStartOffsetX = 0;
let rrPanStartOffsetY = 0;
let rrDidPan = false;

// Field background
let rrCurrentFieldImage = new Image();
let rrBackgroundLoaded = false;

// ============== Drawing/Sketchpad State ===============
let drawingModeActive = false;
let isDrawing = false;
let isErasing = false;
let drawingStartX = 0, drawingStartY = 0;
let drawingCurrentX = 0, drawingCurrentY = 0;
let drawingColor = '#ffffff';
let drawingSize = 4;
let drawingShape = 'normal';

// ============== DOM References ===============
const rrPointInfoPanel = document.getElementById("point-editor-card");
const rrPointXInput = document.getElementById("pointXInput");
const rrPointYInput = document.getElementById("pointYInput");
const rrHeadingInput = document.getElementById("headingInput");
const rrClosePointInfoBtn = document.getElementById("closePointInfo");
const rrLinearBtn = document.getElementById("linearBtn");
const rrDeleteBtn = document.getElementById("deleteBtn");
const rrInsertBtn = document.getElementById("insertBtn");
const rrInsertPointBtn = document.getElementById("insertPointBtn");
const rrTrimBtn = document.getElementById("trimBtn");
const rrClearBtn = document.getElementById("clearBtn");
const rrDelayInput = document.getElementById("delayInput");
const rrPointListDiv = document.getElementById("pointList");
const liveCodeEl = document.getElementById("liveCode");

// ============== History Management ===============
function rrSaveState() {
    rrHistory.past.push(JSON.parse(JSON.stringify(rrPoints)));
    rrHistory.future = [];
}

function rrUndo() {
    if (rrHistory.past.length === 0) return;
    rrHistory.future.push(JSON.parse(JSON.stringify(rrPoints)));
    rrPoints = rrHistory.past.pop();
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    rrHidePointInfo();
}

function rrRedo() {
    if (rrHistory.future.length === 0) return;
    rrHistory.past.push(JSON.parse(JSON.stringify(rrPoints)));
    rrPoints = rrHistory.future.pop();
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    rrHidePointInfo();
}

// ============== Coordinate Conversions ===============
function rrVexToCanvas(x, y) {
    const scaleX = RR_CANVAS_WIDTH / (RR_VEX_MAX - RR_VEX_MIN);
    const scaleY = RR_CANVAS_HEIGHT / (RR_VEX_MAX - RR_VEX_MIN);
    return {
        x: (x - RR_VEX_MIN) * scaleX,
        y: (RR_VEX_MAX - y) * scaleY
    };
}

function rrCanvasToVex(x, y) {
    const cx_unscaled = (x - rrOffsetX) / rrScale;
    const cy_unscaled = (y - rrOffsetY) / rrScale;
    const scaleX = (RR_VEX_MAX - RR_VEX_MIN) / RR_CANVAS_WIDTH;
    const scaleY = (RR_VEX_MAX - RR_VEX_MIN) / RR_CANVAS_HEIGHT;
    return {
        x: RR_VEX_MIN + cx_unscaled * scaleX,
        y: RR_VEX_MAX - cy_unscaled * scaleY
    };
}

// ============== Drawing Functions ===============
function rrDrawPoint(vexX, vexY, radius = 6, color = '#bef264', alpha = 1, heading = null, isHighlighted = false, index = null) {
    const { x, y } = rrVexToCanvas(vexX, vexY);

    if (isHighlighted) {
        // Outer pulse ring
        rrCtx.beginPath();
        rrCtx.arc(x, y, radius + 9, 0, 2 * Math.PI);
        rrCtx.fillStyle = 'rgba(6, 182, 212, 0.12)';
        rrCtx.fill();
        // Selection ring
        rrCtx.beginPath();
        rrCtx.arc(x, y, radius + 5, 0, 2 * Math.PI);
        rrCtx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
        rrCtx.lineWidth = 1.5;
        rrCtx.stroke();
    }

    // Glow halo
    rrCtx.beginPath();
    rrCtx.arc(x, y, radius + 2, 0, 2 * Math.PI);
    rrCtx.fillStyle = isHighlighted ? 'rgba(6,182,212,0.2)' : 'rgba(190,242,100,0.15)';
    rrCtx.fill();

    // Point core
    rrCtx.beginPath();
    rrCtx.arc(x, y, radius, 0, 2 * Math.PI);
    rrCtx.fillStyle = isHighlighted ? '#06b6d4' : color;
    rrCtx.globalAlpha = alpha;
    rrCtx.fill();
    rrCtx.globalAlpha = 1;

    // Heading indicator arrow
    if (heading !== null && heading !== undefined) {
        const radians = (90 - heading) * (Math.PI / 180);
        const lineLength = radius * 2.8;
        const endX = x + Math.cos(radians) * lineLength;
        const endY = y - Math.sin(radians) * lineLength;

        rrCtx.beginPath();
        rrCtx.moveTo(x, y);
        rrCtx.lineTo(endX, endY);
        rrCtx.strokeStyle = isHighlighted ? 'rgba(6,182,212,0.9)' : 'rgba(190,242,100,0.8)';
        rrCtx.lineWidth = 2;
        rrCtx.stroke();

        // Arrow tip
        const arrowAngle = Math.atan2(endY - y, endX - x);
        const arrowSize = 5;
        rrCtx.beginPath();
        rrCtx.moveTo(endX, endY);
        rrCtx.lineTo(endX - arrowSize * Math.cos(arrowAngle - Math.PI / 6), endY - arrowSize * Math.sin(arrowAngle - Math.PI / 6));
        rrCtx.moveTo(endX, endY);
        rrCtx.lineTo(endX - arrowSize * Math.cos(arrowAngle + Math.PI / 6), endY - arrowSize * Math.sin(arrowAngle + Math.PI / 6));
        rrCtx.strokeStyle = isHighlighted ? 'rgba(6,182,212,0.9)' : 'rgba(190,242,100,0.8)';
        rrCtx.lineWidth = 2;
        rrCtx.stroke();
    }

    // Index number label
    if (index !== null) {
        rrCtx.font = `bold 11px 'JetBrains Mono', monospace`;
        rrCtx.fillStyle = isHighlighted ? '#06b6d4' : 'rgba(248,250,252,0.75)';
        rrCtx.textAlign = 'left';
        rrCtx.textBaseline = 'top';
        rrCtx.fillText(`${index + 1}`, x + radius + 4, y - radius - 2);
    }
}

function rrDrawLinearPath() {
    if (rrPoints.length < 2) return;

    const start = rrVexToCanvas(rrPoints[0].x, rrPoints[0].y);

    // Outer glow trace
    rrCtx.beginPath();
    rrCtx.moveTo(start.x, start.y);
    for (let i = 1; i < rrPoints.length; i++) {
        const { x, y } = rrVexToCanvas(rrPoints[i].x, rrPoints[i].y);
        rrCtx.lineTo(x, y);
    }
    rrCtx.strokeStyle = 'rgba(190,242,100,0.1)';
    rrCtx.lineWidth = 10;
    rrCtx.lineCap = 'round';
    rrCtx.lineJoin = 'round';
    rrCtx.shadowBlur = 16;
    rrCtx.shadowColor = 'rgba(190,242,100,0.35)';
    rrCtx.stroke();

    // Crisp foreground line
    rrCtx.beginPath();
    rrCtx.moveTo(start.x, start.y);
    for (let i = 1; i < rrPoints.length; i++) {
        const { x, y } = rrVexToCanvas(rrPoints[i].x, rrPoints[i].y);
        rrCtx.lineTo(x, y);
    }
    rrCtx.strokeStyle = '#bef264';
    rrCtx.lineWidth = 2.5;
    rrCtx.lineCap = 'round';
    rrCtx.lineJoin = 'round';
    rrCtx.shadowBlur = 4;
    rrCtx.shadowColor = 'rgba(190,242,100,0.5)';
    rrCtx.stroke();
    rrCtx.shadowBlur = 0;
}

function rrDistToSegment(p, v, w) {
    const l2_sq = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2_sq === 0) return { distance: Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2), point: v, t: 0 };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2_sq;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    const distance = Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
    return { distance, point: projection, segment: [v, w], t };
}

// ============== Live Code Preview ===============
function updateLiveCodePreview() {
    if (!liveCodeEl) return;
    const delay = rrDelayInput ? (parseInt(rrDelayInput.value) || 1000) : 1000;

    if (rrPoints.length === 0) {
        liveCodeEl.innerHTML = `<span class="code-comment">// Place points on the field to</span>\n<span class="code-comment">// generate autonomous code</span>`;
        return;
    }

    const pts = rrPoints.map(p => ({
        x: parseFloat(p.x).toFixed(2),
        y: parseFloat(p.y).toFixed(2),
        h: p.heading !== undefined ? parseFloat(p.heading).toFixed(1) : '0.0'
    }));

    let lines = [];
    lines.push(`<span class="code-comment">// RoboRoute v3.0 — LemLib Autonomous</span>`);
    lines.push(`<span class="code-comment">// ${rrPoints.length} waypoint${rrPoints.length !== 1 ? 's' : ''}</span>`);
    lines.push(``);
    lines.push(`<span class="code-fn">chassis</span><span class="code-dot">.</span><span class="code-method">setPose</span>(<span class="code-num">${pts[0].x}</span>, <span class="code-num">${pts[0].y}</span>, <span class="code-num">${pts[0].h}</span>);`);

    for (let i = 1; i < pts.length; i++) {
        lines.push(`<span class="code-fn">chassis</span><span class="code-dot">.</span><span class="code-method">moveToPose</span>(`);
        lines.push(`  <span class="code-num">${pts[i].x}</span>, <span class="code-num">${pts[i].y}</span>,`);
        lines.push(`  <span class="code-num">${pts[i].h}</span>, <span class="code-num">${delay}</span>`);
        lines.push(`);`);
    }

    liveCodeEl.innerHTML = lines.join('\n');

    // Update path summary
    const pathLengthEl = document.getElementById('pathLength');
    if (pathLengthEl) {
        pathLengthEl.textContent = `${rrPoints.length} pts`;
    }
}

// ============== Copy Code ===============
function copyCode() {
    const delay = rrDelayInput ? (parseInt(rrDelayInput.value) || 1000) : 1000;
    if (rrPoints.length === 0) {
        showToast('No path points to copy.', 'warning');
        return;
    }
    const pts = rrPoints.map(p => ({
        x: parseFloat(p.x).toFixed(2),
        y: parseFloat(p.y).toFixed(2),
        h: p.heading !== undefined ? parseFloat(p.heading).toFixed(1) : '0.0'
    }));
    let code = `// RoboRoute v3.0 — LemLib Autonomous\n// ${rrPoints.length} waypoints\n\n`;
    code += `chassis.setPose(${pts[0].x}, ${pts[0].y}, ${pts[0].h});\n`;
    for (let i = 1; i < pts.length; i++) {
        code += `chassis.moveToPose(${pts[i].x}, ${pts[i].y}, ${pts[i].h}, ${delay});\n`;
    }
    navigator.clipboard.writeText(code).then(() => {
        showToast('LemLib code copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Copy failed — check browser permissions.', 'error');
    });
}

// ============== Save / Load ===============
function savePath() {
    if (rrPoints.length === 0) { showToast('No points to save.', 'warning'); return; }
    localStorage.setItem('rr_path', JSON.stringify(rrPoints));
    showToast(`Path saved — ${rrPoints.length} waypoints stored.`, 'success');
}

function loadPath() {
    const raw = localStorage.getItem('rr_path');
    if (!raw) { showToast('No saved path found.', 'warning'); return; }
    try {
        rrSaveState();
        rrPoints = JSON.parse(raw);
        rrHidePointInfo();
        showToast(`Path loaded — ${rrPoints.length} waypoints restored.`, 'success');
    } catch {
        showToast('Failed to parse saved path.', 'error');
    }
}

function exportJSON() {
    if (rrPoints.length === 0) { showToast('No points to export.', 'warning'); return; }
    const data = JSON.stringify({ version: '3.0', points: rrPoints }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roboroute-path.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Path exported as JSON.', 'success');
}

// ============== Toast Notifications ===============
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'i' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'i'}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

// ============== Field Image ===============
function rrLoadFieldImage(src) {
    rrBackgroundLoaded = false;
    rrCurrentFieldImage = new Image();
    rrCurrentFieldImage.onload = () => { rrBackgroundLoaded = true; };
    rrCurrentFieldImage.onerror = () => {
        console.error('Failed to load field:', src);
        rrCurrentFieldImage.src = DEFAULT_FIELD_IMAGE;
    };
    rrCurrentFieldImage.src = src;
}

// ============== Mode Switching ===============
function rrSetActiveMode(button) {
    rrDeleteMode = false;
    rrInsertMode = false;
    rrTrimMode = false;
    rrPointCreationEnabled = false;

    [rrDeleteBtn, rrInsertBtn, rrTrimBtn, rrLinearBtn].forEach(b => b?.classList.remove('active-mode'));

    if (button === rrInsertBtn) {
        rrInsertMode = true;
    } else if (button === rrDeleteBtn) {
        rrDeleteMode = true;
    } else if (button === rrTrimBtn) {
        rrTrimMode = true;
    } else if (button === rrLinearBtn) {
        rrMode = 'linear';
        rrPointCreationEnabled = true;
    }

    if (button) button.classList.add('active-mode');

    // Update top-bar mode label
    const modeLabel = document.getElementById('activeModeLabel');
    if (modeLabel) {
        const labels = {
            [rrLinearBtn]: 'Linear Mode',
            [rrInsertBtn]: 'Insert Mode',
            [rrDeleteBtn]: 'Delete Mode',
            [rrTrimBtn]: 'Trim Mode',
        };
        modeLabel.textContent = button ? (labels[button] || 'No Mode') : 'No Mode';
        modeLabel.className = 'mode-label' + (button ? ' active' : '');
    }
}

// ============== Point Info Panel ===============
function rrShowPointInfo(index) {
    if (!rrPointInfoPanel) return;
    rrPointInfoPanel.classList.add('show');
    rrSelectedPoint = rrPoints[index];
    rrSelectedPointIndex = index;

    if (rrPointXInput) rrPointXInput.value = rrSelectedPoint.x.toFixed(2);
    if (rrPointYInput) rrPointYInput.value = rrSelectedPoint.y.toFixed(2);
    if (rrSelectedPoint.heading === undefined) rrSelectedPoint.heading = 0;
    if (rrHeadingInput) rrHeadingInput.value = rrSelectedPoint.heading.toFixed(1);

    const badge = document.getElementById('pointIndexValue');
    if (badge) badge.textContent = `P${index + 1}`;
}

function rrHidePointInfo() {
    if (rrPointInfoPanel) rrPointInfoPanel.classList.remove('show');
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    rrUpdatePointList();
}

function rrSelectPoint(index) {
    rrSelectedPointIndex = index;
    rrSelectedPoint = rrPoints[index];
    rrShowPointInfo(index);
    rrUpdatePointList();
}

// ============== Point List ===============
function rrUpdatePointList() {
    if (!rrPointListDiv) return;
    rrPointListDiv.innerHTML = '';

    if (rrPoints.length === 0) {
        rrPointListDiv.innerHTML = `<div class="point-list-empty">No waypoints — click field to begin</div>`;
        return;
    }

    rrPoints.forEach((point, index) => {
        const el = document.createElement('div');
        el.className = 'point-entry' + (rrSelectedPointIndex === index ? ' selected' : '');

        const num = document.createElement('span');
        num.className = 'point-num';
        num.textContent = `P${index + 1}`;

        const coords = document.createElement('span');
        coords.className = 'point-coords';
        coords.textContent = `(${point.x.toFixed(1)}, ${point.y.toFixed(1)}) ${point.heading !== undefined ? point.heading.toFixed(0) : 0}°`;

        el.appendChild(num);
        el.appendChild(coords);
        el.addEventListener('click', () => rrSelectPoint(index));
        rrPointListDiv.appendChild(el);
    });

    updateLiveCodePreview();

    // Scroll selected into view
    const selected = rrPointListDiv.querySelector('.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ============== Insert Midpoint ===============
function rrInsertPointAtIndex(currentIndex) {
    if (currentIndex < rrPoints.length - 1) {
        rrSaveState();
        const p1 = rrPoints[currentIndex];
        const p2 = rrPoints[currentIndex + 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        let midHeading = 0;
        if (p1.heading !== undefined && p2.heading !== undefined) {
            let h1 = p1.heading, h2 = p2.heading;
            if (Math.abs(h1 - h2) > 180) { h1 > h2 ? h2 += 360 : h1 += 360; }
            midHeading = ((h1 + h2) / 2) % 360;
        } else if (p1.heading !== undefined) {
            midHeading = p1.heading;
        }
        rrPoints.splice(currentIndex + 1, 0, { x: midX, y: midY, heading: midHeading });
        rrSelectPoint(currentIndex + 1);
    } else {
        showToast('No next point to insert between.', 'info');
    }
}

// ============== Main Drawing Loop ===============
function redrawCanvas() {
    rrCtx.clearRect(0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    rrCtx.save();
    rrCtx.translate(rrOffsetX, rrOffsetY);
    rrCtx.scale(rrScale, rrScale);

    // Field background
    if (rrBackgroundLoaded && rrCurrentFieldImage.complete) {
        rrCtx.drawImage(rrCurrentFieldImage, 0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    } else {
        rrCtx.fillStyle = '#0a0b0e';
        rrCtx.fillRect(0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    }

    // Path line
    if (rrMode === 'linear') rrDrawLinearPath();

    // Path points
    rrPoints.forEach((point, index) => {
        const heading = point.heading !== undefined ? point.heading : 0;
        const isHighlighted = index === rrSelectedPointIndex;
        rrDrawPoint(point.x, point.y, 5, point.color || '#bef264', 1, heading, isHighlighted, index);
    });

    // Insert hover preview
    if (rrInsertMode && rrHoverPoint) {
        rrDrawPoint(rrHoverPoint.x, rrHoverPoint.y, 4, 'rgba(6,182,212,0.7)', 0.7, null);
    }

    rrCtx.restore();
    requestAnimationFrame(redrawCanvas);
}

// ============== Sketchpad Handlers ===============
function handleDrawingMouseDown(e) {
    if (!drawingModeActive) return;
    const r = drawingCanvas.getBoundingClientRect();
    drawingStartX = e.clientX - r.left;
    drawingStartY = e.clientY - r.top;
    drawingCurrentX = drawingStartX;
    drawingCurrentY = drawingStartY;
    isDrawing = true;
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';
    drawingCtx.strokeStyle = drawingColor;
    drawingCtx.lineWidth = drawingSize;
    if (isErasing) {
        drawingCtx.globalCompositeOperation = 'destination-out';
        drawingCtx.lineWidth = Math.max(12, drawingSize * 2);
    } else {
        drawingCtx.globalCompositeOperation = 'source-over';
    }
    if (drawingShape === 'normal' || isErasing) {
        drawingCtx.beginPath();
        drawingCtx.moveTo(drawingStartX, drawingStartY);
    }
}

function handleDrawingMouseMove(e) {
    if (!drawingModeActive || !isDrawing) return;
    const r = drawingCanvas.getBoundingClientRect();
    drawingCurrentX = e.clientX - r.left;
    drawingCurrentY = e.clientY - r.top;
    if (drawingShape === 'normal' || isErasing) {
        drawingCtx.lineTo(drawingCurrentX, drawingCurrentY);
        drawingCtx.stroke();
        drawingCtx.beginPath();
        drawingCtx.moveTo(drawingCurrentX, drawingCurrentY);
    }
}

function handleDrawingMouseUp(e) {
    if (!drawingModeActive || !isDrawing) return;
    const r = drawingCanvas.getBoundingClientRect();
    drawingCurrentX = e.clientX - r.left;
    drawingCurrentY = e.clientY - r.top;
    if (isErasing) {
        drawingCtx.lineTo(drawingCurrentX, drawingCurrentY);
        drawingCtx.stroke();
    } else if (drawingShape === 'square') {
        drawingCtx.strokeRect(drawingStartX, drawingStartY, drawingCurrentX - drawingStartX, drawingCurrentY - drawingStartY);
    } else if (drawingShape === 'arrow') {
        drawingCtx.beginPath();
        drawingCtx.moveTo(drawingStartX, drawingStartY);
        drawingCtx.lineTo(drawingCurrentX, drawingCurrentY);
        drawingCtx.stroke();
        const a = Math.atan2(drawingCurrentY - drawingStartY, drawingCurrentX - drawingStartX);
        const hL = drawingSize * 3;
        drawingCtx.beginPath();
        drawingCtx.moveTo(drawingCurrentX, drawingCurrentY);
        drawingCtx.lineTo(drawingCurrentX - hL * Math.cos(a - Math.PI / 6), drawingCurrentY - hL * Math.sin(a - Math.PI / 6));
        drawingCtx.moveTo(drawingCurrentX, drawingCurrentY);
        drawingCtx.lineTo(drawingCurrentX - hL * Math.cos(a + Math.PI / 6), drawingCurrentY - hL * Math.sin(a + Math.PI / 6));
        drawingCtx.stroke();
    } else if (drawingShape === 'normal') {
        drawingCtx.lineTo(drawingCurrentX, drawingCurrentY);
        drawingCtx.stroke();
    }
    isDrawing = false;
    drawingCtx.globalCompositeOperation = 'source-over';
}

// ============== Event Listeners ===============
function setupEventListeners() {
    // Mode buttons
    rrLinearBtn?.addEventListener('click', () => {
        if (rrLinearBtn.classList.contains('active-mode')) { rrSetActiveMode(null); rrMode = null; }
        else { rrMode = 'linear'; rrSetActiveMode(rrLinearBtn); }
    });
    rrInsertBtn?.addEventListener('click', () => rrSetActiveMode(rrInsertMode ? null : rrInsertBtn));
    rrDeleteBtn?.addEventListener('click', () => rrSetActiveMode(rrDeleteMode ? null : rrDeleteBtn));
    rrTrimBtn?.addEventListener('click', () => rrSetActiveMode(rrTrimMode ? null : rrTrimBtn));

    rrClearBtn?.addEventListener('click', () => {
        if (rrPoints.length === 0) return;
        if (confirm('Clear all path waypoints?')) {
            rrSaveState();
            rrPoints = [];
            rrHidePointInfo();
            rrSetActiveMode(rrLinearBtn);
            showToast('Path cleared.', 'info');
        }
    });

    // Copy / Save / Load / Export
    document.getElementById('copyCodeBtn')?.addEventListener('click', copyCode);
    document.getElementById('savePathBtn')?.addEventListener('click', savePath);
    document.getElementById('loadPathBtn')?.addEventListener('click', loadPath);
    document.getElementById('exportJsonBtn')?.addEventListener('click', exportJSON);

    // Delay input → live update
    rrDelayInput?.addEventListener('input', updateLiveCodePreview);

    // Canvas: mousedown
    rrCanvas.addEventListener('mousedown', (e) => {
        if (drawingModeActive) return;

        // Right-click (2), middle-click (1), or Left-click + Shift/Ctrl/Cmd triggers panning
        if (e.button === 2 || e.button === 1 || (e.button === 0 && (e.shiftKey || e.ctrlKey || e.metaKey))) {
            rrIsPanning = true;
            rrPanStartX = e.clientX;
            rrPanStartY = e.clientY;
            rrPanStartOffsetX = rrOffsetX;
            rrPanStartOffsetY = rrOffsetY;
            rrDidPan = false;
            rrCanvas.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);

        // Check path points
        for (let i = 0; i < rrPoints.length; i++) {
            const pt = rrPoints[i];
            const dist = Math.sqrt((vexX - pt.x) ** 2 + (vexY - pt.y) ** 2);
            if (dist < 2.8) {
                if (e.button === 0) {
                    if (rrDeleteMode) {
                        rrSaveState();
                        rrPoints.splice(i, 1);
                        if (rrSelectedPointIndex === i) {
                            rrHidePointInfo();
                        } else {
                            if (rrSelectedPointIndex > i) {
                                rrSelectedPointIndex--;
                            }
                            rrUpdatePointList();
                        }
                        rrJustDeletedPoint = true;
                        setTimeout(() => { rrJustDeletedPoint = false; }, 100);
                        return;
                    } else {
                        rrIsDraggingPoint = true;
                        rrSelectPoint(i);
                    }
                }
                return;
            }
        }
    });

    // Canvas: mousemove
    rrCanvas.addEventListener('mousemove', (e) => {
        if (drawingModeActive) return;

        if (rrIsPanning) {
            const dx = e.clientX - rrPanStartX;
            const dy = e.clientY - rrPanStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                rrDidPan = true;
            }
            rrOffsetX = rrPanStartOffsetX + dx;
            rrOffsetY = rrPanStartOffsetY + dy;
            rrCanvas.style.cursor = 'grabbing';
            return;
        }

        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);

        if (rrIsDraggingPoint && rrSelectedPoint) {
            rrSelectedPoint.x = vexX;
            rrSelectedPoint.y = vexY;
            if (rrPointXInput) rrPointXInput.value = vexX.toFixed(2);
            if (rrPointYInput) rrPointYInput.value = vexY.toFixed(2);
            updateLiveCodePreview();
            return;
        }

        if (rrInsertMode && rrPoints.length >= 2) {
            let minDist = Infinity;
            let closestSegPt = null;
            let segInfo = null;
            for (let i = 0; i < rrPoints.length - 1; i++) {
                const result = rrDistToSegment({ x: vexX, y: vexY }, rrPoints[i], rrPoints[i + 1]);
                if (result.distance < minDist && result.distance < 2.5) {
                    minDist = result.distance;
                    closestSegPt = result.point;
                    segInfo = { segmentIndex: i, t: result.t };
                }
            }
            rrHoverPoint = closestSegPt ? { x: closestSegPt.x, y: closestSegPt.y, ...segInfo } : null;
            rrCanvas.style.cursor = rrHoverPoint ? 'copy' : 'crosshair';
        } else if (rrDeleteMode) {
            let onPt = false;
            for (let i = 0; i < rrPoints.length; i++) {
                const dist = Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2);
                if (dist < 2.8) { rrPoints[i].color = '#f87171'; onPt = true; }
                else { rrPoints[i].color = '#bef264'; }
            }
            rrCanvas.style.cursor = onPt ? 'not-allowed' : 'crosshair';
        } else if (e.shiftKey || e.ctrlKey || e.metaKey) {
            rrCanvas.style.cursor = 'grab';
        } else {
            rrCanvas.style.cursor = 'crosshair';
        }
    });

    // Canvas: mouseup
    rrCanvas.addEventListener('mouseup', (e) => {
        if (drawingModeActive) return;
        if (rrIsPanning) {
            rrIsPanning = false;
            rrCanvas.style.cursor = (e.shiftKey || e.ctrlKey || e.metaKey) ? 'grab' : 'crosshair';
            return;
        }
        if (rrIsDraggingPoint && rrSelectedPoint) rrSaveState();
        rrIsDraggingPoint = false;
    });

    // Prevent context menu to allow smooth right-click dragging
    rrCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Canvas: mouseleave
    rrCanvas.addEventListener('mouseleave', () => {
        if (rrIsPanning) {
            rrIsPanning = false;
        }
    });

    // Canvas: click (place points)
    rrCanvas.addEventListener('click', (e) => {
        if (drawingModeActive || e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || rrDidPan) {
            if (rrDidPan) rrDidPan = false;
            return;
        }
        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);

        if (rrTrimMode) {
            for (let i = 0; i < rrPoints.length; i++) {
                if (Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2) < 2.8) {
                    rrSaveState();
                    rrPoints.splice(i);
                    rrHidePointInfo();
                    return;
                }
            }
        } else if (rrInsertMode && rrHoverPoint) {
            rrSaveState();
            let h = 0;
            if (rrPoints.length > 0 && rrPoints[rrHoverPoint.segmentIndex].heading !== undefined &&
                rrPoints[rrHoverPoint.segmentIndex + 1].heading !== undefined) {
                const h1 = rrPoints[rrHoverPoint.segmentIndex].heading;
                const h2 = rrPoints[rrHoverPoint.segmentIndex + 1].heading;
                h = h1 + (h2 - h1) * rrHoverPoint.t;
            }
            const insertIdx = rrHoverPoint.segmentIndex + 1;
            rrPoints.splice(insertIdx, 0, { x: rrHoverPoint.x, y: rrHoverPoint.y, heading: h });
            rrHoverPoint = null;
            rrSelectPoint(insertIdx);
            return;
        } else if (rrDeleteMode) {
            return;
        }

        // Add new waypoint
        if (rrPointCreationEnabled && !rrDeleteMode && !rrInsertMode && !rrTrimMode && !rrIsDraggingPoint && !rrJustDeletedPoint) {
            let clickedExisting = false;
            for (let i = 0; i < rrPoints.length; i++) {
                if (Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2) < 2.8) {
                    clickedExisting = true;
                    rrSelectPoint(i);
                    break;
                }
            }
            if (!clickedExisting) {
                rrSaveState();
                const newPt = { x: vexX, y: vexY, heading: 0 };
                if (rrPoints.length > 0 && rrPoints[rrPoints.length - 1].heading !== undefined) {
                    newPt.heading = rrPoints[rrPoints.length - 1].heading;
                }
                rrPoints.push(newPt);
                rrSelectPoint(rrPoints.length - 1);
                updateLiveCodePreview();
            }
        }
    });

    // Scroll wheel: adjust heading
    rrCanvas.addEventListener('wheel', (e) => {
        if (drawingModeActive || !rrSelectedPoint) return;
        e.preventDefault();
        rrSaveState();
        if (rrSelectedPoint.heading === undefined) rrSelectedPoint.heading = 0;
        const d = e.deltaY > 0 ? -5 : 5;
        rrSelectedPoint.heading = ((rrSelectedPoint.heading + d + 360) % 360);
        if (rrHeadingInput) rrHeadingInput.value = rrSelectedPoint.heading.toFixed(1);
        updateLiveCodePreview();
    }, { passive: false });

    // Sketchpad
    drawingCanvas.addEventListener('mousedown', handleDrawingMouseDown);
    drawingCanvas.addEventListener('mousemove', handleDrawingMouseMove);
    drawingCanvas.addEventListener('mouseup', handleDrawingMouseUp);
    drawingCanvas.addEventListener('mouseleave', () => { if (isDrawing) isDrawing = false; });

    document.getElementById('toggle-drawing')?.addEventListener('click', function () {
        drawingModeActive = !drawingModeActive;
        this.textContent = drawingModeActive ? 'Disable Sketchpad' : 'Enable Sketchpad';
        this.classList.toggle('active-mode', drawingModeActive);
        drawingCanvas.classList.toggle('drawing-active', drawingModeActive);
        if (!drawingModeActive) {
            isErasing = false;
            drawingCtx.globalCompositeOperation = 'source-over';
            rrCanvas.style.cursor = 'crosshair';
        } else {
            rrCanvas.style.cursor = 'default';
        }
    });

    // Color palette initialization
    const googleColors = [
        "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
        "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
        "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
        "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
        "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9ee1", "#6fa8dc", "#8e7cc3", "#c27ba0",
        "#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79",
        "#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47",
        "#5b0f00", "#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4d1234"
    ];

    const paletteContainer = document.getElementById('drawing-color-palette');
    if (paletteContainer) {
        paletteContainer.innerHTML = '';
        googleColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color.toUpperCase();
            
            // Contrast check for checkmark color
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
            if (hsp > 200) swatch.classList.add('light-color');

            if (color === '#ffffff') {
                swatch.classList.add('selected');
                drawingColor = '#ffffff';
            }

            swatch.addEventListener('click', () => {
                paletteContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                drawingColor = color;
                isErasing = false;
            });
            paletteContainer.appendChild(swatch);
        });
    }

    // Brush Size chip setup
    const brushSizeChip = document.getElementById("brushSizeChip");
    const brushSizeVal = document.getElementById("brushSizeVal");
    const brushSizeInput = document.getElementById("brushSizeInput");

    let isDraggingBrushSize = false;
    let dragBrushSizeStartX = 0;
    let dragBrushSizeStartVal = 4;
    let hasDraggedBrushSize = false;

    function updateBrushSize(newSize) {
        drawingSize = Math.max(1, Math.min(100, Math.round(newSize)));
        if (brushSizeVal) brushSizeVal.textContent = drawingSize + 'px';
        if (brushSizeInput) brushSizeInput.value = drawingSize;
    }

    const handleBrushSizeDragStart = (e) => {
        if (e.target.tagName === 'INPUT') return;
        isDraggingBrushSize = true;
        dragBrushSizeStartX = e.touches ? e.touches[0].clientX : e.clientX;
        dragBrushSizeStartVal = drawingSize;
        hasDraggedBrushSize = false;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    };

    brushSizeChip?.addEventListener('mousedown', handleBrushSizeDragStart);
    brushSizeChip?.addEventListener('touchstart', handleBrushSizeDragStart, { passive: false });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingBrushSize) return;
        const dx = e.clientX - dragBrushSizeStartX;
        if (Math.abs(dx) > 3) hasDraggedBrushSize = true;
        const newSize = dragBrushSizeStartVal + dx * 0.2;
        updateBrushSize(newSize);
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDraggingBrushSize || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - dragBrushSizeStartX;
        if (Math.abs(dx) > 3) hasDraggedBrushSize = true;
        const newSize = dragBrushSizeStartVal + dx * 0.2;
        updateBrushSize(newSize);
    }, { passive: true });

    function showBrushSizeInput() {
        if (!brushSizeVal || !brushSizeInput) return;
        brushSizeVal.style.display = 'none';
        brushSizeInput.style.display = 'inline-block';
        brushSizeInput.value = drawingSize;
        brushSizeInput.focus();
        brushSizeInput.select();
    }

    function applyBrushSizeInput() {
        if (!brushSizeInput) return;
        const val = parseInt(brushSizeInput.value);
        if (!isNaN(val)) updateBrushSize(val);
        else updateBrushSize(drawingSize);
        hideBrushSizeInput();
    }

    function hideBrushSizeInput() {
        if (!brushSizeVal || !brushSizeInput) return;
        brushSizeInput.style.display = 'none';
        brushSizeVal.style.display = 'inline-block';
    }

    const handleBrushSizeDragEnd = () => {
        if (isDraggingBrushSize) {
            isDraggingBrushSize = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (!hasDraggedBrushSize) showBrushSizeInput();
        }
    };

    window.addEventListener('mouseup', handleBrushSizeDragEnd);
    window.addEventListener('touchend', handleBrushSizeDragEnd);

    brushSizeInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyBrushSizeInput();
        else if (e.key === 'Escape') { hideBrushSizeInput(); e.stopPropagation(); }
    });
    brushSizeInput?.addEventListener('blur', applyBrushSizeInput);

    document.getElementById('drawing-shape')?.addEventListener('change', (e) => { drawingShape = e.target.value; });

    document.getElementById('erase-tool')?.addEventListener('click', () => {
        if (!drawingModeActive) document.getElementById('toggle-drawing')?.click();
        isErasing = true;
    });
    document.getElementById('clear-drawing')?.addEventListener('click', () => {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); rrUndo(); }
            else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); rrRedo(); }
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (rrSelectedPointIndex !== null && !e.ctrlKey && !e.metaKey) {
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
                e.preventDefault();
                rrSaveState();
                rrPoints.splice(rrSelectedPointIndex, 1);
                rrHidePointInfo();
                updateLiveCodePreview();
            }
        }
    });

    // Point editor inputs
    rrPointXInput?.addEventListener('input', () => {
        if (rrSelectedPoint) { rrSaveState(); rrSelectedPoint.x = parseFloat(rrPointXInput.value) || 0; updateLiveCodePreview(); }
    });
    rrPointYInput?.addEventListener('input', () => {
        if (rrSelectedPoint) { rrSaveState(); rrSelectedPoint.y = parseFloat(rrPointYInput.value) || 0; updateLiveCodePreview(); }
    });
    rrHeadingInput?.addEventListener('input', () => {
        if (rrSelectedPoint) {
            rrSaveState();
            let v = parseFloat(rrHeadingInput.value);
            v = ((v % 360) + 360) % 360;
            rrSelectedPoint.heading = v;
            rrHeadingInput.value = v.toFixed(1);
            updateLiveCodePreview();
        }
    });

    rrInsertPointBtn?.addEventListener('click', () => {
        if (rrSelectedPointIndex !== null) rrInsertPointAtIndex(rrSelectedPointIndex);
    });
    rrClosePointInfoBtn?.addEventListener('click', rrHidePointInfo);
    document.getElementById('closePointList')?.addEventListener('click', rrHidePointInfo);

    // Field selector
    const fieldSelect = document.getElementById('fieldSelect');
    const fileInput = document.getElementById('customFieldInput');
    const uploadBtn = document.getElementById('uploadFieldBtn');
    fieldSelect?.addEventListener('change', function () {
        if (this.value === 'custom') {
            if (fileInput) fileInput.style.display = 'inline-block';
            if (uploadBtn) uploadBtn.style.display = 'inline-block';
        } else {
            if (fileInput) fileInput.style.display = 'none';
            if (uploadBtn) uploadBtn.style.display = 'none';
            rrLoadFieldImage(this.value);

            // Update field name readout
            const fieldNameEl = document.getElementById('fieldName');
            if (fieldNameEl) fieldNameEl.textContent = fieldSelect.options[fieldSelect.selectedIndex].text;
        }
    });
    fileInput?.addEventListener('change', function () {
        if (this.files?.[0]) {
            if (uploadBtn) uploadBtn.textContent = 'Upload ' + (this.files[0].name.length > 10 ? this.files[0].name.substring(0, 7) + '...' : this.files[0].name);
        }
    });
    uploadBtn?.addEventListener('click', () => {
        if (fileInput?.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (e) => rrLoadFieldImage(e.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        }
    });

    // Drag-to-zoom on scaleChip and canvasChip
    const scaleChip = document.getElementById("scaleChip");
    const canvasChip = document.getElementById("canvasChip");
    const scaleVal = document.getElementById("scaleVal");
    const canvasZoomVal = document.getElementById("canvasZoomVal");
    const scaleInput = document.getElementById("scaleInput");
    const canvasZoomInput = document.getElementById("canvasZoomInput");

    let isDraggingZoom = false;
    let dragZoomStartX = 0;
    let dragZoomStartScale = 1.0;
    let dragZoomTarget = null;
    let hasDragged = false;

    function updateZoom(newScale) {
        rrScale = Math.max(0.5, Math.min(5.0, newScale));
        rrOffsetX = 400 - 400 * rrScale;
        rrOffsetY = 400 - 400 * rrScale;

        if (scaleVal) scaleVal.textContent = rrScale.toFixed(2) + '×';
        if (canvasZoomVal) canvasZoomVal.textContent = Math.round(rrScale * 800) + 'px';

        if (scaleInput) scaleInput.value = rrScale.toFixed(2);
        if (canvasZoomInput) canvasZoomInput.value = Math.round(rrScale * 800);
    }

    const handleZoomDragStart = (e) => {
        // If clicking/interacting with the input element itself, don't drag-zoom
        if (e.target.tagName === 'INPUT') return;

        isDraggingZoom = true;
        dragZoomTarget = e.currentTarget === scaleChip ? 'scale' : 'canvas';
        dragZoomStartX = e.touches ? e.touches[0].clientX : e.clientX;
        dragZoomStartScale = rrScale;
        hasDragged = false;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    };

    scaleChip?.addEventListener('mousedown', handleZoomDragStart);
    canvasChip?.addEventListener('mousedown', handleZoomDragStart);
    scaleChip?.addEventListener('touchstart', handleZoomDragStart, { passive: false });
    canvasChip?.addEventListener('touchstart', handleZoomDragStart, { passive: false });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingZoom) return;
        const dx = e.clientX - dragZoomStartX;
        if (Math.abs(dx) > 3) {
            hasDragged = true;
        }
        const scaleDelta = dx * 0.005; // 0.005 is smooth and responsive
        const newScale = dragZoomStartScale + scaleDelta;
        updateZoom(newScale);
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDraggingZoom || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - dragZoomStartX;
        if (Math.abs(dx) > 3) {
            hasDragged = true;
        }
        const scaleDelta = dx * 0.005;
        const newScale = dragZoomStartScale + scaleDelta;
        updateZoom(newScale);
    }, { passive: true });

    function showScaleInput() {
        if (!scaleVal || !scaleInput) return;
        scaleVal.style.display = 'none';
        scaleInput.style.display = 'inline-block';
        scaleInput.value = rrScale.toFixed(2);
        scaleInput.focus();
        scaleInput.select();
    }

    function showCanvasInput() {
        if (!canvasZoomVal || !canvasZoomInput) return;
        canvasZoomVal.style.display = 'none';
        canvasZoomInput.style.display = 'inline-block';
        canvasZoomInput.value = Math.round(rrScale * 800);
        canvasZoomInput.focus();
        canvasZoomInput.select();
    }

    function applyScaleInput() {
        if (!scaleInput) return;
        const val = parseFloat(scaleInput.value);
        if (!isNaN(val)) {
            updateZoom(val);
        } else {
            updateZoom(rrScale);
        }
        hideScaleInput();
    }

    function hideScaleInput() {
        if (!scaleVal || !scaleInput) return;
        scaleInput.style.display = 'none';
        scaleVal.style.display = 'inline-block';
    }

    function applyCanvasInput() {
        if (!canvasZoomInput) return;
        const val = parseInt(canvasZoomInput.value);
        if (!isNaN(val)) {
            const newScale = val / 800;
            updateZoom(newScale);
        } else {
            updateZoom(rrScale);
        }
        hideCanvasInput();
    }

    function hideCanvasInput() {
        if (!canvasZoomVal || !canvasZoomInput) return;
        canvasZoomInput.style.display = 'none';
        canvasZoomVal.style.display = 'inline-block';
    }

    const handleZoomDragEnd = () => {
        if (isDraggingZoom) {
            isDraggingZoom = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // If we just clicked (not dragged), show input field for typing
            if (!hasDragged) {
                if (dragZoomTarget === 'scale') {
                    showScaleInput();
                } else if (dragZoomTarget === 'canvas') {
                    showCanvasInput();
                }
            }
        }
    };

    window.addEventListener('mouseup', handleZoomDragEnd);
    window.addEventListener('touchend', handleZoomDragEnd);

    // Input event listeners (Enter / Esc / Blur)
    scaleInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            applyScaleInput();
        } else if (e.key === 'Escape') {
            hideScaleInput();
            e.stopPropagation();
        }
    });
    scaleInput?.addEventListener('blur', applyScaleInput);

    canvasZoomInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            applyCanvasInput();
        } else if (e.key === 'Escape') {
            hideCanvasInput();
            e.stopPropagation();
        }
    });
    canvasZoomInput?.addEventListener('blur', applyCanvasInput);

    // Double click to reset
    const handleZoomReset = () => {
        updateZoom(1.0);
    };

    scaleChip?.addEventListener('dblclick', handleZoomReset);
    canvasChip?.addEventListener('dblclick', handleZoomReset);
}

// ============== Init ===============
window.addEventListener('DOMContentLoaded', () => {
    rrMode = 'linear';
    rrPointCreationEnabled = true;
    rrLinearBtn?.classList.add('active-mode');

    // Update initial readout values
    const scaleVal = document.getElementById("scaleVal");
    const canvasZoomVal = document.getElementById("canvasZoomVal");
    const scaleInput = document.getElementById("scaleInput");
    const canvasZoomInput = document.getElementById("canvasZoomInput");
    if (scaleVal) scaleVal.textContent = rrScale.toFixed(2) + '×';
    if (canvasZoomVal) canvasZoomVal.textContent = Math.round(rrScale * 800) + 'px';
    if (scaleInput) scaleInput.value = rrScale.toFixed(2);
    if (canvasZoomInput) canvasZoomInput.value = Math.round(rrScale * 800);

    rrUpdatePointList();
    updateLiveCodePreview();
    rrLoadFieldImage(DEFAULT_FIELD_IMAGE);
    setupEventListeners();
    redrawCanvas();
});
