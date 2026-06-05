import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../ai-workbench/llm/llm.service';
import { ImageService } from '../ai-workbench/image/image.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { SettingsService } from '../settings/settings.service';
import type {
  AutoArrangeDto,
  SuggestLayoutDto,
  GenerateSeatCardsDto,
  TableAssignment,
  LayoutSuggestion,
  SeatCardData,
} from './dto';

const ARRANGEMENT_SYSTEM_PROMPT = `You are a professional wedding planner specializing in seating arrangements.

Your task is to create optimal seating arrangements for wedding banquets considering:
1. Guest relationships and groups (family, friends, colleagues)
2. VIP guests should be placed at premium tables (near stage, at front)
3. Keep groups together when possible
4. Consider age and mobility (elderly guests away from loud music)
5. Balance tables so no table is too empty or overcrowded
6. Respect table preferences when specified

Output a JSON array of table assignments with the following structure:
{
  "tables": [
    {
      "tableNumber": 1,
      "tableName": "VIP Table 1",
      "guests": [
        { "name": "Guest Name", "group": "family", "seatPosition": 1 }
      ],
      "position": { "x": 5, "y": 3 }
    }
  ],
  "reasoning": "Explanation of arrangement logic"
}`;

const LAYOUT_SYSTEM_PROMPT = `You are an expert wedding venue designer.

Your task is to suggest optimal table layouts for wedding banquets considering:
1. Venue dimensions and shape
2. Guest count and table capacity
3. Stage/ceremony area positioning
4. Traffic flow and aisles for service
5. Emergency exits and accessibility
6. Visual aesthetics and balance

Output a JSON object with layout suggestions:
{
  "suggestions": [
    {
      "id": "layout_1",
      "name": "Classic Banquet Layout",
      "description": "Description of the layout",
      "tables": [
        {
          "tableNumber": 1,
          "type": "round",
          "capacity": 10,
          "position": { "x": 5, "y": 3 },
          "size": { "width": 2, "depth": 2 }
        }
      ],
      "aisles": [...],
      "score": 0.95,
      "reasoning": "Why this layout works well"
    }
  ]
}`;

