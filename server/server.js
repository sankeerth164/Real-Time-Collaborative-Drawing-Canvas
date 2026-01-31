const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const RoomManager = require('./rooms');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const roomManager = new RoomManager();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// WebSocket connection handler
wss.on('connection', (ws) => {
  let userId = null;
  let roomId = null;
  let userColor = null;
  let userName = null;

  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'JOIN_ROOM':
          userId = message.userId;
          roomId = message.roomId;
          userColor = message.userColor;
          userName = message.userName || userId.substr(0, 8);

          const room = roomManager.getOrCreateRoom(roomId);
          room.addUser(userId, ws, userColor, userName);

          // Send current canvas state to new user
          ws.send(JSON.stringify({
            type: 'CANVAS_STATE',
            strokes: room.drawingState.getStrokes(),
            users: room.getUsers(),
          }));

          // Broadcast user joined
          room.broadcast({
            type: 'USER_JOINED',
            userId,
            userName,
            userColor,
            users: room.getUsers(),
          });

          break;

        case 'DRAW_START':
          if (roomId) {
            const room = roomManager.getRoom(roomId);
            if (room) {
              const stroke = {
                id: message.strokeId,
                userId,
                userColor,
                startX: message.x,
                startY: message.y,
                points: [[message.x, message.y]],
                color: message.color,
                width: message.width,
                timestamp: Date.now(),
              };
              room.drawingState.addStroke(stroke);
              room.broadcastExcept(userId, {
                type: 'DRAW_START',
                stroke,
              });
            }
          }
          break;

        case 'DRAW_MOVE':
          if (roomId) {
            const room = roomManager.getRoom(roomId);
            if (room) {
              room.drawingState.addPoint(message.strokeId, message.x, message.y);
              room.broadcastExcept(userId, {
                type: 'DRAW_MOVE',
                strokeId: message.strokeId,
                x: message.x,
                y: message.y,
              });
            }
          }
          break;

        case 'DRAW_END':
          if (roomId) {
            const room = roomManager.getRoom(roomId);
            if (room) {
              room.drawingState.finishStroke(message.strokeId);
              room.broadcastExcept(userId, {
                type: 'DRAW_END',
                strokeId: message.strokeId,
              });
            }
          }
          break;

        case 'UNDO':
          if (roomId) {
            const room = roomManager.getRoom(roomId);
            if (room) {
              const undoneStroke = room.drawingState.undo(userId);
              room.broadcast({
                type: 'UNDO',
                strokeId: undoneStroke ? undoneStroke.id : null,
                userId,
              });
            }
          }
          break;

        case 'REDO':
          if (roomId) {
            const room = roomManager.getRoom(roomId);
            if (room) {
              const redoneStroke = room.drawingState.redo(userId);
              room.broadcast({
                type: 'REDO',
                stroke: redoneStroke,
                userId,
              });
            }
          }
          break;

        case 'CURSOR_MOVE':
          if (roomId) {
            const room = roomManager.getRoom(roomId);
            if (room) {
              room.broadcastExcept(userId, {
                type: 'CURSOR_MOVE',
                userId,
                userName,
                x: message.x,
                y: message.y,
                userColor,
              });
            }
          }
          break;

        case 'CLEAR_CANVAS':
          if (roomId) {
            const room = roomManager.getRoom(roomId);
            if (room) {
              room.drawingState.clear();
              room.broadcast({
                type: 'CLEAR_CANVAS',
                userId,
              });
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    if (userId && roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.removeUser(userId);
        room.broadcast({
          type: 'USER_LEFT',
          userId,
          users: room.getUsers(),
        });
        if (room.isEmpty()) {
          roomManager.deleteRoom(roomId);
        }
      }
    }
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
