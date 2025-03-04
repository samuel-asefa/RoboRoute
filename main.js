const canvas = document.getElementById("pathCanvas");
const ctx = canvas.getContext("2d");

let points = [];
let history = {
  past: [], // Array of previous point states
  future: []  // Array of states that can be redone
};
let mode = "linear";
let selectedPoint = null;
let selectedPointIndex = null;
let deleteMode = false;
let insertMode = false;
let isDragging = false;
let hoverPoint = null;
let isRotating = false;

const pointInfo = document.getElementById("pointInfo");
const pointXInput = document.createElement("input");
const pointYInput = document.createElement("input");
const closePointInfoBtn = document.getElementById("closePointInfo");
const deleteBtn = document.getElementById("deleteBtn");
const insertBtn = document.getElementById("insertBtn");
const insertPointBtn = document.getElementById("insertPointBtn");

// Create point list container
const pointListContainer = document.createElement("div");
pointListContainer.id = "pointListContainer";
pointListContainer.style.position = "absolute";
pointListContainer.style.top = "50px";
pointListContainer.style.right = "20px";
pointListContainer.style.width = "200px";
pointListContainer.style.maxHeight = "600px";
pointListContainer.style.overflowY = "auto";
pointListContainer.style.backgroundColor = "#f0f0f0";
pointListContainer.style.border = "1px solid #ccc";
pointListContainer.style.padding = "10px";
pointListContainer.style.borderRadius = "5px";
pointListContainer.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.1)";

// Create header for point list
const pointListHeader = document.createElement("h3");
pointListHeader.textContent = "Points List";
pointListHeader.style.margin = "0 0 10px 0";
pointListContainer.appendChild(pointListHeader);

// Create point list
const pointList = document.createElement("div");
pointList.id = "pointList";
pointListContainer.appendChild(pointList);

// Add to document
document.body.appendChild(pointListContainer);

pointXInput.type = "number";
pointYInput.type = "number";
pointXInput.step = "0.1";
pointYInput.step = "0.1";
document.getElementById("pointX").replaceWith(pointXInput);
document.getElementById("pointY").replaceWith(pointYInput);

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const VEX_MIN = -72;
const VEX_MAX = 72;

// Function to save the current state to history
function saveState() {
  // Deep clone the points array to avoid reference issues
  const currentState = JSON.parse(JSON.stringify(points));
  
  // Add to past states
  history.past.push(currentState);
  
  // Clear future states when a new action is performed
  history.future = [];
}

// Function to undo the last action
function undo() {
  if (history.past.length === 0) return;
  
  // Save current state to future states
  history.future.push(JSON.parse(JSON.stringify(points)));
  
  // Restore the last past state
  points = history.past.pop();
  
  // Reset selection
  selectedPoint = null;
  selectedPointIndex = null;
  hidePointInfo();
  
  // Redraw
  redraw();
}

// Function to redo the last undone action
function redo() {
  if (history.future.length === 0) return;
  
  // Save current state to past states
  history.past.push(JSON.parse(JSON.stringify(points)));
  
  // Restore the last future state
  points = history.future.pop();
  
  // Reset selection
  selectedPoint = null;
  selectedPointIndex = null;
  hidePointInfo();
  
  // Redraw
  redraw();
}

// Add keyboard event listener for undo/redo
document.addEventListener('keydown', (e) => {
  // Check for Ctrl + Z (Undo)
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault(); // Prevent default browser undo
    undo();
  }
  
  // Check for Ctrl + Y (Redo)
  if (e.ctrlKey && e.key === 'y') {
    e.preventDefault(); // Prevent default browser redo
    redo();
  }
});

function vexToCanvas(x, y) {
  const scaleX = CANVAS_WIDTH / (VEX_MAX - VEX_MIN);
  const scaleY = CANVAS_HEIGHT / (VEX_MAX - VEX_MIN);
  return {
    x: (x - VEX_MIN) * scaleX,
    y: (VEX_MAX - y) * scaleY
  };
}

function canvasToVex(x, y) {
  const scaleX = (VEX_MAX - VEX_MIN) / CANVAS_WIDTH;
  const scaleY = (VEX_MAX - VEX_MIN) / CANVAS_HEIGHT;
  return {
    x: VEX_MIN + x * scaleX,
    y: VEX_MAX - y * scaleY
  };
}

