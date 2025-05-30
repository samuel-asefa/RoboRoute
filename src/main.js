const canvas = document.getElementById("pathCanvas");
const ctx = canvas.getContext("2d");

let points = [];
let history = {
  past: [],
  future: []
};

let mode = "linear"; 
let selectedPoint = null;
let selectedPointIndex = null;
let deleteMode = false;
let insertMode = false;
let trimMode = false;
let isDragging = false; 
let hoverPoint = null; 
let isRotating = false; 

// View state for pan and zoom
let view = {
  panX: 0,
  panY: 0,
  zoom: 1,
  isPanning: false,
  panLastRawX: 0, 
  panLastRawY: 0,
  mouseDisplayX: 0, 
  mouseDisplayY: 0
};

// Robot and Simulation settings
const robotWidth_vex = 18; // inches
const robotLength_vex = 18; // inches (length is along the "forward" direction)
let showRobotOnPath = false;
let visualizedRobotState = null; // {x_vex, y_vex, angle_deg_body} for drawing robot

const forward_speed_ips = 24; // inches per second
const backward_speed_ips = 18; // inches per second
const turn_rate_dps = 90; // degrees per second
const initial_robot_heading_sim = 0; // degrees, for start of path simulation


const pointInfo = document.getElementById("pointInfo");
const pointXInput = document.createElement("input");
const pointYInput = document.createElement("input");
const closePointInfoBtn = document.getElementById("closePointInfo");
const deleteBtn = document.getElementById("deleteBtn");
const insertBtn = document.getElementById("insertBtn");
const insertPointBtn = document.getElementById("insertPointBtn"); 
const deleteSelectedPointBtn = document.getElementById("deleteSelectedPointBtn");
const trimBtn = document.getElementById("trimBtn");
const clearBtn = document.getElementById("clearBtn"); 
const delayInput = document.getElementById("delayInput"); 
const showRobotOnPathToggle = document.getElementById("showRobotOnPathToggle"); // Get from HTML

if (showRobotOnPathToggle) {
    showRobotOnPathToggle.addEventListener('change', (e) => {
        showRobotOnPath = e.target.checked;
        if (!showRobotOnPath) {
            visualizedRobotState = null; 
        }
        redraw();
    });
}


const pointListContainer = document.createElement("div");
pointListContainer.id = "pointListContainer";
// Styles for pointListContainer are expected to be in style.css
// Basic positioning if not fully covered by CSS:
pointListContainer.style.position = "absolute";
pointListContainer.style.top = "70px"; 
pointListContainer.style.left = "20px"; 


const pointListHeader = document.createElement("h3");
pointListHeader.textContent = "Points List";
pointListContainer.appendChild(pointListHeader);

const pointList = document.createElement("div");
pointList.id = "pointList";
pointListContainer.appendChild(pointList);
document.body.appendChild(pointListContainer);


pointXInput.type = "number"; pointYInput.type = "number";
pointXInput.step = "0.1"; pointYInput.step = "0.1";
document.getElementById("pointX").replaceWith(pointXInput);
document.getElementById("pointY").replaceWith(pointYInput);

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const VEX_MIN = -72; const VEX_MAX = 72;

// --- UTILITY FUNCTIONS ---
function normalizeAngle(degrees) { 
    return ((degrees % 360) + 360) % 360;
}

function shortestAngleDiff(from_deg, to_deg) { 
    const normFrom = normalizeAngle(from_deg);
    const normTo = normalizeAngle(to_deg);
    let diff = normTo - normFrom;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
}

function atan2_degrees(y, x) {
    return normalizeAngle(Math.atan2(y, x) * 180 / Math.PI);
}

function distance(p1, p2) {
    return Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
}


// --- HISTORY (Undo/Redo) ---
function saveState(actionDescription = "unknown action") {
  const currentState = {
    points: JSON.parse(JSON.stringify(points.map(p => ({...p, heading: parseFloat(p.heading.toFixed(3))})))), // Save with consistent precision
    view: JSON.parse(JSON.stringify(view)) 
  };
  history.past.push(currentState);
  history.future = [];
  if (history.past.length > 50) history.past.shift();
}

function undo() {
  if (history.past.length === 0) return;
  history.future.push({points: JSON.parse(JSON.stringify(points)), view: JSON.parse(JSON.stringify(view))});
  const previousState = history.past.pop();
  points = previousState.points;
  if (previousState.view) view = previousState.view; 
  selectedPoint = null; selectedPointIndex = null; hidePointInfo(); redraw(); updatePointList();
}

function redo() {
  if (history.future.length === 0) return;
  history.past.push({points: JSON.parse(JSON.stringify(points)), view: JSON.parse(JSON.stringify(view))});
  const nextState = history.future.pop();
  points = nextState.points;
  if (nextState.view) view = nextState.view; 
  selectedPoint = null; selectedPointIndex = null; hidePointInfo(); redraw(); updatePointList();
}

