// ============== Global Variables and Constants ===============
// --- RoboRoute Variables ---
const rrCanvas = document.getElementById("pathCanvas");
const rrCtx = rrCanvas.getContext("2d");

let rrPoints = []; // Renamed from 'points' to avoid conflict
let rrHistory = { past: [], future: [] };
let rrMode = "linear"; // For path type (linear, bezier)
let rrSelectedPoint = null;
let rrSelectedPointIndex = null;
let rrDeleteMode = false; // Path point deletion
let rrInsertMode = false; // Path segment insertion
let rrTrimMode = false;   // Path trimming
let rrIsDraggingPoint = false;
let rrHoverPoint = null; // For inserting on path segment

const rrPointInfoPanel = document.getElementById("pointInfo");
const rrPointXInput = document.createElement("input");
const rrPointYInput = document.createElement("input");
const rrHeadingInput = document.createElement("input"); // Create heading input once
const rrClosePointInfoBtn = document.getElementById("closePointInfo");
const rrDeleteBtn = document.getElementById("deleteBtn"); // Path delete
const rrInsertBtn = document.getElementById("insertBtn"); // Path insert
const rrInsertPointBtn = document.getElementById("insertPointBtn"); // Insert midpoint in panel
const rrTrimBtn = document.getElementById("trimBtn");   // Path trim
const rrClearBtn = document.getElementById("clearBtn"); // Path clear
const rrGenerateBtn = document.getElementById("generateBtn");
const rrDelayInput = document.getElementById("delayInput");

let rrPointListContainer; // Will be created
let rrPointListDiv;       // Will be created

const RR_CANVAS_WIDTH = rrCanvas.width;
const RR_CANVAS_HEIGHT = rrCanvas.height;
const RR_VEX_MIN = -72; // Inches
const RR_VEX_MAX = 72;  // Inches

// Zoom and Pan for RoboRoute path view (optional, from original RR if implemented)
let rrScale = 1.0;
let rrOffsetX = 0;
let rrOffsetY = 0;

let rrCurrentFieldImage = new Image();
let rrBackgroundLoaded = false;
const DEFAULT_FIELD_IMAGE = "../assets/fields/high-stakes-matches.png"; // Default for VexPlan

// --- VexPlan Variables ---
const VP_FIELD_SIZE = 800; // Match RoboRoute's canvas size (VexPlan was 720)
const VP_ROBOT_SIZE = Math.round(90 * (VP_FIELD_SIZE / 720)); // Scale robot size
const VP_MOBILE_GOAL_SIZE = Math.round(50 * (VP_FIELD_SIZE / 720));
const VP_STAKE_RADIUS = Math.round(9 * (VP_FIELD_SIZE / 720));
const VP_LADDER_SIZE = Math.round(240 * (VP_FIELD_SIZE / 720));
const VP_CORNER_SIZE = Math.round(60 * (VP_FIELD_SIZE / 720));
const VP_RING_OUTER_RADIUS = Math.round(7 * (VP_FIELD_SIZE / 720));
const VP_RING_INNER_RADIUS = Math.round(4 * (VP_FIELD_SIZE / 720));

const vpDrawingCanvas = document.getElementById('drawing-canvas');
const vpDrawingCtx = vpDrawingCanvas.getContext('2d');
const vpContextMenu = document.getElementById('context-menu');

let vpDrawingModeActive = false; // VexPlan's drawing mode
let vpIsDrawing = false;
let vpIsErasing = false;
let vpDrawingStartX = 0, vpDrawingStartY = 0;
let vpDrawingCurrentX = 0, vpDrawingCurrentY = 0;
let vpDrawingColor = 'black';
let vpDrawingSize = 2;
let vpDrawingShape = 'normal';

const vpRobots = [
    { id: 'r1', x: scaleVpCoord(30), y: scaleVpCoord(30), color: 'red', alliance: 'red', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'r2', x: scaleVpCoord(30), y: scaleVpCoord(VP_FIELD_SIZE - 120), color: 'red', alliance: 'red', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'b1', x: scaleVpCoord(VP_FIELD_SIZE - 120), y: scaleVpCoord(30), color: 'blue', alliance: 'blue', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'b2', x: scaleVpCoord(VP_FIELD_SIZE - 120), y: scaleVpCoord(VP_FIELD_SIZE - 120), color: 'blue', alliance: 'blue', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" }
];

const vpMobileGoals = [
    { id: 'mg1', x: scaleVpCoord(480), y: scaleVpCoord(235), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg2', x: scaleVpCoord(360), y: scaleVpCoord(595), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg3', x: scaleVpCoord(240), y: scaleVpCoord(235), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg4', x: scaleVpCoord(480), y: scaleVpCoord(475), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg5', x: scaleVpCoord(240), y: scaleVpCoord(475), maxRings: 6, ringColors: [], dragging: false }
];

const vpStakes = [
    { id: 's_red', x: 0, y: VP_FIELD_SIZE / 2, color: 'red', maxRings: 2, ringColors: [] },
    { id: 's_blue', x: VP_FIELD_SIZE, y: VP_FIELD_SIZE / 2, color: 'blue', maxRings: 2, ringColors: [] },
    { id: 's_neut_top', x: VP_FIELD_SIZE / 2, y: 0, color: 'black', maxRings: 6, ringColors: [] },
    { id: 's_neut_bot', x: VP_FIELD_SIZE / 2, y: VP_FIELD_SIZE, color: 'black', maxRings: 6, ringColors: [] }
];

const vpLadder = {
    x: VP_FIELD_SIZE / 2 - VP_LADDER_SIZE / 2,
    y: VP_FIELD_SIZE / 2 - VP_LADDER_SIZE / 2,
    width: VP_LADDER_SIZE,
    height: VP_LADDER_SIZE,
    highStake: { id: 's_high', x: VP_FIELD_SIZE / 2, y: VP_FIELD_SIZE / 2, color: 'yellow', maxRings: 1, ringColors: [] }
};

let vpSelectedObject = null; // For dragging VexPlan robots/goals
let vpSelectedRingTarget = null; // For adding rings to VexPlan stakes/goals

// Utility to scale VexPlan's original 720-based coordinates to new FIELD_SIZE
function scaleVpCoord(coord) {
    return Math.round(coord * (VP_FIELD_SIZE / 720));
}
vpRobots.forEach(r => { r.x = scaleVpCoord(r.x); r.y = scaleVpCoord(r.y); });
vpMobileGoals.forEach(mg => { mg.x = scaleVpCoord(mg.x); mg.y = scaleVpCoord(mg.y); });
// Stakes and ladder positions are relative to VP_FIELD_SIZE, so mostly okay.

// ============== RoboRoute Functions (Path Planning) ===============
function rrSaveState() {
    const currentState = JSON.parse(JSON.stringify(rrPoints));
    rrHistory.past.push(currentState);
    rrHistory.future = [];
}

function rrUndo() {
    if (rrHistory.past.length === 0) return;
    rrHistory.future.push(JSON.parse(JSON.stringify(rrPoints)));
    rrPoints = rrHistory.past.pop();
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    rrHidePointInfo();
    // redrawCombined(); // Combined redraw function
}

function rrRedo() {
    if (rrHistory.future.length === 0) return;
    rrHistory.past.push(JSON.parse(JSON.stringify(rrPoints)));
    rrPoints = rrHistory.future.pop();
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    rrHidePointInfo();
    // redrawCombined();
}

function rrVexToCanvas(x, y) {
    const scaleX = RR_CANVAS_WIDTH / (RR_VEX_MAX - RR_VEX_MIN);
    const scaleY = RR_CANVAS_HEIGHT / (RR_VEX_MAX - RR_VEX_MIN);
    return {
        x: (x - RR_VEX_MIN) * scaleX,
        y: (RR_VEX_MAX - y) * scaleY
    };
}

function rrCanvasToVex(x, y) {
    const scaleX = (RR_VEX_MAX - RR_VEX_MIN) / RR_CANVAS_WIDTH;
    const scaleY = (RR_VEX_MAX - RR_VEX_MIN) / RR_CANVAS_HEIGHT;
    return {
        x: RR_VEX_MIN + x * scaleX,
        y: RR_VEX_MAX - y * scaleY
    };
}

function rrDrawPoint(vexX, vexY, radius = 5, color = 'black', alpha = 1, heading = null, isHighlighted = false) {
    const { x, y } = rrVexToCanvas(vexX, vexY);
    if (isHighlighted) {
        rrCtx.beginPath();
        rrCtx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        rrCtx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        rrCtx.fill();
    }
    rrCtx.beginPath();
    rrCtx.arc(x, y, radius, 0, 2 * Math.PI);
    rrCtx.fillStyle = color;
    rrCtx.globalAlpha = alpha;
    rrCtx.fill();
    if (heading !== null) {
        const radians = (90 - heading) * (Math.PI / 180);
        const lineLength = radius * 2; // Increased length for visibility
        const endX = x + Math.cos(radians) * lineLength;
        const endY = y - Math.sin(radians) * lineLength;
        rrCtx.beginPath();
        rrCtx.moveTo(x, y);
        rrCtx.lineTo(endX, endY);
        rrCtx.strokeStyle = '#2f2f2e';
        rrCtx.lineWidth = 3; // Thicker line
        rrCtx.stroke();
    }
    rrCtx.globalAlpha = 1;
}

function rrDrawLinearPath() {
    if (rrPoints.length < 2) return;
    rrCtx.beginPath();
    const start = rrVexToCanvas(rrPoints[0].x, rrPoints[0].y);
    rrCtx.moveTo(start.x, start.y);
    for (let i = 1; i < rrPoints.length; i++) {
        const { x, y } = rrVexToCanvas(rrPoints[i].x, rrPoints[i].y);
        rrCtx.lineTo(x, y);
    }
    rrCtx.strokeStyle = "#bcd732";
    rrCtx.lineWidth = 2;
    rrCtx.stroke();
}

function rrUpdatePointList() {
    if (!rrPointListDiv) return;
    rrPointListDiv.innerHTML = "";
    rrPoints.forEach((point, index) => {
        const pointEntry = document.createElement("div");
        pointEntry.className = "point-entry";
        if (rrSelectedPointIndex === index) {
            pointEntry.classList.add("selected");
        }
        const pointLabel = document.createElement("span");
        pointLabel.textContent = `Point ${index + 1}`;
        const pointCoords = document.createElement("small");
        pointCoords.textContent = `(${point.x.toFixed(1)}, ${point.y.toFixed(1)}) H:${point.heading !== undefined ? point.heading.toFixed(0) : 0}°`;
        pointEntry.appendChild(pointLabel);
        pointEntry.appendChild(pointCoords);
        pointEntry.addEventListener("click", () => rrSelectPoint(index));
        rrPointListDiv.appendChild(pointEntry);
    });
    if (rrPoints.length === 0) {
        const noPoints = document.createElement("p");
        noPoints.textContent = "No path points added yet";
        noPoints.style.color = "#999";
        noPoints.style.fontStyle = "italic";
        noPoints.style.textAlign = "center";
        rrPointListDiv.appendChild(noPoints);
    }
}

function rrSelectPoint(index) {
    rrSelectedPointIndex = index;
    rrSelectedPoint = rrPoints[index];
    rrShowPointInfo(index);
    // redrawCombined();
}

function rrDistToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return { distance: Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2), point: v, t: 0 };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    const distance = Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
    return { distance, point: projection, segment: [v, w], t };
}


