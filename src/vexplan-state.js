// ============== VexPlan Game State ===============
import { VP_FIELD_SIZE, VP_LADDER_SIZE, scaleVpCoord } from './constants.js';

// Drawing state
export let vpDrawingModeActive = false;
export let vpIsDrawing = false;
export let vpIsErasing = false;
export let vpDrawingStartX = 0, vpDrawingStartY = 0;
export let vpDrawingCurrentX = 0, vpDrawingCurrentY = 0;
export let vpDrawingColor = 'black';
export let vpDrawingSize = 2;
export let vpDrawingShape = 'normal';

// Game objects
export const vpRobots = [
    { id: 'r1', x: scaleVpCoord(30), y: scaleVpCoord(30), color: 'red', alliance: 'red', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'r2', x: scaleVpCoord(30), y: scaleVpCoord(720 - 120), color: 'red', alliance: 'red', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'b1', x: scaleVpCoord(720 - 120), y: scaleVpCoord(30), color: 'blue', alliance: 'blue', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" },
    { id: 'b2', x: scaleVpCoord(720 - 120), y: scaleVpCoord(720 - 120), color: 'blue', alliance: 'blue', dragging: false, climbLevel: 0, hanging: null, teamNumber: "" }
];

export const vpMobileGoals = [
    { id: 'mg1', x: scaleVpCoord(480), y: scaleVpCoord(235), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg2', x: scaleVpCoord(360), y: scaleVpCoord(595), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg3', x: scaleVpCoord(240), y: scaleVpCoord(235), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg4', x: scaleVpCoord(480), y: scaleVpCoord(475), maxRings: 6, ringColors: [], dragging: false },
    { id: 'mg5', x: scaleVpCoord(240), y: scaleVpCoord(475), maxRings: 6, ringColors: [], dragging: false }
];

export const vpStakes = [
    { id: 's_red', x: 0, y: VP_FIELD_SIZE / 2, color: 'red', maxRings: 2, ringColors: [] },
    { id: 's_blue', x: VP_FIELD_SIZE, y: VP_FIELD_SIZE / 2, color: 'blue', maxRings: 2, ringColors: [] },
    { id: 's_neut_top', x: VP_FIELD_SIZE / 2, y: 0, color: 'black', maxRings: 6, ringColors: [] },
    { id: 's_neut_bot', x: VP_FIELD_SIZE / 2, y: VP_FIELD_SIZE, color: 'black', maxRings: 6, ringColors: [] }
];

export const vpLadder = {
    x: VP_FIELD_SIZE / 2 - VP_LADDER_SIZE / 2,
    y: VP_FIELD_SIZE / 2 - VP_LADDER_SIZE / 2,
    width: VP_LADDER_SIZE,
    height: VP_LADDER_SIZE,
    highStake: { id: 's_high', x: VP_FIELD_SIZE / 2, y: VP_FIELD_SIZE / 2, color: 'yellow', maxRings: 1, ringColors: [] }
};

export let vpSelectedObject = null; // For dragging VexPlan robots/goals
export let vpSelectedRingTarget = null; // For adding rings to VexPlan stakes/goals

// State setters
export function setVpDrawingModeActive(active) {
    vpDrawingModeActive = active;
}

export function setVpIsDrawing(drawing) {
    vpIsDrawing = drawing;
}

export function setVpIsErasing(erasing) {
    vpIsErasing = erasing;
}

export function setVpDrawingStart(x, y) {
    vpDrawingStartX = x;
    vpDrawingStartY = y;
}

export function setVpDrawingCurrent(x, y) {
    vpDrawingCurrentX = x;
    vpDrawingCurrentY = y;
}

export function setVpDrawingColor(color) {
    vpDrawingColor = color;
}

export function setVpDrawingSize(size) {
    vpDrawingSize = size;
}

export function setVpDrawingShape(shape) {
    vpDrawingShape = shape;
}

export function setVpSelectedObject(obj) {
    vpSelectedObject = obj;
}

export function setVpSelectedRingTarget(target) {
    vpSelectedRingTarget = target;
}