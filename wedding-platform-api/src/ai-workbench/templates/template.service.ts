import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ── Style templates (fallback, loaded from DB when available) ──────────────
const DEFAULT_STYLES: Record<string, string> = {
  french_pastoral: 'French pastoral romantic style, soft natural light, wildflowers and greenery, linen and lace texture, warm cream and sage tones, gentle watercolor feel, elegant and dreamy countryside atmosphere',
  french_retro: 'French retro style, botanical oil painting texture, vintage paper, soft golden lighting',
  cream: 'Cream aesthetic style, soft milky tones, minimal elegant, warm beige and ivory palette',
  morandi: 'Morandi color palette, muted low-saturation tones, calm and sophisticated, soft matte texture',
  oil_painting: 'Vintage oil painting texture, rich brushstrokes, classical romantic mood, deep warm tones',
  hand_drawn_floral: 'Hand-drawn floral illustration style, delicate botanical line art, watercolor wash, soft pastel flowers',
  chinese_traditional: 'Chinese traditional style, red and gold color scheme, auspicious patterns, silk texture',
  minimalist: 'Minimalist modern style, clean lines, white space, subtle gradients, elegant typography',
  rustic: 'Rustic country style, natural materials, burlap texture, wildflowers, warm earth tones',
  luxury: 'Luxury style, gold accents, crystal elements, rich velvet texture, dramatic lighting',
};

const DEFAULT_MATERIALS: Record<string, string> = {
  vow_card: 'wedding vow card background, romantic and elegant, blank center for text',
  table_card: 'wedding table place card, small format, elegant design, space for name and number',
  place_card: 'wedding place card, refined and delicate, guest name area',
  photo_wall: 'wedding photo wall background, large format, decorative frame arrangement',
  sticker: 'wedding sticker design, die-cut style, transparent background feel, cute and festive',
  tablecloth: 'wedding tablecloth pattern, seamless tileable design, elegant and subtle',
  fan_cover: 'wedding fan cover design, elegant and decorative, suitable for summer ceremony',
  hand_card: 'wedding hand card design, portable format, elegant and readable',
};

const MATERIAL_INSTRUCTIONS: Record<string, string> = {
  vow_card: 'Create an elegant wedding vow card background with large blank center for text',
  menu_card: 'Create a wedding menu card with elegant borders and space for menu items',
  welcome_sign: 'Create a wedding welcome sign with decorative elements',
  pet_witness_card: "Create a cute pet witness card preserving the pet's features",
  wedding_mood: 'Create a wedding mood board or atmosphere image',
};

@Injectable()
export class TemplateService implements OnModuleInit {
  private readonly logger = new Logger(TemplateService.name);
  private styleCache: Map<string, string> = new Map();
  private materialCache: Map<string, string> = new Map();
  private instructionCache: Map<string, string> = new Map(Object.entries(MATERIAL_INSTRUCTIONS));

  async onModuleInit() {
    this.warmCaches();
  }

  private warmCaches() {
    // Use hardcoded defaults - DB overrides removed with ai_templates migration
    for (const [key, value] of Object.entries(DEFAULT_STYLES)) {
      this.styleCache.set(key, value);
    }
    for (const [key, value] of Object.entries(DEFAULT_MATERIALS)) {
      this.materialCache.set(key, value);
    }
    this.logger.log(
      `Template cache warmed: ${this.styleCache.size} styles, ${this.materialCache.size} materials`,
    );
  }

  /**
   * Get expanded style description.
   * Priority: DB cache → default → style name itself
   */
  getStyleDescription(styleCode: string): string {
    return this.styleCache.get(styleCode) ?? DEFAULT_STYLES[styleCode] ?? styleCode;
  }

  /**
   * Get material-specific AI prompt prefix.
   * Priority: DB cache → default → empty string
   */
  getMaterialPrompt(materialCode: string): string {
    return this.materialCache.get(materialCode) ?? DEFAULT_MATERIALS[materialCode] ?? '';
  }

  /**
   * Get material-specific human instruction.
   * Priority: DB cache → default → empty string
   */
  getMaterialInstruction(materialCode: string): string {
    return this.instructionCache.get(materialCode) ?? '';
  }

  /**
   * Force refresh caches (called after admin updates templates).
   */
  async refresh() {
    this.styleCache.clear();
    this.materialCache.clear();
    await this.warmCaches();
  }
}
