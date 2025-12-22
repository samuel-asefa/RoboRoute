// ============== RoboRoute - Path Planning Application ===============
// Main application file for robot path planning and visualization

// ============== Constants ===============
const RR_CANVAS_WIDTH = 800;
const RR_CANVAS_HEIGHT = 800;
const RR_VEX_MIN = -72; // Inches
const RR_VEX_MAX = 72;  // Inches
const DEFAULT_FIELD_IMAGE = "../assets/fields/high-stakes-matches.png";

// Game simulation constants (for field visualization)
const FIELD_SIZE = 800;
const ROBOT_SIZE = Math.round(90 * (FIELD_SIZE / 720));
const MOBILE_GOAL_SIZE = Math.round(50 * (FIELD_SIZE / 720));
const STAKE_RADIUS = Math.round(9 * (FIELD_SIZE / 720));
const LADDER_SIZE = Math.round(240 * (FIELD_SIZE / 720));
const CORNER_SIZE = Math.round(60 * (FIELD_SIZE / 720));
const RING_OUTER_RADIUS = Math.round(7 * (FIELD_SIZE / 720));
const RING_INNER_RADIUS = Math.round(4 * (FIELD_SIZE / 720));

// ============== Canvas Setup ===============
const rrCanvas = document.getElementById("pathCanvas");
const rrCtx = rrCanvas.getContext("2d");
const drawingCanvas = document.getElementById('drawing-canvas');
const drawingCtx = drawingCanvas.getContext('2d');
const contextMenu = document.getElementById('context-menu');

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
let rrPointCreationEnabled = true; // Track if point creation is enabled
let rrJustDeletedPoint = false; // Flag to prevent point creation after delete

// Zoom and Pan
let rrScale = 1.0;
let rrOffsetX = 0;
let rrOffsetY = 0;

// Field background
let rrCurrentFieldImage = new Image();
let rrBackgroundLoaded = false;

// ============== Drawing State ===============
let drawingModeActive = false;
let isDrawing = false;
let isErasing = false;
let drawingStartX = 0, drawingStartY = 0;
let drawingCurrentX = 0, drawingCurrentY = 0;
let drawingColor = 'black';
let drawingSize = 2;
let drawingShape = 'normal';

// ============== Game Simulation State (for field visualization) ===============
const robots = [
    { id: 'r1', x: scaleCoord(30), y: scaleCoord(30), color: 'red', alliance: 'red', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'r2', x: scaleCoord(30), y: scaleCoord(FIELD_SIZE - 120), color: 'red', alliance: 'red', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'b1', x: scaleCoord(FIELD_SIZE - 120), y: scaleCoord(30), color: 'blue', alliance: 'blue', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'b2', x: scaleCoord(FIELD_SIZE - 120), y: scaleCoord(FIELD_SIZE - 120), color: 'blue', alliance: 'blue', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" }
];

const mobileGoals = [
    { id: 'mg1', x: scaleCoord(480), y: scaleCoord(235), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg2', x: scaleCoord(360), y: scaleCoord(595), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg3', x: scaleCoord(240), y: scaleCoord(235), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg4', x: scaleCoord(480), y: scaleCoord(475), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg5', x: scaleCoord(240), y: scaleCoord(475), maxRings: 6, ringColors: [], dragging: false }
];

const stakes = [
    { id: 's_red', x: 0, y: FIELD_SIZE / 2, color: 'red', maxRings: 2, ringColors: [] },
    { id: 's_blue', x: FIELD_SIZE, y: FIELD_SIZE / 2, color: 'blue', maxRings: 2, ringColors: [] },
    { id: 's_neut_top', x: FIELD_SIZE / 2, y: 0, color: 'black', maxRings: 6, ringColors: [] },
    { id: 's_neut_bot', x: FIELD_SIZE / 2, y: FIELD_SIZE, color: 'black', maxRings: 6, ringColors: [] }
];

const ladder = {
    x: FIELD_SIZE / 2 - LADDER_SIZE / 2,
    y: FIELD_SIZE / 2 - LADDER_SIZE / 2,
    width: LADDER_SIZE,
    height: LADDER_SIZE,
    highStake: { id: 's_high', x: FIELD_SIZE / 2, y: FIELD_SIZE / 2, color: 'yellow', maxRings: 1, ringColors: [] }
};

let selectedObject = null;
let selectedRingTarget = null;

// Utility function
function scaleCoord(coord) {
    return Math.round(coord * (FIELD_SIZE / 720));
}

// ============== DOM Element References ===============
const rrPointInfoPanel = document.getElementById("pointInfo");
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
const rrGenerateBtn = document.getElementById("generateBtn");
const rrDelayInput = document.getElementById("delayInput");
const rrPointListContainer = document.getElementById("pointListContainer");
const rrPointListDiv = document.getElementById("pointList");

// ============== Path Planning Functions ===============
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
}

