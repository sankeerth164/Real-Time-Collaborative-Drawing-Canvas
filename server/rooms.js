const DrawingState = require('./drawing-state');

class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.users = new Map();
    this.drawingState = new DrawingState();
  }

  addUser(userId, ws, userColor, userName) {
    this.users.set(userId, { ws, userColor, userName, lastActivity: Date.now() });
  }

  removeUser(userId) {
    this.users.delete(userId);
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getUsers() {
    return Array.from(this.users.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      userColor: data.userColor,
    }));
  }

  isEmpty() {
    return this.users.size === 0;
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.users.forEach((user) => {
      if (user.ws.readyState === 1) { // WebSocket.OPEN
        user.ws.send(data);
      }
    });
  }

  broadcastExcept(userId, message) {
    const data = JSON.stringify(message);
    this.users.forEach((user, id) => {
      if (id !== userId && user.ws.readyState === 1) {
        user.ws.send(data);
      }
    });
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Room(roomId));
    }
    return this.rooms.get(roomId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  getRooms() {
    return Array.from(this.rooms.values());
  }
}

module.exports = RoomManager;
