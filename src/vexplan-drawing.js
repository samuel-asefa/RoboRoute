// ============== VexPlan Drawing and Game Objects ===============
import { 
    VP_FIELD_SIZE, VP_ROBOT_SIZE, VP_MOBILE_GOAL_SIZE, VP_STAKE_RADIUS, 
    VP_LADDER_SIZE, VP_RING_OUTER_RADIUS, VP_RING_INNER_RADIUS 
} from './constants.js';
import { vpStakes, vpLadder, vpMobileGoals, vpRobots, vpSelectedRingTarget } from './vexplan-state.js';

export function vpDrawHexagon(ctx, x, y, size, fillStyle) {
    ctx.beginPath(); 
    const radius = size / 2;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + (Math.PI / 6);
        const px = x + radius * Math.cos(angle); 
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); 
        else ctx.lineTo(px, py);
    }
    ctx.closePath(); 
    ctx.fillStyle = fillStyle; 
    ctx.fill();
}

export function vpDrawRing(ctx, x, y, outerRadius, innerRadius, color) {
    ctx.beginPath(); 
    ctx.arc(x, y, outerRadius, 0, 2 * Math.PI);
    ctx.arc(x, y, innerRadius, 0, 2 * Math.PI, true);
    ctx.fillStyle = color; 
    ctx.fill('evenodd');
}

export function vpIsPointInHexagon(x, y, centerX, centerY, size) {
    const r = size / 2;
    const dX = Math.abs(x - centerX);
    const dY = Math.abs(y - centerY);
    if (dX > r || dY > r * Math.sqrt(3) / 2) return false;
    return (dY <= (r * Math.sqrt(3) / 2)) && (dX <= r / 2 + (r - dY * 2 / Math.sqrt(3)));
}

export function vpIsPointInDiamond(x, y, centerX, centerY, size) {
    return (Math.abs(x - centerX) + Math.abs(y - centerY)) <= (size / 2);
}

