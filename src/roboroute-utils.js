// ============== RoboRoute Utility Functions ===============
import { RR_CANVAS_WIDTH, RR_CANVAS_HEIGHT, RR_VEX_MIN, RR_VEX_MAX } from './constants.js';

export function rrVexToCanvas(x, y) {
    const scaleX = RR_CANVAS_WIDTH / (RR_VEX_MAX - RR_VEX_MIN);
    const scaleY = RR_CANVAS_HEIGHT / (RR_VEX_MAX - RR_VEX_MIN);
    return {
        x: (x - RR_VEX_MIN) * scaleX,
        y: (RR_VEX_MAX - y) * scaleY  // Y is inverted
    };
}

export function rrCanvasToVex(x, y) {
    const scaleX = (RR_VEX_MAX - RR_VEX_MIN) / RR_CANVAS_WIDTH;
    const scaleY = (RR_VEX_MAX - RR_VEX_MIN) / RR_CANVAS_HEIGHT;
    return {
        x: RR_VEX_MIN + x * scaleX,
        y: RR_VEX_MAX - y * scaleY // Y is inverted
    };
}

export function rrDistToSegment(p, v, w) { // p, v, w are in Vex coords
    const l2_sq = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2_sq === 0) return { distance: Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2), point: v, t: 0 };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2_sq;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    const distance = Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
    return { distance, point: projection, segment: [v, w], t };
}

export function rrGenerateCode(points, delayValue) {
    if (points.length < 1) { 
        alert("No path points to generate code from."); 
        return; 
    }
    
    const formattedPoints = points.map(p => ({
        x: parseFloat(p.x).toFixed(2), 
        y: parseFloat(p.y).toFixed(2),
        heading: p.heading !== undefined ? parseFloat(p.heading).toFixed(1) : 0
    }));
    
    let code = `chassis.setPose(${formattedPoints[0].x}, ${formattedPoints[0].y}, ${formattedPoints[0].heading});\n`;
    for (let i = 1; i < formattedPoints.length; i++) {
        code += `chassis.moveToPose(${formattedPoints[i].x}, ${formattedPoints[i].y}, ${formattedPoints[i].heading}, ${delayValue || 1000});\n`;
    }
    
    console.log(code); 
    alert("Generated Path Code:\n\n" + code);
}