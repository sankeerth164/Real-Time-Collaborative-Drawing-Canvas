class DrawingState {
  constructor() {
    this.activeStrokes = new Map(); // strokeId -> stroke data (currently visible)
    this.history = []; // Array of actions: { type: 'ADD', stroke: {...} }
    this.historyIndex = -1; // Current position in history
  }

  addStroke(stroke) {
    // When a new stroke is added, we MUST clear any "redo" history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const strokeCopy = JSON.parse(JSON.stringify(stroke));
    this.history.push({ type: 'ADD', stroke: strokeCopy });
    this.historyIndex++;

    this.activeStrokes.set(stroke.id, strokeCopy);
  }

  finishStroke(strokeId) {
    // The stroke is already in history (added at start). 
    // We just need to ensure the final version is captured.
    // However, DRAW_START already added it. DRAW_MOVE updates it in memory.
    // For simplicity, we assume the reference in history is updated 
    // because it's the same object (or we update it here).
    const stroke = this.activeStrokes.get(strokeId);
    if (stroke) {
      // Find the item in history and update it
      const historyItem = this.history.find(item => item.type === 'ADD' && item.stroke.id === strokeId);
      if (historyItem) {
        historyItem.stroke = JSON.parse(JSON.stringify(stroke));
      }
    }
  }

  addPoint(strokeId, x, y) {
    const stroke = this.activeStrokes.get(strokeId);
    if (stroke) {
      stroke.points.push([x, y]);
    }
  }

  undo(userId) {
    console.log(`Global Undo requested by ${userId}. Index: ${this.historyIndex}`);

    if (this.historyIndex >= 0) {
      const action = this.history[this.historyIndex];
      this.historyIndex--;

      if (action.type === 'ADD') {
        this.activeStrokes.delete(action.stroke.id);
        console.log(`Undone stroke: ${action.stroke.id}`);
        return action.stroke;
      }
    }

    return null;
  }

  redo(userId) {
    console.log(`Global Redo requested by ${userId}. Index: ${this.historyIndex}`);

    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const action = this.history[this.historyIndex];

      if (action.type === 'ADD') {
        this.activeStrokes.set(action.stroke.id, action.stroke);
        console.log(`Redone stroke: ${action.stroke.id}`);
        return action.stroke;
      }
    }

    return null;
  }

  getStrokes() {
    return Array.from(this.activeStrokes.values());
  }

  clear() {
    this.activeStrokes.clear();
    this.history = [];
    this.historyIndex = -1;
  }

  getStroke(strokeId) {
    return this.activeStrokes.get(strokeId);
  }
}

module.exports = DrawingState;