export function vpDrawGameObjects(ctx) {
    // Draw ladder
    const ladderGradient = ctx.createLinearGradient(vpLadder.x, vpLadder.y, vpLadder.x + vpLadder.width, vpLadder.y + vpLadder.height);
    ladderGradient.addColorStop(0, '#ff6b6b'); 
    ladderGradient.addColorStop(1, '#ff8787');
    ctx.strokeStyle = ladderGradient; 
    ctx.lineWidth = 4; 
    ctx.shadowBlur = 6; 
    ctx.shadowColor = 'rgba(255,107,107,0.4)';
    ctx.beginPath(); 
    ctx.moveTo(vpLadder.x + VP_LADDER_SIZE / 2, vpLadder.y);
    ctx.lineTo(vpLadder.x + VP_LADDER_SIZE, vpLadder.y + VP_LADDER_SIZE / 2);
    ctx.lineTo(vpLadder.x + VP_LADDER_SIZE / 2, vpLadder.y + VP_LADDER_SIZE);
    ctx.lineTo(vpLadder.x, vpLadder.y + VP_LADDER_SIZE / 2); 
    ctx.closePath(); 
    ctx.stroke(); 
    ctx.shadowBlur = 0;

    // Draw high stake
    ctx.fillStyle = vpLadder.highStake === vpSelectedRingTarget ? '#ffff99' : '#f1c40f';
    ctx.shadowBlur = 4; 
    ctx.shadowColor = 'rgba(241,196,15,0.5)'; 
    ctx.beginPath();
    ctx.arc(vpLadder.highStake.x, vpLadder.highStake.y, VP_STAKE_RADIUS, 0, 2 * Math.PI); 
    ctx.fill();
    vpLadder.highStake.ringColors.forEach((rc, i) => 
        vpDrawRing(ctx, vpLadder.highStake.x, vpLadder.highStake.y - (i + 1) * (VP_RING_OUTER_RADIUS * 2.2), VP_RING_OUTER_RADIUS, VP_RING_INNER_RADIUS, rc)
    );
    ctx.shadowBlur = 0;

    // Draw stakes
    vpStakes.forEach(stake => {
        ctx.fillStyle = stake === vpSelectedRingTarget ? '#999999' : stake.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `rgba(${stake.color === 'red' ? '255,0,0' : stake.color === 'blue' ? '0,0,255' : '0,0,0'},0.5)`;
        ctx.beginPath();
        ctx.arc(stake.x, stake.y, VP_STAKE_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        stake.ringColors.forEach((rc, i) => {
            const yOff = (stake.x === VP_FIELD_SIZE / 2 && stake.y === 0) ? 
                (i + 1) * (VP_RING_OUTER_RADIUS * 2.2) : 
                -(i + 1) * (VP_RING_OUTER_RADIUS * 2.2);
            vpDrawRing(ctx, stake.x, stake.y + yOff, VP_RING_OUTER_RADIUS, VP_RING_INNER_RADIUS, rc);
        });
        ctx.shadowBlur = 0;
    });

    // Draw mobile goals
    vpMobileGoals.forEach(mg => {
        const mgGrad = ctx.createLinearGradient(
            mg.x - VP_MOBILE_GOAL_SIZE / 2, mg.y - VP_MOBILE_GOAL_SIZE / 2,
            mg.x + VP_MOBILE_GOAL_SIZE / 2, mg.y + VP_MOBILE_GOAL_SIZE / 2
        );
        mgGrad.addColorStop(0, mg === vpSelectedRingTarget ? '#f39c12' : '#e67e22');
        mgGrad.addColorStop(1, mg === vpSelectedRingTarget ? '#e67e22' : '#d35400');
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(230,126,34,0.5)';
        vpDrawHexagon(ctx, mg.x, mg.y, VP_MOBILE_GOAL_SIZE, mgGrad);
        ctx.fillStyle = mg === vpSelectedRingTarget ? '#ffff99' : '#f1c40f';
        ctx.beginPath();
        ctx.arc(mg.x, mg.y, VP_STAKE_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        mg.ringColors.forEach((rc, i) => 
            vpDrawRing(ctx, mg.x, mg.y - (i + 1) * (VP_RING_OUTER_RADIUS * 2.2), VP_RING_OUTER_RADIUS, VP_RING_INNER_RADIUS, rc)
        );
        ctx.shadowBlur = 0;
    });

    // Draw robots
    vpRobots.forEach(robot => {
        const rGrad = ctx.createLinearGradient(robot.x, robot.y, robot.x + VP_ROBOT_SIZE, robot.y + VP_ROBOT_SIZE);
        rGrad.addColorStop(0, robot.color === 'red' ? '#e74c3c' : '#3498db');
        rGrad.addColorStop(1, robot.color === 'red' ? '#c0392b' : '#2980b9');
        ctx.fillStyle = rGrad; 
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${robot.color === 'red' ? '231,76,60' : '52,152,219'},0.5)`;
        ctx.fillRect(robot.x, robot.y, VP_ROBOT_SIZE, VP_ROBOT_SIZE);
        
        if (robot.teamNumber) {
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const tX = robot.x + VP_ROBOT_SIZE / 2;
            const tY = robot.y + VP_ROBOT_SIZE / 2;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(robot.teamNumber, tX, tY);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(robot.teamNumber, tX, tY);
        }
        
        if (robot.hanging) {
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            const rCX = robot.x + VP_ROBOT_SIZE / 2;
            const rCY = robot.y + VP_ROBOT_SIZE / 2;
            let hX, hY;
            if (robot.hanging === 'ladder') {
                hX = vpLadder.highStake.x;
                hY = vpLadder.highStake.y;
            } else if (robot.hanging.startsWith('stake')) {
                const sI = parseInt(robot.hanging.slice(5));
                hX = vpStakes[sI].x;
                hY = vpStakes[sI].y;
            }
            if (hX !== undefined) {
                ctx.moveTo(rCX, rCY);
                ctx.lineTo(hX, hY);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
    });
}