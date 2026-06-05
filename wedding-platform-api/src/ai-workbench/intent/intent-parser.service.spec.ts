import { describe, expect, it, vi } from 'vitest';
import { IntentParserService } from './intent-parser.service';

function createService(overrides: Record<string, unknown> = {}) {
  const llmService = {
    chat: vi.fn(),
    ...overrides,
  } as any;

  const service = new IntentParserService(llmService);
  return { service, llmService };
}

describe('IntentParserService', () => {
  // -- parseIntent happy path --
  it('parses intent from LLM response', async () => {
    const { service, llmService } = createService();
    const parsed = {
      intent: 'CREATE_NEW_IMAGE',
      confidence: 0.95,
      operations: [{ type: 'CHANGE_COLOR', value: 'blue' }],
      preserveRules: { preserveSubject: true },
    };
    llmService.chat.mockResolvedValue(JSON.stringify(parsed));

    const result = await service.parseIntent('make a blue bouquet');

    expect(result).toEqual(parsed);
    expect(llmService.chat).toHaveBeenCalledOnce();
  });

  it('includes designState and conversationHistory in the prompt', async () => {
    const { service, llmService } = createService();
    llmService.chat.mockResolvedValue(
      JSON.stringify({ intent: 'CREATE_NEW_IMAGE', confidence: 0.9, operations: [], preserveRules: {} }),
    );

    const designState = { currentStyle: ['romantic'] };
    const history = ['prev message 1', 'prev message 2'];

    await service.parseIntent('add flowers', designState, history);

    const prompt: string = llmService.chat.mock.calls[0]![0];
    expect(prompt).toContain('add flowers');
    expect(prompt).toContain('"currentStyle"');
    expect(prompt).toContain('prev message 1');
    expect(prompt).toContain('prev message 2');
  });

  // -- fallback: LLM throws --
  it('falls back to MODIFY_IMAGE when input contains "改"', async () => {
    const { service, llmService } = createService();
    llmService.chat.mockRejectedValue(new Error('LLM timeout'));

    const result = await service.parseIntent('改一下颜色');

    expect(result.intent).toBe('MODIFY_IMAGE');
    expect(result.confidence).toBe(0.7);
  });

  it('falls back to MODIFY_IMAGE when input contains "调整"', async () => {
    const { service, llmService } = createService();
    llmService.chat.mockRejectedValue(new Error('LLM error'));

    const result = await service.parseIntent('调整一下布局');

    expect(result.intent).toBe('MODIFY_IMAGE');
    expect(result.confidence).toBe(0.7);
  });

  it('falls back to MODIFY_IMAGE when input contains "修改"', async () => {
    const { service, llmService } = createService();
    llmService.chat.mockRejectedValue(new Error('LLM error'));

    const result = await service.parseIntent('修改样式');

    expect(result.intent).toBe('MODIFY_IMAGE');
    expect(result.confidence).toBe(0.7);
  });

  it('falls back to REFERENCE_STYLE when input contains "参考"', async () => {
    const { service, llmService } = createService();
    llmService.chat.mockRejectedValue(new Error('LLM error'));

    const result = await service.parseIntent('参考这张图的风格');

    expect(result.intent).toBe('REFERENCE_STYLE');
    expect(result.confidence).toBe(0.7);
  });

  it('falls back to REFERENCE_STYLE when input contains "像这样"', async () => {
    const { service, llmService } = createService();
    llmService.chat.mockRejectedValue(new Error('LLM error'));

    const result = await service.parseIntent('像这样生成');

    expect(result.intent).toBe('REFERENCE_STYLE');
    expect(result.confidence).toBe(0.7);
  });

  it('falls back to CREATE_NEW_IMAGE for unmatched input', async () => {
    const { service, llmService } = createService();
    llmService.chat.mockRejectedValue(new Error('LLM error'));

    const result = await service.parseIntent('generate a bouquet');

    expect(result.intent).toBe('CREATE_NEW_IMAGE');
    expect(result.confidence).toBe(0.5);
    expect(result.operations).toEqual([]);
    expect(result.preserveRules).toEqual({});
  });

  // -- fallback: invalid JSON from LLM --
  it('falls back when LLM returns invalid JSON', async () => {
    const { service, llmService } = createService();
    llmService.chat.mockResolvedValue('not valid json');

    const result = await service.parseIntent('do something');

    expect(result.intent).toBe('CREATE_NEW_IMAGE');
    expect(result.confidence).toBe(0.5);
  });
});
