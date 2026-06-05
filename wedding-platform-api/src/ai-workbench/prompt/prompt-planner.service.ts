import { Injectable, Logger } from '@nestjs/common';
import type { ParsedIntent } from '../intent/intent-parser.service';

// ── Prompt section types ───────────────────────────────────────────────────
interface PromptSection {
  readonly role: 'system' | 'context' | 'style' | 'material' | 'user' | 'constraints';
  readonly priority: number; // lower = earlier in prompt
  readonly content: string;
}

// ── Strategy ───────────────────────────────────────────────────────────────
type PromptStrategy = 'default' | 'detailed' | 'refine';

// ── Token budget ───────────────────────────────────────────────────────────
const TOKEN_BUDGET_SOFT = 800;  // warn
const TOKEN_BUDGET_HARD = 1200; // trim constraints

function estimateTokens(text: string): number {
  // Rough: ~0.75 tokens per char for English, ~0.5 for mixed
  return Math.ceil(text.length * 0.6);
}

@Injectable()
export class PromptPlannerService {
  private readonly logger = new Logger(PromptPlannerService.name);

  // ── Default material instructions (fallback when DB has no entry) ──────
  private readonly materialDefaults: Record<string, string> = {
    vow_card: 'Create an elegant wedding vow card background with large blank center for text',
    menu_card: 'Create a wedding menu card with elegant borders and space for menu items',
    welcome_sign: 'Create a wedding welcome sign with decorative elements',
    pet_witness_card: "Create a cute pet witness card preserving the pet's features",
    wedding_mood: 'Create a wedding mood board or atmosphere image',
    table_card: 'Create a wedding table place card, small format, elegant design, space for name',
    place_card: 'Create a wedding place card, refined and delicate, guest name area',
    photo_wall: 'Create a wedding photo wall background, large format, decorative arrangement',
    sticker: 'Create a wedding sticker design, die-cut style, festive and cute',
    tablecloth: 'Create a wedding tablecloth pattern, seamless tileable, elegant and subtle',
    fan_cover: 'Create a wedding fan cover design, elegant and decorative, for summer ceremony',
    hand_card: 'Create a wedding hand card design, portable format, elegant and readable',
  };

  // ── Public API ──────────────────────────────────────────────────────────

  buildPrompt(params: {
    intent: ParsedIntent;
    materialType?: string;
    materialInstruction?: string;
    projectStyle?: string;
    userRequest: string;
    preserveRules?: Record<string, boolean>;
  }): string {
    const sections = this.buildSections(params, 'default');
    return this.assemble(sections);
  }

  buildDetailedPrompt(params: {
    intent: ParsedIntent;
    materialType?: string;
    materialInstruction?: string;
    projectStyle?: string;
    userRequest: string;
    preserveRules?: Record<string, boolean>;
    extraContext?: string;
  }): string {
    const sections = this.buildSections(params, 'detailed');
    return this.assemble(sections);
  }

  buildRefinePrompt(params: {
    originalPrompt: string;
    feedback: string;
    preserveRules?: Record<string, boolean>;
  }): string {
    const sections: PromptSection[] = [
      { role: 'context', priority: 1, content: `Original: ${params.originalPrompt}` },
      { role: 'user', priority: 2, content: `Revision feedback: ${params.feedback}` },
    ];

    if (params.preserveRules) {
      const keep: string[] = [];
      if (params.preserveRules.preserveLayout) keep.push('layout');
      if (params.preserveRules.preserveSubject) keep.push('subject');
      if (params.preserveRules.preserveColorPalette) keep.push('colors');
      if (keep.length > 0) {
        sections.push({ role: 'constraints', priority: 3, content: `Preserve: ${keep.join(', ')}` });
      }
    }

    return this.assemble(sections);
  }

  // ── Section builder ─────────────────────────────────────────────────────

  private buildSections(
    params: {
      intent: ParsedIntent;
      materialType?: string;
      materialInstruction?: string;
      projectStyle?: string;
      userRequest: string;
      preserveRules?: Record<string, boolean>;
      extraContext?: string;
    },
    strategy: PromptStrategy,
  ): PromptSection[] {
    const sections: PromptSection[] = [];

    // 1. Context — what we're making
    if (params.materialType) {
      const instruction = params.materialInstruction ?? this.materialDefaults[params.materialType];
      sections.push({
        role: 'context',
        priority: 1,
        content: instruction
          ? `Task: ${instruction} (${params.materialType})`
          : `Task: Generate an image for ${params.materialType}`,
      });
    }

    // 2. Style — aesthetic direction (detailed mode adds more)
    if (params.projectStyle) {
      const prefix = strategy === 'detailed' ? 'Style guidance (apply throughout): ' : 'Style: ';
      sections.push({ role: 'style', priority: 2, content: `${prefix}${params.projectStyle}` });
    }

    // 3. User request — the core
    sections.push({ role: 'user', priority: 3, content: `User request: ${params.userRequest}` });

    // 4. Extra context (detailed only)
    if (params.extraContext && strategy === 'detailed') {
      sections.push({ role: 'context', priority: 4, content: params.extraContext });
    }

    // 5. Preserve rules
    if (params.preserveRules) {
      const rules: string[] = [];
      if (params.preserveRules.preserveSubject) rules.push('preserve subject (HIGH PRIORITY)');
      if (params.preserveRules.preserveLayout) rules.push('preserve layout');
      if (params.preserveRules.preserveColorPalette) rules.push('preserve colors');
      if (rules.length > 0) {
        sections.push({ role: 'constraints', priority: 5, content: `Preserve: ${rules.join(', ')}` });
      }
    }

    // 6. Negative constraints — always last
    sections.push({
      role: 'constraints',
      priority: 6,
      content: 'Constraints: no watermark, no random text, no messy layout, no low quality',
    });

    return sections;
  }

  // ── Assembly ────────────────────────────────────────────────────────────

  private assemble(sections: PromptSection[]): string {
    // Sort by priority, then role weight
    const roleWeight: Record<string, number> = { system: 0, context: 10, style: 20, material: 30, user: 40, constraints: 50 };
    const sorted = [...sections].sort(
      (a, b) => a.priority - b.priority || (roleWeight[a.role] ?? 100) - (roleWeight[b.role] ?? 100),
    );

    const prompt = sorted.map((s) => s.content).join('\n');
    const tokens = estimateTokens(prompt);

    if (tokens > TOKEN_BUDGET_HARD) {
      this.logger.warn(`Prompt exceeds hard token budget: ${tokens} tokens`);
      // Trim constraints to fit
      return sorted
        .filter((s) => s.role !== 'constraints')
        .map((s) => s.content).join('\n');
    }
    if (tokens > TOKEN_BUDGET_SOFT) {
      this.logger.warn(`Prompt approaching token limit: ${tokens} tokens`);
    }

    return prompt;
  }
}
