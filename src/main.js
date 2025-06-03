const canvas = document.getElementById("pathCanvas");
const ctx = canvas.getContext("2d");

let points = [];
let history = {
  past: [], // previous point states
  future: []  // states that can be redone
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

const pointInfo = document.getElementById("pointInfo");
const pointXInput = document.createElement("input");
const pointYInput = document.createElement("input");
const closePointInfoBtn = document.getElementById("closePointInfo");
const deleteBtn = document.getElementById("deleteBtn");
const insertBtn = document.getElementById("insertBtn");
const insertPointBtn = document.getElementById("insertPointBtn");
const trimBtn = document.getElementById("trimBtn");

const pointListContainer = document.createElement("div");
pointListContainer.id = "pointListContainer";
pointListContainer.style.position = "absolute";
pointListContainer.style.top = "27px";
pointListContainer.style.right = "20px";
pointListContainer.style.width = "200px";
pointListContainer.style.maxHeight = "600px";
pointListContainer.style.overflowY = "auto";
pointListContainer.style.backgroundColor = "#222222";
pointListContainer.style.border = "1px solid #121212";
pointListContainer.style.padding = "10px";
pointListContainer.style.borderRadius = "5px";
pointListContainer.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.1)";

const pointListHeader = document.createElement("h3");
pointListHeader.textContent = "Points List";
pointListHeader.style.margin = "0 0 10px 0";
pointListContainer.appendChild(pointListHeader);

const pointList = document.createElement("div");
pointList.id = "pointList";
pointListContainer.appendChild(pointList);

document.body.appendChild(pointListContainer);

pointXInput.type = "number";
pointYInput.type = "number";
pointXInput.step = "0.1";
pointYInput.step = "0.1";
document.getElementById("pointX").replaceWith(pointXInput);
document.getElementById("pointY").replaceWith(pointYInput);

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
// Unit: Inches
const VEX_MIN = -72;
const VEX_MAX = 72;

// saves current state to history
function saveState() {
  const currentState = JSON.parse(JSON.stringify(points));
  
  // Add to past states
  history.past.push(currentState);
  
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
  
  redraw();
}

const pathCanvas = new Image();
pathCanvas.src = "../assets/fields/high-stakes-matches.png";

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

function drawPoint(vexX, vexY, radius = 5, color = 'black', alpha = 1, heading = null, isHighlighted = false) {
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
    const lineLength = radius * 1;
    const endX = x + Math.cos(radians) * lineLength;
    const endY = y - Math.sin(radians) * lineLength;
    
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#2f2f2e';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;
}

