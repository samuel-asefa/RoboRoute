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
    // VexPlan original coordinates were for a 720x720 canvas.
    // If RoboRoute canvas is 800x800, and VexPlan coordinates are relative to its field elements,
    // we might need to scale them based on the game field's actual dimensions represented,
    // not just the canvas size, if VP_FIELD_SIZE is also supposed to represent the game field in new units.
    // For simplicity, if VP_FIELD_SIZE = 800 (matching rrCanvas), and original VexPlan coords were for a 720px rendering of that same field,
    // then coord * (800/720) is correct.
    return Math.round(coord * (VP_FIELD_SIZE / 720));
}
// Re-initialize positions based on new VP_FIELD_SIZE scaling
vpRobots[0].x = scaleVpCoord(30); vpRobots[0].y = scaleVpCoord(30);
vpRobots[1].x = scaleVpCoord(30); vpRobots[1].y = scaleVpCoord(720 - 120); // Use 720 as original field size for relative pos
vpRobots[2].x = scaleVpCoord(720 - 120); vpRobots[2].y = scaleVpCoord(30);
vpRobots[3].x = scaleVpCoord(720 - 120); vpRobots[3].y = scaleVpCoord(720 - 120);

vpMobileGoals[0].x = scaleVpCoord(480); vpMobileGoals[0].y = scaleVpCoord(235);
vpMobileGoals[1].x = scaleVpCoord(360); vpMobileGoals[1].y = scaleVpCoord(595);
vpMobileGoals[2].x = scaleVpCoord(240); vpMobileGoals[2].y = scaleVpCoord(235);
vpMobileGoals[3].x = scaleVpCoord(480); vpMobileGoals[3].y = scaleVpCoord(475);
vpMobileGoals[4].x = scaleVpCoord(240); vpMobileGoals[4].y = scaleVpCoord(475);
// Stakes and ladder positions are relative to VP_FIELD_SIZE, so mostly okay if VP_FIELD_SIZE is canvas width/height.


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
    // redrawCombined(); // Handled by main loop
}

function rrRedo() {
    if (rrHistory.future.length === 0) return;
    rrHistory.past.push(JSON.parse(JSON.stringify(rrPoints)));
    rrPoints = rrHistory.future.pop();
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    rrHidePointInfo();
    // redrawCombined(); // Handled by main loop
}

function rrVexToCanvas(x, y) {
    const scaleX = RR_CANVAS_WIDTH / (RR_VEX_MAX - RR_VEX_MIN);
    const scaleY = RR_CANVAS_HEIGHT / (RR_VEX_MAX - RR_VEX_MIN);
    return {
        x: (x - RR_VEX_MIN) * scaleX,
        y: (RR_VEX_MAX - y) * scaleY  // Y is inverted
    };
}

function rrCanvasToVex(x, y) {
    const scaleX = (RR_VEX_MAX - RR_VEX_MIN) / RR_CANVAS_WIDTH;
    const scaleY = (RR_VEX_MAX - RR_VEX_MIN) / RR_CANVAS_HEIGHT;
    return {
        x: RR_VEX_MIN + x * scaleX,
        y: RR_VEX_MAX - y * scaleY // Y is inverted
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
    if (heading !== null && heading !== undefined) {
        const radians = (90 - heading) * (Math.PI / 180); // Convert heading where 0 is North/Up
        const lineLength = radius * 2; 
        const endX = x + Math.cos(radians) * lineLength;
        const endY = y - Math.sin(radians) * lineLength; // Subtract sin because canvas Y is down
        rrCtx.beginPath();
        rrCtx.moveTo(x, y);
        rrCtx.lineTo(endX, endY);
        rrCtx.strokeStyle = '#2f2f2e'; // Darker line for heading
        rrCtx.lineWidth = 3;
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
    rrCtx.strokeStyle = "#bcd732"; // RoboRoute path color
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
    // redrawCombined(); // Handled by main loop
}

function rrDistToSegment(p, v, w) { // p, v, w are in Vex coords
    const l2_sq = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2_sq === 0) return { distance: Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2), point: v, t: 0 };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2_sq;
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
    rrUpdatePointList(); // Update list to show selection
}

function rrHidePointInfo() {
    rrPointInfoPanel.style.display = "none";
    // Clear selection highlight in list (visual only, actual selection cleared elsewhere)
    if (rrPointListDiv && rrSelectedPointIndex !== null) {
        const entries = rrPointListDiv.querySelectorAll('.point-entry');
        if (entries[rrSelectedPointIndex]) entries[rrSelectedPointIndex].classList.remove('selected');
    }
    rrSelectedPoint = null; // Ensure these are cleared
    rrSelectedPointIndex = null; // Ensure these are cleared
    rrUpdatePointList(); 
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
            midHeading = ((h1 + h2) / 2) % 360;
        } else if (p1.heading !== undefined) {
            midHeading = p1.heading;
        }
        const newPoint = { x: midX, y: midY, heading: midHeading };
        rrPoints.splice(currentIndex + 1, 0, newPoint);
        rrSelectPoint(currentIndex + 1); // Select the newly inserted point
    }
}

function rrMovePointOrder(direction) {
    if (rrSelectedPointIndex === null) return;
    rrSaveState();
    if (direction === "up" && rrSelectedPointIndex > 0) {
        [rrPoints[rrSelectedPointIndex], rrPoints[rrSelectedPointIndex - 1]] = [rrPoints[rrSelectedPointIndex - 1], rrPoints[rrSelectedPointIndex]];
        rrSelectPoint(rrSelectedPointIndex - 1); // Update selection to moved point
    } else if (direction === "down" && rrSelectedPointIndex < rrPoints.length - 1) {
        [rrPoints[rrSelectedPointIndex], rrPoints[rrSelectedPointIndex + 1]] = [rrPoints[rrSelectedPointIndex + 1], rrPoints[rrSelectedPointIndex]];
        rrSelectPoint(rrSelectedPointIndex + 1); // Update selection to moved point
    }
}

