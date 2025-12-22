// ============== RoboRoute Drawing Functions ===============
import { rrVexToCanvas } from './roboroute-utils.js';

export function rrDrawPoint(ctx, vexX, vexY, radius = 5, color = 'black', alpha = 1, heading = null, isHighlighted = false) {
    const { x, y } = rrVexToCanvas(vexX, vexY);
    
    if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fill();
    }
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    
    if (heading !== null && heading !== undefined) {
        const radians = (90 - heading) * (Math.PI / 180); // Convert heading where 0 is North/Up
        const lineLength = radius * 2; 
        const endX = x + Math.cos(radians) * lineLength;
        const endY = y - Math.sin(radians) * lineLength; // Subtract sin because canvas Y is down
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#2f2f2e'; // Darker line for heading
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
}

export function rrDrawLinearPath(ctx, points) {
    if (points.length < 2) return;
    
    ctx.beginPath();
    const start = rrVexToCanvas(points[0].x, points[0].y);
    ctx.moveTo(start.x, start.y);
    
    for (let i = 1; i < points.length; i++) {
        const { x, y } = rrVexToCanvas(points[i].x, points[i].y);
        ctx.lineTo(x, y);
    }
    
    ctx.strokeStyle = "#bcd732"; // RoboRoute path color
    ctx.lineWidth = 2;
    ctx.stroke();
}