function rrSetActiveMode(button) {
    rrDeleteMode = false;
    rrInsertMode = false;
    rrTrimMode = false;

    rrDeleteBtn.classList.remove('active-mode');
    rrInsertBtn.classList.remove('active-mode');
    rrTrimBtn.classList.remove('active-mode');

    if (button === rrInsertBtn) rrInsertMode = true;
    else if (button === rrDeleteBtn) rrDeleteMode = true;
    else if (button === rrTrimBtn) rrTrimMode = true;
    
    if (button) button.classList.add('active-mode');
}

function rrShowPointInfo(index) {
    rrPointInfoPanel.style.display = "block";
    rrSelectedPoint = rrPoints[index];
    rrSelectedPointIndex = index;

    rrPointXInput.value = rrSelectedPoint.x.toFixed(2);
    rrPointYInput.value = rrSelectedPoint.y.toFixed(2);
    
    if (rrSelectedPoint.heading === undefined) rrSelectedPoint.heading = 0;
    rrHeadingInput.value = rrSelectedPoint.heading.toFixed(1);

    const pointIndexElement = rrPointInfoPanel.querySelector("#pointIndexInfo");
    if (pointIndexElement) {
        pointIndexElement.querySelector("#pointIndexValue").textContent = index + 1;
    }
    rrUpdatePointList();
}

function rrHidePointInfo() {
    rrPointInfoPanel.style.display = "none";
    if (rrSelectedPointIndex !== null) { // Deselect if something was selected
      const prevSelectedEntry = rrPointListDiv?.querySelector(`.point-entry.selected`);
      if (prevSelectedEntry) prevSelectedEntry.classList.remove('selected');
    }
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    rrUpdatePointList(); // Update list to remove highlight
}

