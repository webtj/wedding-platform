import { describe, expect, it, vi } from "vitest";
import { LlmService } from "./llm.service";

function createLlmService(settings: Record<string, unknown> = {}) {
  const settingsService = {
    getByGroup: vi.fn().mockResolvedValue([
      { key: "ai.llm", value: { provider: "openai", baseUrl: "", apiKey: "", model: "", enabled: false } }
    ]),
    ...settings,
  } as any;

  const registry = { resolve: vi.fn() } as any;
  const templateService = {
    getMaterialPrompt: vi.fn().mockReturnValue(''),
    getStyleDescription: vi.fn().mockReturnValue('french_pastoral'),
    getMaterialInstruction: vi.fn().mockReturnValue(''),
  } as any;

  return new LlmService(settingsService, registry, templateService);
}

describe("LlmService", () => {
  it("expandRefinePrompt builds business-aware refine input", async () => {
    const svc = createLlmService();

    // Mock expandPrompt to return a predictable string
    const expandSpy = vi.spyOn(svc, "expandPrompt").mockResolvedValue("revised prompt output");

    const result = await svc.expandRefinePrompt({
      originalPrompt: "window roses",
      originalAiPrompt: "French pastoral...",
      feedback: "make it more romantic",
      materialCode: "vow_card",
      style: "french_pastoral",
      size: { width: 120, height: 170 },
    });

    expect(result).toBe("revised prompt output");
    expect(expandSpy).toHaveBeenCalledWith(
      expect.stringContaining("Revise the wedding image generation prompt"),
      "vow_card",
      "french_pastoral",
      { width: 120, height: 170 },
    );
    expect(expandSpy.mock.calls[0]![0]).toContain("make it more romantic");
    expect(expandSpy.mock.calls[0]![0]).toContain("window roses");
    expect(expandSpy.mock.calls[0]![0]).toContain("Keep the useful visual structure");
  });

  it("buildSeriesPrompt includes source and target material context", async () => {
    const svc = createLlmService();
    const expandSpy = vi.spyOn(svc, "expandPrompt").mockResolvedValue("series prompt output");

    const result = await svc.buildSeriesPrompt({
      originalPrompt: "flower arch",
      originalAiPrompt: "French pastoral arch...",
      sourceMaterialCode: "vow_card",
      targetMaterialCode: "table_card",
      style: "french_pastoral",
      size: { width: 120, height: 170 },
      instruction: "keep same flowers, smaller format",
    });

    expect(result).toBe("series prompt output");
    const callText = expandSpy.mock.calls[0]![0] as string;
    expect(callText).toContain("Source material: vow_card");
    expect(callText).toContain("Target material: table_card");
    expect(callText).toContain("keep same flowers, smaller format");
    expect(expandSpy).toHaveBeenCalledWith(
      expect.any(String),
      "table_card",
      "french_pastoral",
      { width: 120, height: 170 },
    );
  });
});
