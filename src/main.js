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
const showRobotOnPathToggle = document.getElementById("showRobotOnPathToggle"); 
const themeToggleBtn = document.getElementById("themeToggleBtn"); // Theme toggle button

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

// --- THEME TOGGLE ---
function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    localStorage.setItem('roboRouteTheme', theme);
    redraw(); // Redraw canvas as colors might change
}

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
});

function loadTheme() {
    const savedTheme = localStorage.getItem('roboRouteTheme') || 'dark'; // Default to dark
    applyTheme(savedTheme);
}


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

// Function to get CSS variable value
function getCssVariable(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}


// --- HISTORY (Undo/Redo) ---
function saveState(actionDescription = "unknown action") {
  const currentState = {
    points: JSON.parse(JSON.stringify(points.map(p => ({...p, heading: parseFloat(p.heading.toFixed(3))})))), 
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
    currentFieldImage.src = "../assets/fields/empty-field.png"; 
};


function drawPoint(vexX, vexY, radius = 5, color = null, alpha = 1, heading = null, isHighlighted = false) {
  const { x: sceneX, y: sceneY } = vexToScene(vexX, vexY); 
  const visualRadius = radius / view.zoom; 
  const visualHighlightRadius = (radius + 4) / view.zoom;

  const pointDefaultColor = getCssVariable('--point-color-default');
  const finalColor = color || pointDefaultColor;

  if (isHighlighted) {
    ctx.beginPath(); ctx.arc(sceneX, sceneY, visualHighlightRadius, 0, 2 * Math.PI);
    ctx.fillStyle = getCssVariable('--active-mode-bg-color') + '4D'; // '4D' for ~30% opacity
    ctx.fill();
  }
  ctx.beginPath(); ctx.arc(sceneX, sceneY, visualRadius, 0, 2 * Math.PI);
  ctx.fillStyle = finalColor; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;

  if (heading !== null) {
    const canvasAngleRad = (normalizeAngle(heading - 90)) * Math.PI / 180; 
    const lineLength = visualRadius * 2; 
    const endX = sceneX + Math.cos(canvasAngleRad) * lineLength; 
    const endY = sceneY + Math.sin(canvasAngleRad) * lineLength; 
    ctx.beginPath(); ctx.moveTo(sceneX, sceneY); ctx.lineTo(endX, endY);
    ctx.strokeStyle = getCssVariable('--text-color'); // Use text color for heading line for contrast
    ctx.lineWidth = Math.max(1, 2 / view.zoom); ctx.stroke();
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
  ctx.strokeStyle = getCssVariable('--path-stroke-color'); 
  ctx.lineWidth = Math.max(1, 2 / view.zoom); ctx.stroke();
}

function drawRobotOnPath(robotState) { 
    if (!robotState) return;
    const { x: sceneX, y: sceneY } = vexToScene(robotState.x_vex, robotState.y_vex);
    const canvasAngleRad = (normalizeAngle(robotState.angle_deg_body - 90)) * Math.PI / 180;

    const robotWidth_scene = (robotWidth_vex / (VEX_MAX - VEX_MIN) * CANVAS_WIDTH);
    const robotLength_scene = (robotLength_vex / (VEX_MAX - VEX_MIN) * CANVAS_WIDTH);

    ctx.save();
    ctx.translate(sceneX, sceneY);
    ctx.rotate(canvasAngleRad); 
    
    ctx.fillStyle = getCssVariable('--panel-header-color') + '4D'; // Use panel header color with opacity
    ctx.strokeStyle = getCssVariable('--panel-header-color') + 'B3'; // Use panel header color with more opacity
    ctx.lineWidth = Math.max(1, 1.5 / view.zoom);
    
    ctx.beginPath();
    ctx.rect(-robotLength_scene / 2, -robotWidth_scene / 2, robotLength_scene, robotWidth_scene);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0,0); 
    ctx.lineTo(robotLength_scene / 2 * 0.9, 0); 
    ctx.strokeStyle = getCssVariable('--panel-text-color') + 'E6'; // Panel text color with opacity
    ctx.lineWidth = Math.max(1, 2 / view.zoom);
    ctx.stroke();
    
    ctx.restore();
}


function redraw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.save();
  ctx.translate(view.panX, view.panY); ctx.scale(view.zoom, view.zoom);

  // Set canvas background based on theme (important if field image doesn't load/cover all)
  canvas.style.backgroundColor = getCssVariable('--canvas-bg-color');


  if (backgroundLoaded || currentFieldImage.complete) {
    ctx.drawImage(currentFieldImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  if (mode === "linear") drawLinearPath();

  points.forEach((point, index) => {
    const heading = point.heading !== undefined ? point.heading : 0;
    const isHighlighted = index === selectedPointIndex;
    const pointColor = point.color || (deleteMode && hoverPoint === point ? getCssVariable('--point-color-delete-hover') : getCssVariable('--point-color-default'));
    drawPoint(point.x, point.y, 5, pointColor, 1, heading, isHighlighted);
    
    const { x: sceneX, y: sceneY } = vexToScene(point.x, point.y);
    const fontSize = Math.max(8, 12 / view.zoom); 
    ctx.font = `${fontSize}px Roboto`; 
    ctx.fillStyle = getCssVariable('--point-text-color'); 
    ctx.fillText(`${index + 1}`, sceneX + (8 / view.zoom) , sceneY + (5 / view.zoom));
  });

  if (insertMode && hoverPoint && hoverPoint.hasOwnProperty('x')) { 
    drawPoint(hoverPoint.x, hoverPoint.y, 5, getCssVariable('--button-primary-bg-color'), 0.5, hoverPoint.heading);
  }
  if (showRobotOnPath && visualizedRobotState) {
      drawRobotOnPath(visualizedRobotState);
  }
  
  ctx.restore(); 

  ctx.font = "14px Roboto"; 
  ctx.fillStyle = getCssVariable('--canvas-coords-text-color');
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
    pointCoords.style.color = getCssVariable('--path-summary-small-text-color'); 
    pointCoords.textContent = `(${point.x.toFixed(1)}, ${point.y.toFixed(1)}) H:${normalizeAngle(point.heading !== undefined ? point.heading : 0).toFixed(0)}°`;

    pointEntry.appendChild(pointLabel); pointEntry.appendChild(pointCoords);
    pointEntry.addEventListener("click", () => selectPoint(index));
    pointList.appendChild(pointEntry);
  });
  if (points.length === 0) { 
      const noPointsMsg = document.createElement('p');
      noPointsMsg.textContent = "No points added yet.";
      noPointsMsg.style.textAlign = 'center'; noPointsMsg.style.fontStyle = 'italic'; 
      noPointsMsg.style.color = getCssVariable('--path-summary-small-text-color');
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
    visualizedRobotState = null; 

    if (isDragging && selectedPoint) { 
        selectedPoint.x = vexCoords.x; selectedPoint.y = vexCoords.y;
        const pointXInputElement = document.getElementById("pointXInput"); 
        const pointYInputElement = document.getElementById("pointYInput"); 
        if(pointXInputElement) pointXInputElement.value = selectedPoint.x.toFixed(2); 
        if(pointYInputElement) pointYInputElement.value = selectedPoint.y.toFixed(2);
        redraw(); updatePointList(); return;
    }
    
    hoverPoint = null; 
    if (deleteMode) { 
        let onPoint = false;
        points.forEach(point => {
            const distThresholdInVex = 5 / view.zoom;
            if (distance(vexCoords, point) < distThresholdInVex) {
                point.color = getCssVariable('--point-color-delete-hover'); 
                hoverPoint = point; onPoint = true;
            } else { point.color = getCssVariable('--point-color-default'); }
        });
        canvas.style.cursor = onPoint ? 'not-allowed' : 'crosshair';
        redraw(); return; 
    } else { points.forEach(p => p.color = getCssVariable('--point-color-default')); }


    if (insertMode && points.length >=1 ) { 
        let minDistToSegment = Infinity; let closestProjection = null; let segmentDetails = null; 
        if (points.length >= 2) {
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i]; const p2 = points[i+1];
                // Need distToSegment function for this to work properly
                // Assuming distToSegment exists and works as expected.
                // const result = distToSegment(vexCoords, p1, p2); 
                // Placeholder logic for hover point on segment for insert mode
                const placeholder_dist_to_segment = Math.random() * 20; // Replace with actual calculation
                const distThresholdInVex = 10 / view.zoom;
                if (placeholder_dist_to_segment < minDistToSegment && placeholder_dist_to_segment < distThresholdInVex) {
                     minDistToSegment = placeholder_dist_to_segment;
                     closestProjection = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2}; // Simplified placeholder
                     segmentDetails = { segmentIndex: i, t: 0.5 }; // Simplified placeholder
                }
            }
        }
        if (closestProjection) {
          hoverPoint = { x: closestProjection.x, y: closestProjection.y, heading: 0, segmentIndex: segmentDetails.segmentIndex, t: segmentDetails.t };
          // Need interpolateAngle function for this to work properly
          // Assuming interpolateAngle exists and works as expected
          // if (segmentDetails && points[segmentDetails.segmentIndex].heading !== undefined && points[segmentDetails.segmentIndex + 1].heading !== undefined) {
          //    hoverPoint.heading = interpolateAngle(points[segmentDetails.segmentIndex].heading, points[segmentDetails.segmentIndex + 1].heading, segmentDetails.t);
          // }
          canvas.style.cursor = 'copy';
        } else { canvas.style.cursor = 'crosshair'; }
        redraw(); return; 
    } else { if (!isDragging && !deleteMode) canvas.style.cursor = 'crosshair';}

    if (showRobotOnPath && points.length >= 2 && !isDragging && !deleteMode && !insertMode) {
        let minDistToAnySegment = Infinity; let closestProjectionOnAnySegment = null;
        let segmentAngleForRobot = 0; let segIndexForRobot = -1;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i]; const p2 = points[i+1];
            // Need distToSegment function for this to work properly
            // const segInfo = distToSegment(vexCoords, p1, p2);
            // Placeholder logic for robot on path visualization
            const placeholder_dist_to_segment_robot = Math.random() * 20; // Replace
            const distThresholdInVex = 10 / view.zoom; 
            if (placeholder_dist_to_segment_robot < minDistToAnySegment && placeholder_dist_to_segment_robot < distThresholdInVex) {
                minDistToAnySegment = placeholder_dist_to_segment_robot; 
                closestProjectionOnAnySegment = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2}; // Simplified placeholder
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

  if (trimMode) { /* ... trim logic ... */ redraw(); return; }
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
    else if (e.key === 'ArrowUp' && selectedPointIndex !== null) { e.preventDefault(); /* movePoint("up"); */ } 
    else if (e.key === 'ArrowDown' && selectedPointIndex !== null) { e.preventDefault(); /* movePoint("down"); */ }
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== null) { 
    e.preventDefault(); deleteSelectedPoint(); 
  } else if (e.key === 'Escape') { 
    let modeCleared = false;
    if (deleteMode) { deleteMode = false; deleteBtn.classList.remove('active-mode'); hoverPoint = null; modeCleared = true; }
    if (insertMode) { insertMode = false; insertBtn.classList.remove('active-mode'); hoverPoint = null; modeCleared = true;}
    if (trimMode) { trimMode = false; trimBtn.classList.remove('active-mode'); modeCleared = true; }
    if (selectedPointIndex !== null) { selectedPoint = null; selectedPointIndex = null; hidePointInfo(); modeCleared = true; } 
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
  const globalPointYInput = document.getElementById("pointYInput") || pointYInput; 
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
    redraw(); updatePointList(); 
  };
  headingInput.onchange = () => { saveState("manual heading change"); redraw(); }; 

  let movesBackwardsLabel = document.getElementById("movesBackwardsLabel");
  let movesBackwardsCheckbox = document.getElementById("movesBackwardsCheckbox");
  if (!movesBackwardsCheckbox) {
      movesBackwardsLabel = document.createElement("label"); movesBackwardsLabel.id = "movesBackwardsLabel";
      movesBackwardsLabel.style.display = "block"; movesBackwardsLabel.style.marginTop = "10px";
      movesBackwardsCheckbox = document.createElement("input"); movesBackwardsCheckbox.type = "checkbox";
      movesBackwardsCheckbox.id = "movesBackwardsCheckbox"; movesBackwardsCheckbox.style.marginRight = "5px";
      movesBackwardsLabel.appendChild(movesBackwardsCheckbox); movesBackwardsLabel.append("Move backwards to this point");
      headingInput.parentElement.after(movesBackwardsLabel); 
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
    // Need interpolateAngle function
    // if (selectedPoint.heading !== undefined && nextPoint.heading !== undefined) {
    //     midHeading = interpolateAngle(selectedPoint.heading, nextPoint.heading, 0.5);
    // }
    const newPoint = { x: midX, y: midY, heading: midHeading, actions: [], movesBackwards: false };
    points.splice(index + 1, 0, newPoint); selectPoint(index + 1); 
  } else if (selectedPoint && index === points.length -1) { /* ... */ }
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