function drawPoint(vexX, vexY, radius = 10, color = 'black', alpha = 1, heading = null, isHighlighted = false) {
  const { x, y } = vexToCanvas(vexX, vexY);
  
  // Draw highlight if point is selected
  if (isHighlighted) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.fill();
  }
  
  // Draw the circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  
  // Draw the heading indicator if provided
  if (heading !== null) {
    // Convert heading to radians (0 degrees points up, increases clockwise)
    const radians = (90 - heading) * (Math.PI / 180);
    
    // Calculate the endpoint of the heading line
    const lineLength = radius * 1.5;
    const endX = x + Math.cos(radians) * lineLength;
    const endY = y - Math.sin(radians) * lineLength;
    
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;
}

function drawLinearPath() {
  if (points.length < 2) return;
  ctx.beginPath();
  const start = vexToCanvas(points[0].x, points[0].y);
  ctx.moveTo(start.x, start.y);
  points.slice(1).forEach(point => {
    const { x, y } = vexToCanvas(point.x, point.y);
    ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function updatePointList() {
  // Clear current list
  pointList.innerHTML = "";
  
  // Create entries for each point
  points.forEach((point, index) => {
    const pointEntry = document.createElement("div");
    pointEntry.className = "point-entry";
    pointEntry.style.padding = "5px";
    pointEntry.style.margin = "2px 0";
    pointEntry.style.cursor = "pointer";
    pointEntry.style.borderRadius = "3px";
    pointEntry.style.display = "flex";
    pointEntry.style.justifyContent = "space-between";
    pointEntry.style.alignItems = "center";
    
    // Highlight selected point
    if (selectedPointIndex === index) {
      pointEntry.style.backgroundColor = "#ffffaa";
      pointEntry.style.border = "1px solid #dddd00";
    } else {
      pointEntry.style.backgroundColor = "white";
      pointEntry.style.border = "1px solid #ddd";
    }
    
    const pointLabel = document.createElement("span");
    pointLabel.textContent = `Point ${index + 1}`;
    pointLabel.style.fontWeight = selectedPointIndex === index ? "bold" : "normal";
    
    const pointCoords = document.createElement("small");
    pointCoords.style.color = "#666";
    pointCoords.textContent = `(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`;
    
    pointEntry.appendChild(pointLabel);
    pointEntry.appendChild(pointCoords);
    
    // Add click event
    pointEntry.addEventListener("click", () => {
      selectPoint(index);
    });
    
    pointList.appendChild(pointEntry);
  });
  
  // Show "No points" message if list is empty
  if (points.length === 0) {
    const noPoints = document.createElement("p");
    noPoints.textContent = "No points added yet";
    noPoints.style.color = "#999";
    noPoints.style.fontStyle = "italic";
    noPoints.style.textAlign = "center";
    pointList.appendChild(noPoints);
  }
}

function selectPoint(index) {
  selectedPointIndex = index;
  selectedPoint = points[index];
  showPointInfo(index);
  redraw();
}

function redraw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw the path first so it's behind the points
  if (mode === "linear") {
    drawLinearPath();
  }
  
  // Draw all points with heading indicators
  points.forEach((point, index) => {
    const heading = point.heading !== undefined ? point.heading : 0;
    const isHighlighted = index === selectedPointIndex;
    drawPoint(point.x, point.y, 5, point.color || "black", 1, heading, isHighlighted);
    
    // Draw point number label
    const { x, y } = vexToCanvas(point.x, point.y);
    ctx.font = "12px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(`${index + 1}`, x + 10, y + 5);
  });
  
  // Draw hover point if in insert mode
  if (insertMode && hoverPoint) {
    // Calculate expected heading for the hover point
    let heading = 0;
    if (points.length > 0 && points[0].heading !== undefined) {
      const prevHeading = points[hoverPoint.segmentIndex].heading;
      const nextHeading = points[hoverPoint.segmentIndex + 1].heading;
      heading = prevHeading + (nextHeading - prevHeading) * hoverPoint.t;
    }
    
    drawPoint(hoverPoint.x, hoverPoint.y, 7, "blue", 0.5, heading);
  }
  
  // Draw headings text if needed
  if (points.length > 0 && points[0].heading !== undefined) {
    drawHeadingText();
  }
  
  // Update point list UI
  updatePointList();
}

// Calculate distance from point to line segment
function distToSegment(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
  
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  
  const projection = {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y)
  };
  
  const distance = Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
  return { distance, point: projection, segment: [v, w], t };
}

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = canvasToVex(e.offsetX, e.offsetY);
  
  // Highlight points red when in delete mode
  if (deleteMode) {
    points.forEach(point => {
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      point.color = (distance < 2) ? "red" : "black";
    });
  }
  
  // Handle insert mode hover behavior
  if (insertMode && points.length >= 2) {
    let minDist = Infinity;
    let closestPoint = null;
    let closestSegment = null;
    
    // Check each line segment
    for (let i = 0; i < points.length - 1; i++) {
      const result = distToSegment({ x, y }, points[i], points[i+1]);
      if (result.distance < minDist && result.distance < 2) {
        minDist = result.distance;
        closestPoint = result.point;
        closestSegment = {
          index: i,
          t: result.t
        };
      }
    }
    
    if (closestPoint && minDist < 2) {
      hoverPoint = { 
        x: closestPoint.x, 
        y: closestPoint.y,
        segmentIndex: closestSegment.index,
        t: closestSegment.t
      };
    } else {
      hoverPoint = null;
    }
  } else {
    hoverPoint = null;
  }
  
  // Update point while dragging
  if (isDragging && selectedPoint) {
    selectedPoint.x = x;
    selectedPoint.y = y;
    pointXInput.value = x.toFixed(2);
    pointYInput.value = y.toFixed(2);
    updatePointList();
  }
  
  redraw();
});