// --- COORDINATE TRANSFORMATION ---
function vexToScene(vexX, vexY) {
  const scaleX = CANVAS_WIDTH / (VEX_MAX - VEX_MIN);
  const scaleY = CANVAS_HEIGHT / (VEX_MAX - VEX_MIN);
  return { x: (vexX - VEX_MIN) * scaleX, y: (VEX_MAX - vexY) * scaleY };
}

function sceneToVex(sceneX, sceneY) {
  const scaleX = (VEX_MAX - VEX_MIN) / CANVAS_WIDTH;
  const scaleY = (VEX_MAX - VEX_MIN) / CANVAS_HEIGHT;
  return { x: VEX_MIN + sceneX * scaleX, y: VEX_MAX - sceneY * scaleY };
}

function canvasToVex(canvasX, canvasY) {
  const sceneX = (canvasX - view.panX) / view.zoom;
  const sceneY = (canvasY - view.panY) / view.zoom;
  return sceneToVex(sceneX, sceneY);
}


// --- DRAWING ---
let currentFieldImage = new Image();
currentFieldImage.src = "../assets/fields/high-stakes-matches.png"; 
let backgroundLoaded = false;
currentFieldImage.onload = () => { backgroundLoaded = true; redraw(); };
currentFieldImage.onerror = () => { 
    console.error("Failed to load field image:", currentFieldImage.src);
    currentFieldImage.src = "../assets/fields/empty-field.png"; // Fallback
    // The new src will trigger its own onload
};