function rrRedo() {
    if (rrHistory.future.length === 0) return;
    rrHistory.past.push(JSON.parse(JSON.stringify(rrPoints)));
    rrPoints = rrHistory.future.pop();
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    rrHidePointInfo();
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

function rrDrawPoint(vexX, vexY, radius = 6, color = '#bcd732', alpha = 1, heading = null, isHighlighted = false) {
    const { x, y } = rrVexToCanvas(vexX, vexY);
    
    // Draw highlight ring for selected point
    if (isHighlighted) {
        rrCtx.beginPath();
        rrCtx.arc(x, y, radius + 6, 0, 2 * Math.PI);
        rrCtx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        rrCtx.fill();
        rrCtx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
        rrCtx.lineWidth = 2;
        rrCtx.stroke();
    }
    
    // Draw point
    rrCtx.beginPath();
    rrCtx.arc(x, y, radius, 0, 2 * Math.PI);
    rrCtx.fillStyle = color;
    rrCtx.globalAlpha = alpha;
    rrCtx.fill();
    
    // Draw heading indicator
    if (heading !== null && heading !== undefined) {
        const radians = (90 - heading) * (Math.PI / 180);
        const lineLength = radius * 2.5;
        const endX = x + Math.cos(radians) * lineLength;
        const endY = y - Math.sin(radians) * lineLength;
        
        rrCtx.beginPath();
        rrCtx.moveTo(x, y);
        rrCtx.lineTo(endX, endY);
        rrCtx.strokeStyle = '#2c3e50';
        rrCtx.lineWidth = 2.5;
        rrCtx.stroke();
        
        // Draw arrowhead
        const arrowAngle = Math.atan2(endY - y, endX - x);
        const arrowSize = 4;
        rrCtx.beginPath();
        rrCtx.moveTo(endX, endY);
        rrCtx.lineTo(endX - arrowSize * Math.cos(arrowAngle - Math.PI / 6), endY - arrowSize * Math.sin(arrowAngle - Math.PI / 6));
        rrCtx.moveTo(endX, endY);
        rrCtx.lineTo(endX - arrowSize * Math.cos(arrowAngle + Math.PI / 6), endY - arrowSize * Math.sin(arrowAngle + Math.PI / 6));
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
    rrCtx.lineWidth = 3;
    rrCtx.lineCap = 'round';
    rrCtx.lineJoin = 'round';
    rrCtx.shadowBlur = 4;
    rrCtx.shadowColor = 'rgba(188, 215, 50, 0.5)';
    rrCtx.stroke();
    rrCtx.shadowBlur = 0;
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
        pointLabel.style.fontWeight = "600";
        
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
        noPoints.style.color = "#8b949e";
        noPoints.style.fontStyle = "italic";
        noPoints.style.textAlign = "center";
        noPoints.style.padding = "var(--spacing-md)";
        rrPointListDiv.appendChild(noPoints);
    }
}

function rrSelectPoint(index) {
    rrSelectedPointIndex = index;
    rrSelectedPoint = rrPoints[index];
    rrShowPointInfo(index);
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

function rrSetActiveMode(button) {
    // Reset all modes
    rrDeleteMode = false;
    rrInsertMode = false;
    rrTrimMode = false;
    rrPointCreationEnabled = false; // Disable point creation by default

    // Remove active class from all buttons
    rrDeleteBtn?.classList.remove('active-mode');
    rrInsertBtn?.classList.remove('active-mode');
    rrTrimBtn?.classList.remove('active-mode');
    rrLinearBtn?.classList.remove('active-mode');

    // Set active mode and button
    if (button === rrInsertBtn) {
        rrInsertMode = true;
    } else if (button === rrDeleteBtn) {
        rrDeleteMode = true;
    } else if (button === rrTrimBtn) {
        rrTrimMode = true;
    } else if (button === rrLinearBtn) {
        rrMode = "linear";
        rrPointCreationEnabled = true; // Enable point creation when linear mode is active
    }
    
    if (button) {
        button.classList.add('active-mode');
    }
}

function rrShowPointInfo(index) {
    if (!rrPointInfoPanel) return;
    
    rrPointInfoPanel.classList.add("show");
    rrSelectedPoint = rrPoints[index];
    rrSelectedPointIndex = index;

    if (rrPointXInput) rrPointXInput.value = rrSelectedPoint.x.toFixed(2);
    if (rrPointYInput) rrPointYInput.value = rrSelectedPoint.y.toFixed(2);
    
    if (rrSelectedPoint.heading === undefined) rrSelectedPoint.heading = 0;
    if (rrHeadingInput) rrHeadingInput.value = rrSelectedPoint.heading.toFixed(1);

    const pointIndexValue = document.getElementById("pointIndexValue");
    if (pointIndexValue) {
        pointIndexValue.textContent = index + 1;
    }
    rrUpdatePointList();
}

function rrHidePointInfo() {
    if (rrPointInfoPanel) {
        rrPointInfoPanel.classList.remove("show");
    }
    if (rrPointListDiv && rrSelectedPointIndex !== null) {
        const entries = rrPointListDiv.querySelectorAll('.point-entry');
        if (entries[rrSelectedPointIndex]) entries[rrSelectedPointIndex].classList.remove('selected');
    }
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
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
            if (Math.abs(h1 - h2) > 180) {
                (h1 > h2) ? h2 += 360 : h1 += 360;
            }
            midHeading = ((h1 + h2) / 2) % 360;
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
        [rrPoints[rrSelectedPointIndex], rrPoints[rrSelectedPointIndex - 1]] = 
            [rrPoints[rrSelectedPointIndex - 1], rrPoints[rrSelectedPointIndex]];
        rrSelectPoint(rrSelectedPointIndex - 1);
    } else if (direction === "down" && rrSelectedPointIndex < rrPoints.length - 1) {
        [rrPoints[rrSelectedPointIndex], rrPoints[rrSelectedPointIndex + 1]] = 
            [rrPoints[rrSelectedPointIndex + 1], rrPoints[rrSelectedPointIndex]];
        rrSelectPoint(rrSelectedPointIndex + 1);
    }
}

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
    
    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
        alert("Generated Path Code copied to clipboard!\n\n" + code);
    }).catch(() => {
        alert("Generated Path Code:\n\n" + code);
    });
}

function rrLoadFieldImage(src) {
    rrBackgroundLoaded = false;
    rrCurrentFieldImage.onload = () => { rrBackgroundLoaded = true; };
    rrCurrentFieldImage.onerror = () => {
        console.error("Failed to load field image:", src);
        rrCurrentFieldImage.src = DEFAULT_FIELD_IMAGE;
    };
    rrCurrentFieldImage.src = src;
}

// ============== Drawing Functions ===============
function drawHexagon(ctx, x, y, size, fillStyle) {
    ctx.beginPath();
    const radius = size / 2;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + (Math.PI / 6);
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
}

function drawRing(ctx, x, y, outerRadius, innerRadius, color) {
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, 2 * Math.PI);
    ctx.arc(x, y, innerRadius, 0, 2 * Math.PI, true);
    ctx.fillStyle = color;
    ctx.fill('evenodd');
}