canvas.addEventListener("mousedown", (e) => {
  const { x, y } = canvasToVex(e.offsetX, e.offsetY);
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
    if (distance < 2) {
      if (e.button === 0) { // Left click
        isDragging = true;
        selectedPoint = point;
        selectedPointIndex = i;
        showPointInfo(i);
      }
      return;
    }
  }
});

canvas.addEventListener("mouseup", () => {
  if (isDragging && selectedPoint) {
    // Save state after dragging
    saveState();
  }
  isDragging = false;
});


// Continue from the wheel event handler
canvas.addEventListener("wheel", (e) => {
  if (selectedPoint) {
    e.preventDefault(); // Prevent page scrolling
    
    // Initialize heading if it doesn't exist
    if (selectedPoint.heading === undefined) {
      selectedPoint.heading = 0;
      // Ensure all points have heading
      points.forEach(point => {
        if (point.heading === undefined) {
          point.heading = 0;
        }
      });
    }
    
    // Change heading based on wheel direction
    // Negative deltaY means scroll up, positive means scroll down
    const delta = e.deltaY > 0 ? -5 : 5; // 5 degree increments
    
    // Save state before modifying
    saveState();
    
    selectedPoint.heading = (selectedPoint.heading + delta) % 360;
    // Handle negative values
    if (selectedPoint.heading < 0) selectedPoint.heading += 360;
    
    // Update input if it exists
    const headingInput = document.querySelector("#headingInput");
    if (headingInput) {
      headingInput.value = selectedPoint.heading.toFixed(1);
    }
    
    redraw();
  }
});

canvas.addEventListener("click", (e) => {
  if (e.button !== 0) return; // Only handle left clicks
  
  const { x, y } = canvasToVex(e.offsetX, e.offsetY);
  
  // Save state before modification
  saveState();
  
  // Handle click when in insert mode
  if (insertMode && hoverPoint) {
    // Calculate heading if needed
    let heading = 0;
    if (points.length > 0 && points[0].heading !== undefined) {
      const prevHeading = points[hoverPoint.segmentIndex].heading;
      const nextHeading = points[hoverPoint.segmentIndex + 1].heading;
      heading = prevHeading + (nextHeading - prevHeading) * hoverPoint.t;
    }
    
    // Insert the new point
    points.splice(hoverPoint.segmentIndex + 1, 0, { 
      x: hoverPoint.x, 
      y: hoverPoint.y,
      heading
    });
    
    redraw();
    return;
  }
  
  // Handle regular point click/add
  let clickedOnPoint = false;
  
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
    if (distance < 2) {
      clickedOnPoint = true;
      if (deleteMode) {
        points.splice(i, 1);
        // Reset selection if deleted point was deleted
        if (selectedPointIndex === i) {
          selectedPointIndex = null;
          selectedPoint = null;
          hidePointInfo();
        } else if (selectedPointIndex > i) {
          // Adjust index if a point before the selected one was deleted
          selectedPointIndex--;
        }
      } else if (!insertMode) {
        selectedPointIndex = i;
        showPointInfo(i);
      }
      redraw();
      return;
    }
  }
  
  if (!clickedOnPoint && !deleteMode && !insertMode) {
    // Initialize with heading if other points have it
    const newPoint = { x, y };
    
    if (points.length > 0 && points[0].heading !== undefined) {
      newPoint.heading = 0;
    } else if (points.length === 0) {
      // First point should have heading to initialize the system
      newPoint.heading = 0;
    }
    
    points.push(newPoint);
    selectedPointIndex = points.length - 1;
    selectedPoint = newPoint;
    showPointInfo(selectedPointIndex);
    redraw();
  }
});

