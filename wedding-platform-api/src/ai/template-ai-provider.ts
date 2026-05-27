import { Injectable } from '@nestjs/common';
import { AiProvider, type AiGenerateInput, type AiGeneratedText, type AiRefineInput } from './ai-provider';

@Injectable()
export class TemplateAiProvider extends AiProvider {
  generate(input: AiGenerateInput): AiGeneratedText {
    const titleMap: Record<string, string> = {
      vows: '誓言草稿',
      speech: '致辞草稿',
      social_copy: '朋友圈文案',
      planner_marketing: '策划案例文案'
    };
    const title = titleMap[input.type] ?? '婚礼文案';
    return {
      title,
      content: `【${title}】\n项目：${input.projectName}\n要点：${input.prompt}\n\n这是一版基于项目上下文生成的模板内容，可在后续接入真实 AI 提供商。`
    };
  }

  refine(input: AiRefineInput): AiGeneratedText {
    return {
      title: `${input.originalTitle} - 润色版`,
      content: `${input.originalContent}\n\n【润色要求】${input.instruction}\n【模板润色结果】语气更自然，结构更清晰，保留原始信息。`
    };
  }
}
