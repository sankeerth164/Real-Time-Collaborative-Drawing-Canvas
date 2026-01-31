class WebSocketManager {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.messageHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect(roomId, userId, userColor, userName) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.send({
        type: 'JOIN_ROOM',
        roomId,
        userId,
        userColor,
        userName,
      });
      this.triggerHandler('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.triggerHandler('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.triggerHandler('disconnected');
      this.attemptReconnect(roomId, userId, userColor, userName);
    };
  }

  attemptReconnect(roomId, userId, userColor, userName) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(
        () => this.connect(roomId, userId, userColor, userName),
        this.reconnectDelay
      );
    }
  }

  send(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(eventType, handler) {
    if (!this.messageHandlers[eventType]) {
      this.messageHandlers[eventType] = [];
    }
    this.messageHandlers[eventType].push(handler);
  }

  handleMessage(message) {
    const { type } = message;
    this.triggerHandler(type, message);
  }

  triggerHandler(eventType, data) {
    if (this.messageHandlers[eventType]) {
      this.messageHandlers[eventType].forEach((handler) => {
        handler(data);
      });
    }
  }

  sendDrawStart(strokeId, x, y, color, width) {
    this.send({
      type: 'DRAW_START',
      strokeId,
      x,
      y,
      color,
      width,
    });
  }

  sendDrawMove(strokeId, x, y) {
    this.send({
      type: 'DRAW_MOVE',
      strokeId,
      x,
      y,
      color: null, // Placeholder for potential future use
    });
  }

  sendDrawEnd(strokeId) {
    this.send({
      type: 'DRAW_END',
      strokeId,
    });
  }

  sendUndo(strokeId) {
    this.send({
      type: 'UNDO',
      strokeId,
    });
  }

  sendRedo(strokeId) {
    this.send({
      type: 'REDO',
      strokeId,
    });
  }

  sendCursorMove(x, y) {
    this.send({
      type: 'CURSOR_MOVE',
      x,
      y,
    });
  }

  sendClearCanvas() {
    this.send({
      type: 'CLEAR_CANVAS',
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional disconnect
      this.ws.close();
      this.connected = false;
    }
  }
}