function drawPoint(vexX, vexY, radius = 5, color = 'black', alpha = 1, heading = null, isHighlighted = false) {
  const { x: sceneX, y: sceneY } = vexToScene(vexX, vexY); 
  const visualRadius = radius / view.zoom; 
  const visualHighlightRadius = (radius + 4) / view.zoom;

  if (isHighlighted) {
    ctx.beginPath(); ctx.arc(sceneX, sceneY, visualHighlightRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(sceneX, sceneY, visualRadius, 0, 2 * Math.PI);
  ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;

  if (heading !== null) {
    // Convert RoboRoute heading (0 up, clockwise) to canvas angle (0 right, counter-clockwise)
    const canvasAngleRad = (normalizeAngle(heading - 90)) * Math.PI / 180; // -90 to align 0_up to 0_right for Math.cos/sin
    const lineLength = visualRadius * 2; 
    const endX = sceneX + Math.cos(canvasAngleRad) * lineLength; // Standard angle for Math.cos
    const endY = sceneY + Math.sin(canvasAngleRad) * lineLength; // Standard angle for Math.sin
    ctx.beginPath(); ctx.moveTo(sceneX, sceneY); ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'black'; ctx.lineWidth = Math.max(1, 2 / view.zoom); ctx.stroke();
  }
}

function drawLinearPath() {
  if (points.length < 2) return;
  ctx.beginPath();
  const start = vexToScene(points[0].x, points[0].y);
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < points.length; i++) {
    const { x, y } = vexToScene(points[i].x, points[i].y);
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#bcd732"; ctx.lineWidth = Math.max(1, 2 / view.zoom); ctx.stroke();
}

function drawRobotOnPath(robotState) { 
    if (!robotState) return;
    const { x: sceneX, y: sceneY } = vexToScene(robotState.x_vex, robotState.y_vex);
    // robotState.angle_deg_body is RoboRoute heading (0 up, clockwise)
    const canvasAngleRad = (normalizeAngle(robotState.angle_deg_body - 90)) * Math.PI / 180;

    // Convert robot dimensions from VEX units to scene units (unzoomed canvas pixels)
    const robotWidth_scene = (robotWidth_vex / (VEX_MAX - VEX_MIN) * CANVAS_WIDTH);
    const robotLength_scene = (robotLength_vex / (VEX_MAX - VEX_MIN) * CANVAS_WIDTH);

    ctx.save();
    ctx.translate(sceneX, sceneY);
    ctx.rotate(canvasAngleRad); // Rotate by the robot's body orientation
    
    ctx.fillStyle = "rgba(100, 100, 255, 0.3)"; 
    ctx.strokeStyle = "rgba(100, 100, 255, 0.7)";
    ctx.lineWidth = Math.max(1, 1.5 / view.zoom);
    
    // Draw robot body (length along its local X, width along its local Y)
    // Centered at (0,0) in its local rotated frame
    ctx.beginPath();
    ctx.rect(-robotLength_scene / 2, -robotWidth_scene / 2, robotLength_scene, robotWidth_scene);
    ctx.fill();
    ctx.stroke();
    
    // Draw a line indicating the "front" of the robot (positive local X)
    ctx.beginPath();
    ctx.moveTo(0,0); // Center of robot
    ctx.lineTo(robotLength_scene / 2 * 0.9, 0); // Line pointing towards local +X
    ctx.strokeStyle = "rgba(230, 230, 255, 0.9)";
    ctx.lineWidth = Math.max(1, 2 / view.zoom);
    ctx.stroke();
    
    ctx.restore();
}


function redraw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.save();
  ctx.translate(view.panX, view.panY); ctx.scale(view.zoom, view.zoom);

  if (backgroundLoaded || currentFieldImage.complete) {
    ctx.drawImage(currentFieldImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  if (mode === "linear") drawLinearPath();

  points.forEach((point, index) => {
    const heading = point.heading !== undefined ? point.heading : 0;
    const isHighlighted = index === selectedPointIndex;
    const pointColor = point.color || (deleteMode && hoverPoint === point ? "red" : "#bcd732");
    drawPoint(point.x, point.y, 5, pointColor, 1, heading, isHighlighted);
    
    const { x: sceneX, y: sceneY } = vexToScene(point.x, point.y);
    const fontSize = Math.max(8, 12 / view.zoom); 
    ctx.font = `${fontSize}px Roboto`; ctx.fillStyle = "black"; 
    ctx.fillText(`${index + 1}`, sceneX + (8 / view.zoom) , sceneY + (5 / view.zoom));
  });

  if (insertMode && hoverPoint && hoverPoint.hasOwnProperty('x')) { 
    drawPoint(hoverPoint.x, hoverPoint.y, 5, "blue", 0.5, hoverPoint.heading);
  }
  if (showRobotOnPath && visualizedRobotState) {
      drawRobotOnPath(visualizedRobotState);
  }
  
  ctx.restore(); 

  ctx.font = "14px Roboto"; ctx.fillStyle = "white";
  ctx.fillText(`Zoom: ${(view.zoom * 100).toFixed(0)}%`, 10, 20);
  const currentVexCoords = canvasToVex(view.mouseDisplayX, view.mouseDisplayY); 
  ctx.fillText(`VEX Coords: (X: ${currentVexCoords.x.toFixed(1)}, Y: ${currentVexCoords.y.toFixed(1)})`, 10, 40);

  updatePointList(); updateActionsPanel(); 
}

// --- UI UPDATES ---
function updatePointList() {
  pointList.innerHTML = "";
  points.forEach((point, index) => {
    const pointEntry = document.createElement("div");
    pointEntry.className = "point-entry";
    if (selectedPointIndex === index) pointEntry.classList.add("selected");

    const pointLabel = document.createElement("span");
    pointLabel.textContent = `Point ${index + 1}${point.movesBackwards ? " (Bwd)" : ""}`;
    pointLabel.style.fontWeight = selectedPointIndex === index ? "bold" : "normal";

    const pointCoords = document.createElement("small");
    pointCoords.style.color = "#aaa"; 
    pointCoords.textContent = `(${point.x.toFixed(1)}, ${point.y.toFixed(1)}) H:${normalizeAngle(point.heading !== undefined ? point.heading : 0).toFixed(0)}°`;

    pointEntry.appendChild(pointLabel); pointEntry.appendChild(pointCoords);
    pointEntry.addEventListener("click", () => selectPoint(index));
    pointList.appendChild(pointEntry);
  });
  if (points.length === 0) { 
      const noPointsMsg = document.createElement('p');
      noPointsMsg.textContent = "No points added yet.";
      noPointsMsg.style.textAlign = 'center'; noPointsMsg.style.fontStyle = 'italic'; noPointsMsg.style.color = '#888';
      pointList.appendChild(noPointsMsg);
  }
}

function selectPoint(index) {
  selectedPointIndex = index; selectedPoint = points[index];
  showPointInfo(index); redraw(); 
}

// --- EVENT HANDLERS ---
canvas.addEventListener("wheel", (e) => {
  e.preventDefault(); 
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
  const sceneMouseX_before = (mouseX - view.panX) / view.zoom;
  const sceneMouseY_before = (mouseY - view.panY) / view.zoom;
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9; 
  const newZoom = view.zoom * zoomFactor;

  if (newZoom < 0.1) view.zoom = 0.1; else if (newZoom > 10) view.zoom = 10; else view.zoom = newZoom;
  view.panX = mouseX - sceneMouseX_before * view.zoom; view.panY = mouseY - sceneMouseY_before * view.zoom;
  
  if (selectedPoint && !e.ctrlKey && !e.shiftKey && !e.altKey) { 
      saveState("change heading scroll");
      const delta = e.deltaY > 0 ? -5 : 5; 
      selectedPoint.heading = normalizeAngle(selectedPoint.heading + delta);
      const headingInputElement = document.querySelector("#headingInput");
      if (headingInputElement) headingInputElement.value = selectedPoint.heading.toFixed(1);
  }
  redraw();
});

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) { 
        view.isPanning = true; view.panLastRawX = mouseX; view.panLastRawY = mouseY;
        canvas.style.cursor = 'grabbing'; e.preventDefault(); return;
    }
    if (e.button === 0) {
      isDragging = false; 
      const vexMouseCoords = canvasToVex(mouseX, mouseY);
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const distThresholdInVex = 5 / view.zoom; 
        const distanceVal = distance(vexMouseCoords, point);
        if (distanceVal < distThresholdInVex) {
          if (!deleteMode && !insertMode && !trimMode) { 
            isDragging = true; selectedPoint = point; selectedPointIndex = i; showPointInfo(i);
          } return; 
        }
      }
    }
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
    view.mouseDisplayX = mouseX; view.mouseDisplayY = mouseY;

    if (view.isPanning) {
        const dx = mouseX - view.panLastRawX; const dy = mouseY - view.panLastRawY;
        view.panX += dx; view.panY += dy;
        view.panLastRawX = mouseX; view.panLastRawY = mouseY;
        redraw(); return; 
    }
    
    const vexCoords = canvasToVex(mouseX, mouseY); 
    visualizedRobotState = null; // Clear each move, will be re-populated if hovering path

    if (isDragging && selectedPoint) { 
        selectedPoint.x = vexCoords.x; selectedPoint.y = vexCoords.y;
        const pointXInputElement = document.getElementById("pointXInput"); // Assume pointXInput is global or get it
        const pointYInputElement = document.getElementById("pointYInput"); // Assume pointYInput is global or get it
        if(pointXInputElement) pointXInputElement.value = selectedPoint.x.toFixed(2); 
        if(pointYInputElement) pointYInputElement.value = selectedPoint.y.toFixed(2);
        redraw(); updatePointList(); return;
    }
    
    hoverPoint = null; // Reset general hoverPoint, specific modes might set it again
    if (deleteMode) { 
        let onPoint = false;
        points.forEach(point => {
            const distThresholdInVex = 5 / view.zoom;
            if (distance(vexCoords, point) < distThresholdInVex) {
                point.color = "red"; hoverPoint = point; onPoint = true;
            } else { point.color = "#bcd732"; }
        });
        canvas.style.cursor = onPoint ? 'not-allowed' : 'crosshair';
        redraw(); return; 
    } else { points.forEach(p => p.color = "#bcd732"); }

    if (insertMode && points.length >=1 ) { 
        let minDistToSegment = Infinity; let closestProjection = null; let segmentDetails = null; 
        if (points.length >= 2) {
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i]; const p2 = points[i+1];
                const result = distToSegment(vexCoords, p1, p2);
                const distThresholdInVex = 10 / view.zoom; 
                if (result.distance < minDistToSegment && result.distance < distThresholdInVex) {
                    minDistToSegment = result.distance; closestProjection = result.point;
                    segmentDetails = { segmentIndex: i, t: result.t };
                }
            }
        }
        if (closestProjection) {
          hoverPoint = { x: closestProjection.x, y: closestProjection.y, heading: 0, segmentIndex: segmentDetails.segmentIndex, t: segmentDetails.t };
          if (segmentDetails && points[segmentDetails.segmentIndex].heading !== undefined && points[segmentDetails.segmentIndex + 1].heading !== undefined) {
              hoverPoint.heading = interpolateAngle(points[segmentDetails.segmentIndex].heading, points[segmentDetails.segmentIndex + 1].heading, segmentDetails.t);
          }
          canvas.style.cursor = 'copy';
        } else { canvas.style.cursor = 'crosshair'; }
        redraw(); return; 
    } else { if (!isDragging && !deleteMode) canvas.style.cursor = 'crosshair';}

    if (showRobotOnPath && points.length >= 2 && !isDragging && !deleteMode && !insertMode) {
        let minDistToAnySegment = Infinity; let closestProjectionOnAnySegment = null;
        let segmentAngleForRobot = 0; let segIndexForRobot = -1;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i]; const p2 = points[i+1];
            const segInfo = distToSegment(vexCoords, p1, p2);
            const distThresholdInVex = 10 / view.zoom; 
            if (segInfo.distance < minDistToAnySegment && segInfo.distance < distThresholdInVex) {
                minDistToAnySegment = segInfo.distance; closestProjectionOnAnySegment = segInfo.point; 
                segIndexForRobot = i;
            }
        }
        if (closestProjectionOnAnySegment && segIndexForRobot !== -1) {
            const p1 = points[segIndexForRobot]; const p2 = points[segIndexForRobot + 1];
            const pathAngle = atan2_degrees(p2.y - p1.y, p2.x - p1.x);
            const movesBackwardOnSeg = p2.movesBackwards || false;
            segmentAngleForRobot = movesBackwardOnSeg ? normalizeAngle(pathAngle + 180) : pathAngle;
            visualizedRobotState = {
                x_vex: closestProjectionOnAnySegment.x, y_vex: closestProjectionOnAnySegment.y,
                angle_deg_body: segmentAngleForRobot
            };
        }
    }
    if (!view.isPanning && !isDragging) redraw(); 
});