function rrCreatePointListUI() {
    rrPointListContainer = document.createElement("div");
    rrPointListContainer.id = "pointListContainer";
    const pointListHeader = document.createElement("h3");
    pointListHeader.textContent = "Path Points";
    rrPointListContainer.appendChild(pointListHeader);
    rrPointListDiv = document.createElement("div");
    rrPointListDiv.id = "pointList";
    rrPointListContainer.appendChild(rrPointListDiv);
    document.body.appendChild(rrPointListContainer); 
}

function rrSetupPointInfoPanel() {
    rrPointXInput.type = "number"; rrPointXInput.step = "0.1";
    document.getElementById("pointXSpan").replaceWith(rrPointXInput);
    rrPointYInput.type = "number"; rrPointYInput.step = "0.1";
    document.getElementById("pointYSpan").replaceWith(rrPointYInput);

    const headingLabelP = document.createElement("p");
    headingLabelP.id = "headingLabel";
    headingLabelP.innerHTML = "<strong>Heading (°):</strong> ";
    rrHeadingInput.id = "headingInput"; rrHeadingInput.type = "number";
    rrHeadingInput.step = "1"; rrHeadingInput.min = "0"; rrHeadingInput.max = "359";
    headingLabelP.appendChild(rrHeadingInput);
    
    const pointYParagraph = rrPointYInput.parentElement; 
    if (pointYParagraph) pointYParagraph.after(headingLabelP);
    else rrPointInfoPanel.insertBefore(headingLabelP, rrPointInfoPanel.querySelector('hr') || rrInsertPointBtn);


    const pointIndexInfo = document.createElement("p");
    pointIndexInfo.id = "pointIndexInfo";
    pointIndexInfo.innerHTML = `<strong>Point Index:</strong> <span id="pointIndexValue">N/A</span>`;
    rrPointInfoPanel.querySelector("h4").after(pointIndexInfo);

    rrPointXInput.oninput = () => { if (rrSelectedPoint) { rrSaveState(); rrSelectedPoint.x = parseFloat(rrPointXInput.value); }};
    rrPointYInput.oninput = () => { if (rrSelectedPoint) { rrSaveState(); rrSelectedPoint.y = parseFloat(rrPointYInput.value); }};
    rrHeadingInput.oninput = () => {
        if (rrSelectedPoint) {
            rrSaveState();
            let value = parseFloat(rrHeadingInput.value);
            value = ((value % 360) + 360) % 360; 
            rrSelectedPoint.heading = value;
            rrHeadingInput.value = value.toFixed(1);
        }
    };
    rrInsertPointBtn.onclick = () => { if (rrSelectedPointIndex !== null) rrInsertPointAtIndex(rrSelectedPointIndex); };
    rrClosePointInfoBtn.addEventListener("click", rrHidePointInfo);
}

