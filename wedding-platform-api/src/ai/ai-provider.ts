export type AiGenerateInput = {
  type: string;
  prompt: string;
  projectName: string;
};

export type AiRefineInput = {
  originalTitle: string;
  originalContent: string;
  instruction: string;
};

export type AiGeneratedText = {
  title: string;
  content: string;
};

export abstract class AiProvider {
  abstract generate(input: AiGenerateInput): AiGeneratedText;
  abstract refine(input: AiRefineInput): AiGeneratedText;
}
