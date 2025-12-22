// ============== Global Constants and Configuration ===============

// RoboRoute Constants
export const RR_CANVAS_WIDTH = 800;
export const RR_CANVAS_HEIGHT = 800;
export const RR_VEX_MIN = -72; // Inches
export const RR_VEX_MAX = 72;  // Inches
export const DEFAULT_FIELD_IMAGE = "../assets/fields/high-stakes-matches.png";

// VexPlan Constants
export const VP_FIELD_SIZE = 800; // Match RoboRoute's canvas size
export const VP_ROBOT_SIZE = Math.round(90 * (VP_FIELD_SIZE / 720));
export const VP_MOBILE_GOAL_SIZE = Math.round(50 * (VP_FIELD_SIZE / 720));
export const VP_STAKE_RADIUS = Math.round(9 * (VP_FIELD_SIZE / 720));
export const VP_LADDER_SIZE = Math.round(240 * (VP_FIELD_SIZE / 720));
export const VP_CORNER_SIZE = Math.round(60 * (VP_FIELD_SIZE / 720));
export const VP_RING_OUTER_RADIUS = Math.round(7 * (VP_FIELD_SIZE / 720));
export const VP_RING_INNER_RADIUS = Math.round(4 * (VP_FIELD_SIZE / 720));

// Field Presets
export const PRESET_FIELDS = [
    { value: "../assets/fields/high-stakes-matches.png", text: "High Stakes (Matches)" },
    { value: "../assets/fields/high-stakes-skills.png", text: "High Stakes (Skills)" },
    { value: "../assets/fields/push-back-skills.png", text: "Push Back (Skills)" },
    { value: "../assets/fields/over-under-matches.png", text: "Over Under (Matches)" },
    { value: "../assets/fields/over-under-skills.png", text: "Over Under (Skills)" },
    { value: "../assets/fields/empty-field.png", text: "Empty Field" },
    { value: "custom", text: "Custom Field" }
];

// Utility to scale VexPlan's original 720-based coordinates to new FIELD_SIZE
export function scaleVpCoord(coord) {
    return Math.round(coord * (VP_FIELD_SIZE / 720));
}