function drawLinearPath() {
  if (points.length < 2) return;

  // Draw the entire path as a single stroke without animation
  ctx.beginPath();
  const start = vexToCanvas(points[0].x, points[0].y);
  ctx.moveTo(start.x, start.y);
  
  // Draw all segments in one go
  for (let i = 1; i < points.length; i++) {
    const { x, y } = vexToCanvas(points[i].x, points[i].y);
    ctx.lineTo(x, y);
  }
  
  // Use a stroke style that matches your design
  ctx.strokeStyle = "#bcd732"; // Yellow color for the path
  ctx.lineWidth = 2;
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
      pointEntry.style.backgroundColor = "#333333";
      pointEntry.style.border = "1px solid white";
    } else {
      pointEntry.style.backgroundColor = "#22222";
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
  
  // Draw the background image first
  const backgroundImage = new Image();
  backgroundImage.src = "../assets/fields/high-stakes-matches.png";
  
  // Apply transformation matrix for zoom and pan
  ctx.save();
  
  // Check if the image is already loaded
  if (backgroundImage.complete) {
    // Draw the background with scaling and offset
    ctx.drawImage(backgroundImage, offsetX, offsetY, CANVAS_WIDTH * scale, CANVAS_HEIGHT * scale);
    drawContent();
  } else {
    // If not loaded, wait for it to load
    backgroundImage.onload = function() {
      ctx.drawImage(backgroundImage, offsetX, offsetY, CANVAS_WIDTH * scale, CANVAS_HEIGHT * scale);
      drawContent();
    };
  }
  
  function drawContent() {
    // Draw the path first so it's behind the points
    if (mode === "linear") {
      drawLinearPath();
    }
    
    // Draw all points with heading indicators
    points.forEach((point, index) => {
      const heading = point.heading !== undefined ? point.heading : 0;
      const isHighlighted = index === selectedPointIndex;
      drawPoint(point.x, point.y, 5, point.color || "#bcd732", 1, heading, isHighlighted);
      
      // Draw point number label
      const { x, y } = vexToCanvas(point.x, point.y);
      ctx.font = "12px Roboto";
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
      
      drawPoint(hoverPoint.x, hoverPoint.y, 5, "blue", 0.5, heading);
    }
    
    // Add zoom level indicator
    ctx.font = "14px Roboto";
    ctx.fillStyle = "black";
    ctx.fillText(`Zoom: ${(scale * 100).toFixed(0)}%`, 10, 20);
    
    // Restore the context
    ctx.restore();
    
    // Update point list UI
    updatePointList();
  }
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

// Remove the existing click handlers (in your actual code)
// and replace with this unified click handler
canvas.addEventListener("click", (e) => {
  if (e.button !== 0) return; // Only handle left clicks
  
  const { x, y } = canvasToVex(e.offsetX, e.offsetY);
  
  // Save state before modification
  saveState();
  
  // Check if trimming mode is active
  if (trimMode) {
    // Find the clicked point
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      if (distance < 2) {
        // Remove the clicked point and all subsequent points
        points.splice(i);
        
        // Reset selection
        selectedPointIndex = null;
        selectedPoint = null;
        hidePointInfo();
        
        redraw();
        
        // Exit trim mode after trimming
        trimMode = false;
        trimBtn.classList.remove('active-mode');
        
        return;
      }
    }
    return;
  }
  
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

  canvas.addEventListener("mousemove", (e) => {
    const { x, y } = canvasToVex(e.offsetX, e.offsetY);
    
    // Highlight points red when in delete mode
    if (deleteMode) {
      points.forEach(point => {
        const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        point.color = (distance < 2) ? "red" : "#bcd732"; // Use your default color here
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
        canvas.style.cursor = 'pointer'; // Change cursor to indicate insert possible
      } else {
        hoverPoint = null;
        canvas.style.cursor = 'default';
      }
    } else {
      hoverPoint = null;
      // Reset cursor only if we're not on a draggable point
      if (!isDragging) {
        canvas.style.cursor = 'default';
      }
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

function setActiveMode(button) {
  deleteMode = false;
  insertMode = false;
  trimMode = false;
  
  deleteBtn.classList.remove('active-mode');
  insertBtn.classList.remove('active-mode');
  trimBtn.classList.remove('active-mode');
  
  // Set the specific mode based on which button was clicked
  if (button === insertBtn) {
    insertMode = true;
    insertBtn.classList.add('active-mode');
  } else if (button === deleteBtn) {
    deleteMode = true;
    deleteBtn.classList.add('active-mode');
  } else if (button === trimBtn) {
    trimMode = true;
    trimBtn.classList.add('active-mode');
  }
  // If null is passed, all modes remain off
}

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

// Remove the existing click handlers (in your actual code)
// and replace with this unified click handler
// Remove the duplicated click event handler entirely and keep just one version
canvas.addEventListener("click", (e) => {
  if (e.button !== 0) return; // Only handle left clicks
  
  const { x, y } = canvasToVex(e.offsetX, e.offsetY);
  
  // Save state before modification
  saveState();
  
  // Check if trimming mode is active
  if (trimMode) {
    // Find the clicked point
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      if (distance < 2) {
        // Remove the clicked point and all subsequent points
        points.splice(i);
        
        // Reset selection
        selectedPointIndex = null;
        selectedPoint = null;
        hidePointInfo();
        
        redraw();
        
        // Exit trim mode after trimming
        trimMode = false;
        trimBtn.classList.remove('active-mode');
        
        return;
      }
    }
    return;
  }
  
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

trimBtn.addEventListener("click", () => {
  saveState();
  trimMode = !trimMode;
  if (trimMode) {
    deleteMode = false;
    insertMode = false;
    
    trimBtn.classList.add('active-mode');
  } else {
    trimBtn.classList.remove('active-mode');
  }
});

// Modify the click event listener to handle trim mode
canvas.addEventListener("click", (e) => {
  if (e.button !== 0) return; // Only handle left clicks
  
  const { x, y } = canvasToVex(e.offsetX, e.offsetY);
  
  // Check if trimming
  if (trimMode) {
    // Find the clicked point
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      if (distance < 2) {
        // Save state before trimming
        saveState();
        
        // Remove the clicked point and all subsequent points
        points.splice(i);
        
        // Reset selection
        selectedPointIndex = null;
        selectedPoint = null;
        hidePointInfo();
        
        redraw();
        
        // Exit trim mode after trimming
        trimMode = false;
        trimBtn.classList.remove('active-mode');
        
        return;
      }
    }
  }
});

deleteBtn.addEventListener("click", () => {
  saveState();
  deleteMode = !deleteMode;
  if (deleteMode) {
    insertMode = false;
    deleteBtn.classList.add('active-mode');
  } else {
    deleteBtn.classList.remove('active-mode');
  }
});

insertBtn.addEventListener("click", () => {
  saveState();
  insertMode = !insertMode; // Toggle insert mode
  
  if (insertMode) {
    // Turn off other modes
    deleteMode = false;
    trimMode = false;
    
    // Update button appearances
    insertBtn.classList.add('active-mode');
    deleteBtn.classList.remove('active-mode');
    trimBtn.classList.remove('active-mode');
  } else {
    insertBtn.classList.remove('active-mode');
  }
});

const clearBtn = document.getElementById("clearBtn");

clearBtn.addEventListener("click", () => {
  // Save state before clearing
  saveState();
  
  // Clear all points
  points = [];
  
  // Reset selection
  selectedPoint = null;
  selectedPointIndex = null;
  hidePointInfo();
  
  // Redraw the canvas
  redraw();
});







// POINT INFO

function showPointInfo(index) {
  pointInfo.style.display = "block";
  selectedPoint = points[index];
  selectedPointIndex = index;
  pointXInput.value = selectedPoint.x.toFixed(2);
  pointYInput.value = selectedPoint.y.toFixed(2);
  
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
  
  const pointIndexElement = document.querySelector("#pointIndexInfo");
  if (!pointIndexElement) {
    const pointIndexInfo = document.createElement("p");
    pointIndexInfo.id = "pointIndexInfo";
    pointIndexInfo.innerHTML = `<strong>Point Index:</strong> <span id="pointIndexValue">${index + 1}</span>`;
    document.querySelector("#pointInfo h4").after(pointIndexInfo);
  } else {
    document.getElementById("pointIndexValue").textContent = index + 1;
  }
  
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
  ctx.font = "12px Roboto";
  ctx.fillStyle = "white";
  points.forEach(point => {
    const { x, y } = vexToCanvas(point.x, point.y);
    const heading = point.heading !== undefined ? point.heading.toFixed(0) : "0";
    ctx.fillText(`${heading}°`, x + 10, y - 10);
  });
}

// Function to handle point movement in either direction
function movePoint(direction) {
  if (direction === "up" && selectedPointIndex > 0) {
    saveState();
    
    // Swap the selected point with the one above it
    const temp = points[selectedPointIndex];
    points[selectedPointIndex] = points[selectedPointIndex - 1];
    points[selectedPointIndex - 1] = temp;
    
    // Update the selected point index
    selectedPointIndex--;
    selectedPoint = points[selectedPointIndex];
    showPointInfo(selectedPointIndex);
    redraw();
  } 
  else if (direction === "down" && selectedPointIndex < points.length - 1) {
    saveState();
    
    // Swap the selected point with the one below it
    const temp = points[selectedPointIndex];
    points[selectedPointIndex] = points[selectedPointIndex + 1];
    points[selectedPointIndex + 1] = temp;
    
    // Update the selected point index
    selectedPointIndex++;
    selectedPoint = points[selectedPointIndex];
    showPointInfo(selectedPointIndex);
    redraw();
  }
}

// Add keyboard event listener to the document
document.addEventListener("keydown", (event) => {
  // Only process if we have a selected point and Ctrl key is pressed
  if (selectedPointIndex !== null && selectedPointIndex !== undefined && event.ctrlKey) {
    if (event.key === "ArrowUp") {
      movePoint("up");
      event.preventDefault(); // Prevent page scrolling
    } 
    else if (event.key === "ArrowDown") {
      movePoint("down");
      event.preventDefault(); // Prevent page scrolling
    }
  }
});

// Field Selector

let currentFieldImage = new Image();
currentFieldImage.src = "../assets/fields/push-back-skills.png"; // Default image
let backgroundLoaded = false;

function addFieldSelector() {
  const fieldSelectLabel = document.createElement("label");
  fieldSelectLabel.textContent = ""; // No field select label
  fieldSelectLabel.style.color = "white";
  fieldSelectLabel.style.marginRight = "5px";
  fieldSelectLabel.style.marginLeft = "0.0em";
  
  const fieldSelect = document.createElement("select");
  fieldSelect.id = "fieldSelect";
  fieldSelect.style.padding = "0.2em 0.6em";
  fieldSelect.style.fontSize = "16px";
  fieldSelect.style.fontWeight = "500";
  fieldSelect.style.backgroundColor = "rgb(25,25,25)";
  fieldSelect.style.color = "white";
  fieldSelect.style.border = "0.1em solid rgb(50,50,50)";
  fieldSelect.style.transition = "0.25s";
  fieldSelect.style.marginRight = "5px";
  
  // Add hover effect to match other tools
  fieldSelect.addEventListener("mouseover", function() {
    this.style.backgroundColor = "#2e2e2e";
  });
  
  fieldSelect.addEventListener("mouseout", function() {
    this.style.backgroundColor = "rgb(25,25,25)";
  });
  
  const presetFields = [
    { value: "../assets/fields/push-back-skills.png", text: "Push Back (Skills)" },
    { value: "../assets/fields/high-stakes-matches.png", text: "High Stakes (Matches)" },
    { value: "../assets/fields/high-stakes-skills.png", text: "High Stakes (Skills)" },
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
  
  // File input for uploading custom fields
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "customFieldInput";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.style.marginLeft = "0.3em";
  fileInput.style.padding = "0.2em";
  fileInput.style.fontSize = "14px";
  fileInput.style.backgroundColor = "rgb(25,25,25)";
  fileInput.style.color = "white";
  fileInput.style.border = "0.1em solid rgb(50,50,50)";
  
  // Create upload button (visible when "Custom Upload" is selected)
  const uploadButton = document.createElement("button");
  uploadButton.id = "uploadFieldBtn";
  uploadButton.textContent = "Upload";
  uploadButton.style.display = "none";
  uploadButton.style.marginLeft = "0.0em";
  uploadButton.style.padding = "0.2em 0.6em";
  uploadButton.style.fontSize = "16px";
  uploadButton.style.fontWeight = "500";
  uploadButton.style.backgroundColor = "rgb(25,25,25)";
  uploadButton.style.border = "0.1em solid rgb(50,50,50)";
  uploadButton.style.color = "white";
  uploadButton.style.transition = "0.25s";
  uploadButton.style.cursor = "pointer";
  
  uploadButton.addEventListener("mouseover", function() {
    this.style.backgroundColor = "#2e2e2e";
  });
  
  uploadButton.addEventListener("mouseout", function() {
    this.style.backgroundColor = "rgb(25,25,25)";
  });
  
  // Add event listener for dropdown change
  fieldSelect.addEventListener("change", function() {
    if (this.value === "custom") {
      fileInput.style.display = "inline-block";
      uploadButton.style.display = "inline-block";
    } else {
      fileInput.style.display = "none";
      uploadButton.style.display = "none";
      
      // Load the selected preset field
      loadFieldImage(this.value);
    }
  });
  
  // Add event listener for file input
  fileInput.addEventListener("change", function() {
    if (this.files && this.files[0]) {
      const fileName = this.files[0].name;
      // Truncate filename if too long
      uploadButton.textContent = fileName.length > 8 ? 
        "Upload " + fileName.substring(0, 5) + "..." : 
        "Upload " + fileName;
    }
  });
  
  // Add event listener for upload button
  uploadButton.addEventListener("click", function() {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      
      reader.onload = function(e) {
        loadFieldImage(e.target.result);
      };
      
      reader.readAsDataURL(file);
    }
  });
  
  // Get the tools div and append the new elements
  const toolsDiv = document.getElementById("tools");
  
  // Add elements to the tools div
  toolsDiv.appendChild(fieldSelectLabel);
  toolsDiv.appendChild(fieldSelect);
  toolsDiv.appendChild(fileInput);
  toolsDiv.appendChild(uploadButton);
}

// Function to load a field image
function loadFieldImage(src) {
  backgroundLoaded = false;
  currentFieldImage = new Image();
  
  currentFieldImage.onload = function() {
    backgroundLoaded = true;
    redraw();
  };
  
  currentFieldImage.onerror = function() {
    console.error("Failed to load field image:", src);
    // Revert to default if loading fails
    currentFieldImage.src = "../assets/fields/push-back-skills.png";
  };
  
  currentFieldImage.src = src;
}

// Modify the redraw function to use the current field image
function updateRedrawFunction() {
  // This assumes your original redraw function is defined somewhere in the code
  // Here, we're just modifying how the background image is handled
  const originalRedraw = redraw;
  
  redraw = function() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw the background image
    if (backgroundLoaded || currentFieldImage.complete) {
      ctx.drawImage(currentFieldImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      backgroundLoaded = true;
      drawContent();
    } else {
      // If not loaded, wait for it to load
      currentFieldImage.onload = function() {
        backgroundLoaded = true;
        ctx.drawImage(currentFieldImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawContent();
      };
    }
    
    function drawContent() {
      // Draw the path first so it's behind the points
      if (mode === "linear") {
        drawLinearPath();
      }
      
      // Draw all points with heading indicators
      points.forEach((point, index) => {
        const heading = point.heading !== undefined ? point.heading : 0;
        const isHighlighted = index === selectedPointIndex;
        drawPoint(point.x, point.y, 5, point.color || "#bcd732", 1, heading, isHighlighted);
        
        // Draw point number label
        const { x, y } = vexToCanvas(point.x, point.y);
        ctx.font = "12px Roboto";
        ctx.fillStyle = "white";
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
        
        drawPoint(hoverPoint.x, hoverPoint.y, 5, "white", 0.5, heading);
      }
      
      // Draw headings text if needed
      if (points.length > 0 && points[0].heading !== undefined) {
        drawHeadingText();
      }
      
      // Update point list UI
      updatePointList();
    }
  };
}

// Initialize field selector and update redraw function
function initializeFieldSelector() {
  addFieldSelector();
  updateRedrawFunction();
  
  // Set initial state
  backgroundLoaded = false;
  loadFieldImage("../assets/fields/push-back-skills.png");
}

// Call this function when the page loads
window.addEventListener("DOMContentLoaded", initializeFieldSelector);

// Add keyboard event listener to the document
document.addEventListener("keydown", (event) => {
  // Only process if we have a selected point and Ctrl key is pressed
  if (selectedPointIndex !== null && selectedPointIndex !== undefined && event.ctrlKey) {
    if (event.key === "ArrowUp") {
      movePoint("up");
      event.preventDefault(); // Prevent page scrolling
    } 
    else if (event.key === "ArrowDown") {
      movePoint("down");
      event.preventDefault(); // Prevent page scrolling
    }
  }
});

// Add keyboard event listener to the document
document.addEventListener("keydown", (event) => {
  // Only process if we have a selected point
  if (selectedPointIndex !== null && selectedPointIndex !== undefined) {
    if (event.key === "ArrowUp") {
      movePoint("up");
      event.preventDefault();
    } 
    else if (event.key === "ArrowDown") {
      movePoint("down");
      event.preventDefault();
    }
  }
});

pointInfo.appendChild(document.createElement("hr"));
const reorderContainer = document.createElement("div");
reorderContainer.style.marginTop = "10px";
pointInfo.appendChild(reorderContainer);

// Code Generation

const generateCodeBtn = document.getElementById("generateBtn");
const delayInput = document.getElementById("delayInput");

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

redraw();