canvas.addEventListener("mouseup", (e) => {
  if (view.isPanning) { view.isPanning = false; canvas.style.cursor = 'crosshair'; saveState("pan view"); }
  if (isDragging && selectedPoint) { isDragging = false; saveState("drag point"); redraw(); }
});

canvas.addEventListener("mouseleave", () => { 
  if (view.isPanning) { view.isPanning = false; canvas.style.cursor = 'crosshair'; saveState("pan view (mouseleave)"); }
  if (isDragging) { isDragging = false; saveState("drag point (mouseleave)"); }
  if (hoverPoint || visualizedRobotState) { hoverPoint = null; visualizedRobotState = null; redraw(); }
});


canvas.addEventListener("click", (e) => {
  if (e.button !== 0 || e.shiftKey) return; 
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
  const vexMouseCoords = canvasToVex(mouseX, mouseY);

  if (trimMode) { /* ... trim logic from before ... */ redraw(); return; }
  if (deleteMode) { 
    if (hoverPoint) {
        const indexToDelete = points.indexOf(hoverPoint);
        if (indexToDelete > -1) {
            saveState("delete point"); points.splice(indexToDelete, 1);
            if (selectedPointIndex === indexToDelete) { selectedPoint = null; selectedPointIndex = null; hidePointInfo(); }
            else if (selectedPointIndex > indexToDelete) { selectedPointIndex--; }
            hoverPoint = null; 
        }
    }
    redraw(); return;
  }
  if (insertMode && hoverPoint && hoverPoint.hasOwnProperty('x')) {
    saveState("insert point on segment");
    const newPoint = { x: hoverPoint.x, y: hoverPoint.y, heading: hoverPoint.heading || 0, actions: [], movesBackwards: false };
    points.splice(hoverPoint.segmentIndex + 1, 0, newPoint);
    selectPoint(hoverPoint.segmentIndex + 1); 
    hoverPoint = null; redraw(); return;
  } else if (insertMode) { 
    saveState("add point (insert mode at click)");
    const newPoint = { 
        x: vexMouseCoords.x, y: vexMouseCoords.y, 
        heading: (points.length > 0 && points[points.length-1].heading !== undefined) ? points[points.length-1].heading : 0,
        actions: [], movesBackwards: false 
    };
    points.push(newPoint); selectPoint(points.length - 1); redraw(); return;
  }

  let clickedOnExistingPoint = false;
   for (let i = 0; i < points.length; i++) {
    const distThresholdInVex = 5 / view.zoom;
    if (distance(vexMouseCoords, points[i]) < distThresholdInVex) {
        clickedOnExistingPoint = true; if (selectedPointIndex !== i) selectPoint(i); break;
    }
  }

  if (!clickedOnExistingPoint && !deleteMode && !insertMode && !trimMode) { 
    saveState("add point");
    const newPoint = { 
        x: vexMouseCoords.x, y: vexMouseCoords.y, 
        heading: (points.length > 0 && points[points.length-1].heading !== undefined) ? points[points.length-1].heading : 0, 
        actions: [], movesBackwards: false
    };
    points.push(newPoint); selectPoint(points.length - 1); redraw();
  }
});


