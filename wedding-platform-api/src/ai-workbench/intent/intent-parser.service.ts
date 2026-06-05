import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

export interface ParsedIntent {
  intent:
    | 'CREATE_NEW_IMAGE'
    | 'MODIFY_IMAGE'
    | 'REFERENCE_STYLE'
    | 'REFERENCE_SUBJECT'
    | 'CHANGE_MATERIAL_TYPE'
    | 'GENERATE_SERIES'
    | 'DOWNLOAD_IMAGE';
  confidence: number;
  targetImageId?: string;
  operations: Array<{
    type: 'CHANGE_COLOR' | 'CHANGE_BACKGROUND' | 'ADD_OBJECT' | 'REMOVE_OBJECT' | 'CHANGE_STYLE' | 'PRESERVE_SUBJECT' | 'PRESERVE_LAYOUT';
    value?: string;
    target?: string;
  }>;
  preserveRules: {
    preserveLayout?: boolean;
    preserveSubject?: boolean;
    preserveColorPalette?: boolean;
  };
}

const INTENT_PROMPT = `你是一个婚礼视觉 AI 助手的意图识别模块。

用户输入：{userInput}
当前设计状态：{designState}
对话历史：{conversationHistory}

请识别用户意图，输出 JSON：
{
  "intent": "CREATE_NEW_IMAGE | MODIFY_IMAGE | REFERENCE_STYLE | REFERENCE_SUBJECT | CHANGE_MATERIAL_TYPE | GENERATE_SERIES | DOWNLOAD_IMAGE",
  "confidence": 0.95,
  "operations": [
    {"type": "CHANGE_COLOR | CHANGE_BACKGROUND | ADD_OBJECT | REMOVE_OBJECT | CHANGE_STYLE | PRESERVE_SUBJECT | PRESERVE_LAYOUT", "value": "描述", "target": "目标"}
  ],
  "preserveRules": {
    "preserveLayout": true,
    "preserveSubject": true,
    "preserveColorPalette": true
  }
}

示例1:
用户输入: "生成一张红棕色复古风的婚礼誓言卡"
输出: {"intent": "CREATE_NEW_IMAGE", "confidence": 0.95, "operations": [], "preserveRules": {}}

示例2:
用户输入: "这张不错，花再少一点"
输出: {"intent": "MODIFY_IMAGE", "confidence": 0.9, "operations": [{"type": "REMOVE_OBJECT", "value": "花"}], "preserveRules": {"preserveLayout": true}}

示例3:
用户输入: "参考这张图的风格"
输出: {"intent": "REFERENCE_STYLE", "confidence": 0.9, "operations": [], "preserveRules": {}}

示例4:
用户输入: "把这只狗狗放在画面中间"
输出: {"intent": "REFERENCE_SUBJECT", "confidence": 0.88, "operations": [{"type": "ADD_OBJECT", "value": "宠物狗", "target": "画面中央"}], "preserveRules": {"preserveSubject": true}}

示例5:
用户输入: "把这张改成请柬的样式"
输出: {"intent": "CHANGE_MATERIAL_TYPE", "confidence": 0.92, "operations": [{"type": "CHANGE_STYLE", "value": "请柬"}], "preserveRules": {}}

示例6:
用户输入: "根据这张图生成同系列的桌卡和菜单"
输出: {"intent": "GENERATE_SERIES", "confidence": 0.95, "operations": [], "preserveRules": {"preserveStyle": true, "preserveColorPalette": true}}

示例7:
用户输入: "帮我下载这张图片"
输出: {"intent": "DOWNLOAD_IMAGE", "confidence": 0.98, "operations": [], "preserveRules": {}}

只输出 JSON，不要其他文字。`;

@Injectable()
export class IntentParserService {
  private readonly logger = new Logger(IntentParserService.name);

  constructor(private readonly llmService: LlmService) {}

  async parseIntent(
    userInput: string,
    designState?: any,
    conversationHistory?: string[],
  ): Promise<ParsedIntent> {
    try {
      const prompt = INTENT_PROMPT
        .replace('{userInput}', userInput)
        .replace('{designState}', JSON.stringify(designState || {}))
        .replace('{conversationHistory}', (conversationHistory || []).join('\n'));

      const result = await this.llmService.chat(prompt);

      try {
        const parsed = JSON.parse(result);
        if (parsed.intent && parsed.confidence) {
          return parsed;
        }
      } catch (e) {
        this.logger.warn(`Failed to parse intent JSON: ${e}`);
      }
    } catch (error) {
      this.logger.warn(`LLM call failed: ${error}`);
    }

    // Fallback to keyword matching
    return this.fallbackParse(userInput);
  }

  private fallbackParse(userInput: string): ParsedIntent {
    const input = userInput.toLowerCase();

    // DOWNLOAD_IMAGE: highest priority, very specific
    if (input.includes('下载') || input.includes('保存') || input.includes('导出')) {
      return {
        intent: 'DOWNLOAD_IMAGE',
        confidence: 0.7,
        operations: [],
        preserveRules: {},
      };
    }

    // REFERENCE_SUBJECT: preserve specific elements
    if (input.includes('保留') || input.includes('不要动') || input.includes('保持')) {
      return {
        intent: 'REFERENCE_SUBJECT',
        confidence: 0.7,
        operations: [],
        preserveRules: { preserveSubject: true },
      };
    }

    // REFERENCE_STYLE: style reference
    if (input.includes('参考') || input.includes('像这样') || input.includes('类似') || input.includes('同款')) {
      return {
        intent: 'REFERENCE_STYLE',
        confidence: 0.7,
        operations: [],
        preserveRules: {},
      };
    }

    // MODIFY_IMAGE: modification requests
    if (input.includes('改') || input.includes('调整') || input.includes('修改') || input.includes('变') || input.includes('换') || input.includes('少一点') || input.includes('多一点') || input.includes('更')) {
      return {
        intent: 'MODIFY_IMAGE',
        confidence: 0.7,
        operations: [],
        preserveRules: { preserveLayout: true },
      };
    }

    // CREATE_NEW_IMAGE: default for generation requests
    if (input.includes('生成') || input.includes('做一张') || input.includes('创建') || input.includes('画一张') || input.includes('设计')) {
      return {
        intent: 'CREATE_NEW_IMAGE',
        confidence: 0.7,
        operations: [],
        preserveRules: {},
      };
    }

    // Ultimate fallback
    return {
      intent: 'CREATE_NEW_IMAGE',
      confidence: 0.5,
      operations: [],
      preserveRules: {},
    };
  }
}