function rrAddFieldSelector() {
    const fieldSelect = document.createElement("select");
    fieldSelect.id = "fieldSelect";
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
        option.value = field.value; option.textContent = field.text;
        fieldSelect.appendChild(option);
    });
    const fileInput = document.createElement("input");
    fileInput.type = "file"; fileInput.id = "customFieldInput"; fileInput.accept = "image/*";
    const uploadButton = document.createElement("button");
    uploadButton.id = "uploadFieldBtn"; uploadButton.textContent = "Upload Custom";

    fieldSelect.addEventListener("change", function() {
        if (this.value === "custom") {
            fileInput.style.display = "inline-block"; uploadButton.style.display = "inline-block";
        } else {
            fileInput.style.display = "none"; uploadButton.style.display = "none";
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
    toolsDiv.appendChild(fieldSelect); toolsDiv.appendChild(fileInput); toolsDiv.appendChild(uploadButton);
}

function rrLoadFieldImage(src) {
    rrBackgroundLoaded = false;
    rrCurrentFieldImage.onload = () => { rrBackgroundLoaded = true; };
    rrCurrentFieldImage.onerror = () => { console.error("Failed to load field image:", src); rrCurrentFieldImage.src = DEFAULT_FIELD_IMAGE; };
    rrCurrentFieldImage.src = src;
}

function rrGenerateCode() {
    if (rrPoints.length < 1) { alert("No path points to generate code from."); return; }
    const formattedPoints = rrPoints.map(p => ({
        x: parseFloat(p.x).toFixed(2), y: parseFloat(p.y).toFixed(2),
        heading: p.heading !== undefined ? parseFloat(p.heading).toFixed(1) : 0
    }));
    let code = `chassis.setPose(${formattedPoints[0].x}, ${formattedPoints[0].y}, ${formattedPoints[0].heading});\n`;
    for (let i = 1; i < formattedPoints.length; i++) {
        code += `chassis.moveToPose(${formattedPoints[i].x}, ${formattedPoints[i].y}, ${formattedPoints[i].heading}, ${rrDelayInput.value || 1000});\n`;
    }
    console.log(code); alert("Generated Path Code:\n\n" + code);
}

// ============== VexPlan Functions (Game Simulation & Drawing) ===============
function vpDrawHexagon(ctx, x, y, size, fillStyle) {
    ctx.beginPath(); const radius = size / 2;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + (Math.PI / 6);
        const px = x + radius * Math.cos(angle); const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = fillStyle; ctx.fill();
}
function vpDrawRing(ctx, x, y, outerRadius, innerRadius, color) {
    ctx.beginPath(); ctx.arc(x, y, outerRadius, 0, 2 * Math.PI);
    ctx.arc(x, y, innerRadius, 0, 2 * Math.PI, true);
    ctx.fillStyle = color; ctx.fill('evenodd');
}
function vpDrawGameObjects(ctx) {
    const ladderGradient = ctx.createLinearGradient(vpLadder.x, vpLadder.y, vpLadder.x + vpLadder.width, vpLadder.y + vpLadder.height);
    ladderGradient.addColorStop(0, '#ff6b6b'); ladderGradient.addColorStop(1, '#ff8787');
    ctx.strokeStyle = ladderGradient; ctx.lineWidth = 4; ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(255,107,107,0.4)';
    ctx.beginPath(); ctx.moveTo(vpLadder.x + VP_LADDER_SIZE/2, vpLadder.y);
    ctx.lineTo(vpLadder.x + VP_LADDER_SIZE, vpLadder.y + VP_LADDER_SIZE/2);
    ctx.lineTo(vpLadder.x + VP_LADDER_SIZE/2, vpLadder.y + VP_LADDER_SIZE);
    ctx.lineTo(vpLadder.x, vpLadder.y + VP_LADDER_SIZE/2); ctx.closePath(); ctx.stroke(); ctx.shadowBlur = 0;

    ctx.fillStyle = vpLadder.highStake === vpSelectedRingTarget ? '#ffff99':'#f1c40f';
    ctx.shadowBlur=4; ctx.shadowColor='rgba(241,196,15,0.5)'; ctx.beginPath();
    ctx.arc(vpLadder.highStake.x, vpLadder.highStake.y, VP_STAKE_RADIUS,0,2*Math.PI); ctx.fill();
    vpLadder.highStake.ringColors.forEach((rc,i) => vpDrawRing(ctx,vpLadder.highStake.x, vpLadder.highStake.y-(i+1)*(VP_RING_OUTER_RADIUS*2.2),VP_RING_OUTER_RADIUS,VP_RING_INNER_RADIUS,rc));
    ctx.shadowBlur=0;

    vpStakes.forEach(stake => {
        ctx.fillStyle=stake===vpSelectedRingTarget ? '#999999':stake.color;
        ctx.shadowBlur=4;ctx.shadowColor=`rgba(${stake.color==='red'?'255,0,0':stake.color==='blue'?'0,0,255':'0,0,0'},0.5)`;
        ctx.beginPath();ctx.arc(stake.x,stake.y,VP_STAKE_RADIUS,0,2*Math.PI);ctx.fill();
        stake.ringColors.forEach((rc,i)=>{
            const yOff = (stake.x === VP_FIELD_SIZE/2 && stake.y === 0) ? (i+1)*(VP_RING_OUTER_RADIUS*2.2) : -(i+1)*(VP_RING_OUTER_RADIUS*2.2);
            vpDrawRing(ctx,stake.x,stake.y+yOff,VP_RING_OUTER_RADIUS,VP_RING_INNER_RADIUS,rc);
        });
        ctx.shadowBlur=0;
    });
    vpMobileGoals.forEach(mg => {
        const mgGrad = ctx.createLinearGradient(mg.x-VP_MOBILE_GOAL_SIZE/2,mg.y-VP_MOBILE_GOAL_SIZE/2,mg.x+VP_MOBILE_GOAL_SIZE/2,mg.y+VP_MOBILE_GOAL_SIZE/2);
        mgGrad.addColorStop(0,mg===vpSelectedRingTarget?'#f39c12':'#e67e22');mgGrad.addColorStop(1,mg===vpSelectedRingTarget?'#e67e22':'#d35400');
        ctx.shadowBlur=4;ctx.shadowColor='rgba(230,126,34,0.5)';
        vpDrawHexagon(ctx,mg.x,mg.y,VP_MOBILE_GOAL_SIZE,mgGrad); // mg.x, mg.y should be center for hexagon
        ctx.fillStyle=mg===vpSelectedRingTarget?'#ffff99':'#f1c40f';
        ctx.beginPath();ctx.arc(mg.x,mg.y,VP_STAKE_RADIUS,0,2*Math.PI);ctx.fill();
        mg.ringColors.forEach((rc,i)=>vpDrawRing(ctx,mg.x,mg.y-(i+1)*(VP_RING_OUTER_RADIUS*2.2),VP_RING_OUTER_RADIUS,VP_RING_INNER_RADIUS,rc));
        ctx.shadowBlur=0;
    });
    vpRobots.forEach(robot => {
        const rGrad = ctx.createLinearGradient(robot.x,robot.y,robot.x+VP_ROBOT_SIZE,robot.y+VP_ROBOT_SIZE);
        rGrad.addColorStop(0,robot.color==='red'?'#e74c3c':'#3498db');rGrad.addColorStop(1,robot.color==='red'?'#c0392b':'#2980b9');
        ctx.fillStyle=rGrad; ctx.shadowBlur=6;ctx.shadowColor=`rgba(${robot.color==='red'?'231,76,60':'52,152,219'},0.5)`;
        ctx.fillRect(robot.x,robot.y,VP_ROBOT_SIZE,VP_ROBOT_SIZE);
        if(robot.teamNumber){
            ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
            const tX=robot.x+VP_ROBOT_SIZE/2;const tY=robot.y+VP_ROBOT_SIZE/2;
            ctx.strokeStyle='black';ctx.lineWidth=3;ctx.strokeText(robot.teamNumber,tX,tY);
            ctx.fillStyle='#ffffff';ctx.fillText(robot.teamNumber,tX,tY);
        }
        if(robot.hanging){
            ctx.strokeStyle='#333333';ctx.lineWidth=3;ctx.shadowBlur=4;ctx.shadowColor='rgba(0,0,0,0.5)';
            ctx.beginPath();
            const rCX=robot.x+VP_ROBOT_SIZE/2;const rCY=robot.y+VP_ROBOT_SIZE/2;
            let hX,hY;
            if(robot.hanging==='ladder'){hX=vpLadder.highStake.x;hY=vpLadder.highStake.y;}
            else if(robot.hanging.startsWith('stake')){const sI=parseInt(robot.hanging.slice(5));hX=vpStakes[sI].x;hY=vpStakes[sI].y;}
            if(hX!==undefined){ctx.moveTo(rCX,rCY);ctx.lineTo(hX,hY);ctx.stroke();}
            ctx.shadowBlur=0;
        }
    });
}
function vpCalculateScore() {
    let redScore=0,blueScore=0;
    vpStakes.forEach(s=>{
        if(s.color==='red'){let rR=s.ringColors.filter(r=>r==='red').length;redScore+=rR;if(s.ringColors.length>0&&s.ringColors[s.ringColors.length-1]==='red')redScore+=2;}
        else if(s.color==='blue'){let bR=s.ringColors.filter(r=>r==='blue').length;blueScore+=bR;if(s.ringColors.length>0&&s.ringColors[s.ringColors.length-1]==='blue')blueScore+=2;}
        else{s.ringColors.forEach(rg=>{if(rg==='red')redScore++;else if(rg==='blue')blueScore++;});if(s.ringColors.length>0){let t=s.ringColors[s.ringColors.length-1];if(t==='red')redScore+=2;else if(t==='blue')blueScore+=2;}}
    });
    if(vpLadder.highStake.ringColors.length>0){if(vpLadder.highStake.ringColors[0]==='red')redScore+=6;else if(vpLadder.highStake.ringColors[0]==='blue')blueScore+=6;}
    vpMobileGoals.forEach(mg=>{
        let mgR=mg.ringColors.filter(r=>r==='red').length;let mgB=mg.ringColors.filter(r=>r==='blue').length;
        if(mg.ringColors.length>0){let t=mg.ringColors[mg.ringColors.length-1];if(t==='red')mgR+=2;else if(t==='blue')mgB+=2;}
        let mgCX=mg.x; let mgCY=mg.y; // Assuming mg.x, mg.y is center
        let posC=(mgCX<VP_CORNER_SIZE&&mgCY>VP_FIELD_SIZE-VP_CORNER_SIZE)||(mgCX>VP_FIELD_SIZE-VP_CORNER_SIZE&&mgCY>VP_FIELD_SIZE-VP_CORNER_SIZE);
        let negC=(mgCX<VP_CORNER_SIZE&&mgCY<VP_CORNER_SIZE)||(mgCX>VP_FIELD_SIZE-VP_CORNER_SIZE&&mgCY<VP_CORNER_SIZE);
        if(posC){redScore+=mgR*2;blueScore+=mgB*2;}
        else if(negC){redScore=Math.max(0,redScore-mgR);blueScore=Math.max(0,blueScore-mgB);}
        else{redScore+=mgR;blueScore+=mgB;}
    });
    vpRobots.forEach(rb=>{
        if(rb.climbLevel>0){let p={1:3,2:6,3:12}[rb.climbLevel];if(vpLadder.highStake.ringColors.length>0)p+=2;if(rb.alliance==='red')redScore+=p;else blueScore+=p;}
        if(rb.hanging){
            let p=0;if(rb.hanging==='ladder')p=5;
            else if(rb.hanging.startsWith('stake')){const s=vpStakes[parseInt(rb.hanging.slice(5))];if(s.color==='black')p=3;else if(s.color===rb.alliance)p=4;else p=2;if(s.ringColors.length>0)p+=1;}
            if(rb.alliance==='red')redScore+=p;else blueScore+=p;
        }
    });
    document.getElementById('red-score').textContent=Math.round(redScore);document.getElementById('blue-score').textContent=Math.round(blueScore);
}
function vpIsPointInHexagon(x,y,centerX,centerY,size){const r=size/2;const dX=Math.abs(x-centerX);const dY=Math.abs(y-centerY);if(dX>r||dY>r*Math.sqrt(3)/2)return false;return(dY<=(r*Math.sqrt(3)/2))&&(dX<=r/2+(r-dY*2/Math.sqrt(3)));}
function vpIsPointInDiamond(x,y,centerX,centerY,size){return(Math.abs(x-centerX)+Math.abs(y-centerY))<=(size/2);}
function vpUpdateRingManagementPanel(){const sT=document.getElementById('selected-object-info');const rC=document.getElementById('ring-count-info');const rL=document.getElementById('ring-list-info');const aRB=document.getElementById('add-red-ring');const aBB=document.getElementById('add-blue-ring');const rmB=document.getElementById('remove-ring');if(!vpSelectedRingTarget){sT.textContent='None';rC.textContent='0';rL.textContent='None';aRB.disabled=true;aBB.disabled=true;rmB.disabled=true;}else{let n;if(vpSelectedRingTarget===vpLadder.highStake)n='High Stake';else if(vpStakes.includes(vpSelectedRingTarget))n=`${vpSelectedRingTarget.color.charAt(0).toUpperCase()+vpSelectedRingTarget.color.slice(1)} Stake`;else n=`Mobile Goal ${vpMobileGoals.indexOf(vpSelectedRingTarget)+1}`;sT.textContent=n;rC.textContent=vpSelectedRingTarget.ringColors.length;rL.textContent=vpSelectedRingTarget.ringColors.length>0?vpSelectedRingTarget.ringColors.join(', '):'None';aRB.disabled=vpSelectedRingTarget.ringColors.length>=vpSelectedRingTarget.maxRings;aBB.disabled=vpSelectedRingTarget.ringColors.length>=vpSelectedRingTarget.maxRings;rmB.disabled=vpSelectedRingTarget.ringColors.length===0;}}
function vpSetClimbLevel(robotIndex,level){vpRobots[robotIndex].climbLevel=level;vpRobots[robotIndex].hanging=null;vpContextMenu.style.display='none';}
function vpSetHang(robotIndex,location){vpRobots[robotIndex].hanging=location;vpRobots[robotIndex].climbLevel=0;vpContextMenu.style.display='none';}
function vpResetSimulation(){const tNs=vpRobots.map(r=>r.teamNumber);vpRobots.forEach((r,i)=>{const oP=[{x:scaleVpCoord(30),y:scaleVpCoord(30)},{x:scaleVpCoord(30),y:scaleVpCoord(720-120)},{x:scaleVpCoord(720-120),y:scaleVpCoord(30)},{x:scaleVpCoord(720-120),y:scaleVpCoord(720-120)}][i];r.x=oP.x;r.y=oP.y;r.climbLevel=0;r.hanging=null;r.teamNumber=tNs[i];});vpMobileGoals.forEach((mg,i)=>{const oP=[{x:scaleVpCoord(480),y:scaleVpCoord(235)},{x:scaleVpCoord(360),y:scaleVpCoord(595)},{x:scaleVpCoord(240),y:scaleVpCoord(235)},{x:scaleVpCoord(480),y:scaleVpCoord(475)},{x:scaleVpCoord(240),y:scaleVpCoord(475)}][i];mg.x=oP.x;mg.y=oP.y;mg.ringColors=[];mg.dragging=false;});vpStakes.forEach(s=>s.ringColors=[]);vpLadder.highStake.ringColors=[];vpSelectedRingTarget=null;vpSelectedObject=null;vpUpdateRingManagementPanel();}

// ============== Combined Drawing and Game Loop ===============
function redrawCombined() {
    rrCtx.clearRect(0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    rrCtx.save(); 
    rrCtx.translate(rrOffsetX, rrOffsetY); rrCtx.scale(rrScale, rrScale);

    if (rrBackgroundLoaded && rrCurrentFieldImage.complete) {
        rrCtx.drawImage(rrCurrentFieldImage, 0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    } else if (!rrBackgroundLoaded && rrCurrentFieldImage.src && !rrCurrentFieldImage.complete) {
        // Waiting for image
    } else { 
        rrCtx.fillStyle = '#3a3a3a'; // Darker default if no image
        rrCtx.fillRect(0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    }
    
    vpDrawGameObjects(rrCtx); // VexPlan objects drawn on rrCtx (main canvas)

    if (rrMode === "linear") rrDrawLinearPath();

    rrPoints.forEach((point, index) => {
        const heading = point.heading !== undefined ? point.heading : 0;
        const isHighlighted = index === rrSelectedPointIndex;
        rrDrawPoint(point.x, point.y, 5, point.color || "#bcd732", 1, heading, isHighlighted);
        const { x: cx, y: cy } = rrVexToCanvas(point.x, point.y);
        rrCtx.font = "12px Roboto"; rrCtx.fillStyle = "white"; 
        rrCtx.fillText(`${index + 1}`, cx + 10, cy + 5);
    });

    if (rrInsertMode && rrHoverPoint) {
        let heading = 0; 
        if (rrPoints.length > 1 && rrPoints[rrHoverPoint.segmentIndex].heading !== undefined && rrPoints[rrHoverPoint.segmentIndex + 1].heading !== undefined) {
             const prevH = rrPoints[rrHoverPoint.segmentIndex].heading;
             const nextH = rrPoints[rrHoverPoint.segmentIndex + 1].heading;
             heading = prevH + (nextH - prevH) * rrHoverPoint.t;
        }
        rrDrawPoint(rrHoverPoint.x, rrHoverPoint.y, 5, "rgba(0,0,255,0.5)", 0.5, heading); // Semi-transparent blue
    }
    
    rrCtx.restore(); 

    rrUpdatePointList();
    vpCalculateScore(); 
    vpUpdateRingManagementPanel();

    requestAnimationFrame(redrawCombined);
}

// ============== Event Handlers Setup ===============
function setupEventListeners() {
    document.getElementById("linearBtn").addEventListener("click", () => { rrMode = "linear"; rrSetActiveMode(null); });
    rrInsertBtn.addEventListener("click", () => rrSetActiveMode(rrInsertMode ? null : rrInsertBtn));
    rrDeleteBtn.addEventListener("click", () => rrSetActiveMode(rrDeleteMode ? null : rrDeleteBtn));
    rrTrimBtn.addEventListener("click", () => rrSetActiveMode(rrTrimMode ? null : rrTrimBtn));
    rrClearBtn.addEventListener("click", () => { if (confirm("Clear all path points?")) { rrSaveState(); rrPoints = []; rrHidePointInfo(); rrSetActiveMode(null); }});
    rrGenerateBtn.addEventListener("click", rrGenerateCode);

    rrCanvas.addEventListener("mousedown", (e) => {
        const rect = rrCanvas.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
        if (vpDrawingModeActive) return;
        vpSelectedObject = null; 

        for (let robot of vpRobots) {
            if (mouseX>=robot.x&&mouseX<=robot.x+VP_ROBOT_SIZE && mouseY>=robot.y&&mouseY<=robot.y+VP_ROBOT_SIZE) {
                vpSelectedObject=robot; robot.dragging=true; vpSelectedRingTarget=null; vpUpdateRingManagementPanel(); return;
            }
        }
        for (let mg of vpMobileGoals) { // Assuming mg.x, mg.y is center
            if (vpIsPointInHexagon(mouseX,mouseY,mg.x,mg.y,VP_MOBILE_GOAL_SIZE)) {
                vpSelectedObject=mg; mg.dragging=true; vpSelectedRingTarget=mg; vpUpdateRingManagementPanel(); return;
            }
        }
        
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);
        for (let i = 0; i < rrPoints.length; i++) {
            const point = rrPoints[i]; const dist = Math.sqrt((vexX - point.x)**2 + (vexY - point.y)**2);
            if (dist < 2.5) { // Increased sensitivity slightly for RR points
                if (e.button === 0) { 
                    if (rrDeleteMode) { 
                        rrSaveState(); rrPoints.splice(i, 1);
                        if (rrSelectedPointIndex === i) rrHidePointInfo();
                        else if (rrSelectedPointIndex > i) rrSelectedPointIndex--;
                        rrSetActiveMode(null); 
                    } else { rrIsDraggingPoint = true; rrSelectPoint(i); }
                }
                return; 
            }
        }
        // Check for VexPlan stake click only if no RR point was interacted with
        for (let stake of [...vpStakes, vpLadder.highStake]) {
            if (Math.hypot(stake.x - mouseX, stake.y - mouseY) < VP_STAKE_RADIUS * 2.5) {
                vpSelectedRingTarget = stake; vpSelectedObject = null; vpUpdateRingManagementPanel(); return;
            }
        }
    });

    rrCanvas.addEventListener("mousemove", (e) => {
        const rect = rrCanvas.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
        if (vpDrawingModeActive) return;

        if (vpSelectedObject && vpSelectedObject.dragging) {
            if (vpRobots.includes(vpSelectedObject)) {
                vpSelectedObject.x = Math.max(0, Math.min(mouseX - VP_ROBOT_SIZE/2, VP_FIELD_SIZE - VP_ROBOT_SIZE));
                vpSelectedObject.y = Math.max(0, Math.min(mouseY - VP_ROBOT_SIZE/2, VP_FIELD_SIZE - VP_ROBOT_SIZE));
            } else if (vpMobileGoals.includes(vpSelectedObject)) { // Assuming mg.x, mg.y is center
                vpSelectedObject.x = Math.max(VP_MOBILE_GOAL_SIZE/2, Math.min(mouseX, VP_FIELD_SIZE - VP_MOBILE_GOAL_SIZE/2));
                vpSelectedObject.y = Math.max(VP_MOBILE_GOAL_SIZE/2, Math.min(mouseY, VP_FIELD_SIZE - VP_MOBILE_GOAL_SIZE/2));
            }
            return;
        }
        
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);
        if (rrIsDraggingPoint && rrSelectedPoint) {
            // rrSaveState(); // Saving on mouseup is better for performance
            rrSelectedPoint.x = vexX; rrSelectedPoint.y = vexY;
            rrPointXInput.value = vexX.toFixed(2); rrPointYInput.value = vexY.toFixed(2);
        } else if (rrInsertMode && rrPoints.length >= 2) { 
            let minDist = Infinity; let closestSegPt = null; let segInfo = null;
            for (let i = 0; i < rrPoints.length - 1; i++) {
                const result = rrDistToSegment({x:vexX,y:vexY}, rrPoints[i], rrPoints[i+1]);
                if (result.distance < minDist && result.distance < 2.5) { // Sensitivity for snapping
                    minDist = result.distance; closestSegPt = result.point;
                    segInfo = { segmentIndex: i, t: result.t };
                }
            }
            rrHoverPoint = closestSegPt ? { x: closestSegPt.x, y: closestSegPt.y, ...segInfo } : null;
            rrCanvas.style.cursor = rrHoverPoint ? 'copy' : 'crosshair';
        } else if (rrDeleteMode) {
             let onPoint = false;
             for (let i = 0; i < rrPoints.length; i++) {
                const dist = Math.sqrt((vexX - rrPoints[i].x)**2+(vexY - rrPoints[i].y)**2);
                if (dist < 2.5) { rrPoints[i].color="red"; onPoint = true; } else { rrPoints[i].color="#bcd732";}
             }
             rrCanvas.style.cursor = onPoint ? 'not-allowed' : 'crosshair';
        } else {
            rrCanvas.style.cursor = 'crosshair'; 
        }
    });

    rrCanvas.addEventListener("mouseup", (e) => {
        if (vpDrawingModeActive) return;
        if (vpSelectedObject) vpSelectedObject.dragging = false;
        // vpSelectedObject = null; // Don't nullify if it was selected for ring ops via click
        
        if (rrIsDraggingPoint && rrSelectedPoint) {
            rrSaveState(); // Save state after RR point drag is complete
        }
        rrIsDraggingPoint = false;
    });

    rrCanvas.addEventListener("click", (e) => {
        if (vpDrawingModeActive) return;
        if (e.button !== 0) return;

        const rect = rrCanvas.getBoundingClientRect(); const mouseX = e.clientX-rect.left; const mouseY = e.clientY-rect.top;
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);

        // Priority: 1. RoboRoute special modes, 2. VexPlan selections, 3. RoboRoute point add
        if (rrTrimMode) {
            for (let i = 0; i < rrPoints.length; i++) {
                if (Math.sqrt((vexX-rrPoints[i].x)**2+(vexY-rrPoints[i].y)**2) < 2.5) {
                    rrSaveState(); rrPoints.splice(i); rrHidePointInfo(); rrSetActiveMode(null); return;
                }
            }
        } else if (rrInsertMode && rrHoverPoint) {
            rrSaveState(); let h=0;
            if (rrPoints.length > 0 && rrPoints[rrHoverPoint.segmentIndex].heading !== undefined && rrPoints[rrHoverPoint.segmentIndex+1].heading !== undefined) {
                const h1=rrPoints[rrHoverPoint.segmentIndex].heading; const h2=rrPoints[rrHoverPoint.segmentIndex+1].heading;
                h = h1 + (h2-h1)*rrHoverPoint.t; // Simple lerp, might need angle normalization
            }
            rrPoints.splice(rrHoverPoint.segmentIndex+1,0,{x:rrHoverPoint.x,y:rrHoverPoint.y,heading:h});
            rrHoverPoint = null; return;
        } else if (rrDeleteMode) { // Delete mode is handled on mousedown for immediate feedback
            return;
        }
        
        // If not in a RoboRoute special mode that consumes the click, check VexPlan object selection
        let clickedVpElement = false;
        if (!rrIsDraggingPoint) { // Ensure not currently dragging an RR point
             for (let stake of [...vpStakes, vpLadder.highStake]) { // Check stakes first
                if (Math.hypot(stake.x-mouseX,stake.y-mouseY) < VP_STAKE_RADIUS*2.5) {vpSelectedRingTarget=stake;vpSelectedObject=null;clickedVpElement=true;break;}
            }
            if (!clickedVpElement) {
                 for (let mg of vpMobileGoals) { // Then mobile goals (as ring targets)
                    if (vpIsPointInHexagon(mouseX,mouseY,mg.x,mg.y,VP_MOBILE_GOAL_SIZE)) {vpSelectedRingTarget=mg;vpSelectedObject=null;clickedVpElement=true;break;}
                }
            }
             if (clickedVpElement) { vpUpdateRingManagementPanel(); return; }
        }

        // If no VexPlan element selected for rings, and not in RR special mode, try adding RR Point
        if (!rrDeleteMode && !rrInsertMode && !rrTrimMode && !rrIsDraggingPoint && !clickedVpElement) {
            let clickedOnExistingRRPoint = false;
            for (let i=0; i<rrPoints.length; i++) {
                if (Math.sqrt((vexX-rrPoints[i].x)**2+(vexY-rrPoints[i].y)**2) < 2.5) {clickedOnExistingRRPoint=true; rrSelectPoint(i); break;}
            }
            if (!clickedOnExistingRRPoint) {
                rrSaveState(); const newPt={x:vexX,y:vexY,heading:0};
                if(rrPoints.length>0&&rrPoints[rrPoints.length-1].heading!==undefined)newPt.heading=rrPoints[rrPoints.length-1].heading;
                rrPoints.push(newPt); rrSelectPoint(rrPoints.length-1);
            }
        }
    });

    rrCanvas.addEventListener("wheel",(e)=>{if(vpDrawingModeActive)return;if(rrSelectedPoint){e.preventDefault();rrSaveState();if(rrSelectedPoint.heading===undefined)rrSelectedPoint.heading=0;const d=e.deltaY>0?-5:5;rrSelectedPoint.heading=(rrSelectedPoint.heading+d+360)%360;rrHeadingInput.value=rrSelectedPoint.heading.toFixed(1);}});
    rrCanvas.addEventListener("contextmenu",(e)=>{e.preventDefault();if(vpDrawingModeActive)return;const r=rrCanvas.getBoundingClientRect();const mX=e.clientX-r.left;const mY=e.clientY-r.top;let tR=null;for(let i=0;i<vpRobots.length;i++){const rb=vpRobots[i];if(mX>=rb.x&&mX<=rb.x+VP_ROBOT_SIZE&&mY>=rb.y&&mY<=rb.y+VP_ROBOT_SIZE){tR=rb;break;}}if(tR){const rI=vpRobots.indexOf(tR);vpContextMenu.querySelector('ul').innerHTML='';if(!tR.hanging){[1,2,3].forEach(l=>{const li=document.createElement('li');li.textContent=`Climb Level ${l}`;li.onclick=()=>vpSetClimbLevel(rI,l);vpContextMenu.querySelector('ul').appendChild(li);});const li0=document.createElement('li');li0.textContent=`No Climb`;li0.onclick=()=>vpSetClimbLevel(rI,0);vpContextMenu.querySelector('ul').appendChild(li0);}if(tR.climbLevel===0){const rcX=tR.x+VP_ROBOT_SIZE/2;const rcY=tR.y+VP_ROBOT_SIZE/2;if(vpIsPointInDiamond(rcX,rcY,vpLadder.x+VP_LADDER_SIZE/2,vpLadder.y+VP_LADDER_SIZE/2,VP_LADDER_SIZE)){const li=document.createElement('li');li.textContent=`Hang from Ladder`;li.onclick=()=>vpSetHang(rI,'ladder');vpContextMenu.querySelector('ul').appendChild(li);}vpStakes.forEach((s,sI)=>{if(Math.hypot(s.x-rcX,s.y-rcY)<100*(VP_FIELD_SIZE/720)){const li=document.createElement('li');li.textContent=`Hang from ${s.color.charAt(0).toUpperCase()+s.color.slice(1)} Stake`;li.onclick=()=>vpSetHang(rI,`stake${sI}`);vpContextMenu.querySelector('ul').appendChild(li);}}); } if(tR.hanging){const li=document.createElement('li');li.textContent=`No Hang`;li.onclick=()=>vpSetHang(rI,null);vpContextMenu.querySelector('ul').appendChild(li);} if(vpContextMenu.querySelector('ul').children.length>0){vpContextMenu.style.left=`${e.clientX}px`;vpContextMenu.style.top=`${e.clientY}px`;vpContextMenu.style.display='block';}else{vpContextMenu.style.display='none';}}else{vpContextMenu.style.display='none';}});
    document.addEventListener('click',(e)=>{if(!vpContextMenu.contains(e.target))vpContextMenu.style.display='none';});

    vpDrawingCanvas.addEventListener('mousedown',(e)=>{if(!vpDrawingModeActive)return;const r=vpDrawingCanvas.getBoundingClientRect();vpDrawingStartX=e.clientX-r.left;vpDrawingStartY=e.clientY-r.top;vpDrawingCurrentX=vpDrawingStartX;vpDrawingCurrentY=vpDrawingStartY;vpIsDrawing=true;vpDrawingCtx.lineCap='round';vpDrawingCtx.lineJoin='round';vpDrawingCtx.strokeStyle=vpDrawingColor;vpDrawingCtx.lineWidth=vpDrawingSize;if(vpIsErasing){vpDrawingCtx.globalCompositeOperation='destination-out';vpDrawingCtx.lineWidth=10;}else{vpDrawingCtx.globalCompositeOperation='source-over';}if(vpDrawingShape==='normal'||vpIsErasing){vpDrawingCtx.beginPath();vpDrawingCtx.moveTo(vpDrawingStartX,vpDrawingStartY);}});
    vpDrawingCanvas.addEventListener('mousemove',(e)=>{if(!vpDrawingModeActive||!vpIsDrawing)return;const r=vpDrawingCanvas.getBoundingClientRect();vpDrawingCurrentX=e.clientX-r.left;vpDrawingCurrentY=e.clientY-r.top;if(vpDrawingShape==='normal'||vpIsErasing){vpDrawingCtx.lineTo(vpDrawingCurrentX,vpDrawingCurrentY);vpDrawingCtx.stroke();vpDrawingCtx.beginPath();vpDrawingCtx.moveTo(vpDrawingCurrentX,vpDrawingCurrentY);}});
    vpDrawingCanvas.addEventListener('mouseup',(e)=>{if(!vpDrawingModeActive||!vpIsDrawing)return;const r=vpDrawingCanvas.getBoundingClientRect();vpDrawingCurrentX=e.clientX-r.left;vpDrawingCurrentY=e.clientY-r.top;if(vpIsErasing){vpDrawingCtx.lineTo(vpDrawingCurrentX,vpDrawingCurrentY);vpDrawingCtx.stroke();}else if(vpDrawingShape==='square'){vpDrawingCtx.strokeRect(vpDrawingStartX,vpDrawingStartY,vpDrawingCurrentX-vpDrawingStartX,vpDrawingCurrentY-vpDrawingStartY);}else if(vpDrawingShape==='arrow'){vpDrawingCtx.beginPath();vpDrawingCtx.moveTo(vpDrawingStartX,vpDrawingStartY);vpDrawingCtx.lineTo(vpDrawingCurrentX,vpDrawingCurrentY);vpDrawingCtx.stroke();const a=Math.atan2(vpDrawingCurrentY-vpDrawingStartY,vpDrawingCurrentX-vpDrawingStartX);const hL=vpDrawingSize*2.5;vpDrawingCtx.beginPath();vpDrawingCtx.moveTo(vpDrawingCurrentX,vpDrawingCurrentY);vpDrawingCtx.lineTo(vpDrawingCurrentX-hL*Math.cos(a-Math.PI/6),vpDrawingCurrentY-hL*Math.sin(a-Math.PI/6));vpDrawingCtx.moveTo(vpDrawingCurrentX,vpDrawingCurrentY);vpDrawingCtx.lineTo(vpDrawingCurrentX-hL*Math.cos(a+Math.PI/6),vpDrawingCurrentY-hL*Math.sin(a+Math.PI/6));vpDrawingCtx.stroke();}else if(vpDrawingShape==='normal'){vpDrawingCtx.lineTo(vpDrawingCurrentX,vpDrawingCurrentY);vpDrawingCtx.stroke();}vpIsDrawing=false;});
    vpDrawingCanvas.addEventListener('mouseleave',()=>{if(vpIsDrawing)vpIsDrawing=false;});

    document.getElementById('toggle-drawing').addEventListener('click',()=>{vpDrawingModeActive=!vpDrawingModeActive;document.getElementById('toggle-drawing').textContent=vpDrawingModeActive?'Disable Drawing':'Enable Drawing';vpDrawingCanvas.classList.toggle('drawing-active',vpDrawingModeActive);if(!vpDrawingModeActive){vpIsErasing=false;vpDrawingCtx.globalCompositeOperation='source-over'; rrCanvas.style.cursor = 'crosshair';} else {rrCanvas.style.cursor = 'default';}});
    document.getElementById('drawing-color').addEventListener('change',(e)=>{vpDrawingColor=e.target.value;vpIsErasing=false;vpDrawingCtx.globalCompositeOperation='source-over';});
    document.getElementById('drawing-size').addEventListener('change',(e)=>{vpDrawingSize=parseInt(e.target.value);vpIsErasing=false;vpDrawingCtx.globalCompositeOperation='source-over';});
    document.getElementById('drawing-shape').addEventListener('change',(e)=>{vpDrawingShape=e.target.value;vpIsErasing=false;vpDrawingCtx.globalCompositeOperation='source-over';});
    document.getElementById('erase-tool').addEventListener('click',()=>{if(!vpDrawingModeActive)document.getElementById('toggle-drawing').click();vpIsErasing=true;});
    document.getElementById('clear-drawing').addEventListener('click',()=>{vpDrawingCtx.clearRect(0,0,vpDrawingCanvas.width,vpDrawingCanvas.height);vpIsErasing=false;vpDrawingCtx.globalCompositeOperation='source-over';});
    document.getElementById('add-red-ring').addEventListener('click',()=>{if(vpSelectedRingTarget&&vpSelectedRingTarget.ringColors.length<vpSelectedRingTarget.maxRings){vpSelectedRingTarget.ringColors.push('red');vpUpdateRingManagementPanel();}});
    document.getElementById('add-blue-ring').addEventListener('click',()=>{if(vpSelectedRingTarget&&vpSelectedRingTarget.ringColors.length<vpSelectedRingTarget.maxRings){vpSelectedRingTarget.ringColors.push('blue');vpUpdateRingManagementPanel();}});
    document.getElementById('remove-ring').addEventListener('click',()=>{if(vpSelectedRingTarget&&vpSelectedRingTarget.ringColors.length>0){vpSelectedRingTarget.ringColors.pop();vpUpdateRingManagementPanel();}});
    document.getElementById('reset-simulation-button').addEventListener('click',vpResetSimulation);
    document.getElementById('show-tutorial').addEventListener('click',()=>{document.getElementById('tutorial-modal').style.display='flex';});
    document.getElementById('close-tutorial').addEventListener('click',()=>{document.getElementById('tutorial-modal').style.display='none';});
    ['red-team-1','red-team-2','blue-team-1','blue-team-2'].forEach((id,idx)=>{document.getElementById(id).addEventListener('input',(e)=>{vpRobots[idx].teamNumber=e.target.value;});});

    document.addEventListener('keydown',(e)=>{if(e.ctrlKey&&e.key==='z'){e.preventDefault();rrUndo();}if(e.ctrlKey&&e.key==='y'){e.preventDefault();rrRedo();}if(rrSelectedPointIndex!==null&&e.ctrlKey){if(e.key==="ArrowUp"){e.preventDefault();rrMovePointOrder("up");}else if(e.key==="ArrowDown"){e.preventDefault();rrMovePointOrder("down");}}});
}

// ============== Initialization Call ===============
window.addEventListener("DOMContentLoaded", () => {
    rrCreatePointListUI();    
    rrSetupPointInfoPanel();  
    rrAddFieldSelector();     
    rrLoadFieldImage(DEFAULT_FIELD_IMAGE); 
    vpUpdateRingManagementPanel(); 
    setupEventListeners();    
    redrawCombined();         
});