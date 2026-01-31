class CanvasManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas element with ID "${canvasId}" not found`);
      return;
    }
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.isDrawing = false;
    this.strokes = new Map();
    this.renderTimeout = null;

    // Use a slight delay to ensure layout is ready
    setTimeout(() => this.resizeCanvas(), 50);
    window.addEventListener('resize', () => this.resizeCanvas());

    // Also use ResizeObserver for precision
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => this.resizeCanvas());
      observer.observe(this.canvas.parentElement);
    }
  }

  resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    // Set internal resolution to match display size
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    console.log(`Canvas resized to: ${this.canvas.width}x${this.canvas.height}`);
    this.redraw();
  }

  startStroke(strokeId, x, y, color, width) {
    this.isDrawing = true;
    const stroke = {
      id: strokeId,
      color,
      width,
      points: [[x, y]],
    };
    this.strokes.set(strokeId, stroke);
    this.drawPoint(x, y, color, width);
  }

  addPoint(strokeId, x, y) {
    const stroke = this.strokes.get(strokeId);
    if (stroke) {
      stroke.points.push([x, y]);
      this.drawLine(
        stroke.points[stroke.points.length - 2],
        [x, y],
        stroke.color,
        stroke.width
      );
    }
  }

  endStroke(strokeId) {
    this.isDrawing = false;
  }

  drawPoint(x, y, color, width) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, width / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawLine(fromPoint, toPoint, color, width) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(fromPoint[0], fromPoint[1]);
    this.ctx.lineTo(toPoint[0], toPoint[1]);
    this.ctx.stroke();
  }

  drawStroke(stroke) {
    if (stroke.points.length === 0) return;

    if (stroke.points.length === 1) {
      this.drawPoint(
        stroke.points[0][0],
        stroke.points[0][1],
        stroke.color,
        stroke.width
      );
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        this.drawLine(
          stroke.points[i - 1],
          stroke.points[i],
          stroke.color,
          stroke.width
        );
      }
    }
  }

  removeStroke(strokeId) {
    this.strokes.delete(strokeId);
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw all strokes in order
    this.strokes.forEach((stroke) => {
      this.drawStroke(stroke);
    });
  }

  clear() {
    this.strokes.clear();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  loadState(strokes) {
    this.strokes.clear();
    strokes.forEach((stroke) => {
      this.strokes.set(stroke.id, stroke);
    });
    this.redraw();
  }

  getCanvasCoordinates(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  setOnMouseDown(callback) {
    const handleStart = (event) => {
      const coords = this.getCanvasCoordinates(event.touches ? event.touches[0] : event);
      callback(coords.x, coords.y);
    };
    this.canvas.addEventListener('mousedown', handleStart);
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleStart(e);
    }, { passive: false });
  }

  setOnMouseMove(callback) {
    const handleMove = (event) => {
      const coords = this.getCanvasCoordinates(event.touches ? event.touches[0] : event);
      callback(coords.x, coords.y);
    };
    this.canvas.addEventListener('mousemove', handleMove);
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleMove(e);
    }, { passive: false });
  }

  setOnMouseUp(callback) {
    document.addEventListener('mouseup', callback);
    document.addEventListener('touchend', callback);
    document.addEventListener('touchcancel', callback);
  }

  setOnMouseLeave(callback) {
    this.canvas.addEventListener('mouseleave', callback);
  }
}