deleteBtn.addEventListener("click", () => {
  saveState();
  deleteMode = !deleteMode;
  if (deleteMode) {
    insertMode = false;
    insertBtn.textContent = "Insert Point";
  }
  deleteBtn.textContent = deleteMode ? "Exit Delete Mode" : "Delete Point";
});

insertBtn.addEventListener("click", () => {
  saveState();
  insertMode = !insertMode;
  if (insertMode) {
    deleteMode = false;
    deleteBtn.textContent = "Delete Point";
  }
  insertBtn.textContent = insertMode ? "Exit Insert Mode" : "Insert Point";
});

function showPointInfo(index) {
  pointInfo.style.display = "block";
  selectedPoint = points[index];
  selectedPointIndex = index;
  pointXInput.value = selectedPoint.x.toFixed(2);
  pointYInput.value = selectedPoint.y.toFixed(2);
  
  // Create or update heading input if needed
  let headingInput = document.querySelector("#headingInput");
  let headingLabel = document.querySelector("#headingLabel");
  
  if (!headingInput) {
    headingInput = document.createElement("input");
    headingInput.id = "headingInput";
    headingInput.type = "number";
    headingInput.step = "5";
    headingInput.min = "0";
    headingInput.max = "359";
    
    headingLabel = document.createElement("p");
    headingLabel.id = "headingLabel";
    headingLabel.innerHTML = "<strong>Heading (°):</strong> ";
    headingLabel.appendChild(headingInput);
    
    const pointYLabel = document.querySelector("#pointInfo p:nth-child(3)");
    pointYLabel.after(headingLabel);
  }
  
  // Initialize heading if undefined
  if (selectedPoint.heading === undefined) {
    selectedPoint.heading = 0;
  }
  
  headingInput.value = selectedPoint.heading.toFixed(1);
  headingInput.oninput = () => {
    saveState(); // Save state before modifying
    let value = parseFloat(headingInput.value);
    // Ensure heading is between 0-359
    value = ((value % 360) + 360) % 360;
    selectedPoint.heading = value;
    headingInput.value = value.toFixed(1);
    redraw();
  };
  
  pointXInput.oninput = () => {
    saveState(); // Save state before modifying
    selectedPoint.x = parseFloat(pointXInput.value);
    redraw();
  };
  
  pointYInput.oninput = () => {
    saveState(); // Save state before modifying
    selectedPoint.y = parseFloat(pointYInput.value);
    redraw();
  };

  insertPointBtn.onclick = () => insertPointAtIndex(index);
  
  // Add point index information
  const pointIndexElement = document.querySelector("#pointIndexInfo");
  if (!pointIndexElement) {
    const pointIndexInfo = document.createElement("p");
    pointIndexInfo.id = "pointIndexInfo";
    pointIndexInfo.innerHTML = `<strong>Point Index:</strong> <span id="pointIndexValue">${index + 1}</span>`;
    document.querySelector("#pointInfo h4").after(pointIndexInfo);
  } else {
    document.getElementById("pointIndexValue").textContent = index + 1;
  }
  
  // Update the point list to highlight the selected point
  updatePointList();
}

function hidePointInfo() {
  pointInfo.style.display = "none";
  selectedPoint = null;
  selectedPointIndex = null;
  updatePointList();
}

closePointInfoBtn.addEventListener("click", hidePointInfo);

function insertPointAtIndex(index) {
  if (index < points.length - 1) {
    // Save state before inserting
    saveState();
    
    const nextPoint = points[index + 1];
    const midX = (selectedPoint.x + nextPoint.x) / 2;
    const midY = (selectedPoint.y + nextPoint.y) / 2;
    
    const newPoint = { x: midX, y: midY };
    
    // If the points have headings, calculate a midpoint heading
    if (selectedPoint.heading !== undefined) {
      // Calculate shortest angle between the two headings
      let heading1 = selectedPoint.heading;
      let heading2 = nextPoint.heading;
      
      // Handle the case where the headings are on opposite sides of 0/360
      if (Math.abs(heading1 - heading2) > 180) {
        if (heading1 > heading2) {
          heading2 += 360;
        } else {
          heading1 += 360;
        }
      }
      
      newPoint.heading = (heading1 + heading2) / 2 % 360;
    }
    
    points.splice(index + 1, 0, newPoint);
    selectedPointIndex = index + 1;
    selectedPoint = newPoint;
    showPointInfo(selectedPointIndex);
    redraw();
  }
}