function rrInsertPointAtIndex(currentIndex) {
    if (currentIndex < rrPoints.length - 1) {
        rrSaveState();
        const p1 = rrPoints[currentIndex];
        const p2 = rrPoints[currentIndex + 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        let midHeading = 0;
        if (p1.heading !== undefined && p2.heading !== undefined) {
            let h1 = p1.heading;
            let h2 = p2.heading;
            if (Math.abs(h1 - h2) > 180) { (h1 > h2) ? h2 += 360 : h1 += 360; }
            midHeading = (h1 + h2) / 2 % 360;
        } else if (p1.heading !== undefined) {
            midHeading = p1.heading;
        }
        const newPoint = { x: midX, y: midY, heading: midHeading };
        rrPoints.splice(currentIndex + 1, 0, newPoint);
        rrSelectPoint(currentIndex + 1);
    }
}

function rrMovePointOrder(direction) {
    if (rrSelectedPointIndex === null) return;
    rrSaveState();
    if (direction === "up" && rrSelectedPointIndex > 0) {
        [rrPoints[rrSelectedPointIndex], rrPoints[rrSelectedPointIndex - 1]] = [rrPoints[rrSelectedPointIndex - 1], rrPoints[rrSelectedPointIndex]];
        rrSelectPoint(rrSelectedPointIndex - 1);
    } else if (direction === "down" && rrSelectedPointIndex < rrPoints.length - 1) {
        [rrPoints[rrSelectedPointIndex], rrPoints[rrSelectedPointIndex + 1]] = [rrPoints[rrSelectedPointIndex + 1], rrPoints[rrSelectedPointIndex]];
        rrSelectPoint(rrSelectedPointIndex + 1);
    }
}

// Create Point List UI (RoboRoute)
function rrCreatePointListUI() {
    rrPointListContainer = document.createElement("div");
    rrPointListContainer.id = "pointListContainer";
    // Styles are in CSS, but some critical ones can be set here if needed
    const pointListHeader = document.createElement("h3");
    pointListHeader.textContent = "Path Points";
    rrPointListContainer.appendChild(pointListHeader);
    rrPointListDiv = document.createElement("div");
    rrPointListDiv.id = "pointList";
    rrPointListContainer.appendChild(rrPointListDiv);
    document.body.appendChild(rrPointListContainer); // Append to body, adjust positioning with CSS
}

// Setup Point Info Panel Inputs (RoboRoute)
function rrSetupPointInfoPanel() {
    rrPointXInput.type = "number";
    rrPointXInput.step = "0.1";
    document.getElementById("pointXSpan").replaceWith(rrPointXInput);
    rrPointYInput.type = "number";
    rrPointYInput.step = "0.1";
    document.getElementById("pointYSpan").replaceWith(rrPointYInput);

    const headingLabel = document.createElement("p");
    headingLabel.id = "headingLabel";
    headingLabel.innerHTML = "<strong>Heading (°):</strong> ";
    rrHeadingInput.id = "headingInput";
    rrHeadingInput.type = "number";
    rrHeadingInput.step = "1";
    rrHeadingInput.min = "0";
    rrHeadingInput.max = "359";
    headingLabel.appendChild(rrHeadingInput);
    
    const pointYParagraph = rrPointYInput.parentElement; // Assuming input replaced a span in a P
    pointYParagraph.after(headingLabel);

    const pointIndexInfo = document.createElement("p");
    pointIndexInfo.id = "pointIndexInfo";
    pointIndexInfo.innerHTML = `<strong>Point Index:</strong> <span id="pointIndexValue">N/A</span>`;
    rrPointInfoPanel.querySelector("h4").after(pointIndexInfo);


    rrPointXInput.oninput = () => {
        if (rrSelectedPoint) { rrSaveState(); rrSelectedPoint.x = parseFloat(rrPointXInput.value); /* redrawCombined(); */ }
    };
    rrPointYInput.oninput = () => {
        if (rrSelectedPoint) { rrSaveState(); rrSelectedPoint.y = parseFloat(rrPointYInput.value); /* redrawCombined(); */ }
    };
    rrHeadingInput.oninput = () => {
        if (rrSelectedPoint) {
            rrSaveState();
            let value = parseFloat(rrHeadingInput.value);
            value = ((value % 360) + 360) % 360; // Normalize
            rrSelectedPoint.heading = value;
            rrHeadingInput.value = value.toFixed(1);
            // redrawCombined();
        }
    };
    rrInsertPointBtn.onclick = () => { if (rrSelectedPointIndex !== null) rrInsertPointAtIndex(rrSelectedPointIndex); };
    rrClosePointInfoBtn.addEventListener("click", rrHidePointInfo);
}

// RoboRoute Field Selector
function rrAddFieldSelector() {
    const fieldSelectLabel = document.createElement("label");
    fieldSelectLabel.htmlFor = "fieldSelect";
    // fieldSelectLabel.textContent = "Field: ";
    // fieldSelectLabel.style.color = "white";
    // fieldSelectLabel.style.marginRight = "5px";
    
    const fieldSelect = document.createElement("select");
    fieldSelect.id = "fieldSelect";
    // Styles are in CSS

    const presetFields = [
        { value: "../assets/fields/high-stakes-matches.png", text: "High Stakes (Matches)" },
        { value: "../assets/fields/high-stakes-skills.png", text: "High Stakes (Skills)" },
        { value: "../assets/fields/push-back-skills.png", text: "Push Back (Skills)" },
        { value: "../assets/fields/over-under-matches.png", text: "Over Under (Matches)" },
        { value: "../assets/fields/over-under-skills.png", text: "Over Under (Skills)" },
        { value: "../assets/fields/empty-field.png", text: "Empty Field" },
        { value: "custom", text: "Custom Field" }
    ];
    presetFields.forEach(field => {
        const option = document.createElement("option");
        option.value = field.value;
        option.textContent = field.text;
        fieldSelect.appendChild(option);
    });

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "customFieldInput";
    fileInput.accept = "image/*";
    // styles in CSS

    const uploadButton = document.createElement("button");
    uploadButton.id = "uploadFieldBtn";
    uploadButton.textContent = "Upload Custom";
    // styles in CSS

    fieldSelect.addEventListener("change", function() {
        if (this.value === "custom") {
            fileInput.style.display = "inline-block";
            uploadButton.style.display = "inline-block";
        } else {
            fileInput.style.display = "none";
            uploadButton.style.display = "none";
            rrLoadFieldImage(this.value);
        }
    });
    fileInput.addEventListener("change", function() {
      if (this.files && this.files[0]) {
          const fileName = this.files[0].name;
          uploadButton.textContent = "Upload " + (fileName.length > 10 ? fileName.substring(0, 7) + "..." : fileName);
      }
    });
    uploadButton.addEventListener("click", function() {
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) { rrLoadFieldImage(e.target.result); };
            reader.readAsDataURL(fileInput.files[0]);
        }
    });

    const toolsDiv = document.getElementById("tools");
    // toolsDiv.appendChild(fieldSelectLabel);
    toolsDiv.appendChild(fieldSelect);
    toolsDiv.appendChild(fileInput);
    toolsDiv.appendChild(uploadButton);
}

function rrLoadFieldImage(src) {
    rrBackgroundLoaded = false;
    rrCurrentFieldImage.onload = () => {
        rrBackgroundLoaded = true;
        // redrawCombined();
    };
    rrCurrentFieldImage.onerror = () => {
        console.error("Failed to load field image:", src);
        rrCurrentFieldImage.src = DEFAULT_FIELD_IMAGE; // Fallback
    };
    rrCurrentFieldImage.src = src;
}

// RoboRoute Code Generation
function rrGenerateCode() {
    if (rrPoints.length < 1) {
        alert("No path points to generate code from.");
        return;
    }
    const formattedPoints = rrPoints.map(p => ({
        x: parseFloat(p.x).toFixed(2),
        y: parseFloat(p.y).toFixed(2),
        heading: p.heading !== undefined ? parseFloat(p.heading).toFixed(1) : 0
    }));
    let code = `chassis.setPose(${formattedPoints[0].x}, ${formattedPoints[0].y}, ${formattedPoints[0].heading});\n`;
    for (let i = 1; i < formattedPoints.length; i++) {
        code += `chassis.moveToPose(${formattedPoints[i].x}, ${formattedPoints[i].y}, ${formattedPoints[i].heading}, ${rrDelayInput.value || 1000});\n`;
    }
    console.log(code);
    alert("Generated Path Code:\n\n" + code);
}


// ============== VexPlan Functions (Game Simulation & Drawing) ===============

function vpDrawFieldBackground(ctx) { // VexPlan's own field markings, if any
    // Original VexPlan drawField drew grid lines and corners.
    // This might be redundant if RoboRoute field image is used.
    // For now, let's assume rrCurrentFieldImage is the primary background.
    // If VexPlan specific markings are needed, draw them here.
    // Example: Draw VexPlan grid
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    for (let i = 0; i < 6; i++) { // 6x6 grid like in VexPlan
        for (let j = 0; j < 6; j++) {
            ctx.strokeRect(i * (VP_FIELD_SIZE / 6), j * (VP_FIELD_SIZE / 6), VP_FIELD_SIZE / 6, VP_FIELD_SIZE / 6);
        }
    }
    ctx.shadowBlur = 0;

    // Draw VexPlan corners
    const cornerGradient = ctx.createLinearGradient(0, 0, VP_CORNER_SIZE, VP_CORNER_SIZE);
    cornerGradient.addColorStop(0, '#2ecc71');
    cornerGradient.addColorStop(1, '#27ae60');
    ctx.fillStyle = cornerGradient;
    // ... (draw 4 corners as in VexPlan) ...
}

function vpDrawHexagon(ctx, x, y, size, fillStyle) {
    ctx.beginPath();
    const radius = size / 2;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + (Math.PI / 6);
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
}

function vpDrawRing(ctx, x, y, outerRadius, innerRadius, color) {
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, 2 * Math.PI);
    ctx.arc(x, y, innerRadius, 0, 2 * Math.PI, true);
    ctx.fillStyle = color;
    ctx.fill('evenodd');
}

