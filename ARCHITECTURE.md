# Collaborative Canvas - Architecture Document

## System Overview

The Collaborative Canvas is a real-time multi-user drawing application built with a WebSocket-based event-driven architecture. Users connect to a central server, join rooms, and all drawing operations are synchronized across connected clients in real-time.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  main.js     │  │  canvas.js   │  │  websocket.js        │  │
│  │              │  │              │  │                      │  │
│  │ • App state  │  │ • Drawing    │  │ • WebSocket client   │  │
│  │ • Event      │  │ • Rendering  │  │ • Message handling   │  │
│  │   handlers   │  │ • Canvas     │  │ • Connection mgmt    │  │
│  │ • UI logic   │  │   operations │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                                        │               │
│         └────────────────┬───────────────────────┘               │
│                          │                                       │
│                    HTML5 Canvas                                 │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                    WebSocket (ws://)
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                     NODE.JS SERVER                              │
├──────────────────────────┼────────��──────────────────────────────┤
│                          │                                       │
│         ┌────────────────▼────────────────┐                      │
│         │     server.js (Express)         │                      │
│         │  • WebSocket server setup       │                      │
│         │  • Message routing              │                      │
│         │  • Connection handling          │                      │
│         └────────────────┬────────────────┘                      │
│                          │                                       │
│         ┌────────────────▼────────────────┐                      │
│         │   RoomManager (rooms.js)        │                      │
│         │                                 │                      │
│         │  ┌─────────────────────────┐    │                      │
│         │  │ Room 1 [User1, User2]  │    │                      │
│         │  │  • Users Map            │    │                      │
│         │  │  • Broadcast methods    │    │                      │
│         │  │  • DrawingState ref     │    │                      │
│         │  └─────────────────────────┘    │                      │
│         │                                 │                      │
│         │  ┌─────────────────────────┐    │                      │
│         │  │ Room 2 [User3, User4]  │    │                      │
│         │  │  • Users Map            │    │                      │
│         │  │  • Broadcast methods    │    │                      │
│         │  │  • DrawingState ref     │    │                      │
│         │  └─────────────────────────┘    │                      │
│         │                                 │                      │
│         └────────────────┬────────────────┘                      │
│                          │                                       │
│         ┌────────────────▼────────────────┐                      │
│         │  DrawingState (drawing-state.js)│                      │
│         │  (Per Room)                     │                      │
│         │                                 │                      │
│         │  • activeStrokes: Map<id, stroke>  │                      │
│         │  • history: Array               │                      │
│         │  • historyIndex: Number         │                      │
│         │                                 │                      │
│         └─────────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## WebSocket Protocol

### Message Format

All messages are JSON-encoded:
```json
{
  "type": "MESSAGE_TYPE",
  "data": { /* message-specific data */ }
}
```

### Client → Server Messages

#### 1. **JOIN_ROOM**
User joins a collaborative room
```json
{
  "type": "JOIN_ROOM",
  "userId": "user-abc123",
  "roomId": "room-1",
  "userColor": "#FF6B6B"
}
```

#### 2. **DRAW_START**
Initiates a new stroke
```json
{
  "type": "DRAW_START",
  "strokeId": "stroke-1234567890-0.xxx",
  "x": 100,
  "y": 150,
  "color": "#FF6B6B",
  "width": 3
}
```

#### 3. **DRAW_MOVE**
Adds a point to current stroke
```json
{
  "type": "DRAW_MOVE",
  "strokeId": "stroke-1234567890-0.xxx",
  "x": 105,
  "y": 155
}
```

#### 4. **DRAW_END**
Completes the current stroke
```json
{
  "type": "DRAW_END",
  "strokeId": "stroke-1234567890-0.xxx"
}
```

#### 5. **UNDO**
Request to undo the last operation
```json
{
  "type": "UNDO"
}
```

#### 6. **REDO**
Request to redo the last undone operation
```json
{
  "type": "REDO"
}
```

#### 7. **CURSOR_MOVE**
Send cursor position for remote cursor tracking
```json
{
  "type": "CURSOR_MOVE",
  "x": 100,
  "y": 150
}
```

#### 8. **CLEAR_CANVAS**
Clear all drawings from the canvas
```json
{
  "type": "CLEAR_CANVAS"
}
```

### Server → Client Messages

#### 1. **CANVAS_STATE**
Sent to new users upon connection (initial state)
```json
{
  "type": "CANVAS_STATE",
  "strokes": [
    {
      "id": "stroke-xxx",
      "userId": "user-1",
      "userColor": "#FF6B6B",
      "startX": 100,
      "startY": 150,
      "points": [[100, 150], [105, 155], [110, 160]],
      "color": "#FF6B6B",
      "width": 3,
      "timestamp": 1234567890
    }
  ],
  "users": [
    { "userId": "user-1", "userColor": "#FF6B6B" },
    { "userId": "user-2", "userColor": "#4ECDC4" }
  ]
}
```

#### 2. **DRAW_START**
Broadcast to other users when someone starts drawing
```json
{
  "type": "DRAW_START",
  "stroke": {
    "id": "stroke-xxx",
    "userId": "user-1",
    "userColor": "#FF6B6B",
    "startX": 100,
    "startY": 150,
    "points": [[100, 150]],
    "color": "#FF6B6B",
    "width": 3,
    "timestamp": 1234567890
  }
}
```

#### 3. **DRAW_MOVE**
Broadcast to other users when someone is drawing
```json
{
  "type": "DRAW_MOVE",
  "strokeId": "stroke-xxx",
  "x": 105,
  "y": 155
}
```

#### 4. **DRAW_END**
Broadcast to other users when a stroke is completed
```json
{
  "type": "DRAW_END",
  "strokeId": "stroke-xxx"
}
```

#### 5. **UNDO**
Broadcast undo operation
```json
{
  "type": "UNDO",
  "strokeId": "stroke-xxx",
  "userId": "user-1"
}
```

#### 6. **REDO**
Broadcast redo operation
```json
{
  "type": "REDO",
  "strokeId": "stroke-xxx",
  "userId": "user-1"
}
```

#### 7. **CURSOR_MOVE**
Broadcast cursor position of other users
```json
{
  "type": "CURSOR_MOVE",
  "userId": "user-1",
  "userName": "Alex",
  "x": 100,
  "y": 150,
  "userColor": "#FF6B6B"
}
```

#### 8. **CLEAR_CANVAS**
Broadcast canvas clear operation
```json
{
  "type": "CLEAR_CANVAS",
  "userId": "user-1"
}
```

#### 9. **USER_JOINED**
Broadcast when a user joins the room
```json
{
  "type": "USER_JOINED",
  "userId": "user-2",
  "userColor": "#4ECDC4",
  "users": [
    { "userId": "user-1", "userColor": "#FF6B6B" },
    { "userId": "user-2", "userColor": "#4ECDC4" }
  ]
}
```

#### 10. **USER_LEFT**
Broadcast when a user leaves the room
```json
{
  "type": "USER_LEFT",
  "userId": "user-1",
  "users": [
    { "userId": "user-2", "userColor": "#4ECDC4" }
  ]
}
```

## Data Flow

### 1. Stroke Drawing Flow

```
User Mouse Down
       │
       ├─► CanvasManager.startStroke()
       ├─► wsManager.sendDrawStart()
       └─► state.undoStack.push()
              │
              ▼
    [Server] → Other Clients
              │
              ├─► CanvasManager.startStroke()
              └─► Display on canvas

User Mouse Move (while drawing)
       │
       ├─► CanvasManager.addPoint()
       ├─► wsManager.sendDrawMove()
       └─► wsManager.sendCursorMove()
              │
              ▼
    [Server] → Other Clients
              │
              ├─► CanvasManager.addPoint()
              ├─► updateRemoteCursor()
              └─► Display on canvas

User Mouse Up
       │
       ├─► CanvasManager.endStroke()
       └─► wsManager.sendDrawEnd()
              │
              ▼
    [Server] → Other Clients
              │
              └─► CanvasManager.endStroke()
```

### 2. User Connection Flow

```
Client connects
       │
       ├─► WebSocketManager.connect()
       └─► Send JOIN_ROOM message
              │
              ▼
       [Server receives JOIN_ROOM]
              │
              ├─► RoomManager.getOrCreateRoom()
              ├─► Room.addUser()
              ├─► Send CANVAS_STATE to new user
              └─► Broadcast USER_JOINED to others
                     │
                     ▼
              [All Clients receive messages]
                     │
                     ├─► Load canvas state
                     ├─► Update users list
                     └─► Display updated info
```

### 3. Undo/Redo Flow

```
User clicks Undo
       │
       ├─► state.undoStack.pop()
       ├─► CanvasManager.removeStroke()
       ├─► CanvasManager.redraw()
       ├─► state.redoStack.push()
       └─► wsManager.sendUndo()
              │
              ▼
       [Server receives UNDO]
              │
              ├─► DrawingState.undo()
              └─► Broadcast UNDO to others
                     │
                     ▼
              [All Clients receive UNDO]
                     │
                     ├─► CanvasManager.removeStroke()
                     └─► CanvasManager.redraw()
```

## Undo/Redo Strategy

### Current Implementation: Global History Stack

```
DrawingState
├── activeStrokes: Map
│   └── strokeId → {id, userId, points, color, width, timestamp}
├── history: Array
│   └── { type: 'ADD', stroke: {...} }
└── historyIndex: Number (current position in history)
```

### Algorithm

**Undo Operation:**
1. Check if historyIndex >= 0
2. Get operation at current historyIndex
3. Decrement historyIndex
4. If operation type is 'ADD', remove the stroke from activeStrokes Map
5. Broadcast UNDO to all clients with the stroke ID

**Redo Operation:**
1. Check if historyIndex < history length - 1
2. Increment historyIndex
3. Get operation at the new historyIndex
4. If operation type is 'ADD', re-add the stroke to activeStrokes Map
5. Broadcast REDO to all clients with the complete stroke data

### Advantages
- Simple and straightforward to implement
- Works well for small groups of concurrent users
- Global state consistency

### Limitations & Trade-offs
- Doesn't distinguish between which user should undo
- All users see the same undo/redo order regardless of who drew what
- Can't selectively undo specific user's strokes
- Potential conflicts with concurrent drawing operations

### Production-Ready Alternative: Operational Transformation (OT)

For a production system, consider implementing Operational Transformation:
- Track operations per user with vector clocks
- Store operation history with causality information
- Transform operations to maintain consistency across concurrent edits
- Supports partial undo of specific user's actions

## Performance Decisions

### 1. Event Batching vs. Individual Messages
**Decision**: Send individual messages for real-time responsiveness
- Each DRAW_MOVE is sent immediately
- Trade-off: Higher bandwidth usage for lower latency
- Alternative: Batch every 10ms (higher latency but less bandwidth)

### 2. Canvas Rendering Strategy
**Decision**: Redraw entire canvas from stroke history on undo/clear
- Simpler implementation
- Strokes limited to ~10,000 before performance degrades
- Alternative: Use off-screen canvas or WebGL for large drawings

### 3. Stroke Data Structure
**Decision**: Store full point arrays in memory
- Pros: Fast rendering, simple synchronization
- Cons: High memory usage for long/complex strokes
- Alternative: Store simplified paths or compressed point deltas

### 4. User Cursor Tracking
**Decision**: Send cursor position with every mouse move
- Pros: Real-time cursor feedback
- Cons: High message frequency (60+ msgs/sec at 60fps)
- Alternative: Throttle to every 100ms

## Conflict Resolution

### Drawing Overlaps
**Strategy**: Painter's Algorithm (Last-draw-on-top)
- All strokes are rendered in order they were created
- No conflict: each stroke is independent
- Concurrent draws appear in chronological order

### Simultaneous Undo
**Strategy**: Global history index prevents conflicts
- First undo always removes the most recent stroke
- If two users undo simultaneously, server processes in order
- Clients receive updates and stay synchronized

### User Disconnect During Stroke
**Strategy**: Complete or discard
- If connection lost during DRAW_MOVE, stroke is considered incomplete
- Server removes partial stroke
- Clients receive DRAW_END and stop rendering

## Scalability Considerations

### Current Limits
- Supports 10-20 concurrent users per room
- Supports 5,000-10,000 strokes before performance degradation
- Single server instance only
- No database persistence

### Scaling Strategies

**For more users per room:**
1. Implement stroke compression/simplification
2. Use delta compression for point arrays
3. Implement quadtree spatial partitioning

**For persistence:**
1. Add PostgreSQL or MongoDB
2. Implement drawing snapshots
3. Store operation log for replay

**For multiple servers:**
1. Use Redis for pub/sub
2. Implement session affinity (sticky sessions)
3. Sync drawing state across servers

## Security Considerations

### Current Implementation (Not Secure)
- No authentication - anyone can join any room
- No authorization - users can perform any action
- No rate limiting - potential for DoS
- No input validation - trust all client messages

### Recommended Security Measures

1. **Authentication**: Require user login before drawing
2. **Authorization**: Check user permissions before room access
3. **Input Validation**: Validate all drawing coordinates and parameters
4. **Rate Limiting**: Limit messages per user per second
5. **Sanitization**: Validate color values, stroke width ranges
6. **HTTPS/WSS**: Use secure WebSocket connections in production

## Testing Strategy

### Unit Tests
- Canvas rendering operations
- Undo/redo logic
- Message serialization/deserialization

### Integration Tests
- WebSocket connection flow
- Multiple user synchronization
- Room isolation

### Load Tests
- Concurrent users in single room
- High-frequency drawing operations
- Large canvas sizes

### Manual Testing
- Cross-browser compatibility
- Mobile device support
- Network latency simulation
- Client disconnection/reconnection