@Injectable()
export class SceneAiService {
  private readonly logger = new Logger(SceneAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly imageService: ImageService,
    private readonly objectStorage: ObjectStorageService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Auto-arrange seats based on guest list using AI
   */
  async autoArrange(tenantId: string, sceneId: string, data: AutoArrangeDto) {
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, tenantId },
      include: { project: { select: { id: true, brideName: true, groomName: true } } },
    });
    if (!scene) throw new NotFoundException('Scene not found');

    const venue = (scene.sceneData as any)?.venue ?? { width: scene.width, depth: scene.height };
    const tableCount = data.tableCount ?? this.calculateOptimalTableCount(data.guestList.length, data.seatsPerTable ?? 10);
    const seatsPerTable = data.seatsPerTable ?? Math.ceil(data.guestList.length / tableCount);

    // Build the prompt for AI
    const guestListStr = data.guestList
      .map((g) => `- ${g.name}${g.group ? ` (Group: ${g.group})` : ''}${g.tablePreference ? ` [Prefers: ${g.tablePreference}]` : ''}`)
      .join('\n');

    const constraintsStr = data.constraints
      ? `Constraints:
- Keep groups together: ${data.constraints.keepGroupsTogether}
- VIP tables: ${data.constraints.vipTables}
${data.constraints.avoidPairs ? `- Avoid seating together: ${data.constraints.avoidPairs.map(([a, b]) => `${a} & ${b}`).join(', ')}` : ''}`
      : 'No special constraints.';

    const prompt = `Wedding seating arrangement for ${scene.project?.brideName ?? 'Bride'} & ${scene.project?.groomName ?? 'Groom'}'s wedding.

Venue: ${venue.width}m x ${venue.depth}m
Total guests: ${data.guestList.length}
Tables available: ${tableCount}
Seats per table: ${seatsPerTable}

Guest List:
${guestListStr}

${constraintsStr}

Please create an optimal seating arrangement that respects all constraints and creates a pleasant experience for all guests.`;

    try {
      const response = await this.llmService.chat(prompt, ARRANGEMENT_SYSTEM_PROMPT);
      const parsed = this.parseArrangementResponse(response, tableCount, seatsPerTable, venue);

      // Update scene with new table assignments
      const sceneData = scene.sceneData as any;
      const updatedObjects = this.buildTableObjects(parsed.tables, venue);

      await this.prisma.scene.update({
        where: { id: sceneId },
        data: {
          sceneData: {
            ...sceneData,
            objects: [...(sceneData.objects ?? []).filter((o: any) => o.category !== 'table'), ...updatedObjects],
            aiArrangement: {
              tables: parsed.tables,
              reasoning: parsed.reasoning,
              arrangedAt: new Date().toISOString(),
            },
          },
          version: { increment: 1 },
        },
      });

      return {
        tables: parsed.tables,
        reasoning: parsed.reasoning,
        tableCount,
        seatsPerTable,
      };
    } catch (error) {
      this.logger.error(`Auto-arrange failed: ${error}`);
      // Fallback to rule-based arrangement
      return this.fallbackArrangement(data, tableCount, seatsPerTable, venue);
    }
  }

  /**
   * Suggest optimal table layouts based on venue and guest count
   */
  async suggestLayout(tenantId: string, sceneId: string, data: SuggestLayoutDto) {
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, tenantId },
    });
    if (!scene) throw new NotFoundException('Scene not found');

    const prompt = `Wedding venue layout suggestion request.

Venue dimensions: ${data.venueWidth}m x ${data.venueDepth}m
Guest count: ${data.guestCount}
Preferred table style: ${data.style}
Stage position: ${data.stagePosition}
${data.specialRequirements ? `Special requirements: ${data.specialRequirements}` : ''}

Please suggest 2-3 optimal layout options that maximize space utilization, guest comfort, and visual appeal. Consider:
1. Table sizes and shapes appropriate for the style
2. Aisle widths for service and movement (minimum 1.2m)
3. Stage proximity for VIP tables
4. Balance and symmetry in the layout
5. Emergency exit accessibility

For each table, specify position in meters from the venue origin (0,0 is top-left).`;

    try {
      const response = await this.llmService.chat(prompt, LAYOUT_SYSTEM_PROMPT);
      const parsed = this.parseLayoutResponse(response, data);

      return {
        suggestions: parsed.suggestions,
        venueWidth: data.venueWidth,
        venueDepth: data.venueDepth,
      };
    } catch (error) {
      this.logger.error(`Layout suggestion failed: ${error}`);
      // Fallback to template-based layouts
      return this.fallbackLayoutSuggestion(data);
    }
  }

  /**
   * Generate personalized seat cards for guests
   */
  async generateSeatCards(tenantId: string, sceneId: string, data: GenerateSeatCardsDto) {
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, tenantId },
      include: { project: { select: { id: true, brideName: true, groomName: true } } },
    });
    if (!scene) throw new NotFoundException('Scene not found');

    const results: SeatCardData[] = [];
    const errors: Array<{ tableNumber: number; guestName: string; error: string }> = [];

    // Generate seat cards in batches to avoid rate limiting
    for (const table of data.tableAssignments) {
      for (const guest of table.guests) {
        try {
          const prompt = this.buildSeatCardPrompt(
            scene.project?.brideName ?? 'Bride',
            scene.project?.groomName ?? 'Groom',
            table.tableName ?? `Table ${table.tableNumber}`,
            guest.name,
            guest.title,
            data.style,
            data.language,
          );

          // Use the image service to generate a seat card
          const imageResult = await this.imageService.generate(
            prompt,
            { width: 800, height: 600 }, // Standard seat card size
            'text2img',
            undefined,
          );

          if (imageResult.images && imageResult.images.length > 0) {
            // Upload to storage
            const imageUrl = imageResult.images[0]!;
            results.push({
              tableNumber: table.tableNumber,
              tableName: table.tableName ?? `Table ${table.tableNumber}`,
              guestName: guest.name,
              guestTitle: guest.title,
              imageUrl,
              templateStyle: data.style,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to generate seat card for ${guest.name}: ${error}`);
          errors.push({
            tableNumber: table.tableNumber,
            guestName: guest.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Save generation metadata to scene
    const sceneData = scene.sceneData as any;
    await this.prisma.scene.update({
      where: { id: sceneId },
      data: {
        sceneData: {
          ...sceneData,
          aiSeatCards: {
            generatedAt: new Date().toISOString(),
            style: data.style,
            language: data.language,
            count: results.length,
          },
        },
      },
    });

    return {
      cards: results,
      totalRequested: data.tableAssignments.reduce((sum, t) => sum + t.guests.length, 0),
      generated: results.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ── Private Helper Methods ─────────────────────────────────────────────

  private calculateOptimalTableCount(guestCount: number, seatsPerTable: number): number {
    return Math.ceil(guestCount / seatsPerTable);
  }

  private parseArrangementResponse(
    response: string,
    tableCount: number,
    seatsPerTable: number,
    venue: { width: number; depth: number },
  ): { tables: TableAssignment[]; reasoning: string } {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tables && Array.isArray(parsed.tables)) {
          return {
            tables: parsed.tables.map((t: any, i: number) => ({
              tableNumber: t.tableNumber ?? i + 1,
              tableName: t.tableName ?? `Table ${i + 1}`,
              guests: (t.guests ?? []).map((g: any, j: number) => ({
                name: g.name ?? `Guest ${j + 1}`,
                group: g.group,
                seatPosition: g.seatPosition ?? j + 1,
              })),
              position: t.position ?? this.calculateDefaultPosition(i, tableCount, venue),
            })),
            reasoning: parsed.reasoning ?? 'AI-optimized seating arrangement',
          };
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to parse AI arrangement response: ${e}`);
    }

    // Fallback: return empty tables
    return {
      tables: Array.from({ length: tableCount }, (_, i) => ({
        tableNumber: i + 1,
        tableName: `Table ${i + 1}`,
        guests: [],
        position: this.calculateDefaultPosition(i, tableCount, venue),
      })),
      reasoning: 'Unable to parse AI response, using default arrangement',
    };
  }

  private parseLayoutResponse(
    response: string,
    data: SuggestLayoutDto,
  ): { suggestions: LayoutSuggestion[] } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          return {
            suggestions: parsed.suggestions.map((s: any, i: number) => ({
              id: s.id ?? `layout_${i + 1}`,
              name: s.name ?? `Layout Option ${i + 1}`,
              description: s.description ?? '',
              tables: (s.tables ?? []).map((t: any) => ({
                tableNumber: t.tableNumber,
                type: t.type ?? 'round',
                capacity: t.capacity ?? 10,
                position: t.position ?? { x: 0, y: 0 },
                size: t.size ?? { width: 2, depth: 2 },
              })),
              aisles: s.aisles ?? [],
              score: s.score ?? 0.8,
              reasoning: s.reasoning ?? '',
            })),
          };
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to parse AI layout response: ${e}`);
    }

    return { suggestions: [] };
  }

  private buildSeatCardPrompt(
    brideName: string,
    groomName: string,
    tableName: string,
    guestName: string,
    guestTitle: string | undefined,
    style: string,
    language: string,
  ): string {
    const styleDescriptions: Record<string, string> = {
      elegant: 'luxurious, gold accents, serif typography, cream and champagne colors',
      modern: 'clean lines, minimalist, sans-serif typography, monochrome with accent color',
      rustic: 'natural textures, kraft paper, handwritten style, earth tones, botanical elements',
      minimalist: 'simple, white space, thin typography, single accent color',
      floral: 'watercolor flowers, soft pastels, romantic typography, garden-inspired',
    };

    const styleDesc = styleDescriptions[style] ?? styleDescriptions.elegant;

    const nameText = language === 'en'
      ? guestName
      : language === 'both'
        ? `${guestName}\n${guestTitle ?? ''}`
        : guestName;

    return `Elegant wedding seat card design.
Style: ${styleDesc}
Wedding: ${brideName} & ${groomName}
Table: ${tableName}
Guest name displayed prominently: ${nameText}
${guestTitle ? `Guest title/relationship: ${guestTitle}` : ''}
Professional calligraphy or typography, high quality print-ready design, centered composition, subtle wedding motifs, no text errors, 4k high-definition`;
  }

  private calculateDefaultPosition(
    index: number,
    total: number,
    venue: { width: number; depth: number },
  ): { x: number; y: number } {
    // Simple grid layout calculation
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const cellWidth = venue.width / (cols + 1);
    const cellDepth = venue.depth / (Math.ceil(total / cols) + 1);

    return {
      x: Math.round((col + 1) * cellWidth * 100) / 100,
      y: Math.round((row + 1) * cellDepth * 100) / 100,
    };
  }

  private buildTableObjects(
    tables: TableAssignment[],
    venue: { width: number; depth: number },
  ): any[] {
    return tables.map((table) => ({
      id: `table_ai_${table.tableNumber}_${Date.now()}`,
      type: 'round_table_10',
      category: 'table',
      name: table.tableName,
      position: table.position,
      size: { width: 2, depth: 2, height: 0.75 },
      rotation: 0,
      layerId: 'tables',
      locked: false,
      visible: true,
      style: { color: '#C9A45C' },
      business: {
        tableNumber: table.tableNumber,
        guests: table.guests,
        aiGenerated: true,
      },
    }));
  }

  private fallbackArrangement(
    data: AutoArrangeDto,
    tableCount: number,
    seatsPerTable: number,
    venue: { width: number; depth: number },
  ): { tables: TableAssignment[]; reasoning: string } {
    // Rule-based fallback arrangement
    const tables: TableAssignment[] = [];
    const guests = [...data.guestList];

    // Sort by group if keepGroupsTogether is true
    if (data.constraints?.keepGroupsTogether) {
      guests.sort((a, b) => (a.group ?? '').localeCompare(b.group ?? ''));
    }

    // Distribute guests across tables
    for (let i = 0; i < tableCount; i++) {
      const tableGuests = guests.splice(0, seatsPerTable);
      tables.push({
        tableNumber: i + 1,
        tableName: i < (data.constraints?.vipTables ?? 0) ? `VIP Table ${i + 1}` : `Table ${i + 1}`,
        guests: tableGuests.map((g, j) => ({
          name: g.name,
          group: g.group,
          seatPosition: j + 1,
        })),
        position: this.calculateDefaultPosition(i, tableCount, venue),
      });
    }

    return {
      tables,
      reasoning: 'Rule-based arrangement (AI service unavailable)',
    };
  }

  private fallbackLayoutSuggestion(data: SuggestLayoutDto): { suggestions: LayoutSuggestion[] } {
    const tableCapacity = data.style === 'round_tables' ? 10 : 8;
    const tableCount = Math.ceil(data.guestCount / tableCapacity);
    const tableWidth = data.style === 'round_tables' ? 2 : 2.4;
    const tableDepth = data.style === 'round_tables' ? 2 : 1.2;

    // Calculate grid layout
    const cols = Math.ceil(Math.sqrt(tableCount));
    const rows = Math.ceil(tableCount / cols);
    const cellWidth = data.venueWidth / (cols + 1);
    const cellDepth = data.venueDepth / (rows + 1);

    const tables = Array.from({ length: tableCount }, (_, i) => ({
      tableNumber: i + 1,
      type: (data.style === 'rectangular_tables' ? 'rectangular' : 'round') as 'round' | 'rectangular',
      capacity: tableCapacity,
      position: {
        x: Math.round(((i % cols) + 1) * cellWidth * 100) / 100,
        y: Math.round((Math.floor(i / cols) + 1) * cellDepth * 100) / 100,
      },
      size: { width: tableWidth, depth: tableDepth },
    }));

    return {
      suggestions: [
        {
          id: 'fallback_grid',
          name: '标准网格布局',
          description: '整齐排列的桌位布局，适合大多数宴会厅',
          tables,
          aisles: [],
          score: 0.7,
          reasoning: '基于规则的标准布局（AI服务不可用）',
        },
      ],
    };
  }
}