document.addEventListener('keydown', (e) => {
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) return; 
  
  if (e.ctrlKey || e.metaKey) { 
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); } 
    else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo(); } 
    else if (e.key === 'ArrowUp' && selectedPointIndex !== null) { e.preventDefault(); movePoint("up"); } 
    else if (e.key === 'ArrowDown' && selectedPointIndex !== null) { e.preventDefault(); movePoint("down"); }
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== null) { 
    e.preventDefault(); deleteSelectedPoint(); 
  } else if (e.key === 'Escape') { 
    let modeCleared = false;
    if (deleteMode) { deleteMode = false; deleteBtn.classList.remove('active-mode'); hoverPoint = null; modeCleared = true; }
    if (insertMode) { insertMode = false; insertBtn.classList.remove('active-mode'); hoverPoint = null; modeCleared = true;}
    if (trimMode) { trimMode = false; trimBtn.classList.remove('active-mode'); modeCleared = true; }
    if (selectedPointIndex !== null) { selectedPoint = null; selectedPointIndex = null; hidePointInfo(); modeCleared = true; } // Also deselect point
    if (modeCleared) { canvas.style.cursor = 'crosshair'; redraw(); }
  }
});

function setActiveMode(activeButton) { 
    const buttons = [deleteBtn, insertBtn, trimBtn ];
    buttons.forEach(btn => {
        if (btn === activeButton) btn.classList.toggle('active-mode'); 
        else btn.classList.remove('active-mode'); 
    });
    deleteMode = deleteBtn.classList.contains('active-mode');
    insertMode = insertBtn.classList.contains('active-mode');
    trimMode = trimBtn.classList.contains('active-mode');
    hoverPoint = null; 
    if (!deleteMode && !insertMode && !trimMode) canvas.style.cursor = 'crosshair';
    else if (deleteMode) canvas.style.cursor = 'not-allowed';
    else if (insertMode) canvas.style.cursor = 'copy';
    else if (trimMode) canvas.style.cursor = 'text'; 
    redraw(); 
}
deleteBtn.addEventListener("click", () => setActiveMode(deleteBtn));
insertBtn.addEventListener("click", () => setActiveMode(insertBtn));
trimBtn.addEventListener("click", () => setActiveMode(trimBtn));
clearBtn.addEventListener("click", () => { if (confirm("Clear all points?")) { saveState("clear path"); points = []; selectedPoint = null; selectedPointIndex = null; hidePointInfo(); redraw(); }});

