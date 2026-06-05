import { describe, expect, it, vi } from "vitest";
import { AiWorkbenchService } from "./ai-workbench.service";
import { AppError } from "../common/errors/app-error";

function createService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    aiGeneration: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    materialType: {
      findFirst: vi.fn(),
    },
    ...overrides,
  } as any;

  const service = new AiWorkbenchService(
    prisma,
    { expandPrompt: vi.fn(), expandRefinePrompt: vi.fn(), buildSeriesPrompt: vi.fn() } as any,
    { generate: vi.fn() } as any,
    { checkQuota: vi.fn(), recordUsage: vi.fn(), getUsageStats: vi.fn() } as any,
    { create: vi.fn(), findById: vi.fn(), list: vi.fn(), addMessage: vi.fn(), updateDesignState: vi.fn(), updateCurrentGeneration: vi.fn() } as any,
    { parseIntent: vi.fn() } as any,
    { buildPrompt: vi.fn(), buildRefinePrompt: vi.fn() } as any,
    { createInitialState: vi.fn(), updateState: vi.fn() } as any,
    { compose: vi.fn() } as any,
    { get: vi.fn(), list: vi.fn(), getByType: vi.fn() } as any,
    { upload: vi.fn(), download: vi.fn(), delete: vi.fn(), getUrl: vi.fn() } as any,
    { create: vi.fn(), createFromFile: vi.fn(), findById: vi.fn(), list: vi.fn(), delete: vi.fn() } as any,
    { getByGroup: vi.fn().mockResolvedValue([]) } as any,
    { emitStarted: vi.fn(), emitProgress: vi.fn(), emitCompleted: vi.fn(), emitFailed: vi.fn(), getEvents: vi.fn() } as any,
  );

  return { service, prisma };
}

describe("AiWorkbenchService", () => {
  // ── bookmark ──
  it("bookmarks an existing generation", async () => {
    const { service, prisma } = createService();
    prisma.aiGeneration.findFirst.mockResolvedValue({ id: "gen_1", tenantId: "t1" });
    prisma.aiGeneration.update.mockResolvedValue({
      id: "gen_1",
      isBookmarked: true,
      businessTags: ["客户喜欢"],
    });

    const result = await service.updateBookmark("t1", "gen_1", {
      isBookmarked: true,
      businessTags: ["客户喜欢"],
    });

    expect(result.isBookmarked).toBe(true);
    expect(prisma.aiGeneration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "gen_1" },
        data: expect.objectContaining({
          isBookmarked: true,
          businessTags: ["客户喜欢"],
        }),
      }),
    );
  });

  it("throws AppError when bookmarking missing generation", async () => {
    const { service, prisma } = createService();
    prisma.aiGeneration.findFirst.mockResolvedValue(null);

    await expect(
      service.updateBookmark("t1", "missing", { isBookmarked: true }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("unsets bookmark and clears bookmarkedAt", async () => {
    const { service, prisma } = createService();
    prisma.aiGeneration.findFirst.mockResolvedValue({ id: "gen_1", tenantId: "t1" });
    prisma.aiGeneration.update.mockResolvedValue({ id: "gen_1", isBookmarked: false });

    await service.updateBookmark("t1", "gen_1", { isBookmarked: false });

    const call = prisma.aiGeneration.update.mock.calls[0]![0];
    expect(call.data.isBookmarked).toBe(false);
    expect(call.data.bookmarkedAt).toBeNull();
  });

  // ── listGenerations with isBookmarked filter ──
  it("filters generations by isBookmarked", async () => {
    const { service, prisma } = createService();
    prisma.aiGeneration.findMany.mockResolvedValue([]);
    prisma.aiGeneration.count.mockResolvedValue(0);

    await service.listGenerations("t1", {
      isBookmarked: true,
      page: 1,
      pageSize: 20,
    });

    expect(prisma.aiGeneration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isBookmarked: true }) }),
    );
  });

  // ── getGeneration ──
  it("throws AppError for missing generation", async () => {
    const { service, prisma } = createService();
    prisma.aiGeneration.findFirst.mockResolvedValue(null);

    await expect(service.getGeneration("t1", "missing")).rejects.toBeInstanceOf(AppError);
  });

  // ── deleteGeneration ──
  it("deletes an existing generation", async () => {
    const { service, prisma } = createService();
    prisma.aiGeneration.findFirst.mockResolvedValue({ id: "gen_1" });
    prisma.aiGeneration.delete.mockResolvedValue({ id: "gen_1" });

    const result = await service.deleteGeneration("t1", "gen_1");
    expect(result.deleted).toBe(true);
  });

  // ── markGenerationFailed ──
  it("marks a generation as failed with sanitized error", async () => {
    const { service, prisma } = createService();
    prisma.aiGeneration.update.mockResolvedValue({ id: "gen_1", status: "failed" });

    // Access private method via type cast
    await (service as any).markGenerationFailed("gen_1", new Error("API timeout after 30s"));

    expect(prisma.aiGeneration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
  });

  it("truncates long error messages", async () => {
    const { service, prisma } = createService();
    prisma.aiGeneration.update.mockResolvedValue({ id: "gen_1" });
    const longMsg = "x".repeat(5000);

    await (service as any).markGenerationFailed("gen_1", new Error(longMsg));

    const call = prisma.aiGeneration.update.mock.calls[0]![0];
    expect((call.data.errorMessage as string).length).toBeLessThanOrEqual(2000);
  });
});
