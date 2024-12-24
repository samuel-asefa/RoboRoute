// Select DOM elements
const canvas = document.getElementById("field");
const ctx = canvas.getContext("2d");
const codeInput = document.getElementById("codeInput");
const runButton = document.getElementById("runButton");
const routeButton = document.getElementById("routeButton");
const speedInput = document.getElementById("speedInput");
const resetXInput = document.getElementById("resetXInput");
const resetYInput = document.getElementById("resetYInput");
const resetAngleInput = document.getElementById("resetAngleInput");
const setResetButton = document.getElementById("setResetButton");
const setRobotSizeButton = document.getElementById("setRobotSizeButton");
const robotWidthInput = document.getElementById("robotWidthInput");
const robotHeightInput = document.getElementById("robotHeightInput");
const timerDisplay = document.getElementById("timerDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const faqButton = document.getElementById("faqButton");
const faqPopup = document.getElementById("faqPopup");
const closeFaqButton = document.getElementById("closeFaqButton");

// Variables for robot state
let robot = {
  x: 300,
  y: 300,
  angle: 0,
  width: 40,
  height: 40,
  resetX: 300,
  resetY: 300,
  resetAngle: 0,
  score: 0,
};

let speed = 100; // Pixels Per Second
let timer = 0.1; // Start timer at 0.1 seconds - Offsets Error
let animationRunning = false;

// Load Field and Robot Image
const fieldImage = new Image();
fieldImage.src = "field.png";

const robotImage = new Image();
robotImage.src = "robot.png";

// Render canvas
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(fieldImage, 0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(robot.x, robot.y);
  ctx.rotate((robot.angle * Math.PI) / 180);
  ctx.drawImage(
    robotImage,
    -robot.width / 2,
    -robot.height / 2,
    robot.width,
    robot.height
  );
  ctx.restore();
}

// Execute a single command
function executeCommand(command) {
  return new Promise((resolve) => {
    let [action, value] = command.split(" ");
    value = parseFloat(value);
    const duration = Math.abs(value / speed) * 1000; // Animation duration

    if (action === "move" || action === "back") {
      const direction = action === "move" ? 1 : -1;
      const deltaX = Math.cos((robot.angle * Math.PI) / 180) * value * direction;
      const deltaY = Math.sin((robot.angle * Math.PI) / 180) * value * direction;

      let startX = robot.x;
      let startY = robot.y;
      const startTime = performance.now();

      function animateMove(timestamp) {
        const elapsedTime = timestamp - startTime;
        const fraction = Math.min(elapsedTime / duration, 1);
        robot.x = startX + deltaX * fraction;
        robot.y = startY + deltaY * fraction;
        render();

        if (fraction < 1) {
          requestAnimationFrame(animateMove);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(animateMove);
    } else if (action === "turn") {
      const startAngle = robot.angle;
      const deltaAngle = value;
      const startTime = performance.now();

      function animateTurn(timestamp) {
        const elapsedTime = timestamp - startTime;
        const fraction = Math.min(elapsedTime / duration, 1);
        robot.angle = startAngle + deltaAngle * fraction;
        render();

        if (fraction < 1) {
          requestAnimationFrame(animateTurn);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(animateTurn);
    } else if (action === "score") {
      robot.score += 3; // Example scoring logic
      scoreDisplay.textContent = `Score: ${robot.score}`;
      resolve();
    } else {
      resolve();
    }
  });
}

// Execute code input
async function executeCode() {
  const commands = codeInput.value.split("\n").map((cmd) => cmd.trim());
  animationRunning = true;
  timer = 0.1; // Reset timer
  timerDisplay.textContent = `Time: ${timer.toFixed(1)}s`;

  const interval = setInterval(() => {
    if (animationRunning) {
      timer += 0.1;
      timerDisplay.textContent = `Time: ${timer.toFixed(1)}s`;
    } else {
      clearInterval(interval);
    }
  }, 100);

  for (const command of commands) {
    await executeCommand(command);
  }

  animationRunning = false;
}

// Reset robot position and angle
function resetRobot() {
  robot.x = robot.resetX;
  robot.y = robot.resetY;
  robot.angle = robot.resetAngle;
  robot.score = 0;
  timer = 0.1;
  timerDisplay.textContent = `Time: ${timer.toFixed(1)}s`;
  scoreDisplay.textContent = `Score: ${robot.score}`;
  render();
}

// Set reset position
setResetButton.addEventListener("click", () => {
  robot.resetX = parseFloat(resetXInput.value);
  robot.resetY = parseFloat(resetYInput.value);
  robot.resetAngle = parseFloat(resetAngleInput.value);
  resetRobot();
});

// Set robot size
setRobotSizeButton.addEventListener("click", () => {
  robot.width = parseFloat(robotWidthInput.value);
  robot.height = parseFloat(robotHeightInput.value);
  render();
});

// Add event listeners
runButton.addEventListener("click", () => executeCode());
routeButton.addEventListener("click", () => {
  alert("Route visualization not implemented yet.");
});
faqButton.addEventListener("click", () => {
  faqPopup.style.display = "block";
});
closeFaqButton.addEventListener("click", () => {
  faqPopup.style.display = "none";
});

// Render initial setup
fieldImage.onload = render;