// --- POINT INFO PANEL ---
function showPointInfo(index) {
  if (index < 0 || index >= points.length) { hidePointInfo(); return; }
  pointInfo.style.display = "block";
  selectedPoint = points[index]; selectedPointIndex = index;

  let pointIndexElement = document.getElementById("pointIndexInfoDisplay");
  if (!pointIndexElement) { 
      pointIndexElement = document.createElement("p"); pointIndexElement.id = "pointIndexInfoDisplay";
      pointInfo.insertBefore(pointIndexElement, pointInfo.children[1]); 
  }
  pointIndexElement.innerHTML = `<strong>Point Number:</strong> ${index + 1}`;

  pointXInput.value = selectedPoint.x.toFixed(2); 
  const globalPointYInput = document.getElementById("pointYInput") || pointYInput; // Use global if available from HTML
  globalPointYInput.value = selectedPoint.y.toFixed(2);


  let headingInput = document.querySelector("#headingInput");
  if (!headingInput) { 
      const headingLabel = document.createElement("p"); headingLabel.id = "headingLabel"; headingLabel.innerHTML = "<strong>Heading (°):</strong> ";
      headingInput = document.createElement("input"); headingInput.id = "headingInput";
      headingInput.type = "number"; headingInput.step = "1"; headingInput.min = "0"; headingInput.max = "359.9";
      headingLabel.appendChild(headingInput);
      const yCoordElement = Array.from(pointInfo.querySelectorAll('p strong')).find(el => el.textContent.includes('Y:')).parentElement;
      yCoordElement.after(headingLabel);
  }
  selectedPoint.heading = selectedPoint.heading !== undefined ? parseFloat(selectedPoint.heading) : 0; 
  headingInput.value = normalizeAngle(selectedPoint.heading).toFixed(1);
  
  headingInput.oninput = () => { 
    let value = parseFloat(headingInput.value); if (isNaN(value)) value = 0;
    selectedPoint.heading = normalizeAngle(value); 
    headingInput.value = selectedPoint.heading.toFixed(1); 
    redraw(); updatePointList(); // For H display
  };
  headingInput.onchange = () => { saveState("manual heading change"); redraw(); }; 

  // "Move Backwards" Checkbox
  let movesBackwardsLabel = document.getElementById("movesBackwardsLabel");
  let movesBackwardsCheckbox = document.getElementById("movesBackwardsCheckbox");
  if (!movesBackwardsCheckbox) {
      movesBackwardsLabel = document.createElement("label"); movesBackwardsLabel.id = "movesBackwardsLabel";
      movesBackwardsLabel.style.display = "block"; movesBackwardsLabel.style.marginTop = "10px";
      movesBackwardsCheckbox = document.createElement("input"); movesBackwardsCheckbox.type = "checkbox";
      movesBackwardsCheckbox.id = "movesBackwardsCheckbox"; movesBackwardsCheckbox.style.marginRight = "5px";
      movesBackwardsLabel.appendChild(movesBackwardsCheckbox); movesBackwardsLabel.append("Move backwards to this point");
      headingInput.parentElement.after(movesBackwardsLabel); // After heading's <p>
  }
  movesBackwardsCheckbox.checked = selectedPoint.movesBackwards || false;
  movesBackwardsCheckbox.onchange = () => {
      selectedPoint.movesBackwards = movesBackwardsCheckbox.checked;
      saveState("toggle movesBackwards");
      redraw(); updatePointList(); updateActionsPanel(); 
  };

  pointXInput.oninput = () => { selectedPoint.x = parseFloat(pointXInput.value) || 0; redraw(); };
  pointXInput.onchange = () => { selectedPoint.x = parseFloat(pointXInput.value) || 0; saveState("manual X change"); redraw();};
  globalPointYInput.oninput = () => { selectedPoint.y = parseFloat(globalPointYInput.value) || 0; redraw(); };
  globalPointYInput.onchange = () => { selectedPoint.y = parseFloat(globalPointYInput.value) || 0; saveState("manual Y change"); redraw();};
  
  insertPointBtn.onclick = () => insertMidpoint(index); 
  deleteSelectedPointBtn.onclick = deleteSelectedPoint; 
  updatePointList(); updateActionsPanel(); 
}

function hidePointInfo() { pointInfo.style.display = "none"; updatePointList(); updateActionsPanel(); }
closePointInfoBtn.addEventListener("click", () => { selectedPoint = null; selectedPointIndex = null; hidePointInfo(); redraw(); });

