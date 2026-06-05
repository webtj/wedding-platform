import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

const GRID_SIZE = 1;
const METERS_TO_PX = 50;

export class PixiEditorApp {
  app!: Application;
  world!: Container;
  gridLayer!: Container;
  objectsLayer!: Container;
  venueLayer!: Container;
  canvas!: HTMLCanvasElement;

  private width: number;
  private height: number;
  private venueWidth: number;
  private venueDepth: number;

  constructor(width: number, height: number, venueWidth: number, venueDepth: number) {
    this.width = width;
    this.height = height;
    this.venueWidth = venueWidth;
    this.venueDepth = venueDepth;
  }

  async init(): Promise<void> {
    this.app = new Application();

    await this.app.init({
      width: this.width,
      height: this.height,
      background: '#f8f8f8',
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      preference: 'webgl'
    });

    this.canvas = this.app.canvas as HTMLCanvasElement;

    this.world = new Container();
    this.gridLayer = new Container();
    this.objectsLayer = new Container();
    this.venueLayer = new Container();

    this.world.addChild(this.gridLayer);
    this.world.addChild(this.venueLayer);
    this.world.addChild(this.objectsLayer);
    this.app.stage.addChild(this.world);

    this.drawGrid();
    this.drawVenueBorder();
    this.centerView();

    // Force first render to ensure canvas is visible
    this.app.render();
  }

  private drawGrid(): void {
    this.gridLayer.removeChildren();

    const g = new Graphics();
    const vw = this.venueWidth * METERS_TO_PX;
    const vd = this.venueDepth * METERS_TO_PX;
    const step = GRID_SIZE * METERS_TO_PX;

    for (let x = 0; x <= vw; x += step) {
      g.moveTo(x, 0);
      g.lineTo(x, vd);
    }
    for (let y = 0; y <= vd; y += step) {
      g.moveTo(0, y);
      g.lineTo(vw, y);
    }
    g.stroke({ width: 0.5, color: '#e0e0e0', alpha: 0.5 });

    this.gridLayer.addChild(g);
  }

