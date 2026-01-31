// Application State
// DOM Elements
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomInput');
const connectionStatus = document.getElementById('connectionStatus');
const brushTool = document.getElementById('brushTool');
const eraserTool = document.getElementById('eraserTool');
const colorPicker = document.getElementById('colorPicker');
const strokeWidthSlider = document.getElementById('strokeWidthSlider');
const widthDisplay = document.getElementById('widthDisplay');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const usersList = document.getElementById('usersList');
const cursorsLayer = document.getElementById('cursorsLayer');
const presetColors = document.querySelectorAll('.color-preset');

// Modal Elements
const roomModal = document.getElementById('roomModal');
const roomInputModal = document.getElementById('roomInputModal');
const nameInputModal = document.getElementById('nameInputModal');
const joinBtnModal = document.getElementById('joinBtnModal');
const createBtnModal = document.getElementById('createBtnModal');
const exitBtn = document.getElementById('exitBtn');
const activeRoomInfo = document.getElementById('activeRoomInfo');
const activeRoomName = document.getElementById('activeRoomName');
const toastContainer = document.getElementById('toastContainer');

// Application State
const state = {
  userId: `user-${Math.random().toString(36).substr(2, 9)}`,
  userName: null,
  roomId: null,
  userColor: getRandomColor(),
  currentStrokeId: null,
  tool: 'brush',
  color: colorPicker.value || '#3b82f6',
  strokeWidth: parseInt(strokeWidthSlider.value) || 4,
  isDrawing: false,
  remoteCursors: new Map(),
  undoStack: [],
  redoStack: [],
};

// Set default room ID
if (roomInputModal) {
  roomInputModal.value = '12';
}

// Initialize managers
// Classes are loaded from canvas.js and websocket.js
const canvasManager = new CanvasManager('canvas');
const wsManager = new WebSocketManager();