function insertMidpoint(index) { 
  if (selectedPoint && index < points.length - 1) {
    saveState("insert midpoint"); const nextPoint = points[index + 1];
    const midX = (selectedPoint.x + nextPoint.x) / 2; const midY = (selectedPoint.y + nextPoint.y) / 2;
    let midHeading = selectedPoint.heading; 
    if (selectedPoint.heading !== undefined && nextPoint.heading !== undefined) {
        midHeading = interpolateAngle(selectedPoint.heading, nextPoint.heading, 0.5);
    }
    const newPoint = { x: midX, y: midY, heading: midHeading, actions: [], movesBackwards: false };
    points.splice(index + 1, 0, newPoint); selectPoint(index + 1); 
  } else if (selectedPoint && index === points.length -1) { /* ... insert after last ... */ }
}
function deleteSelectedPoint() {
    if (selectedPointIndex !== null) {
        saveState("delete selected point from panel"); points.splice(selectedPointIndex, 1);
        if (points.length === 0) { selectedPoint = null; selectedPointIndex = null; hidePointInfo(); } 
        else if (selectedPointIndex >= points.length) { selectPoint(points.length - 1); } 
        else { selectPoint(selectedPointIndex); }
        redraw();
    }
}

// --- Path Actions & Info Panel (TIME CALCULATION UPDATE) ---
function updateActionsPanel() {
    actionsPanel.style.display = "block"; 
    let totalPathTime = 0; let totalDistance = 0;
    let currentSimHeading = initial_robot_heading_sim; 

    if (points.length > 0) {
        // Turn from initial_robot_heading_sim to points[0].heading
        // This is a bit ambiguous: is point[0] a setPose or the first target of a moveTo?
        // Let's assume setPose for point[0] means robot instantly is at points[0].heading.
        // If we want to model a turn to the first point's heading:
        // const turnToFirstPointHeading = shortestAngleDiff(initial_robot_heading_sim, points[0].heading);
        // totalPathTime += Math.abs(turnToFirstPointHeading) / turn_rate_dps;
        currentSimHeading = points[0].heading; // Robot is at P0, facing P0.heading

        if (points[0].actions) {
            points[0].actions.forEach(action => {
                if (action.type.toLowerCase() === 'delay') totalPathTime += parseFloat(action.value || 0) / 1000;
            });
        }
    }

    for (let i = 0; i < points.length - 1; i++) { 
        const p1 = points[i]; const p2 = points[i+1];     
        const pathAngleSegment = atan2_degrees(p2.y - p1.y, p2.x - p1.x);
        const driveOrientationSegment = p2.movesBackwards ? normalizeAngle(pathAngleSegment + 180) : pathAngleSegment;
        
        const turn1 = shortestAngleDiff(currentSimHeading, driveOrientationSegment);
        totalPathTime += Math.abs(turn1) / turn_rate_dps;
        currentSimHeading = driveOrientationSegment; 

        const segmentDist = distance(p1, p2);
        totalDistance += segmentDist;
        totalPathTime += segmentDist / (p2.movesBackwards ? backward_speed_ips : forward_speed_ips);

        const turn2 = shortestAngleDiff(currentSimHeading, p2.heading);
        totalPathTime += Math.abs(turn2) / turn_rate_dps;
        currentSimHeading = p2.heading; 

        const uiDelay = parseFloat(delayInput.value);
        if (uiDelay && uiDelay > 0) totalPathTime += uiDelay / 1000;
        
        if (p2.actions) {
            p2.actions.forEach(action => {
                if (action.type.toLowerCase() === 'delay') totalPathTime += parseFloat(action.value || 0) / 1000;
            });
        }
    }
    
    pathSummaryDiv.innerHTML = `
        <p>Total Points: ${points.length}</p>
        <p>Total Path Distance: ${totalDistance.toFixed(1)} inches</p>
        <p>Est. Time (Path + Turns + Delays): ${totalPathTime.toFixed(1)} seconds</p>
        <p><small>(F:${forward_speed_ips}ips, B:${backward_speed_ips}ips, T:${turn_rate_dps}dps, Init H:${initial_robot_heading_sim}°)</small></p>
    `;
    pointActionsListDiv.innerHTML = '';
    if (selectedPoint && selectedPoint.actions && selectedPoint.actions.length > 0) { /* ... action items ... */ } 
    else if (selectedPoint) { pointActionsListDiv.textContent = 'No actions for this point.'; } 
    else { pointActionsListDiv.textContent = 'Select a point to see/add actions.'; }
    addPointActionBtn.disabled = !selectedPoint;
}
addPointActionBtn.onclick = () => { /* ... as before ... */ };

