// ============== RoboRoute State Management ===============

// State variables
export let rrPoints = [];
export let rrHistory = { past: [], future: [] };
export let rrMode = "linear";
export let rrSelectedPoint = null;
export let rrSelectedPointIndex = null;
export let rrDeleteMode = false;
export let rrInsertMode = false;
export let rrTrimMode = false;
export let rrIsDraggingPoint = false;
export let rrHoverPoint = null;

// Zoom and Pan (optional)
export let rrScale = 1.0;
export let rrOffsetX = 0;
export let rrOffsetY = 0;

// Background image state
export let rrCurrentFieldImage = new Image();
export let rrBackgroundLoaded = false;

// State mutation functions
export function setRrPoints(points) {
    rrPoints = points;
}

export function setRrSelectedPoint(point) {
    rrSelectedPoint = point;
}

export function setRrSelectedPointIndex(index) {
    rrSelectedPointIndex = index;
}

export function setRrDeleteMode(mode) {
    rrDeleteMode = mode;
}

export function setRrInsertMode(mode) {
    rrInsertMode = mode;
}

export function setRrTrimMode(mode) {
    rrTrimMode = mode;
}

export function setRrIsDraggingPoint(dragging) {
    rrIsDraggingPoint = dragging;
}

export function setRrHoverPoint(point) {
    rrHoverPoint = point;
}

export function setRrBackgroundLoaded(loaded) {
    rrBackgroundLoaded = loaded;
}

// History management
export function rrSaveState() {
    const currentState = JSON.parse(JSON.stringify(rrPoints));
    rrHistory.past.push(currentState);
    rrHistory.future = [];
}

export function rrUndo() {
    if (rrHistory.past.length === 0) return;
    rrHistory.future.push(JSON.parse(JSON.stringify(rrPoints)));
    rrPoints = rrHistory.past.pop();
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    return true; // Indicates state changed
}

export function rrRedo() {
    if (rrHistory.future.length === 0) return;
    rrHistory.past.push(JSON.parse(JSON.stringify(rrPoints)));
    rrPoints = rrHistory.future.pop();
    rrSelectedPoint = null;
    rrSelectedPointIndex = null;
    return true; // Indicates state changed
}