function vpDrawGameObjects(ctx) {
    // Ladder
    const ladderGradient = ctx.createLinearGradient(vpLadder.x, vpLadder.y, vpLadder.x + vpLadder.width, vpLadder.y + vpLadder.height);
    ladderGradient.addColorStop(0, '#ff6b6b'); ladderGradient.addColorStop(1, '#ff8787');
    ctx.strokeStyle = ladderGradient; ctx.lineWidth = 4; ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(255, 107, 107, 0.4)';
    ctx.beginPath();
    ctx.moveTo(vpLadder.x + VP_LADDER_SIZE / 2, vpLadder.y);
    ctx.lineTo(vpLadder.x + VP_LADDER_SIZE, vpLadder.y + VP_LADDER_SIZE / 2);
    ctx.lineTo(vpLadder.x + VP_LADDER_SIZE / 2, vpLadder.y + VP_LADDER_SIZE);
    ctx.lineTo(vpLadder.x, vpLadder.y + VP_LADDER_SIZE / 2);
    ctx.closePath(); ctx.stroke(); ctx.shadowBlur = 0;

    // High Stake on Ladder
    ctx.fillStyle = vpLadder.highStake === vpSelectedRingTarget ? '#ffff99' : '#f1c40f';
    ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(241, 196, 15, 0.5)';
    ctx.beginPath(); ctx.arc(vpLadder.highStake.x, vpLadder.highStake.y, VP_STAKE_RADIUS, 0, 2 * Math.PI); ctx.fill();
    vpLadder.highStake.ringColors.forEach((rc, i) => vpDrawRing(ctx, vpLadder.highStake.x, vpLadder.highStake.y - (i + 1) * (VP_RING_OUTER_RADIUS*2.2) , VP_RING_OUTER_RADIUS, VP_RING_INNER_RADIUS, rc));
    ctx.shadowBlur = 0;

    // Stakes
    vpStakes.forEach(stake => {
        ctx.fillStyle = stake === vpSelectedRingTarget ? '#999999' : stake.color;
        ctx.shadowBlur = 4; ctx.shadowColor = `rgba(${stake.color === 'red' ? '255,0,0' : stake.color === 'blue' ? '0,0,255' : '0,0,0'}, 0.5)`;
        ctx.beginPath(); ctx.arc(stake.x, stake.y, VP_STAKE_RADIUS, 0, 2 * Math.PI); ctx.fill();
        stake.ringColors.forEach((rc, i) => {
            const yOffset = (stake.x === VP_FIELD_SIZE / 2 && stake.y === 0) ? (i + 1) * (VP_RING_OUTER_RADIUS*2.2) : -(i + 1) * (VP_RING_OUTER_RADIUS*2.2);
            vpDrawRing(ctx, stake.x, stake.y + yOffset, VP_RING_OUTER_RADIUS, VP_RING_INNER_RADIUS, rc);
        });
        ctx.shadowBlur = 0;
    });

    // Mobile Goals
    vpMobileGoals.forEach(mg => {
        const mgGrad = ctx.createLinearGradient(mg.x - VP_MOBILE_GOAL_SIZE/2, mg.y - VP_MOBILE_GOAL_SIZE/2, mg.x + VP_MOBILE_GOAL_SIZE/2, mg.y + VP_MOBILE_GOAL_SIZE/2);
        mgGrad.addColorStop(0, mg === vpSelectedRingTarget ? '#f39c12' : '#e67e22'); mgGrad.addColorStop(1, mg === vpSelectedRingTarget ? '#e67e22' : '#d35400');
        ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(230, 126, 34, 0.5)';
        vpDrawHexagon(ctx, mg.x, mg.y, VP_MOBILE_GOAL_SIZE, mgGrad);
        
        ctx.fillStyle = mg === vpSelectedRingTarget ? '#ffff99' : '#f1c40f'; // Stake on MG
        ctx.beginPath(); ctx.arc(mg.x, mg.y, VP_STAKE_RADIUS, 0, 2 * Math.PI); ctx.fill();
        mg.ringColors.forEach((rc, i) => vpDrawRing(ctx, mg.x, mg.y - (i + 1) * (VP_RING_OUTER_RADIUS*2.2), VP_RING_OUTER_RADIUS, VP_RING_INNER_RADIUS, rc));
        ctx.shadowBlur = 0;
    });

    // Robots
    vpRobots.forEach(robot => {
        const rGrad = ctx.createLinearGradient(robot.x, robot.y, robot.x + VP_ROBOT_SIZE, robot.y + VP_ROBOT_SIZE);
        rGrad.addColorStop(0, robot.color === 'red' ? '#e74c3c' : '#3498db'); rGrad.addColorStop(1, robot.color === 'red' ? '#c0392b' : '#2980b9');
        ctx.fillStyle = rGrad;
        ctx.shadowBlur = 6; ctx.shadowColor = `rgba(${robot.color === 'red' ? '231,76,60' : '52,152,219'}, 0.5)`;
        ctx.fillRect(robot.x, robot.y, VP_ROBOT_SIZE, VP_ROBOT_SIZE);
        if (robot.teamNumber) {
            ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; // Smaller font
            const textX = robot.x + VP_ROBOT_SIZE / 2; const textY = robot.y + VP_ROBOT_SIZE / 2;
            ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.strokeText(robot.teamNumber, textX, textY);
            ctx.fillStyle = '#ffffff'; ctx.fillText(robot.teamNumber, textX, textY);
        }
        if (robot.hanging) { // Draw hanging line
            ctx.strokeStyle = '#333333'; ctx.lineWidth = 3; ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            const rCenterX = robot.x + VP_ROBOT_SIZE/2; const rCenterY = robot.y + VP_ROBOT_SIZE/2;
            let hangX, hangY;
            if (robot.hanging === 'ladder') { hangX = vpLadder.highStake.x; hangY = vpLadder.highStake.y; }
            else if (robot.hanging.startsWith('stake')) {
                const stakeIdx = parseInt(robot.hanging.slice(5)); hangX = vpStakes[stakeIdx].x; hangY = vpStakes[stakeIdx].y;
            }
            if (hangX !== undefined) { ctx.moveTo(rCenterX, rCenterY); ctx.lineTo(hangX, hangY); ctx.stroke(); }
            ctx.shadowBlur = 0;
        }
    });
}

function vpCalculateScore() {
    let redScore = 0, blueScore = 0;
    vpStakes.forEach(stake => {
        if (stake.color === 'red') {
            let rRings = stake.ringColors.filter(r => r === 'red').length; redScore += rRings;
            if (stake.ringColors.length > 0 && stake.ringColors[stake.ringColors.length - 1] === 'red') redScore += 2;
        } else if (stake.color === 'blue') {
            let bRings = stake.ringColors.filter(r => r === 'blue').length; blueScore += bRings;
            if (stake.ringColors.length > 0 && stake.ringColors[stake.ringColors.length - 1] === 'blue') blueScore += 2;
        } else { // Neutral stake
            stake.ringColors.forEach(ring => { if (ring === 'red') redScore++; else if (ring === 'blue') blueScore++; });
            if (stake.ringColors.length > 0) {
                let top = stake.ringColors[stake.ringColors.length - 1];
                if (top === 'red') redScore += 2; else if (top === 'blue') blueScore += 2;
            }
        }
    });
    if (vpLadder.highStake.ringColors.length > 0) {
        if (vpLadder.highStake.ringColors[0] === 'red') redScore += 6; else if (vpLadder.highStake.ringColors[0] === 'blue') blueScore += 6;
    }
    vpMobileGoals.forEach(mg => {
        let mgR = mg.ringColors.filter(r => r === 'red').length;
        let mgB = mg.ringColors.filter(r => r === 'blue').length;
        if (mg.ringColors.length > 0) {
            let top = mg.ringColors[mg.ringColors.length - 1];
            if (top === 'red') mgR += 2; else if (top === 'blue') mgB += 2;
        }
        // Corner logic
        let mgCenterX = mg.x + VP_MOBILE_GOAL_SIZE / 2; // Assuming x,y is top-left for hex draw
        let mgCenterY = mg.y + VP_MOBILE_GOAL_SIZE / 2;
        let inPositiveCorner = (mgCenterX < VP_CORNER_SIZE && mgCenterY > VP_FIELD_SIZE - VP_CORNER_SIZE) || (mgCenterX > VP_FIELD_SIZE - VP_CORNER_SIZE && mgCenterY > VP_FIELD_SIZE - VP_CORNER_SIZE);
        let inNegativeCorner = (mgCenterX < VP_CORNER_SIZE && mgCenterY < VP_CORNER_SIZE) || (mgCenterX > VP_FIELD_SIZE - VP_CORNER_SIZE && mgCenterY < VP_CORNER_SIZE);
        if (inPositiveCorner) { redScore += mgR * 2; blueScore += mgB * 2; }
        else if (inNegativeCorner) { redScore = Math.max(0, redScore - mgR); blueScore = Math.max(0, blueScore - mgB); }
        else { redScore += mgR; blueScore += mgB; }
    });
    vpRobots.forEach(robot => {
        if (robot.climbLevel > 0) {
            let pts = {1:3, 2:6, 3:12}[robot.climbLevel];
            if (vpLadder.highStake.ringColors.length > 0) pts += 2;
            if (robot.alliance === 'red') redScore += pts; else blueScore += pts;
        }
        if (robot.hanging) {
            let pts = 0;
            if (robot.hanging === 'ladder') pts = 5;
            else if (robot.hanging.startsWith('stake')) {
                const stake = vpStakes[parseInt(robot.hanging.slice(5))];
                if (stake.color === 'black') pts = 3;
                else if (stake.color === robot.alliance) pts = 4;
                else pts = 2;
                if (stake.ringColors.length > 0) pts += 1;
            }
            if (robot.alliance === 'red') redScore += pts; else blueScore += pts;
        }
    });
    document.getElementById('red-score').textContent = Math.round(redScore);
    document.getElementById('blue-score').textContent = Math.round(blueScore);
}