// --- FIELD SELECTOR & SAVE/LOAD ---
function addFieldSelector() { /* ... as before ... */ }
function loadFieldImage(src) { currentFieldImage.src = src; /* onload handles rest */ }
window.addEventListener("DOMContentLoaded", () => { addFieldSelector(); loadFieldImage(currentFieldImage.src); redraw(); updatePointList(); updateActionsPanel(); saveState("initial app load"); });
savePathBtn.addEventListener('click', () => { /* ... as before ... */ });
loadPathBtn.addEventListener('click', () => { loadPathInput.click(); });
loadPathInput.addEventListener('change', (event) => { 
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const pathData = JSON.parse(e.target.result); history.past = []; history.future = []; 
            points = pathData.points || [];
            points.forEach(p => { // Ensure new properties exist
                p.heading = p.heading !== undefined ? parseFloat(p.heading) : 0;
                p.actions = p.actions || [];
                p.movesBackwards = p.movesBackwards || false; // Add default for older saves
            });
            if (pathData.view) view = pathData.view; else view = { panX: 0, panY: 0, zoom: 1, panLastRawX:0, panLastRawY:0, mouseDisplayX:0, mouseDisplayY:0}; 
            const fieldSelect = document.getElementById('fieldSelect');
            if (pathData.field && fieldSelect) { fieldSelect.value = pathData.field; loadFieldImage(pathData.field); } 
            else if (fieldSelect) { loadFieldImage(fieldSelect.value); }
            if (pathData.delaySetting) delayInput.value = pathData.delaySetting;
            selectedPoint = null; selectedPointIndex = null; hidePointInfo(); 
            saveState("load path from file"); // Save after applying loaded data
            redraw(); updatePointList(); alert("Path loaded successfully!");
        } catch (error) { console.error("Error loading path:", error); alert("Failed to load path."); }
    };
    reader.readAsText(file); loadPathInput.value = ''; 
});

// --- CODE GENERATION & LEMLIB IMPORT ---
generateCodeBtn.addEventListener("click", () => { /* ... as before, modal uses CSS classes ... */ });
importLemLibBtn.addEventListener('click', () => { showImportLemLibModal(); });
function showImportLemLibModal() { /* ... as before, modal uses CSS classes ... */ }

function processLemLibCode(code, modalToClose) {
    const importedPoints = []; let initialPoseSet = false; 
    const setPoseRegex = /\bchassis\.setPose\s*\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*,\s*([-\d\.]+)[^)]*\)/i;
    const moveToPoseRegex = /\bchassis\.moveToPose\s*\(\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*,\s*([-\d\.]+)\s*,\s*([-\d\.]+)[^)]*\)/gi;
    const lines = code.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim(); if (trimmedLine.startsWith("//")) continue; 
        let match = trimmedLine.match(setPoseRegex);
        if (match) {
            const x = parseFloat(match[1]); const y = parseFloat(match[2]); const heading = parseFloat(match[3]);
            if (!isNaN(x) && !isNaN(y) && !isNaN(heading)) {
                if (!initialPoseSet) { 
                    importedPoints.push({ x, y, heading, actions: [], movesBackwards: false }); 
                    initialPoseSet = true;
                } else { console.warn("Multiple chassis.setPose calls found..."); }
            } continue; 
        }
        const moveToMatches = Array.from(trimmedLine.matchAll(moveToPoseRegex)); 
        for (const moveToMatch of moveToMatches) {
            const x = parseFloat(moveToMatch[1]); const y = parseFloat(moveToMatch[2]);
            const heading = parseFloat(moveToMatch[3]); const timeout = parseFloat(moveToMatch[4]);
            if (!isNaN(x) && !isNaN(y) && !isNaN(heading) && !isNaN(timeout)) {
                 const actions = [{ type: 'lemLibTimeout', value: timeout.toString() }];
                 if (!initialPoseSet && importedPoints.length === 0) { // First command is moveToPose
                    importedPoints.push({ x, y, heading, actions, movesBackwards: false }); 
                    initialPoseSet = true; 
                } else if (initialPoseSet) { 
                    importedPoints.push({ x, y, heading, actions, movesBackwards: false }); 
                }
            }
        }
    }

    if (importedPoints.length === 0) { alert("No valid LemLib path commands found."); return; }
    if (confirm(`Replace current path with ${importedPoints.length} imported points?`)) {
        saveState("import LemLib path"); points = importedPoints;
        points.forEach(p => { 
            p.heading = normalizeAngle(p.heading !== undefined ? parseFloat(p.heading) : 0);
            p.actions = p.actions || []; p.movesBackwards = p.movesBackwards || false; 
        });
        selectedPoint = null; selectedPointIndex = null; hidePointInfo();
        redraw(); updatePointList(); updateActionsPanel();
        if (modalToClose) document.body.removeChild(modalToClose);
        alert("LemLib path imported successfully!");
    }
}

// Initial calls after DOM is ready (handled by DOMContentLoaded listener above)
// Make sure global references to DOM elements like pointXInput, pointYInput in showPointInfo are correctly handled
// if they are not the same as the ones created globally. It's better to get them by ID inside showPointInfo if they are replaced.
// For now, assuming the global pointXInput and pointYInput are the ones in the panel.