function drawHeadingText() {
  ctx.font = "12px Arial";
  ctx.fillStyle = "blue";
  points.forEach(point => {
    const { x, y } = vexToCanvas(point.x, point.y);
    const heading = point.heading !== undefined ? point.heading.toFixed(0) : "0";
    ctx.fillText(`${heading}°`, x + 10, y - 10);
  });
}

// Add buttons for moving points up/down in the order
const moveUpButton = document.createElement("button");
moveUpButton.textContent = "Move Up";
moveUpButton.style.marginRight = "5px";
moveUpButton.addEventListener("click", () => {
  if (selectedPointIndex > 0) {
    // Save state before moving
    saveState();
    
    // Swap with previous point
    const temp = points[selectedPointIndex];
    points[selectedPointIndex] = points[selectedPointIndex - 1];
    points[selectedPointIndex - 1] = temp;
    
    // Update selected index
    selectedPointIndex--;
    selectedPoint = points[selectedPointIndex];
    showPointInfo(selectedPointIndex);
    redraw();
  }
});

const moveDownButton = document.createElement("button");
moveDownButton.textContent = "Move Down";
moveDownButton.addEventListener("click", () => {
  if (selectedPointIndex < points.length - 1) {
    // Save state before moving
    saveState();
    
    // Swap with next point
    const temp = points[selectedPointIndex];
    points[selectedPointIndex] = points[selectedPointIndex + 1];
    points[selectedPointIndex + 1] = temp;
    
    // Update selected index
    selectedPointIndex++;
    selectedPoint = points[selectedPointIndex];
    showPointInfo(selectedPointIndex);
    redraw();
  }
});

// Add buttons to point info panel after other buttons
pointInfo.appendChild(document.createElement("hr"));
const reorderContainer = document.createElement("div");
reorderContainer.style.marginTop = "10px";
reorderContainer.appendChild(moveUpButton);
reorderContainer.appendChild(moveDownButton);
pointInfo.appendChild(reorderContainer);

// Create separate buttons for undo and redo
const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo (Ctrl+Z)";
undoBtn.style.marginRight = "10px";
undoBtn.addEventListener("click", undo);

const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo (Ctrl+Y)";
redoBtn.addEventListener("click", redo);

// Add undo/redo buttons to the page
const undoRedoContainer = document.createElement("div");
undoRedoContainer.style.marginBottom = "10px";
undoRedoContainer.appendChild(undoBtn);
undoRedoContainer.appendChild(redoBtn);
document.body.insertBefore(undoRedoContainer, canvas);

// Note for the user
const undoRedoNote = document.createElement("p");
undoRedoNote.textContent = "Tip: Use Ctrl+Z to Undo and Ctrl+Y to Redo actions";
undoRedoNote.style.color = "#666";
undoRedoNote.style.fontSize = "0.9em";
document.body.insertBefore(undoRedoNote, undoRedoContainer.nextSibling);

const generateCodeBtn = document.createElement("button");
generateCodeBtn.textContent = "Generate Code";
document.body.appendChild(generateCodeBtn);

const delayInput = document.createElement("input");
delayInput.type = "number";
delayInput.value = 500;
delayInput.placeholder = "Delay (ms)";
document.body.appendChild(delayInput);

generateCodeBtn.addEventListener("click", () => {
  if (points.length < 1) return;
  
  const formattedPoints = points.map(p => ({
    x: parseFloat(p.x).toFixed(2),
    y: parseFloat(p.y).toFixed(2),
    heading: p.heading !== undefined ? parseFloat(p.heading).toFixed(1) : 0
  }));
  
  let code = `chassis.setPose(${formattedPoints[0].x}, ${formattedPoints[0].y}, ${formattedPoints[0].heading});\n`;

  for (let i = 1; i < formattedPoints.length; i++) {
    code += `chassis.moveToPose(${formattedPoints[i].x}, ${formattedPoints[i].y}, ${formattedPoints[i].heading}, ${delayInput.value});\n`;
  }
  
  console.log(code);
  alert(code);
});


// Initialize the UI
redraw();