function vpIsPointInHexagon(x, y, centerX, centerY, size) {
    const radius = size / 2;
    const dx = Math.abs(x - centerX); const dy = Math.abs(y - centerY);
    if (dx > radius || dy > radius * Math.sqrt(3) / 2) return false;
    return (dy <= (radius * Math.sqrt(3) / 2)) && (dx <= radius / 2 + (radius - dy * 2 / Math.sqrt(3)));
}
function vpIsPointInDiamond(x, y, centerX, centerY, size) {
    return (Math.abs(x - centerX) + Math.abs(y - centerY)) <= (size / 2);
}

function vpUpdateRingManagementPanel() {
    const selText = document.getElementById('selected-object-info');
    const ringCount = document.getElementById('ring-count-info');
    const ringList = document.getElementById('ring-list-info');
    const addRedBtn = document.getElementById('add-red-ring');
    const addBlueBtn = document.getElementById('add-blue-ring');
    const removeBtn = document.getElementById('remove-ring');

    if (!vpSelectedRingTarget) {
        selText.textContent = 'None'; ringCount.textContent = '0'; ringList.textContent = 'None';
        addRedBtn.disabled = true; addBlueBtn.disabled = true; removeBtn.disabled = true;
    } else {
        let name;
        if (vpSelectedRingTarget === vpLadder.highStake) name = 'High Stake';
        else if (vpStakes.includes(vpSelectedRingTarget)) name = `${vpSelectedRingTarget.color.charAt(0).toUpperCase() + vpSelectedRingTarget.color.slice(1)} Stake`;
        else name = `Mobile Goal ${vpMobileGoals.indexOf(vpSelectedRingTarget) + 1}`;
        selText.textContent = name;
        ringCount.textContent = vpSelectedRingTarget.ringColors.length;
        ringList.textContent = vpSelectedRingTarget.ringColors.length > 0 ? vpSelectedRingTarget.ringColors.join(', ') : 'None';
        addRedBtn.disabled = vpSelectedRingTarget.ringColors.length >= vpSelectedRingTarget.maxRings;
        addBlueBtn.disabled = vpSelectedRingTarget.ringColors.length >= vpSelectedRingTarget.maxRings;
        removeBtn.disabled = vpSelectedRingTarget.ringColors.length === 0;
    }
}

function vpSetClimbLevel(robotIndex, level) {
    vpRobots[robotIndex].climbLevel = level;
    vpRobots[robotIndex].hanging = null; // Cannot climb and hang
    vpContextMenu.style.display = 'none';
    // redrawCombined();
}
function vpSetHang(robotIndex, location) {
    vpRobots[robotIndex].hanging = location;
    vpRobots[robotIndex].climbLevel = 0; // Cannot hang and climb
    vpContextMenu.style.display = 'none';
    // redrawCombined();
}

function vpResetSimulation() {
    const teamNumbers = vpRobots.map(r => r.teamNumber); // Preserve team numbers
    vpRobots.forEach((r, i) => {
        const originalPos = [ // Re-calculate original positions based on scaled size
            { x: scaleVpCoord(30), y: scaleVpCoord(30) },
            { x: scaleVpCoord(30), y: scaleVpCoord(VP_FIELD_SIZE - 120) },
            { x: scaleVpCoord(VP_FIELD_SIZE - 120), y: scaleVpCoord(30) },
            { x: scaleVpCoord(VP_FIELD_SIZE - 120), y: scaleVpCoord(VP_FIELD_SIZE - 120) }
        ][i];
        r.x = originalPos.x; r.y = originalPos.y;
        r.climbLevel = 0; r.hanging = null; r.teamNumber = teamNumbers[i];
    });
    vpMobileGoals.forEach((mg, i) => {
         const originalPos = [
            { x: scaleVpCoord(480), y: scaleVpCoord(235)},
            { x: scaleVpCoord(360), y: scaleVpCoord(595)},
            { x: scaleVpCoord(240), y: scaleVpCoord(235)},
            { x: scaleVpCoord(480), y: scaleVpCoord(475)},
            { x: scaleVpCoord(240), y: scaleVpCoord(475)}
        ][i];
        mg.x = originalPos.x; mg.y = originalPos.y;
        mg.ringColors = []; mg.dragging = false;
    });
    vpStakes.forEach(s => s.ringColors = []);
    vpLadder.highStake.ringColors = [];
    vpSelectedRingTarget = null; vpSelectedObject = null;
    vpUpdateRingManagementPanel();
    // redrawCombined();
}

