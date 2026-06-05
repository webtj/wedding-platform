import { describe, expect, it } from 'vitest';
import { PromptPlannerService } from './prompt-planner.service';
import type { ParsedIntent } from '../intent/intent-parser.service';

function createService() {
  return new PromptPlannerService();
}

const baseIntent: ParsedIntent = {
  intent: 'CREATE_NEW_IMAGE',
  confidence: 0.9,
  operations: [],
  preserveRules: {},
};

describe('PromptPlannerService', () => {
  // -- buildPrompt --
  it('includes user request in output', () => {
    const service = createService();
    const result = service.buildPrompt({ intent: baseIntent, userRequest: 'add roses' });
    expect(result).toContain('User request: add roses');
  });

  it('includes material type with task description', () => {
    const service = createService();
    const result = service.buildPrompt({ intent: baseIntent, materialType: 'vow_card', userRequest: 'add roses' });
    expect(result).toContain('vow_card');
  });

  it('omits material type when not provided', () => {
    const service = createService();
    const result = service.buildPrompt({ intent: baseIntent, userRequest: 'add roses' });
    expect(result).not.toContain('Task:');
  });

  it('includes project style when provided', () => {
    const service = createService();
    const result = service.buildPrompt({ intent: baseIntent, projectStyle: 'romantic', userRequest: 'add roses' });
    expect(result).toContain('Style: romantic');
  });

  it('omits project style when not provided', () => {
    const service = createService();
    const result = service.buildPrompt({ intent: baseIntent, userRequest: 'add roses' });
    expect(result).not.toContain('Style:');
  });

  it('includes preserve rules when present', () => {
    const service = createService();
    const result = service.buildPrompt({
      intent: baseIntent, userRequest: 'add roses',
      preserveRules: { preserveLayout: true, preserveSubject: true, preserveColorPalette: true },
    });
    expect(result).toContain('Preserve: preserve subject (HIGH PRIORITY), preserve layout, preserve colors');
  });

  it('includes partial preserve rules', () => {
    const service = createService();
    const result = service.buildPrompt({
      intent: baseIntent, userRequest: 'add roses',
      preserveRules: { preserveSubject: true },
    });
    expect(result).toContain('Preserve: preserve subject (HIGH PRIORITY)');
  });

  it('omits preserve line when no preserve rules are set', () => {
    const service = createService();
    const result = service.buildPrompt({ intent: baseIntent, userRequest: 'add roses' });
    expect(result).not.toContain('Preserve:');
  });

  it('always includes negative constraints', () => {
    const service = createService();
    const result = service.buildPrompt({ intent: baseIntent, userRequest: 'add roses' });
    expect(result).toContain('Constraints: no watermark, no random text, no messy layout, no low quality');
  });

  it('sections are ordered: context → style → user → constraints', () => {
    const service = createService();
    const result = service.buildPrompt({
      intent: baseIntent, materialType: 'vow_card', projectStyle: 'elegant',
      userRequest: 'add roses', preserveRules: { preserveLayout: true },
    });
    const lines = result.split('\n');
    const idxTask = lines.findIndex((l) => l.includes('Task:'));
    const idxStyle = lines.findIndex((l) => l.includes('Style:'));
    const idxUser = lines.findIndex((l) => l.includes('User request:'));
    const idxConstraints = lines.findIndex((l) => l.includes('Constraints:'));
    expect(idxTask).toBeLessThan(idxUser);
    expect(idxStyle).toBeLessThan(idxUser);
    expect(idxUser).toBeLessThan(idxConstraints);
  });

  // -- buildRefinePrompt --
  it('builds refine prompt with original and feedback', () => {
    const service = createService();
    const result = service.buildRefinePrompt({ originalPrompt: 'add roses to the table', feedback: 'make them bigger' });
    expect(result).toContain('Original: add roses to the table');
    expect(result).toContain('Revision feedback: make them bigger');
  });

  it('includes keep rules in refine prompt', () => {
    const service = createService();
    const result = service.buildRefinePrompt({
      originalPrompt: 'add roses', feedback: 'bigger',
      preserveRules: { preserveLayout: true, preserveColorPalette: true },
    });
    expect(result).toContain('Preserve: layout, colors');
  });

  it('includes partial keep rules in refine prompt', () => {
    const service = createService();
    const result = service.buildRefinePrompt({
      originalPrompt: 'add roses', feedback: 'bigger',
      preserveRules: { preserveSubject: true },
    });
    expect(result).toContain('Preserve: subject');
  });

  it('omits keep line when no preserve rules in refine prompt', () => {
    const service = createService();
    const result = service.buildRefinePrompt({ originalPrompt: 'add roses', feedback: 'bigger' });
    expect(result).not.toContain('Preserve:');
  });

  it('omits keep line when preserve rules are all false', () => {
    const service = createService();
    const result = service.buildRefinePrompt({
      originalPrompt: 'add roses', feedback: 'bigger',
      preserveRules: { preserveLayout: false, preserveSubject: false, preserveColorPalette: false },
    });
    expect(result).not.toContain('Preserve:');
  });
});