  private drawVenueBorder(): void {
    this.venueLayer.removeChildren();

    const vw = this.venueWidth * METERS_TO_PX;
    const vd = this.venueDepth * METERS_TO_PX;

    // Draw venue background with gradient
    const bg = new Graphics();
    bg.rect(0, 0, vw, vd);
    bg.fill({ color: '#f5f5f0', alpha: 1 });
    this.venueLayer.addChild(bg);

    // Draw subtle floor pattern
    const pattern = new Graphics();
    const patternSize = METERS_TO_PX * 2; // 2 meter pattern
    for (let x = 0; x < vw; x += patternSize) {
      for (let y = 0; y < vd; y += patternSize) {
        pattern.rect(x, y, patternSize, patternSize);
        pattern.stroke({ width: 0.5, color: '#e8e8e0', alpha: 0.5 });
      }
    }
    this.venueLayer.addChild(pattern);

    // Draw venue border
    const border = new Graphics();
    border.rect(0, 0, vw, vd);
    border.stroke({ width: 3, color: '#333333' });
    this.venueLayer.addChild(border);

    // Draw scale ruler on bottom
    const rulerY = vd + 10;
    const rulerGraphics = new Graphics();
    const meterPx = METERS_TO_PX;

    // Draw ruler line
    rulerGraphics.moveTo(0, rulerY);
    rulerGraphics.lineTo(vw, rulerY);
    rulerGraphics.stroke({ width: 1, color: '#666666' });

    // Draw meter marks
    const labelStyle = new TextStyle({ fontSize: 10, fill: '#666666' });
    for (let m = 0; m <= this.venueWidth; m++) {
      const x = m * meterPx;
      const isMajor = m % 5 === 0;
      const markHeight = isMajor ? 8 : 4;

      rulerGraphics.moveTo(x, rulerY);
      rulerGraphics.lineTo(x, rulerY + markHeight);
      rulerGraphics.stroke({ width: 1, color: '#666666' });

      if (isMajor) {
        const label = new Text({ text: `${m}m`, style: labelStyle });
        label.anchor.set(0.5, 0);
        label.position.set(x, rulerY + 12);
        this.venueLayer.addChild(label);
      }
    }

    // Draw ruler on left side
    const rulerX = -10;
    const leftRuler = new Graphics();
    leftRuler.moveTo(rulerX, 0);
    leftRuler.lineTo(rulerX, vd);
    leftRuler.stroke({ width: 1, color: '#666666' });

    for (let m = 0; m <= this.venueDepth; m++) {
      const y = m * meterPx;
      const isMajor = m % 5 === 0;
      const markWidth = isMajor ? 8 : 4;

      leftRuler.moveTo(rulerX, y);
      leftRuler.lineTo(rulerX - markWidth, y);
      leftRuler.stroke({ width: 1, color: '#666666' });

      if (isMajor) {
        const label = new Text({
          text: `${m}m`,
          style: labelStyle,
          anchor: { x: 1, y: 0.5 }
        });
        label.position.set(rulerX - 12, y);
        this.venueLayer.addChild(label);
      }
    }

    this.venueLayer.addChild(rulerGraphics);
    this.venueLayer.addChild(leftRuler);

    // Draw coordinate axis indicator
    const axisSize = 40;
    const axisX = -30;
    const axisY = vd + 30;
    const axis = new Graphics();

    // X axis
    axis.moveTo(axisX, axisY);
    axis.lineTo(axisX + axisSize, axisY);
    axis.stroke({ width: 2, color: '#ff4444' });
    // Arrow
    axis.moveTo(axisX + axisSize - 5, axisY - 3);
    axis.lineTo(axisX + axisSize, axisY);
    axis.lineTo(axisX + axisSize - 5, axisY + 3);
    axis.stroke({ width: 2, color: '#ff4444' });

    // Y axis
    axis.moveTo(axisX, axisY);
    axis.lineTo(axisX, axisY - axisSize);
    axis.stroke({ width: 2, color: '#4444ff' });
    // Arrow
    axis.moveTo(axisX - 3, axisY - axisSize + 5);
    axis.lineTo(axisX, axisY - axisSize);
    axis.lineTo(axisX + 3, axisY - axisSize + 5);
    axis.stroke({ width: 2, color: '#4444ff' });

    // Labels
    const xLabel = new Text({ text: 'X', style: new TextStyle({ fontSize: 12, fill: '#ff4444', fontWeight: 'bold' }) });
    xLabel.position.set(axisX + axisSize + 5, axisY - 6);
    this.venueLayer.addChild(xLabel);

    const yLabel = new Text({ text: 'Y', style: new TextStyle({ fontSize: 12, fill: '#4444ff', fontWeight: 'bold' }) });
    yLabel.position.set(axisX - 6, axisY - axisSize - 5);
    this.venueLayer.addChild(yLabel);

    this.venueLayer.addChild(axis);
  }

  private centerView(): void {
    const vw = this.venueWidth * METERS_TO_PX;
    const vd = this.venueDepth * METERS_TO_PX;
    const scaleX = this.width / (vw + 40);
    const scaleY = this.height / (vd + 40);
    const scale = Math.min(scaleX, scaleY, 1);

    this.world.scale.set(scale);
    this.world.position.set(
      (this.width - vw * scale) / 2,
      (this.height - vd * scale) / 2
    );
  }

  setVenueSize(width: number, depth: number): void {
    this.venueWidth = width;
    this.venueDepth = depth;
    if (this.app?.renderer) {
      this.drawGrid();
      this.drawVenueBorder();
      this.centerView();
      this.app.render();
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.app?.renderer) {
      this.app.renderer.resize(width, height);
      this.centerView();
      this.app.render();
    }
  }

  destroy(): void {
    try {
      this.app?.destroy(true, { children: true });
    } catch {
      // ignore
    }
  }

  static metersToPx(meters: number): number {
    return meters * METERS_TO_PX;
  }

  static pxToMeters(px: number): number {
    return px / METERS_TO_PX;
  }
}
