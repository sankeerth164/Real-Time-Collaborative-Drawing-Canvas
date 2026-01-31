# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization using WebSockets.

## Features

- **Real-time Drawing Synchronization**: See other users' drawings as they draw (not after)
- **Multiple Drawing Tools**: Brush and eraser with adjustable stroke width
- **Color Picker**: Choose from preset colors or use a custom color picker
- **User Indicators**: See who's online and their cursor positions
- **Global Undo/Redo**: Works across all users drawing in real-time
- **Room-based Collaboration**: Join different rooms to collaborate with different groups
- **Persistent Canvas State**: New users joining a room see the current canvas state

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas, CSS3
- **Backend**: Node.js, Express, WebSockets (ws library)
- **Communication**: JSON-based WebSocket protocol
- **Architecture**: Event-driven, real-time synchronization

## Project Structure

```
real-time-drawing-canvas/
├── client/
│   ├── index.html          # Main HTML file
│   ├── style.css           # Styling
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client manager
│   └── main.js             # Application logic & event handlers
├── server/
│   ├── server.js           # Express + WebSocket server
│   ├── rooms.js            # Room management
│   └── drawing-state.js    # Canvas state management
├── package.json
├── README.md
├── ARCHITECTURE.md
└── .gitignore
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd collaborative-canvas
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## How to Test with Multiple Users

### Method 1: Multiple Browser Windows

1. Open `http://localhost:3000` in one browser window
2. Open `http://localhost:3000` in another browser window (or different browser)
3. Enter the same room ID in both windows (e.g., "room-1")
4. Start drawing in one window and see it appear in real-time in the other

### Method 2: Multiple Devices

1. Get your machine's IP address
2. On the server machine, note the local IP (e.g., 192.168.x.x)
3. On other devices, navigate to `http://<your-ip>:3000`
4. Enter the same room ID and start collaborating

### Testing Scenarios

- **Simultaneous Drawing**: Draw in both windows at the same time to test conflict resolution
- **Cursor Tracking**: See remote cursor positions update in real-time
- **Undo/Redo**: Test that undo/redo works globally across users
- **New User Joining**: Have one user join, draw something, then have another user join to see the canvas state
- **User Leave/Reconnect**: Close a tab and reopen to simulate disconnect/reconnect

## Known Limitations

1. **Undo/Redo Global State**: While undo/redo work across users, the current implementation maintains a single global history. In a production system, you'd want to track individual user operations and handle conflicts more intelligently.

2. **Performance at Scale**: With many concurrent strokes or very large canvases, performance may degrade. The implementation could be optimized with:
   - Stroke compression/batching
   - Canvas chunking
   - WebWorker offloading

3. **No Drawing History Persistence**: Once all users leave a room, the drawing is lost. A database could be added to persist drawings.

4. **Browser Canvas Limitations**: 
   - Browsers have memory limits for canvas size and drawing operations
   - Very complex drawings with thousands of strokes may slow down

5. **Network Latency**: Drawing updates are sent in real-time but network latency may cause visible delays. Client-side prediction could improve perceived performance.

6. **No Authentication**: Anyone can join any room. In production, you'd add proper authentication and authorization.

## Usage Guide

### Drawing

1. **Join a Room**: Enter a room ID and click "Join Room" to connect
2. **Select Tool**: Choose between "Brush" and "Eraser" tools
3. **Pick Color**: Use the color picker or select from preset colors
4. **Adjust Width**: Use the slider to adjust stroke width (1-50px)
5. **Draw**: Click and drag on the canvas to draw
6. **Undo/Redo**: Click undo/redo buttons to revert/restore actions
7. **Clear Canvas**: Clear all drawings from the canvas
8. **View Users**: See who's currently drawing in the room

## Time Spent

- Project Planning & Architecture: 30 minutes
- Backend Implementation (Server, Room Manager, Drawing State): 45 minutes
- Frontend Implementation (HTML, CSS, Canvas): 60 minutes
- WebSocket Integration: 45 minutes
- Testing & Bug Fixes: 30 minutes
- Documentation: 30 minutes

**Total: ~4 hours**

## Future Enhancements

- [ ] Drawing history/undo stack persistence to database
- [ ] User authentication and authorization
- [ ] Drawing layers and transparency
- [ ] Text tool and shape tools
- [ ] Drawing export (PNG/SVG)
- [ ] Mobile touch support
- [ ] Line smoothing and optimization
- [ ] Performance monitoring and metrics
- [ ] Collaborative selection and annotation
- [ ] Real-time presence indicators with timers
