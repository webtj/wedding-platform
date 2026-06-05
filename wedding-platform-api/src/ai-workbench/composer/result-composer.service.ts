import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily?: string;
  color?: string;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}

export interface ComposeRequest {
  backgroundUrl: string;
  texts: TextOverlay[];
  width: number;
  height: number;
  outputFormat?: 'png' | 'jpeg' | 'webp';
}

@Injectable()
export class ResultComposerService {
  private readonly logger = new Logger(ResultComposerService.name);

  async compose(request: ComposeRequest): Promise<Buffer> {
    const { backgroundUrl, texts, width, height, outputFormat = 'png' } = request;

    // Download background image
    const bgResponse = await fetch(backgroundUrl);
    if (!bgResponse.ok) {
      throw new Error(`Failed to fetch background: ${bgResponse.status}`);
    }
    const bgBuffer = Buffer.from(await bgResponse.arrayBuffer());

    // Create SVG overlay for text
    const svgTexts = texts.map(t => {
      const x = t.x;
      const y = t.y;
      const anchor = t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start';
      const fill = t.color || '#000000';
      const fontSize = t.fontSize || 24;
      const fontFamily = t.fontFamily || "'Noto Sans SC', 'Playfair Display', sans-serif";

      if (t.maxWidth) {
        // Wrap text for maxWidth
        return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="auto">
          <tspan x="${x}" dy="0">${this.wrapText(t.text, t.maxWidth, fontSize)}</tspan>
        </text>`;
      }

      return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="auto">${this.escapeXml(t.text)}</text>`;
    }).join('\n');

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${svgTexts}
      </svg>
    `);

    // Composite background + text overlay
    const result = await sharp(bgBuffer)
      .resize(width, height, { fit: 'cover' })
      .composite([{
        input: svgOverlay,
        top: 0,
        left: 0,
      }])
      .toFormat(outputFormat)
      .toBuffer();

    return result;
  }

  private wrapText(text: string, maxWidth: number, fontSize: number): string {
    // Chinese characters are approximately 1em wide
    // English characters are approximately 0.5em wide
    const avgCharWidth = fontSize * 0.6; // Average for mixed content
    const charsPerLine = Math.floor(maxWidth / avgCharWidth);

    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < text.length; i++) {
      currentLine += text[i];

      while (currentLine.length >= charsPerLine) {
        const breakPoint = this.findBreakPoint(currentLine);
        if (breakPoint > 0 && breakPoint < currentLine.length) {
          lines.push(this.escapeXml(currentLine.substring(0, breakPoint)));
          currentLine = currentLine.substring(breakPoint);
        } else {
          lines.push(this.escapeXml(currentLine));
          currentLine = '';
          break;
        }
      }
    }

    if (currentLine) {
      lines.push(this.escapeXml(currentLine));
    }

    return lines.map((line, i) =>
      i === 0 ? line : `<tspan x="0" dy="${fontSize * 1.2}">${line}</tspan>`
    ).join('');
  }

  private findBreakPoint(line: string): number {
    // Chinese punctuation that shouldn't start a line (行首禁则)
    const noStart = '，。！？；：、）】》」』〉〕';
    // Chinese punctuation that shouldn't end a line (行尾禁则)
    const noEnd = '（【《「『〈〔';

    // First pass: prefer breaking at word boundaries (spaces) for English text
    for (let i = line.length - 1; i >= 0; i--) {
      if (line.charAt(i) === ' ') {
        return i + 1;
      }
    }

    // Second pass: find a valid break point respecting Chinese punctuation rules
    for (let i = line.length - 1; i >= 0; i--) {
      const char = line.charAt(i);
      const nextChar = i < line.length - 1 ? line.charAt(i + 1) : undefined;

      // Don't break if the next character would start a new line with noStart punctuation
      if (nextChar && noStart.includes(nextChar)) {
        continue;
      }

      // Don't break if the current character would end the line with noEnd punctuation
      if (noEnd.includes(char)) {
        continue;
      }

      // Valid break point found
      return i + 1;
    }

    // No good break point found, force break at end of line
    return line.length;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
