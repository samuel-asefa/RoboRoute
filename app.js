// Select DOM elements
const canvas = document.getElementById("field");
const ctx = canvas.getContext("2d");
const codeInput = document.getElementById("codeInput");
const runButton = document.getElementById("runButton");
const routeButton = document.getElementById("routeButton");
const speedInput = document.getElementById("speedInput");
const turnSpeedInput = document.getElementById("turnSpeedInput");
const resetXInput = document.getElementById("resetXInput");
const resetYInput = document.getElementById("resetYInput");
const resetAngleInput = document.getElementById("resetAngleInput");
const setResetButton = document.getElementById("setResetButton");
const setRobotSizeButton = document.getElementById("setRobotSizeButton");
const robotWidthInput = document.getElementById("robotWidthInput");
const robotHeightInput = document.getElementById("robotHeightInput");
const timerDisplay = document.getElementById("timerDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const robotImageInput = document.getElementById("robotImageInput");
const uploadRobotImageButton = document.getElementById("uploadRobotImageButton");

// Popup Consts
const faqButton = document.getElementById("faqButton");
const faqPopup = document.getElementById("faqPopup");
const closeFaqButton = document.getElementById("closeFaqButton");
const speedButton = document.getElementById("robotSpeedButton");
const speedPopup = document.getElementById("speedPopup");
const closeSpeedButton = document.getElementById("closeSpeedButton");
const robotSizeButton = document.getElementById("robotSizeButton");
const sizePopup = document.getElementById("sizePopup");
const closeSizeButton = document.getElementById("closeSizeButton");
const initialPositionButton = document.getElementById("initialPositionButton");
const initialPositionPopup = document.getElementById("initialPositionPopup");
const closeInitialPositionButton = document.getElementById("closeInitialPositionButton");

// Variables for robot state
let robot = {
  x: 40,
  y: 460,
  angle: 0,
  width: 40,
  height: 40,
  resetX: 40,
  resetY: 460,
  resetAngle: 0,
  score: 0,
};

let speed = 100; // Pixels per second
let turnSpeed = 90; // Degrees per second
let timer = 0.1; // Start timer at 0.1 seconds
let animationRunning = false;

// Load field and robot images
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
    let duration;

    if (action === "move" || action === "back") {
      const direction = action === "move" ? 1 : -1;
      const deltaX = Math.cos((robot.angle * Math.PI) / 180) * value * direction;
      const deltaY = Math.sin((robot.angle * Math.PI) / 180) * value * direction;
      duration = Math.abs(value / speed) * 1000;

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
      duration = Math.abs(value / turnSpeed) * 1000;

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
      if (!isNaN(value)) {
        robot.score += value;
      } else {
        console.error("Invalid value for score command");
      }
      scoreDisplay.textContent = `Score: ${robot.score}`;
      resolve();
    } else {
      resolve();
    }
  });
}

// Execute code input
async function executeCode() {
  resetRobot();
  const commands = codeInput.value.split("\n").map((cmd) => cmd.trim());
  animationRunning = true;
  timer = 0.1;
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

// Update speed and turn speed
speedInput.addEventListener("change", () => {
  speed = parseFloat(speedInput.value);
});

turnSpeedInput.addEventListener("change", () => {
  turnSpeed = parseFloat(turnSpeedInput.value);
});

// Robot Image Upload
uploadRobotImageButton.addEventListener("click", () => {
  resetRobot();
});

robotImageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      robotImage.src = e.target.result;
      render();
    };
    reader.readAsDataURL(file);
  }
});

// Add event listeners
runButton.addEventListener("click", () => executeCode());
routeButton.addEventListener("click", () => {
  alert("Route visualization not implemented yet.");
});

// FAQ Popup
faqButton.addEventListener("click", () => {
  faqPopup.style.display = "block";
});
closeFaqButton.addEventListener("click", () => {
  faqPopup.style.display = "none";
});

// Speed Popup
speedButton.addEventListener("click", () => {
  speedPopup.style.display = "block";
});
closeSpeedButton.addEventListener("click", () => {
  speedPopup.style.display = "none";
});

// Size Popup
robotSizeButton.addEventListener("click", () => {
  sizePopup.style.display = "block";
});
closeSizeButton.addEventListener("click", () => {
  sizePopup.style.display = "none";
});

// Initial Position Popup
initialPositionButton.addEventListener("click", () => {
  initialPositionPopup.style.display = "block";
});
closeInitialPositionButton.addEventListener("click", () => {
  initialPositionPopup.style.display = "none";
});

// Render initial setup
fieldImage.onload = render;