// ============== Combined Drawing and Game Loop ===============
function redrawCombined() {
    rrCtx.clearRect(0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    rrCtx.save(); // Save context for potential transforms (zoom/pan from RR)
    rrCtx.translate(rrOffsetX, rrOffsetY);
    rrCtx.scale(rrScale, rrScale);

    // 1. Draw RoboRoute Field Background
    if (rrBackgroundLoaded && rrCurrentFieldImage.complete) {
        rrCtx.drawImage(rrCurrentFieldImage, 0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    } else if (!rrBackgroundLoaded && rrCurrentFieldImage.src && !rrCurrentFieldImage.complete) {
        // Image is loading, wait for onload
    } else { // Fallback or no image loaded
        rrCtx.fillStyle = '#555'; // Default dark background
        rrCtx.fillRect(0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    }
    // vpDrawFieldBackground(rrCtx); // Optional VexPlan grid lines

    // 2. Draw VexPlan Game Objects
    vpDrawGameObjects(rrCtx);

    // 3. Draw RoboRoute Paths
    if (rrMode === "linear") rrDrawLinearPath();
    // else if (rrMode === "bezier") rrDrawBezierPath();

    // 4. Draw RoboRoute Points & Labels
    rrPoints.forEach((point, index) => {
        const heading = point.heading !== undefined ? point.heading : 0;
        const isHighlighted = index === rrSelectedPointIndex;
        rrDrawPoint(point.x, point.y, 5, point.color || "#bcd732", 1, heading, isHighlighted);
        const { x: cx, y: cy } = rrVexToCanvas(point.x, point.y);
        rrCtx.font = "12px Roboto"; rrCtx.fillStyle = "white"; // Ensure text is visible
        rrCtx.fillText(`${index + 1}`, cx + 10, cy + 5);
        if (heading !== undefined) {
             //rrCtx.fillText(`${heading.toFixed(0)}°`, cx + 10, cy - 10); // Heading text by point
        }
    });

    // 5. Draw RoboRoute Hover Point (for path insertion)
    if (rrInsertMode && rrHoverPoint) {
        let heading = 0; // Simplified heading for hover point
        if (rrPoints.length > 1 && rrPoints[0].heading !== undefined) {
             const prevH = rrPoints[rrHoverPoint.segmentIndex].heading;
             const nextH = rrPoints[rrHoverPoint.segmentIndex + 1].heading;
             heading = prevH + (nextH - prevH) * rrHoverPoint.t;
        }
        rrDrawPoint(rrHoverPoint.x, rrHoverPoint.y, 5, "blue", 0.5, heading);
    }
    
    rrCtx.restore(); // Restore context after transforms

    // Update UI elements that are not part of canvas
    rrUpdatePointList();
    vpCalculateScore(); // This also updates score display
    vpUpdateRingManagementPanel(); // Updates ring panel

    requestAnimationFrame(redrawCombined);
}


// ============== Event Handlers Setup ===============
function setupEventListeners() {
    // --- RoboRoute Path Tool Buttons ---
    document.getElementById("linearBtn").addEventListener("click", () => {
        rrMode = "linear"; rrSetActiveMode(null); /* redrawCombined(); */
        // Add class or visual indicator for linear mode if needed
    });
    rrInsertBtn.addEventListener("click", () => rrSetActiveMode(rrInsertMode ? null : rrInsertBtn));
    rrDeleteBtn.addEventListener("click", () => rrSetActiveMode(rrDeleteMode ? null : rrDeleteBtn));
    rrTrimBtn.addEventListener("click", () => rrSetActiveMode(rrTrimMode ? null : rrTrimBtn));
    rrClearBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all path points?")) {
            rrSaveState(); rrPoints = []; rrHidePointInfo(); rrSetActiveMode(null); /* redrawCombined(); */
        }
    });
    rrGenerateBtn.addEventListener("click", rrGenerateCode);

    // --- Combined Canvas Event Handlers ---
    rrCanvas.addEventListener("mousedown", (e) => {
        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (vpDrawingModeActive) { // VexPlan drawing takes precedence
            // VexPlan drawing canvas mousedown logic handles this separately
            return;
        }
        
        vpSelectedObject = null; // Clear VexPlan selection unless a VP object is clicked

        // Try VexPlan object interaction first
        for (let robot of vpRobots) {
            if (mouseX >= robot.x && mouseX <= robot.x + VP_ROBOT_SIZE &&
                mouseY >= robot.y && mouseY <= robot.y + VP_ROBOT_SIZE) {
                vpSelectedObject = robot; robot.dragging = true;
                vpSelectedRingTarget = null; vpUpdateRingManagementPanel();
                // redrawCombined();
                return;
            }
        }
        for (let mg of vpMobileGoals) {
            // Use center for hexagon check, assuming x,y is top-left
            if (vpIsPointInHexagon(mouseX, mouseY, mg.x + VP_MOBILE_GOAL_SIZE/2, mg.y + VP_MOBILE_GOAL_SIZE/2, VP_MOBILE_GOAL_SIZE)) {
                vpSelectedObject = mg; mg.dragging = true;
                vpSelectedRingTarget = mg; vpUpdateRingManagementPanel();
                // redrawCombined();
                return;
            }
        }
        
        // If not dragging a VexPlan object, proceed with RoboRoute path point interaction
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);
        for (let i = 0; i < rrPoints.length; i++) {
            const point = rrPoints[i];
            const distance = Math.sqrt((vexX - point.x) ** 2 + (vexY - point.y) ** 2);
            if (distance < 2) { // Click sensitivity for path points
                if (e.button === 0) { // Left click
                    if (rrDeleteMode) { // RoboRoute path point deletion
                        rrSaveState(); rrPoints.splice(i, 1);
                        if (rrSelectedPointIndex === i) rrHidePointInfo();
                        else if (rrSelectedPointIndex > i) rrSelectedPointIndex--;
                        rrSetActiveMode(null); // Exit delete mode
                    } else {
                        rrIsDraggingPoint = true;
                        rrSelectPoint(i);
                    }
                }
                // redrawCombined();
                return;
            }
        }
        // If no path point clicked for dragging, and not in special RR mode, check for VexPlan stake click
         for (let stake of [...vpStakes, vpLadder.highStake]) {
            if (Math.hypot(stake.x - mouseX, stake.y - mouseY) < VP_STAKE_RADIUS * 2.5) { // Larger click area for stakes
                vpSelectedRingTarget = stake; vpSelectedObject = null;
                vpUpdateRingManagementPanel();
                // redrawCombined();
                return;
            }
        }


    });

    rrCanvas.addEventListener("mousemove", (e) => {
        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (vpDrawingModeActive) { /* VexPlan drawing canvas handles this */ return; }

        // VexPlan object dragging
        if (vpSelectedObject && vpSelectedObject.dragging) {
            if (vpRobots.includes(vpSelectedObject)) {
                vpSelectedObject.x = Math.max(0, Math.min(mouseX - VP_ROBOT_SIZE / 2, VP_FIELD_SIZE - VP_ROBOT_SIZE));
                vpSelectedObject.y = Math.max(0, Math.min(mouseY - VP_ROBOT_SIZE / 2, VP_FIELD_SIZE - VP_ROBOT_SIZE));
            } else if (vpMobileGoals.includes(vpSelectedObject)) {
                // Assuming x,y is top-left for drawing, adjust for dragging from center
                vpSelectedObject.x = Math.max(0, Math.min(mouseX - VP_MOBILE_GOAL_SIZE / 2, VP_FIELD_SIZE - VP_MOBILE_GOAL_SIZE));
                vpSelectedObject.y = Math.max(0, Math.min(mouseY - VP_MOBILE_GOAL_SIZE / 2, VP_FIELD_SIZE - VP_MOBILE_GOAL_SIZE));
            }
            // redrawCombined();
            return;
        }
        
        // RoboRoute path point dragging or hover effects
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);
        if (rrIsDraggingPoint && rrSelectedPoint) {
            rrSaveState(); // Save state frequently during drag or on mouseup
            rrSelectedPoint.x = vexX;
            rrSelectedPoint.y = vexY;
            rrPointXInput.value = vexX.toFixed(2);
            rrPointYInput.value = vexY.toFixed(2);
            // redrawCombined();
        } else if (rrInsertMode && rrPoints.length >= 2) { // RoboRoute path segment insertion hover
            let minDist = Infinity; let closestSegPt = null; let segInfo = null;
            for (let i = 0; i < rrPoints.length - 1; i++) {
                const result = rrDistToSegment({ x: vexX, y: vexY }, rrPoints[i], rrPoints[i+1]);
                if (result.distance < minDist && result.distance < 2) { // Sensitivity for snapping to segment
                    minDist = result.distance; closestSegPt = result.point;
                    segInfo = { segmentIndex: i, t: result.t };
                }
            }
            if (closestSegPt) {
                rrHoverPoint = { x: closestSegPt.x, y: closestSegPt.y, ...segInfo };
                rrCanvas.style.cursor = 'copy';
            } else {
                rrHoverPoint = null; rrCanvas.style.cursor = 'crosshair';
            }
            // redrawCombined();
        } else if (rrDeleteMode) { // Highlight path points for deletion
             rrPoints.forEach(p => p.color = "#bcd732"); // Reset color
             for (let i = 0; i < rrPoints.length; i++) {
                const distance = Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2);
                if (distance < 2) { rrPoints[i].color = "red"; break; }
             }
             // redrawCombined();
        } else {
            rrCanvas.style.cursor = 'crosshair'; // Default for path planning
        }
    });

    rrCanvas.addEventListener("mouseup", () => {
        if (vpDrawingModeActive) { /* VexPlan drawing canvas handles this */ return; }

        if (vpSelectedObject) vpSelectedObject.dragging = false;
        vpSelectedObject = null;
        
        if (rrIsDraggingPoint) {
             // rrSaveState(); // Save state after drag is complete (or was saved during mousemove)
        }
        rrIsDraggingPoint = false;
        // redrawCombined();
    });

    rrCanvas.addEventListener("click", (e) => {
        if (vpDrawingModeActive) { /* VexPlan drawing canvas handles this */ return; }
        if (e.button !== 0) return; // Only left clicks for these actions

        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left; // Canvas coords
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY); // Vex coords

        // VexPlan ring target selection (if not dragging/interacting with VP object already)
        // This logic might be better in mousedown or need refinement
        let clickedVpElement = false;
        if (!vpSelectedObject && !rrIsDraggingPoint) {
             for (let stake of [...vpStakes, vpLadder.highStake]) {
                if (Math.hypot(stake.x - mouseX, stake.y - mouseY) < VP_STAKE_RADIUS * 2.5) {
                    vpSelectedRingTarget = stake; clickedVpElement = true; break;
                }
            }
            if (!clickedVpElement) {
                 for (let mg of vpMobileGoals) {
                    if (vpIsPointInHexagon(mouseX, mouseY, mg.x + VP_MOBILE_GOAL_SIZE/2, mg.y + VP_MOBILE_GOAL_SIZE/2, VP_MOBILE_GOAL_SIZE)) {
                        vpSelectedRingTarget = mg; clickedVpElement = true; break;
                    }
                }
            }
            if (clickedVpElement) { vpUpdateRingManagementPanel(); /* redrawCombined(); */ return; }
        }


        // RoboRoute path point addition or segment insertion
        if (rrTrimMode) {
            for (let i = 0; i < rrPoints.length; i++) {
                const distance = Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2);
                if (distance < 2) {
                    rrSaveState(); rrPoints.splice(i); rrHidePointInfo(); rrSetActiveMode(null);
                    // redrawCombined();
                    return;
                }
            }
        } else if (rrInsertMode && rrHoverPoint) {
            rrSaveState();
            let heading = 0; // Default heading
            if (rrPoints.length > 0 && rrPoints[0].heading !== undefined) {
                const prevH = rrPoints[rrHoverPoint.segmentIndex].heading;
                const nextH = rrPoints[rrHoverPoint.segmentIndex + 1].heading;
                heading = prevH + (nextH - prevH) * rrHoverPoint.t; // Interpolate
            }
            rrPoints.splice(rrHoverPoint.segmentIndex + 1, 0, { x: rrHoverPoint.x, y: rrHoverPoint.y, heading });
            rrHoverPoint = null; // Clear hover point after insertion
            // redrawCombined();
            return; // Don't add a new point at the end
        } else if (!rrDeleteMode && !rrInsertMode && !rrTrimMode && !rrIsDraggingPoint) {
            // Add new RoboRoute path point
            let clickedOnExistingPoint = false;
            for (let i = 0; i < rrPoints.length; i++) {
                 const distance = Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2);
                 if (distance < 2) { clickedOnExistingPoint = true; break; }
            }
            if (!clickedOnExistingPoint) {
                rrSaveState();
                const newPoint = { x: vexX, y: vexY, heading: 0 }; // Default heading 0
                if (rrPoints.length > 0 && rrPoints[rrPoints.length - 1].heading !== undefined) {
                    newPoint.heading = rrPoints[rrPoints.length - 1].heading; // Carry over last heading
                }
                rrPoints.push(newPoint);
                rrSelectPoint(rrPoints.length - 1);
                // redrawCombined();
            }
        }
    });

    rrCanvas.addEventListener("wheel", (e) => {
        if (vpDrawingModeActive) return;
        if (rrSelectedPoint) {
            e.preventDefault();
            rrSaveState();
            if (rrSelectedPoint.heading === undefined) rrSelectedPoint.heading = 0;
            const delta = e.deltaY > 0 ? -5 : 5; // 5 degree increments
            rrSelectedPoint.heading = (rrSelectedPoint.heading + delta + 360) % 360;
            rrHeadingInput.value = rrSelectedPoint.heading.toFixed(1);
            // redrawCombined();
        } else {
            // Implement zoom for RoboRoute canvas if desired (rrScale, rrOffsetX, rrOffsetY)
            // e.preventDefault();
            // const zoomIntensity = 0.1;
            // const newScale = rrScale * (e.deltaY > 0 ? (1 - zoomIntensity) : (1 + zoomIntensity));
            // rrScale = Math.max(0.1, Math.min(newScale, 10)); // Clamp zoom
            // redrawCombined();
        }
    });

    rrCanvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (vpDrawingModeActive) return;

        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        let targetRobot = null;

        for (let i = 0; i < vpRobots.length; i++) {
            const robot = vpRobots[i];
            if (mouseX >= robot.x && mouseX <= robot.x + VP_ROBOT_SIZE &&
                mouseY >= robot.y && mouseY <= robot.y + VP_ROBOT_SIZE) {
                targetRobot = robot;
                break;
            }
        }

        if (targetRobot) {
            const robotIndex = vpRobots.indexOf(targetRobot);
            vpContextMenu.querySelector('ul').innerHTML = ''; // Clear previous items
            if (!targetRobot.hanging) {
                [1,2,3].forEach(level => {
                    const li = document.createElement('li');
                    li.textContent = `Climb Level ${level}`;
                    li.onclick = () => vpSetClimbLevel(robotIndex, level);
                    vpContextMenu.querySelector('ul').appendChild(li);
                });
                const li0 = document.createElement('li'); li0.textContent = `No Climb`;
                li0.onclick = () => vpSetClimbLevel(robotIndex, 0); vpContextMenu.querySelector('ul').appendChild(li0);
            }
            if (targetRobot.climbLevel === 0) { // Can only hang if not climbing
                const rCenterX = targetRobot.x + VP_ROBOT_SIZE/2; const rCenterY = targetRobot.y + VP_ROBOT_SIZE/2;
                if (vpIsPointInDiamond(rCenterX, rCenterY, vpLadder.x + VP_LADDER_SIZE/2, vpLadder.y + VP_LADDER_SIZE/2, VP_LADDER_SIZE)) {
                     const li = document.createElement('li'); li.textContent = `Hang from Ladder`;
                     li.onclick = () => vpSetHang(robotIndex, 'ladder'); vpContextMenu.querySelector('ul').appendChild(li);
                }
                vpStakes.forEach((stake, stakeIdx) => {
                    if (Math.hypot(stake.x - rCenterX, stake.y - rCenterY) < 100 * (VP_FIELD_SIZE/720) ) { // Adjusted proximity
                         const li = document.createElement('li');
                         li.textContent = `Hang from ${stake.color.charAt(0).toUpperCase() + stake.color.slice(1)} Stake`;
                         li.onclick = () => vpSetHang(robotIndex, `stake${stakeIdx}`);
                         vpContextMenu.querySelector('ul').appendChild(li);
                    }
                });
            }
            if (targetRobot.hanging) {
                 const li = document.createElement('li'); li.textContent = `No Hang`;
                 li.onclick = () => vpSetHang(robotIndex, null); vpContextMenu.querySelector('ul').appendChild(li);
            }

            if (vpContextMenu.querySelector('ul').children.length > 0) {
                vpContextMenu.style.left = `${e.clientX}px`; // Use clientX/Y for positioning relative to viewport
                vpContextMenu.style.top = `${e.clientY}px`;
                vpContextMenu.style.display = 'block';
            } else {
                vpContextMenu.style.display = 'none';
            }
        } else {
            vpContextMenu.style.display = 'none';
        }
    });
    document.addEventListener('click', (e) => { // Hide context menu on general click
        if (!vpContextMenu.contains(e.target)) {
            vpContextMenu.style.display = 'none';
        }
    });


    // --- VexPlan Drawing Canvas Event Handlers ---
    vpDrawingCanvas.addEventListener('mousedown', (e) => {
        if (!vpDrawingModeActive) return;
        const rect = vpDrawingCanvas.getBoundingClientRect();
        vpDrawingStartX = e.clientX - rect.left; vpDrawingStartY = e.clientY - rect.top;
        vpDrawingCurrentX = vpDrawingStartX; vpDrawingCurrentY = vpDrawingStartY;
        vpIsDrawing = true;
        vpDrawingCtx.lineCap = 'round'; vpDrawingCtx.lineJoin = 'round';
        vpDrawingCtx.strokeStyle = vpDrawingColor; vpDrawingCtx.lineWidth = vpDrawingSize;
        if (vpIsErasing) {
            vpDrawingCtx.globalCompositeOperation = 'destination-out'; vpDrawingCtx.lineWidth = 10; // Eraser size
        } else {
            vpDrawingCtx.globalCompositeOperation = 'source-over';
        }
        if (vpDrawingShape === 'normal' || vpIsErasing) { vpDrawingCtx.beginPath(); vpDrawingCtx.moveTo(vpDrawingStartX, vpDrawingStartY); }
    });
    vpDrawingCanvas.addEventListener('mousemove', (e) => {
        if (!vpDrawingModeActive || !vpIsDrawing) return;
        const rect = vpDrawingCanvas.getBoundingClientRect();
        vpDrawingCurrentX = e.clientX - rect.left; vpDrawingCurrentY = e.clientY - rect.top;
        if (vpDrawingShape === 'normal' || vpIsErasing) {
            vpDrawingCtx.lineTo(vpDrawingCurrentX, vpDrawingCurrentY); vpDrawingCtx.stroke();
            vpDrawingCtx.beginPath(); vpDrawingCtx.moveTo(vpDrawingCurrentX, vpDrawingCurrentY); // For continuous drawing
        }
        // For shapes like square/arrow, you might draw a temporary preview here on main canvas or a temp overlay
    });
    vpDrawingCanvas.addEventListener('mouseup', (e) => {
        if (!vpDrawingModeActive || !vpIsDrawing) return;
        const rect = vpDrawingCanvas.getBoundingClientRect();
        vpDrawingCurrentX = e.clientX - rect.left; vpDrawingCurrentY = e.clientY - rect.top;

        if (vpIsErasing) {
            vpDrawingCtx.lineTo(vpDrawingCurrentX, vpDrawingCurrentY); vpDrawingCtx.stroke();
        } else if (vpDrawingShape === 'square') {
            vpDrawingCtx.strokeRect(vpDrawingStartX, vpDrawingStartY, vpDrawingCurrentX - vpDrawingStartX, vpDrawingCurrentY - vpDrawingStartY);
        } else if (vpDrawingShape === 'arrow') {
            vpDrawingCtx.beginPath(); vpDrawingCtx.moveTo(vpDrawingStartX, vpDrawingStartY); vpDrawingCtx.lineTo(vpDrawingCurrentX, vpDrawingCurrentY); vpDrawingCtx.stroke();
            const angle = Math.atan2(vpDrawingCurrentY - vpDrawingStartY, vpDrawingCurrentX - vpDrawingStartX);
            const headlen = vpDrawingSize * 2.5; // Arrow head size based on line width
            vpDrawingCtx.beginPath(); vpDrawingCtx.moveTo(vpDrawingCurrentX, vpDrawingCurrentY);
            vpDrawingCtx.lineTo(vpDrawingCurrentX - headlen * Math.cos(angle - Math.PI / 6), vpDrawingCurrentY - headlen * Math.sin(angle - Math.PI / 6));
            vpDrawingCtx.moveTo(vpDrawingCurrentX, vpDrawingCurrentY);
            vpDrawingCtx.lineTo(vpDrawingCurrentX - headlen * Math.cos(angle + Math.PI / 6), vpDrawingCurrentY - headlen * Math.sin(angle + Math.PI / 6));
            vpDrawingCtx.stroke();
        } else if (vpDrawingShape === 'normal') { // Ensure last segment is drawn
            vpDrawingCtx.lineTo(vpDrawingCurrentX, vpDrawingCurrentY); vpDrawingCtx.stroke();
        }
        vpIsDrawing = false;
        // vpDrawingCtx.globalCompositeOperation = 'source-over'; // Reset if needed
    });
    vpDrawingCanvas.addEventListener('mouseleave', () => { if (vpIsDrawing) vpIsDrawing = false; });


    // --- VexPlan UI Buttons ---
    document.getElementById('toggle-drawing').addEventListener('click', () => {
        vpDrawingModeActive = !vpDrawingModeActive;
        document.getElementById('toggle-drawing').textContent = vpDrawingModeActive ? 'Disable Drawing' : 'Enable Drawing';
        vpDrawingCanvas.classList.toggle('drawing-active', vpDrawingModeActive);
        if (!vpDrawingModeActive) { vpIsErasing = false; vpDrawingCtx.globalCompositeOperation = 'source-over'; }
        // Adjust cursor for main canvas based on drawing mode
        rrCanvas.style.cursor = vpDrawingModeActive ? 'default' : 'crosshair';
    });
    document.getElementById('drawing-color').addEventListener('change', (e) => { vpDrawingColor = e.target.value; vpIsErasing = false; vpDrawingCtx.globalCompositeOperation = 'source-over'; });
    document.getElementById('drawing-size').addEventListener('change', (e) => { vpDrawingSize = parseInt(e.target.value); vpIsErasing = false; vpDrawingCtx.globalCompositeOperation = 'source-over';});
    document.getElementById('drawing-shape').addEventListener('change', (e) => { vpDrawingShape = e.target.value; vpIsErasing = false; vpDrawingCtx.globalCompositeOperation = 'source-over';});
    document.getElementById('erase-tool').addEventListener('click', () => {
        if (!vpDrawingModeActive) document.getElementById('toggle-drawing').click(); // Enable drawing mode if not active
        vpIsErasing = true;
    });
    document.getElementById('clear-drawing').addEventListener('click', () => { vpDrawingCtx.clearRect(0, 0, vpDrawingCanvas.width, vpDrawingCanvas.height); vpIsErasing = false; vpDrawingCtx.globalCompositeOperation = 'source-over'; });

    document.getElementById('add-red-ring').addEventListener('click', () => { if (vpSelectedRingTarget && vpSelectedRingTarget.ringColors.length < vpSelectedRingTarget.maxRings) { vpSelectedRingTarget.ringColors.push('red'); vpUpdateRingManagementPanel(); /* redrawCombined(); */ } });
    document.getElementById('add-blue-ring').addEventListener('click', () => { if (vpSelectedRingTarget && vpSelectedRingTarget.ringColors.length < vpSelectedRingTarget.maxRings) { vpSelectedRingTarget.ringColors.push('blue'); vpUpdateRingManagementPanel(); /* redrawCombined(); */ } });
    document.getElementById('remove-ring').addEventListener('click', () => { if (vpSelectedRingTarget && vpSelectedRingTarget.ringColors.length > 0) { vpSelectedRingTarget.ringColors.pop(); vpUpdateRingManagementPanel(); /* redrawCombined(); */ } });
    
    document.getElementById('reset-simulation-button').addEventListener('click', vpResetSimulation);
    document.getElementById('show-tutorial').addEventListener('click', () => { document.getElementById('tutorial-modal').style.display = 'flex'; });
    document.getElementById('close-tutorial').addEventListener('click', () => { document.getElementById('tutorial-modal').style.display = 'none'; });

    // VexPlan Team Number Inputs
    ['red-team-1', 'red-team-2', 'blue-team-1', 'blue-team-2'].forEach((id, index) => {
        document.getElementById(id).addEventListener('input', (e) => {
            vpRobots[index].teamNumber = e.target.value;
            // redrawCombined();
        });
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        // RoboRoute Undo/Redo
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); rrUndo(); /* redrawCombined(); */ }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); rrRedo(); /* redrawCombined(); */ }

        // RoboRoute Point Reordering (Ctrl + ArrowUp/Down)
        if (rrSelectedPointIndex !== null && e.ctrlKey) {
            if (e.key === "ArrowUp") { e.preventDefault(); rrMovePointOrder("up"); }
            else if (e.key === "ArrowDown") { e.preventDefault(); rrMovePointOrder("down"); }
            // redrawCombined();
        }
    });
}


// ============== Initialization Call ===============
window.addEventListener("DOMContentLoaded", () => {
    rrCreatePointListUI();    // Create RoboRoute point list UI
    rrSetupPointInfoPanel();  // Setup RoboRoute point info panel inputs
    rrAddFieldSelector();     // Add RoboRoute field selector to tools
    rrLoadFieldImage(DEFAULT_FIELD_IMAGE); // Load default field

    vpUpdateRingManagementPanel(); // Initial VexPlan UI state

    setupEventListeners();    // Setup all event listeners

    redrawCombined();         // Start the main drawing loop
});