// Test script to run main.js in a mocked browser environment and verify drawing functionality
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("Starting mocked drawing test...");

// Load file
const mainJsCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

// Mock DOM structure and canvas context
const mockCanvasContext = {
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    strokeRect: () => {},
    fillRect: () => {},
    arc: () => {},
    fill: () => {},
    translate: () => {},
    scale: () => {},
    setLineDash: () => {},
    drawImage: () => {},
    lineCap: 'butt',
    lineJoin: 'miter',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalCompositeOperation: 'source-over',
};

const listeners = {};
const mockElements = {
    'pathCanvas': {
        getContext: () => mockCanvasContext,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 800 }),
        addEventListener: (name, cb) => { listeners['canvas_' + name] = cb; },
        style: {}
    },
    'drawing-canvas': {
        getContext: () => mockCanvasContext,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 800 }),
        addEventListener: (name, cb) => { listeners['drawing_' + name] = cb; },
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            toggle: () => {}
        },
        width: 800,
        height: 800
    },
    'toggle-drawing': {
        addEventListener: (name, cb) => { listeners['toggle_' + name] = cb; },
        classList: { toggle: () => {}, remove: () => {} },
        textContent: ''
    },
    'drawing-shape': {
        addEventListener: (name, cb) => { listeners['shape_' + name] = cb; },
        value: 'normal'
    },
    'drawing-color-palette': {
        innerHTML: '',
        appendChild: () => {}
    },
    'brushSizeChip': { addEventListener: () => {} },
    'brushSizeVal': { style: {} },
    'brushSizeInput': { addEventListener: () => {} },
    'erase-tool': { addEventListener: () => {}, classList: { toggle: () => {}, remove: () => {} } },
    'toggle-sketches-visibility': { addEventListener: () => {}, classList: { toggle: () => {} } },
    'clear-drawing': { addEventListener: () => {} },
    'fieldSelect': { addEventListener: () => {} },
    'customFieldInput': { addEventListener: () => {} },
    'uploadFieldBtn': { addEventListener: () => {} }
};

// Create a sandbox
const sandbox = {
    console: console,
    document: {
        getElementById: (id) => mockElements[id] || { addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } },
        addEventListener: (name, cb) => { listeners['document_' + name] = cb; },
        createElement: (tag) => ({
            style: {},
            classList: { add: () => {}, remove: () => {}, toggle: () => {} },
            addEventListener: () => {}
        })
    },
    window: {
        addEventListener: (name, cb) => { listeners['window_' + name] = cb; }
    },
    Image: function() {
        return { onload: () => {}, onerror: () => {} };
    },
    requestAnimationFrame: () => {},
    confirm: () => true,
    Date: Date,
    Math: Math
};

// Run main.js script in VM
try {
    vm.createContext(sandbox);
    // Execute DOMContentLoaded
    vm.runInContext(mainJsCode, sandbox);
    console.log("Successfully ran main.js setup!");
    
    // Simulate DOMContentLoaded trigger
    if (listeners['window_DOMContentLoaded']) {
        listeners['window_DOMContentLoaded']();
        console.log("Triggered DOMContentLoaded successfully!");
    } else {
        console.error("DOMContentLoaded listener not found!");
    }
    
    // Check initial state
    console.log("Initial drawingModeActive:", sandbox.drawingModeActive);
    console.log("Initial drawingShape:", sandbox.drawingShape);
    
    // Toggle Drawing Active
    if (listeners['toggle_click']) {
        listeners['toggle_click'].call(mockElements['toggle-drawing']);
        console.log("Toggled sketchpad. drawingModeActive is now:", sandbox.drawingModeActive);
    } else {
        console.error("Toggle click listener not found!");
    }
    
    // Simulate Mouse Down in normal/freehand mode
    if (listeners['drawing_mousedown']) {
        const mouseDownEvent = { clientX: 100, clientY: 100 };
        listeners['drawing_mousedown'](mouseDownEvent);
        console.log("Triggered mousedown. isDrawing:", sandbox.isDrawing, "dragMode:", sandbox.dragMode);
        console.log("Objects count:", sandbox.drawingObjects.length);
        if (sandbox.drawingObjects.length > 0) {
            console.log("First object details:", JSON.stringify(sandbox.drawingObjects[0]));
        }
    } else {
        console.error("Mousedown listener not found!");
    }
    
    // Simulate Mouse Move
    if (listeners['drawing_mousemove']) {
        const mouseMoveEvent = { clientX: 110, clientY: 120 };
        listeners['drawing_mousemove'](mouseMoveEvent);
        console.log("Triggered mousemove. Points count:", sandbox.drawingObjects[0].points.length);
    } else {
        console.error("Mousemove listener not found!");
    }
    
    // Simulate Mouse Up
    if (listeners['drawing_mouseup']) {
        const mouseUpEvent = { clientX: 120, clientY: 130 };
        listeners['drawing_mouseup'](mouseUpEvent);
        console.log("Triggered mouseup. isDrawing:", sandbox.isDrawing, "dragMode:", sandbox.dragMode);
        console.log("Final object bounds:", JSON.stringify(sandbox.drawingObjects[0]));
    } else {
        console.error("Mouseup listener not found!");
    }
    
} catch (e) {
    console.error("VM execution crashed with error:", e);
}