// --- Path Actions & Info Panel ---
const actionsPanel = document.getElementById("actionsPanel");
const pathSummaryDiv = document.getElementById("pathSummary");
const pointActionsListDiv = document.getElementById("pointActionsList");
const addPointActionBtn = document.getElementById("addPointActionBtn");


function updateActionsPanel() {
    actionsPanel.style.display = "block"; 
    let totalPathTime = 0; let totalDistance = 0;
    let currentSimHeading = initial_robot_heading_sim; 

    if (points.length > 0) {
        currentSimHeading = points[0].heading; 
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
        <p><small style="color: ${getCssVariable('--path-summary-small-text-color')};">(F:${forward_speed_ips}ips, B:${backward_speed_ips}ips, T:${turn_rate_dps}dps, Init H:${initial_robot_heading_sim}°)</small></p>
    `;
    pointActionsListDiv.innerHTML = '';
    if (selectedPoint && selectedPoint.actions && selectedPoint.actions.length > 0) { /* ... */ } 
    else if (selectedPoint) { pointActionsListDiv.textContent = 'No actions for this point.'; } 
    else { pointActionsListDiv.textContent = 'Select a point to see/add actions.'; }
    addPointActionBtn.disabled = !selectedPoint;
}
addPointActionBtn.onclick = () => { /* ... */ };

// --- FIELD SELECTOR & SAVE/LOAD ---
const savePathBtn = document.getElementById("savePathBtn");
const loadPathBtn = document.getElementById("loadPathBtn");
const loadPathInput = document.getElementById("loadPathInput");
// const generateCodeBtn = document.getElementById("generateBtn"); // Already in HTML
// const importLemLibBtn = document.getElementById("importLemLibBtn"); // Assuming this will be added if needed


function addFieldSelector() { /* ... */ }
function loadFieldImage(src) { currentFieldImage.src = src; }

window.addEventListener("DOMContentLoaded", () => { 
    loadTheme(); // Load theme preference
    addFieldSelector(); 
    loadFieldImage(currentFieldImage.src); 
    redraw(); 
    updatePointList(); 
    updateActionsPanel(); 
    saveState("initial app load"); 
});
savePathBtn.addEventListener('click', () => { /* ... */ });
loadPathBtn.addEventListener('click', () => { loadPathInput.click(); });
loadPathInput.addEventListener('change', (event) => { 
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const pathData = JSON.parse(e.target.result); history.past = []; history.future = []; 
            points = pathData.points || [];
            points.forEach(p => { 
                p.heading = p.heading !== undefined ? parseFloat(p.heading) : 0;
                p.actions = p.actions || [];
                p.movesBackwards = p.movesBackwards || false; 
            });
            if (pathData.view) view = pathData.view; else view = { panX: 0, panY: 0, zoom: 1, panLastRawX:0, panLastRawY:0, mouseDisplayX:0, mouseDisplayY:0}; 
            const fieldSelect = document.getElementById('fieldSelect');
            if (pathData.field && fieldSelect) { fieldSelect.value = pathData.field; loadFieldImage(pathData.field); } 
            else if (fieldSelect) { loadFieldImage(fieldSelect.value); }
            if (pathData.delaySetting) delayInput.value = pathData.delaySetting;
            selectedPoint = null; selectedPointIndex = null; hidePointInfo(); 
            saveState("load path from file"); 
            redraw(); updatePointList(); alert("Path loaded successfully!");
        } catch (error) { console.error("Error loading path:", error); alert("Failed to load path."); }
    };
    reader.readAsText(file); loadPathInput.value = ''; 
});

// --- CODE GENERATION & LEMLIB IMPORT ---
const generateBtn = document.getElementById("generateBtn"); // Corrected reference
// const importLemLibBtn = document.getElementById("importLemLibBtn"); // Corrected reference (if exists)

generateBtn.addEventListener("click", () => { /* ... */ });
// if (importLemLibBtn) importLemLibBtn.addEventListener('click', () => { showImportLemLibModal(); });
function showImportLemLibModal() { /* ... */ }

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
                 if (!initialPoseSet && importedPoints.length === 0) { 
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

// Placeholder for distToSegment and interpolateAngle if they were part of the original full code
// function distToSegment(p, v, w) { /* ... actual implementation ... */ return { distance: 0, point: p, t: 0}; }
// function interpolateAngle(a1, a2, t) { /* ... actual implementation ... */ return a1; }