// Utility Functions
function getRandomColor() {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generateStrokeId() {
  return `stroke-${Date.now()}-${Math.random()}`;
}

function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.textContent = 'Online';
    connectionStatus.classList.remove('disconnected');
    connectionStatus.classList.add('connected');

    // Hide modal and show room info when connected
    roomModal.classList.add('hidden');
    activeRoomInfo.classList.remove('hidden');
    activeRoomName.textContent = state.roomId;
    showToast(`Joined room: ${state.roomId}`);
  } else {
    connectionStatus.textContent = 'Offline';
    connectionStatus.classList.remove('connected');
    connectionStatus.classList.add('disconnected');
    activeRoomInfo.classList.add('hidden');
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function generateRandomRoomId() {
  const words = ['creative', 'studio', 'collab', 'design', 'pixel', 'draft'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${word}-${num}`;
}

// Event Listeners

// Join Room Logic
function joinRoom(roomId, userName) {
  if (!userName) {
    showToast('Please enter your name', 'error');
    return;
  }
  if (!roomId) {
    showToast('Please enter a room ID', 'error');
    return;
  }
  state.roomId = roomId;
  state.userName = userName;
  state.undoStack = [];
  state.redoStack = [];
  wsManager.connect(roomId, state.userId, state.userColor, userName);
}

joinBtnModal.addEventListener('click', () => {
  joinRoom(roomInputModal.value.trim(), nameInputModal.value.trim());
});

createBtnModal.addEventListener('click', () => {
  const newId = generateRandomRoomId();
  roomInputModal.value = newId;
  joinRoom(newId, nameInputModal.value.trim());
});

roomInputModal.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    joinRoom(roomInputModal.value.trim(), nameInputModal.value.trim());
  }
});

nameInputModal.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    joinRoom(roomInputModal.value.trim(), nameInputModal.value.trim());
  }
});

// Exit Room Logic
exitBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to leave this room?')) {
    wsManager.disconnect();
    state.roomId = null;
    state.undoStack = [];
    state.redoStack = [];
    canvasManager.clear();

    // UI Cleanup
    activeRoomInfo.classList.add('hidden');
    roomModal.classList.remove('hidden');

    // Clear remote cursors
    state.remoteCursors.forEach(cursor => cursor.remove());
    state.remoteCursors.clear();

    showToast('You left the room', 'success');
  }
});

// Tool Selection
brushTool.addEventListener('click', () => {
  state.tool = 'brush';
  brushTool.classList.add('active');
  eraserTool.classList.remove('active');
  canvasManager.canvas.style.cursor = 'crosshair';
});

eraserTool.addEventListener('click', () => {
  state.tool = 'eraser';
  eraserTool.classList.add('active');
  brushTool.classList.remove('active');
  canvasManager.canvas.style.cursor = 'cell';
});

// Color Selection
colorPicker.addEventListener('input', (e) => {
  state.color = e.target.value;
  const display = document.getElementById('colorDisplay');
  if (display) display.textContent = e.target.value.toUpperCase();
});

presetColors.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.color = btn.dataset.color;
    colorPicker.value = state.color;
    const display = document.getElementById('colorDisplay');
    if (display) display.textContent = state.color.toUpperCase();
  });
});

// Stroke Width
strokeWidthSlider.addEventListener('input', (e) => {
  state.strokeWidth = parseInt(e.target.value);
  widthDisplay.textContent = `${state.strokeWidth}px`;
});

// Canvas Drawing
canvasManager.setOnMouseDown((x, y) => {
  if (!state.roomId) {
    showToast('Please join a room to start drawing', 'error');
    roomModal.classList.remove('hidden'); // Re-show modal if they tried to draw
    return;
  }

  state.isDrawing = true;
  state.currentStrokeId = generateStrokeId();

  const drawColor = state.tool === 'eraser' ? '#0f172a' : state.color;
  const drawWidth = state.tool === 'eraser' ? state.strokeWidth * 4 : state.strokeWidth;

  canvasManager.startStroke(
    state.currentStrokeId,
    x,
    y,
    drawColor,
    drawWidth
  );

  // Only sync if we have a room
  if (state.roomId) {
    wsManager.sendDrawStart(
      state.currentStrokeId,
      x,
      y,
      drawColor,
      drawWidth
    );
  }

  state.undoStack.push(state.currentStrokeId);
  state.redoStack = [];
});

canvasManager.setOnMouseMove((x, y) => {
  if (state.isDrawing && state.currentStrokeId) {
    canvasManager.addPoint(state.currentStrokeId, x, y);

    if (state.roomId) {
      wsManager.sendDrawMove(state.currentStrokeId, x, y);
    }
  }

  // Send cursor position only if in a room
  if (state.roomId) {
    wsManager.sendCursorMove(x, y);
  }
});

canvasManager.setOnMouseUp(() => {
  if (state.isDrawing && state.currentStrokeId) {
    canvasManager.endStroke(state.currentStrokeId);
    wsManager.sendDrawEnd(state.currentStrokeId);
    state.isDrawing = false;
    state.currentStrokeId = null;
  }
});

canvasManager.setOnMouseLeave(() => {
  if (state.isDrawing && state.currentStrokeId) {
    canvasManager.endStroke(state.currentStrokeId);
    wsManager.sendDrawEnd(state.currentStrokeId);
    state.isDrawing = false;
    state.currentStrokeId = null;
  }
});

// Undo/Redo
undoBtn.addEventListener('click', () => {
  // Global Undo: Request the server to undo the latest stroke
  console.log('Requesting global undo');
  wsManager.sendUndo();
});

redoBtn.addEventListener('click', () => {
  // Global Redo: Request the server to redo the latest undone stroke
  console.log('Requesting global redo');
  wsManager.sendRedo();
});

// Clear Canvas
clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear the canvas?')) {
    canvasManager.clear();
    state.undoStack = [];
    state.redoStack = [];
    wsManager.sendClearCanvas();
  }
});

// WebSocket Events

wsManager.on('connected', () => {
  updateConnectionStatus(true);
});

wsManager.on('disconnected', () => {
  updateConnectionStatus(false);
});

wsManager.on('CANVAS_STATE', (message) => {
  canvasManager.loadState(message.strokes);
  updateUsersList(message.users);
});

wsManager.on('DRAW_START', (message) => {
  const { stroke } = message;
  canvasManager.startStroke(
    stroke.id,
    stroke.startX,
    stroke.startY,
    stroke.color,
    stroke.width
  );
});

wsManager.on('DRAW_MOVE', (message) => {
  canvasManager.addPoint(message.strokeId, message.x, message.y);
});

wsManager.on('DRAW_END', (message) => {
  canvasManager.endStroke(message.strokeId);
});

wsManager.on('UNDO', (message) => {
  if (message.strokeId) {
    canvasManager.removeStroke(message.strokeId);
    canvasManager.redraw();
  }
});

wsManager.on('REDO', (message) => {
  console.log('Received REDO message from server', message);
  if (message.stroke) {
    canvasManager.strokes.set(message.stroke.id, message.stroke);
    canvasManager.redraw();
    console.log(`Redrawn stroke: ${message.stroke.id}`);
  } else {
    console.log('REDO failed on server or returned no stroke');
  }
});

wsManager.on('CLEAR_CANVAS', () => {
  canvasManager.clear();
});

wsManager.on('USER_JOINED', (message) => {
  updateUsersList(message.users);
  if (message.userId !== state.userId) {
    showToast(`${message.userName || 'Someone'} joined!`);
  }
});

wsManager.on('USER_LEFT', (message) => {
  updateUsersList(message.users);
  const cursor = state.remoteCursors.get(message.userId);
  if (cursor) {
    cursor.remove();
    state.remoteCursors.delete(message.userId);
  }
});

wsManager.on('CURSOR_MOVE', (message) => {
  updateRemoteCursor(message.userId, message.x, message.y, message.userColor, message.userName);
});

// Helper Functions

function updateUsersList(users) {
  usersList.innerHTML = '';
  users.forEach((user) => {
    const userItem = document.createElement('div');
    userItem.className = 'user-item';

    let name = user.userName || user.userId.substr(0, 8);
    if (user.userId === state.userId) {
      name = `${name} (You)`;
    }

    userItem.innerHTML = `
      <div class="user-color" style="background-color: ${user.userColor}"></div>
      <span>${name}</span>
    `;
    usersList.appendChild(userItem);
  });
}

function updateRemoteCursor(userId, x, y, color, userName) {
  let cursor = state.remoteCursors.get(userId);
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.className = 'remote-cursor';
    cursor.style.color = color;
    const displayName = userName || userId.substr(0, 8);
    cursor.innerHTML = `
      <div class="remote-cursor-pointer"></div>
      <div class="remote-cursor-label">${displayName}</div>
    `;
    cursorsLayer.appendChild(cursor);
    state.remoteCursors.set(userId, cursor);
  }

  const rect = canvasManager.canvas.getBoundingClientRect();
  const scaleX = rect.width / canvasManager.canvas.width;
  const scaleY = rect.height / canvasManager.canvas.height;

  cursor.style.left = `${x * scaleX}px`;
  cursor.style.top = `${y * scaleY}px`;

  // Hide cursor after 2 seconds of inactivity
  clearTimeout(cursor.hideTimeout);
  cursor.style.opacity = '1';
  cursor.hideTimeout = setTimeout(() => {
    cursor.style.opacity = '0.3';
  }, 2000);
}

// Initialize
console.log('%c🎨 Canvas Collab Initialized!', 'color: #3b82f6; font-size: 20px; font-weight: bold;');
console.log(`User ID: ${state.userId}`);
console.log(`User Color: ${state.userColor}`);
updateConnectionStatus(false);
