import { describe, expect, it } from 'vitest';
import { TemplateAiProvider } from './template-ai-provider';

describe('TemplateAiProvider', () => {
  it('generates backend-connected template content', () => {
    const provider = new TemplateAiProvider();
    const result = provider.generate({
      type: 'vows',
      projectName: '李想 & 周安',
      prompt: '温柔、自然、草坪婚礼'
    });

    expect(result.title).toBe('誓言草稿');
    expect(result.content).toContain('李想 & 周安');
  });
});