function isPointInHexagon(x, y, centerX, centerY, size) {
    const r = size / 2;
    const dX = Math.abs(x - centerX);
    const dY = Math.abs(y - centerY);
    if (dX > r || dY > r * Math.sqrt(3) / 2) return false;
    return (dY <= (r * Math.sqrt(3) / 2)) && (dX <= r / 2 + (r - dY * 2 / Math.sqrt(3)));
}

function isPointInDiamond(x, y, centerX, centerY, size) {
    return (Math.abs(x - centerX) + Math.abs(y - centerY)) <= (size / 2);
}

function drawGameObjects(ctx) {
    // Draw ladder
    const ladderGradient = ctx.createLinearGradient(ladder.x, ladder.y, ladder.x + ladder.width, ladder.y + ladder.height);
    ladderGradient.addColorStop(0, '#ff6b6b');
    ladderGradient.addColorStop(1, '#ff8787');
    ctx.strokeStyle = ladderGradient;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(255,107,107,0.4)';
    ctx.beginPath();
    ctx.moveTo(ladder.x + LADDER_SIZE/2, ladder.y);
    ctx.lineTo(ladder.x + LADDER_SIZE, ladder.y + LADDER_SIZE/2);
    ctx.lineTo(ladder.x + LADDER_SIZE/2, ladder.y + LADDER_SIZE);
    ctx.lineTo(ladder.x, ladder.y + LADDER_SIZE/2);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw high stake
    ctx.fillStyle = ladder.highStake === selectedRingTarget ? '#ffff99' : '#f1c40f';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(241,196,15,0.5)';
    ctx.beginPath();
    ctx.arc(ladder.highStake.x, ladder.highStake.y, STAKE_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
    ladder.highStake.ringColors.forEach((rc, i) =>
        drawRing(ctx, ladder.highStake.x, ladder.highStake.y - (i + 1) * (RING_OUTER_RADIUS * 2.2), RING_OUTER_RADIUS, RING_INNER_RADIUS, rc)
    );
    ctx.shadowBlur = 0;

    // Draw stakes
    stakes.forEach(stake => {
        ctx.fillStyle = stake === selectedRingTarget ? '#999999' : stake.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `rgba(${stake.color === 'red' ? '255,0,0' : stake.color === 'blue' ? '0,0,255' : '0,0,0'},0.5)`;
        ctx.beginPath();
        ctx.arc(stake.x, stake.y, STAKE_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        stake.ringColors.forEach((rc, i) => {
            const yOff = (stake.x === FIELD_SIZE / 2 && stake.y === 0) ?
                (i + 1) * (RING_OUTER_RADIUS * 2.2) :
                -(i + 1) * (RING_OUTER_RADIUS * 2.2);
            drawRing(ctx, stake.x, stake.y + yOff, RING_OUTER_RADIUS, RING_INNER_RADIUS, rc);
        });
        ctx.shadowBlur = 0;
    });

    // Draw mobile goals
    mobileGoals.forEach(mg => {
        const mgGrad = ctx.createLinearGradient(
            mg.x - MOBILE_GOAL_SIZE / 2, mg.y - MOBILE_GOAL_SIZE / 2,
            mg.x + MOBILE_GOAL_SIZE / 2, mg.y + MOBILE_GOAL_SIZE / 2
        );
        mgGrad.addColorStop(0, mg === selectedRingTarget ? '#f39c12' : '#e67e22');
        mgGrad.addColorStop(1, mg === selectedRingTarget ? '#e67e22' : '#d35400');
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(230,126,34,0.5)';
        drawHexagon(ctx, mg.x, mg.y, MOBILE_GOAL_SIZE, mgGrad);
        ctx.fillStyle = mg === selectedRingTarget ? '#ffff99' : '#f1c40f';
        ctx.beginPath();
        ctx.arc(mg.x, mg.y, STAKE_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        mg.ringColors.forEach((rc, i) =>
            drawRing(ctx, mg.x, mg.y - (i + 1) * (RING_OUTER_RADIUS * 2.2), RING_OUTER_RADIUS, RING_INNER_RADIUS, rc)
        );
        ctx.shadowBlur = 0;
    });

    // Draw robots
    robots.forEach(robot => {
        const rGrad = ctx.createLinearGradient(robot.x, robot.y, robot.x + ROBOT_SIZE, robot.y + ROBOT_SIZE);
        rGrad.addColorStop(0, robot.color === 'red' ? '#e74c3c' : '#3498db');
        rGrad.addColorStop(1, robot.color === 'red' ? '#c0392b' : '#2980b9');
        ctx.fillStyle = rGrad;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${robot.color === 'red' ? '231,76,60' : '52,152,219'},0.5)`;
        ctx.fillRect(robot.x, robot.y, ROBOT_SIZE, ROBOT_SIZE);
        
        if (robot.teamNumber) {
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const tX = robot.x + ROBOT_SIZE / 2;
            const tY = robot.y + ROBOT_SIZE / 2;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(robot.teamNumber, tX, tY);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(robot.teamNumber, tX, tY);
        }
        
        if (robot.hanging) {
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            const rCX = robot.x + ROBOT_SIZE / 2;
            const rCY = robot.y + ROBOT_SIZE / 2;
            let hX, hY;
            if (robot.hanging === 'ladder') {
                hX = ladder.highStake.x;
                hY = ladder.highStake.y;
            } else if (robot.hanging.startsWith('stake')) {
                const sI = parseInt(robot.hanging.slice(5));
                hX = stakes[sI].x;
                hY = stakes[sI].y;
            }
            if (hX !== undefined) {
                ctx.moveTo(rCX, rCY);
                ctx.lineTo(hX, hY);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
    });
}

function calculateScore() {
    let redScore = 0, blueScore = 0;
    
    stakes.forEach(s => {
        if (s.color === 'red') {
            let rR = s.ringColors.filter(r => r === 'red').length;
            redScore += rR;
            if (s.ringColors.length > 0 && s.ringColors[s.ringColors.length - 1] === 'red') redScore += 2;
        } else if (s.color === 'blue') {
            let bR = s.ringColors.filter(r => r === 'blue').length;
            blueScore += bR;
            if (s.ringColors.length > 0 && s.ringColors[s.ringColors.length - 1] === 'blue') blueScore += 2;
        } else {
            s.ringColors.forEach(rg => {
                if (rg === 'red') redScore++;
                else if (rg === 'blue') blueScore++;
            });
            if (s.ringColors.length > 0) {
                let t = s.ringColors[s.ringColors.length - 1];
                if (t === 'red') redScore += 2;
                else if (t === 'blue') blueScore += 2;
            }
        }
    });
    
    if (ladder.highStake.ringColors.length > 0) {
        if (ladder.highStake.ringColors[0] === 'red') redScore += 6;
        else if (ladder.highStake.ringColors[0] === 'blue') blueScore += 6;
    }
    
    mobileGoals.forEach(mg => {
        let mgR = mg.ringColors.filter(r => r === 'red').length;
        let mgB = mg.ringColors.filter(r => r === 'blue').length;
        if (mg.ringColors.length > 0) {
            let t = mg.ringColors[mg.ringColors.length - 1];
            if (t === 'red') mgR += 2;
            else if (t === 'blue') mgB += 2;
        }
        let mgCX = mg.x;
        let mgCY = mg.y;
        let posC = (mgCX < CORNER_SIZE && mgCY > FIELD_SIZE - CORNER_SIZE) || (mgCX > FIELD_SIZE - CORNER_SIZE && mgCY > FIELD_SIZE - CORNER_SIZE);
        let negC = (mgCX < CORNER_SIZE && mgCY < CORNER_SIZE) || (mgCX > FIELD_SIZE - CORNER_SIZE && mgCY < CORNER_SIZE);
        if (posC) {
            redScore += mgR * 2;
            blueScore += mgB * 2;
        } else if (negC) {
            redScore = Math.max(0, redScore - mgR);
            blueScore = Math.max(0, blueScore - mgB);
        } else {
            redScore += mgR;
            blueScore += mgB;
        }
    });
    
    robots.forEach(rb => {
        if (rb.climbLevel > 0) {
            let p = { 1: 3, 2: 6, 3: 12 }[rb.climbLevel];
            if (ladder.highStake.ringColors.length > 0) p += 2;
            if (rb.alliance === 'red') redScore += p;
            else blueScore += p;
        }
        if (rb.hanging) {
            let p = 0;
            if (rb.hanging === 'ladder') p = 5;
            else if (rb.hanging.startsWith('stake')) {
                const s = stakes[parseInt(rb.hanging.slice(5))];
                if (s.color === 'black') p = 3;
                else if (s.color === rb.alliance) p = 4;
                else p = 2;
                if (s.ringColors.length > 0) p += 1;
            }
            if (rb.alliance === 'red') redScore += p;
            else blueScore += p;
        }
    });
    
    const redScoreEl = document.getElementById('red-score');
    const blueScoreEl = document.getElementById('blue-score');
    if (redScoreEl) redScoreEl.textContent = Math.round(redScore);
    if (blueScoreEl) blueScoreEl.textContent = Math.round(blueScore);
}

function updateRingManagementPanel() {
    const sT = document.getElementById('selected-object-info');
    const rC = document.getElementById('ring-count-info');
    const rL = document.getElementById('ring-list-info');
    const aRB = document.getElementById('add-red-ring');
    const aBB = document.getElementById('add-blue-ring');
    const rmB = document.getElementById('remove-ring');
    
    if (!selectedRingTarget) {
        if (sT) sT.textContent = 'None';
        if (rC) rC.textContent = '0';
        if (rL) rL.textContent = 'None';
        if (aRB) aRB.disabled = true;
        if (aBB) aBB.disabled = true;
        if (rmB) rmB.disabled = true;
    } else {
        let n;
        if (selectedRingTarget === ladder.highStake) n = 'High Stake';
        else if (stakes.includes(selectedRingTarget)) n = `${selectedRingTarget.color.charAt(0).toUpperCase() + selectedRingTarget.color.slice(1)} Stake`;
        else n = `Mobile Goal ${mobileGoals.indexOf(selectedRingTarget) + 1}`;
        
        if (sT) sT.textContent = n;
        if (rC) rC.textContent = selectedRingTarget.ringColors.length;
        if (rL) rL.textContent = selectedRingTarget.ringColors.length > 0 ? selectedRingTarget.ringColors.join(', ') : 'None';
        if (aRB) aRB.disabled = selectedRingTarget.ringColors.length >= selectedRingTarget.maxRings;
        if (aBB) aBB.disabled = selectedRingTarget.ringColors.length >= selectedRingTarget.maxRings;
        if (rmB) rmB.disabled = selectedRingTarget.ringColors.length === 0;
    }
}

function setClimbLevel(robotIndex, level) {
    robots[robotIndex].climbLevel = level;
    robots[robotIndex].hanging = null;
    if (contextMenu) contextMenu.style.display = 'none';
}

function setHang(robotIndex, location) {
    robots[robotIndex].hanging = location;
    robots[robotIndex].climbLevel = 0;
    if (contextMenu) contextMenu.style.display = 'none';
}

function resetSimulation() {
    const tNs = robots.map(r => r.teamNumber);
    robots.forEach((r, i) => {
        const oP = [
            { x: scaleCoord(30), y: scaleCoord(30) },
            { x: scaleCoord(30), y: scaleCoord(720 - 120) },
            { x: scaleCoord(720 - 120), y: scaleCoord(30) },
            { x: scaleCoord(720 - 120), y: scaleCoord(720 - 120) }
        ][i];
        r.x = oP.x;
        r.y = oP.y;
        r.climbLevel = 0;
        r.hanging = null;
        r.teamNumber = tNs[i];
    });
    
    mobileGoals.forEach((mg, i) => {
        const oP = [
            { x: scaleCoord(480), y: scaleCoord(235) },
            { x: scaleCoord(360), y: scaleCoord(595) },
            { x: scaleCoord(240), y: scaleCoord(235) },
            { x: scaleCoord(480), y: scaleCoord(475) },
            { x: scaleCoord(240), y: scaleCoord(475) }
        ][i];
        mg.x = oP.x;
        mg.y = oP.y;
        mg.ringColors = [];
        mg.dragging = false;
    });
    
    stakes.forEach(s => s.ringColors = []);
    ladder.highStake.ringColors = [];
    selectedRingTarget = null;
    selectedObject = null;
    updateRingManagementPanel();
}

// ============== Drawing Canvas Functions ===============
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
        drawingCtx.lineWidth = Math.max(10, drawingSize * 2);
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
        const hL = drawingSize * 2.5;
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

// ============== Main Drawing Loop ===============
function redrawCombined() {
    rrCtx.clearRect(0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    rrCtx.save();
    rrCtx.translate(rrOffsetX, rrOffsetY);
    rrCtx.scale(rrScale, rrScale);

    // Draw field background
    if (rrBackgroundLoaded && rrCurrentFieldImage.complete) {
        rrCtx.drawImage(rrCurrentFieldImage, 0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    } else if (!rrBackgroundLoaded && rrCurrentFieldImage.src && !rrCurrentFieldImage.complete) {
        // Waiting for image
    } else {
        rrCtx.fillStyle = '#1e1e1e';
        rrCtx.fillRect(0, 0, RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT);
    }
    
    // Draw game objects
    drawGameObjects(rrCtx);

    // Draw path
    if (rrMode === "linear") rrDrawLinearPath();

    // Draw path points
    rrPoints.forEach((point, index) => {
        const heading = point.heading !== undefined ? point.heading : 0;
        const isHighlighted = index === rrSelectedPointIndex;
        rrDrawPoint(point.x, point.y, 6, point.color || "#bcd732", 1, heading, isHighlighted);
        const { x: cx, y: cy } = rrVexToCanvas(point.x, point.y);
        rrCtx.font = "bold 13px Inter";
        rrCtx.fillStyle = isHighlighted ? "#3498db" : "#ffffff";
        rrCtx.textAlign = "left";
        rrCtx.textBaseline = "top";
        rrCtx.fillText(`${index + 1}`, cx + 8, cy - 6);
    });

    // Draw hover point for insert mode
    if (rrInsertMode && rrHoverPoint) {
        let heading = 0;
        if (rrPoints.length > 1 && rrPoints[rrHoverPoint.segmentIndex].heading !== undefined && 
            rrPoints[rrHoverPoint.segmentIndex + 1].heading !== undefined) {
            const prevH = rrPoints[rrHoverPoint.segmentIndex].heading;
            const nextH = rrPoints[rrHoverPoint.segmentIndex + 1].heading;
            heading = prevH + (nextH - prevH) * rrHoverPoint.t;
        }
        rrDrawPoint(rrHoverPoint.x, rrHoverPoint.y, 5, "rgba(52, 152, 219, 0.7)", 0.7, heading);
    }
    
    rrCtx.restore();

    rrUpdatePointList();
    calculateScore();
    updateRingManagementPanel();

    requestAnimationFrame(redrawCombined);
}

// ============== Event Handlers Setup ===============
function setupEventListeners() {
    // Path tool buttons
    if (rrLinearBtn) {
        rrLinearBtn.addEventListener("click", () => {
            // Toggle linear mode - if already active, deselect it
            if (rrLinearBtn.classList.contains('active-mode')) {
                rrSetActiveMode(null);
                rrMode = null; // Clear mode when deselected
            } else {
                rrMode = "linear";
                rrSetActiveMode(rrLinearBtn);
            }
        });
    }
    
    if (rrInsertBtn) {
        rrInsertBtn.addEventListener("click", () => {
            rrSetActiveMode(rrInsertMode ? null : rrInsertBtn);
        });
    }
    
    if (rrDeleteBtn) {
        rrDeleteBtn.addEventListener("click", () => {
            rrSetActiveMode(rrDeleteMode ? null : rrDeleteBtn);
        });
    }
    
    if (rrTrimBtn) {
        rrTrimBtn.addEventListener("click", () => {
            rrSetActiveMode(rrTrimMode ? null : rrTrimBtn);
        });
    }
    
    if (rrClearBtn) {
        rrClearBtn.addEventListener("click", () => {
            if (confirm("Clear all path points?")) {
                rrSaveState();
                rrPoints = [];
                rrHidePointInfo();
                rrSetActiveMode(null);
            }
        });
    }
    
    if (rrGenerateBtn) {
        rrGenerateBtn.addEventListener("click", rrGenerateCode);
    }

    // Canvas mouse events
    rrCanvas.addEventListener("mousedown", (e) => {
        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        if (drawingModeActive) return;
        selectedObject = null;

        // Check for robot selection
        for (let robot of robots) {
            if (mouseX >= robot.x && mouseX <= robot.x + ROBOT_SIZE &&
                mouseY >= robot.y && mouseY <= robot.y + ROBOT_SIZE) {
                selectedObject = robot;
                robot.dragging = true;
                selectedRingTarget = null;
                updateRingManagementPanel();
                return;
            }
        }
        
        // Check for mobile goal selection
        for (let mg of mobileGoals) {
            if (isPointInHexagon(mouseX, mouseY, mg.x, mg.y, MOBILE_GOAL_SIZE)) {
                selectedObject = mg;
                mg.dragging = true;
                selectedRingTarget = mg;
                updateRingManagementPanel();
                return;
            }
        }
        
        // Check for path point interaction
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);
        for (let i = 0; i < rrPoints.length; i++) {
            const point = rrPoints[i];
            const dist = Math.sqrt((vexX - point.x) ** 2 + (vexY - point.y) ** 2);
            if (dist < 2.5) {
                if (e.button === 0) {
                    if (rrDeleteMode) {
                        rrSaveState();
                        rrPoints.splice(i, 1);
                        if (rrSelectedPointIndex === i) rrHidePointInfo();
                        else if (rrSelectedPointIndex > i) rrSelectedPointIndex--;
                        rrSetActiveMode(null);
                        rrJustDeletedPoint = true; // Set flag to prevent point creation
                        e.stopPropagation(); // Prevent click event from firing
                        // Reset flag after a short delay
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
        
        // Check for stake selection
        for (let stake of [...stakes, ladder.highStake]) {
            if (Math.hypot(stake.x - mouseX, stake.y - mouseY) < STAKE_RADIUS * 2.5) {
                selectedRingTarget = stake;
                selectedObject = null;
                updateRingManagementPanel();
                return;
            }
        }
    });

    rrCanvas.addEventListener("mousemove", (e) => {
        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        if (drawingModeActive) return;

        // Handle dragging objects
        if (selectedObject && selectedObject.dragging) {
            if (robots.includes(selectedObject)) {
                selectedObject.x = Math.max(0, Math.min(mouseX - ROBOT_SIZE / 2, FIELD_SIZE - ROBOT_SIZE));
                selectedObject.y = Math.max(0, Math.min(mouseY - ROBOT_SIZE / 2, FIELD_SIZE - ROBOT_SIZE));
            } else if (mobileGoals.includes(selectedObject)) {
                selectedObject.x = Math.max(MOBILE_GOAL_SIZE / 2, Math.min(mouseX, FIELD_SIZE - MOBILE_GOAL_SIZE / 2));
                selectedObject.y = Math.max(MOBILE_GOAL_SIZE / 2, Math.min(mouseY, FIELD_SIZE - MOBILE_GOAL_SIZE / 2));
            }
            return;
        }
        
        // Handle path point dragging
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);
        if (rrIsDraggingPoint && rrSelectedPoint) {
            rrSelectedPoint.x = vexX;
            rrSelectedPoint.y = vexY;
            if (rrPointXInput) rrPointXInput.value = vexX.toFixed(2);
            if (rrPointYInput) rrPointYInput.value = vexY.toFixed(2);
        } else if (rrInsertMode && rrPoints.length >= 2) {
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
            let onPoint = false;
            for (let i = 0; i < rrPoints.length; i++) {
                const dist = Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2);
                if (dist < 2.5) {
                    rrPoints[i].color = "#e74c3c";
                    onPoint = true;
                } else {
                    rrPoints[i].color = "#bcd732";
                }
            }
            rrCanvas.style.cursor = onPoint ? 'not-allowed' : 'crosshair';
        } else {
            rrCanvas.style.cursor = 'crosshair';
        }
    });

    rrCanvas.addEventListener("mouseup", (e) => {
        if (drawingModeActive) return;
        if (selectedObject) selectedObject.dragging = false;
        
        if (rrIsDraggingPoint && rrSelectedPoint) {
            rrSaveState();
        }
        rrIsDraggingPoint = false;
    });

    rrCanvas.addEventListener("click", (e) => {
        if (drawingModeActive) return;
        if (e.button !== 0) return;

        const rect = rrCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const { x: vexX, y: vexY } = rrCanvasToVex(mouseX, mouseY);

        // Handle trim mode
        if (rrTrimMode) {
            for (let i = 0; i < rrPoints.length; i++) {
                if (Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2) < 2.5) {
                    rrSaveState();
                    rrPoints.splice(i);
                    rrHidePointInfo();
                    rrSetActiveMode(null);
                    return;
                }
            }
        } else if (rrInsertMode && rrHoverPoint) {
            // Insert point on segment
            rrSaveState();
            let h = 0;
            if (rrPoints.length > 0 && rrPoints[rrHoverPoint.segmentIndex].heading !== undefined &&
                rrPoints[rrHoverPoint.segmentIndex + 1].heading !== undefined) {
                const h1 = rrPoints[rrHoverPoint.segmentIndex].heading;
                const h2 = rrPoints[rrHoverPoint.segmentIndex + 1].heading;
                h = h1 + (h2 - h1) * rrHoverPoint.t;
            }
            rrPoints.splice(rrHoverPoint.segmentIndex + 1, 0, { x: rrHoverPoint.x, y: rrHoverPoint.y, heading: h });
            rrHoverPoint = null;
            return;
        } else if (rrDeleteMode) {
            return; // Handled in mousedown
        }
        
        // Check for game object selection
        let clickedGameElement = false;
        if (!rrIsDraggingPoint) {
            for (let stake of [...stakes, ladder.highStake]) {
                if (Math.hypot(stake.x - mouseX, stake.y - mouseY) < STAKE_RADIUS * 2.5) {
                    selectedRingTarget = stake;
                    selectedObject = null;
                    clickedGameElement = true;
                    break;
                }
            }
            if (!clickedGameElement) {
                for (let mg of mobileGoals) {
                    if (isPointInHexagon(mouseX, mouseY, mg.x, mg.y, MOBILE_GOAL_SIZE)) {
                        selectedRingTarget = mg;
                        selectedObject = null;
                        clickedGameElement = true;
                        break;
                    }
                }
            }
            if (clickedGameElement) {
                updateRingManagementPanel();
                return;
            }
        }

        // Add new path point - only if point creation is enabled and we didn't just delete a point
        if (rrPointCreationEnabled && !rrDeleteMode && !rrInsertMode && !rrTrimMode && !rrIsDraggingPoint && !clickedGameElement && !rrJustDeletedPoint) {
            let clickedOnExistingPoint = false;
            for (let i = 0; i < rrPoints.length; i++) {
                if (Math.sqrt((vexX - rrPoints[i].x) ** 2 + (vexY - rrPoints[i].y) ** 2) < 2.5) {
                    clickedOnExistingPoint = true;
                    rrSelectPoint(i);
                    break;
                }
            }
            if (!clickedOnExistingPoint) {
                rrSaveState();
                const newPt = { x: vexX, y: vexY, heading: 0 };
                if (rrPoints.length > 0 && rrPoints[rrPoints.length - 1].heading !== undefined) {
                    newPt.heading = rrPoints[rrPoints.length - 1].heading;
                }
                rrPoints.push(newPt);
                rrSelectPoint(rrPoints.length - 1);
            }
        }
    });

    // Wheel event for adjusting heading
    rrCanvas.addEventListener("wheel", (e) => {
        if (drawingModeActive) return;
        if (rrSelectedPoint) {
            e.preventDefault();
            rrSaveState();
            if (rrSelectedPoint.heading === undefined) rrSelectedPoint.heading = 0;
            const d = e.deltaY > 0 ? -5 : 5;
            rrSelectedPoint.heading = ((rrSelectedPoint.heading + d + 360) % 360);
            if (rrHeadingInput) rrHeadingInput.value = rrSelectedPoint.heading.toFixed(1);
        }
    });

    // Context menu for robots
    rrCanvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (drawingModeActive) return;
        const r = rrCanvas.getBoundingClientRect();
        const mX = e.clientX - r.left;
        const mY = e.clientY - r.top;
        let targetRobot = null;
        
        for (let i = 0; i < robots.length; i++) {
            const rb = robots[i];
            if (mX >= rb.x && mX <= rb.x + ROBOT_SIZE && mY >= rb.y && mY <= rb.y + ROBOT_SIZE) {
                targetRobot = rb;
                break;
            }
        }
        
        if (targetRobot) {
            const rI = robots.indexOf(targetRobot);
            if (contextMenu) {
                contextMenu.querySelector('ul').innerHTML = '';
                
                if (!targetRobot.hanging) {
                    [1, 2, 3].forEach(l => {
                        const li = document.createElement('li');
                        li.textContent = `Climb Level ${l}`;
                        li.onclick = () => setClimbLevel(rI, l);
                        contextMenu.querySelector('ul').appendChild(li);
                    });
                    const li0 = document.createElement('li');
                    li0.textContent = `No Climb`;
                    li0.onclick = () => setClimbLevel(rI, 0);
                    contextMenu.querySelector('ul').appendChild(li0);
                }
                
                if (targetRobot.climbLevel === 0) {
                    const rcX = targetRobot.x + ROBOT_SIZE / 2;
                    const rcY = targetRobot.y + ROBOT_SIZE / 2;
                    if (isPointInDiamond(rcX, rcY, ladder.x + LADDER_SIZE / 2, ladder.y + LADDER_SIZE / 2, LADDER_SIZE)) {
                        const li = document.createElement('li');
                        li.textContent = `Hang from Ladder`;
                        li.onclick = () => setHang(rI, 'ladder');
                        contextMenu.querySelector('ul').appendChild(li);
                    }
                    stakes.forEach((s, sI) => {
                        if (Math.hypot(s.x - rcX, s.y - rcY) < 100 * (FIELD_SIZE / 720)) {
                            const li = document.createElement('li');
                            li.textContent = `Hang from ${s.color.charAt(0).toUpperCase() + s.color.slice(1)} Stake`;
                            li.onclick = () => setHang(rI, `stake${sI}`);
                            contextMenu.querySelector('ul').appendChild(li);
                        }
                    });
                }
                
                if (targetRobot.hanging) {
                    const li = document.createElement('li');
                    li.textContent = `No Hang`;
                    li.onclick = () => setHang(rI, null);
                    contextMenu.querySelector('ul').appendChild(li);
                }
                
                if (contextMenu.querySelector('ul').children.length > 0) {
                    contextMenu.style.left = `${e.clientX}px`;
                    contextMenu.style.top = `${e.clientY}px`;
                    contextMenu.style.display = 'block';
                } else {
                    contextMenu.style.display = 'none';
                }
            }
        } else {
            if (contextMenu) contextMenu.style.display = 'none';
        }
    });
    
    document.addEventListener('click', (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    });

    // Drawing canvas events
    drawingCanvas.addEventListener('mousedown', handleDrawingMouseDown);
    drawingCanvas.addEventListener('mousemove', handleDrawingMouseMove);
    drawingCanvas.addEventListener('mouseup', handleDrawingMouseUp);
    drawingCanvas.addEventListener('mouseleave', () => {
        if (isDrawing) isDrawing = false;
    });

    // Drawing controls
    const toggleDrawingBtn = document.getElementById('toggle-drawing');
    if (toggleDrawingBtn) {
        toggleDrawingBtn.addEventListener('click', () => {
            drawingModeActive = !drawingModeActive;
            toggleDrawingBtn.textContent = drawingModeActive ? 'Disable Drawing Mode' : 'Enable Drawing Mode';
            toggleDrawingBtn.classList.toggle('active-mode', drawingModeActive);
            drawingCanvas.classList.toggle('drawing-active', drawingModeActive);
            if (!drawingModeActive) {
                isErasing = false;
                drawingCtx.globalCompositeOperation = 'source-over';
                rrCanvas.style.cursor = 'crosshair';
            } else {
                rrCanvas.style.cursor = 'default';
            }
        });
    }
    
    const drawingColorSelect = document.getElementById('drawing-color');
    if (drawingColorSelect) {
        drawingColorSelect.addEventListener('change', (e) => {
            drawingColor = e.target.value;
            isErasing = false;
            drawingCtx.globalCompositeOperation = 'source-over';
        });
    }
    
    const drawingSizeSelect = document.getElementById('drawing-size');
    if (drawingSizeSelect) {
        drawingSizeSelect.addEventListener('change', (e) => {
            drawingSize = parseInt(e.target.value);
            isErasing = false;
            drawingCtx.globalCompositeOperation = 'source-over';
        });
    }
    
    const drawingShapeSelect = document.getElementById('drawing-shape');
    if (drawingShapeSelect) {
        drawingShapeSelect.addEventListener('change', (e) => {
            drawingShape = e.target.value;
            isErasing = false;
            drawingCtx.globalCompositeOperation = 'source-over';
        });
    }
    
    const eraseToolBtn = document.getElementById('erase-tool');
    if (eraseToolBtn) {
        eraseToolBtn.addEventListener('click', () => {
            if (!drawingModeActive && toggleDrawingBtn) toggleDrawingBtn.click();
            isErasing = true;
        });
    }
    
    const clearDrawingBtn = document.getElementById('clear-drawing');
    if (clearDrawingBtn) {
        clearDrawingBtn.addEventListener('click', () => {
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            isErasing = false;
            drawingCtx.globalCompositeOperation = 'source-over';
        });
    }
    
    // Ring management
    const addRedRingBtn = document.getElementById('add-red-ring');
    if (addRedRingBtn) {
        addRedRingBtn.addEventListener('click', () => {
            if (selectedRingTarget && selectedRingTarget.ringColors.length < selectedRingTarget.maxRings) {
                selectedRingTarget.ringColors.push('red');
                updateRingManagementPanel();
            }
        });
    }
    
    const addBlueRingBtn = document.getElementById('add-blue-ring');
    if (addBlueRingBtn) {
        addBlueRingBtn.addEventListener('click', () => {
            if (selectedRingTarget && selectedRingTarget.ringColors.length < selectedRingTarget.maxRings) {
                selectedRingTarget.ringColors.push('blue');
                updateRingManagementPanel();
            }
        });
    }
    
    const removeRingBtn = document.getElementById('remove-ring');
    if (removeRingBtn) {
        removeRingBtn.addEventListener('click', () => {
            if (selectedRingTarget && selectedRingTarget.ringColors.length > 0) {
                selectedRingTarget.ringColors.pop();
                updateRingManagementPanel();
            }
        });
    }
    
    // Reset simulation
    const resetSimBtn = document.getElementById('reset-simulation-button');
    if (resetSimBtn) {
        resetSimBtn.addEventListener('click', resetSimulation);
    }
    
    // Tutorial modal
    const showTutorialBtn = document.getElementById('show-tutorial');
    const tutorialModal = document.getElementById('tutorial-modal');
    const closeTutorialBtn = document.getElementById('close-tutorial');
    
    if (showTutorialBtn && tutorialModal) {
        showTutorialBtn.addEventListener('click', () => {
            tutorialModal.classList.add('show');
        });
    }
    
    if (closeTutorialBtn && tutorialModal) {
        closeTutorialBtn.addEventListener('click', () => {
            tutorialModal.classList.remove('show');
        });
    }
    
    if (tutorialModal) {
        tutorialModal.addEventListener('click', (e) => {
            if (e.target === tutorialModal) {
                tutorialModal.classList.remove('show');
            }
        });
    }
    
    // Team number inputs
    ['red-team-1', 'red-team-2', 'blue-team-1', 'blue-team-2'].forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                robots[idx].teamNumber = e.target.value;
            });
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Undo/Redo
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                rrUndo();
            } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                e.preventDefault();
                rrRedo();
            }
        }
        
        // Move point order (Ctrl+Arrow)
        if (rrSelectedPointIndex !== null && (e.ctrlKey || e.metaKey)) {
            if (e.key === "ArrowUp") {
                e.preventDefault();
                rrMovePointOrder("up");
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                rrMovePointOrder("down");
            }
        }
        
        // Delete selected point
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (rrSelectedPointIndex !== null && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                rrSaveState();
                rrPoints.splice(rrSelectedPointIndex, 1);
                rrHidePointInfo();
            }
        }
    });
}

// ============== UI Setup Functions ===============
function rrCreatePointListUI() {
    if (rrPointListContainer) {
        const closeBtn = rrPointListContainer.querySelector('#closePointList');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                rrPointListContainer.classList.remove('show');
            });
        }
        rrPointListContainer.classList.add('show');
    }
}

function rrSetupPointInfoPanel() {
    if (rrPointXInput) {
        rrPointXInput.oninput = () => {
            if (rrSelectedPoint) {
                rrSaveState();
                rrSelectedPoint.x = parseFloat(rrPointXInput.value);
            }
        };
    }
    
    if (rrPointYInput) {
        rrPointYInput.oninput = () => {
            if (rrSelectedPoint) {
                rrSaveState();
                rrSelectedPoint.y = parseFloat(rrPointYInput.value);
            }
        };
    }
    
    if (rrHeadingInput) {
        rrHeadingInput.oninput = () => {
            if (rrSelectedPoint) {
                rrSaveState();
                let value = parseFloat(rrHeadingInput.value);
                value = ((value % 360) + 360) % 360;
                rrSelectedPoint.heading = value;
                rrHeadingInput.value = value.toFixed(1);
            }
        };
    }
    
    if (rrInsertPointBtn) {
        rrInsertPointBtn.onclick = () => {
            if (rrSelectedPointIndex !== null) rrInsertPointAtIndex(rrSelectedPointIndex);
        };
    }
    
    if (rrClosePointInfoBtn) {
        rrClosePointInfoBtn.addEventListener("click", rrHidePointInfo);
    }
}

function rrSetupFieldSelector() {
    const fieldSelect = document.getElementById("fieldSelect");
    const fileInput = document.getElementById("customFieldInput");
    const uploadButton = document.getElementById("uploadFieldBtn");

    if (fieldSelect) {
        fieldSelect.addEventListener("change", function() {
            if (this.value === "custom") {
                if (fileInput) fileInput.style.display = "inline-block";
                if (uploadButton) uploadButton.style.display = "inline-block";
            } else {
                if (fileInput) fileInput.style.display = "none";
                if (uploadButton) uploadButton.style.display = "none";
                rrLoadFieldImage(this.value);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener("change", function() {
            if (this.files && this.files[0]) {
                const fileName = this.files[0].name;
                if (uploadButton) {
                    uploadButton.textContent = "Upload " + (fileName.length > 10 ? fileName.substring(0, 7) + "..." : fileName);
                }
            }
        });
    }

    if (uploadButton) {
        uploadButton.addEventListener("click", function() {
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) { rrLoadFieldImage(e.target.result); };
                reader.readAsDataURL(fileInput.files[0]);
            }
        });
    }
}

function setupCollapsiblePanels() {
    document.querySelectorAll('.panel-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const panel = toggle.closest('.panel');
            if (panel) {
                panel.classList.toggle('collapsed');
            }
        });
    });
}

// ============== Initialization ===============
window.addEventListener("DOMContentLoaded", () => {
    // Initialize with linear mode active and point creation enabled
    rrMode = "linear";
    rrPointCreationEnabled = true;
    if (rrLinearBtn) {
        rrLinearBtn.classList.add('active-mode');
    }
    
    rrCreatePointListUI();
    rrSetupPointInfoPanel();
    rrSetupFieldSelector();
    rrLoadFieldImage(DEFAULT_FIELD_IMAGE);
    updateRingManagementPanel();
    setupCollapsiblePanels();
    setupEventListeners();
    redrawCombined();
});
