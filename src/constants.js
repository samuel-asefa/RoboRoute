// ============== RoboRoute v3.0 — Constants ===============

export const RR_CANVAS_WIDTH = 800;
export const RR_CANVAS_HEIGHT = 800;
export const RR_VEX_MIN = -72; // inches
export const RR_VEX_MAX = 72;  // inches
export const DEFAULT_FIELD_IMAGE = "../assets/fields/push-back-matches.png";

export const PRESET_FIELDS = [
    { value: "../assets/fields/push-back-matches.png",   text: "Push Back — Match" },
    { value: "../assets/fields/push-back-skills.png",    text: "Push Back — Skills" },
    { value: "../assets/fields/high-stakes-matches.png", text: "High Stakes — Match" },
    { value: "../assets/fields/high-stakes-skills.png",  text: "High Stakes — Skills" },
    { value: "../assets/fields/over-under-matches.png",  text: "Over Under — Match" },
    { value: "../assets/fields/over-under-skills.png",   text: "Over Under — Skills" },
    { value: "../assets/fields/empty-field.png",         text: "Empty Field" },
    { value: "custom",                                   text: "Custom Upload…" },
];