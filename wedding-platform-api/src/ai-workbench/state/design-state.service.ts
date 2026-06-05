import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

const DesignStateSchema = z.object({
  version: z.number().optional(),
  currentMaterialType: z.string().optional(),
  currentStyle: z.array(z.string()).optional(),
  currentColorPalette: z.array(z.string()).optional(),
  currentImageId: z.string().optional(),
  referenceImages: z.array(z.object({
    id: z.string(),
    role: z.string(),
  })).optional(),
  subjectImages: z.array(z.object({
    id: z.string(),
    role: z.string(),
  })).optional(),
  negativeConstraints: z.array(z.string()).optional(),
  preserveRules: z.object({
    preserveLayout: z.boolean().optional(),
    preserveSubject: z.boolean().optional(),
    preserveColorPalette: z.boolean().optional(),
  }).optional(),
});

export type DesignState = z.infer<typeof DesignStateSchema>;

const CURRENT_VERSION = 1;

@Injectable()
export class DesignStateService {
  private readonly logger = new Logger(DesignStateService.name);

  createInitialState(projectStyle?: string): DesignState {
    return {
      version: CURRENT_VERSION,
      currentStyle: projectStyle ? [projectStyle] : [],
      negativeConstraints: ['no watermark', 'no messy layout', 'no wrong text'],
      preserveRules: {},
    };
  }

  updateState(current: DesignState, updates: Partial<DesignState>): DesignState {
    return {
      ...current,
      ...updates,
      version: CURRENT_VERSION,
      preserveRules: {
        ...current.preserveRules,
        ...updates.preserveRules,
      },
    };
  }

  addReferenceImage(state: DesignState, id: string, role: string): DesignState {
    const images = [...(state.referenceImages || [])];
    images.push({ id, role });
    return { ...state, referenceImages: images };
  }

  addSubjectImage(state: DesignState, id: string, role: string): DesignState {
    const images = [...(state.subjectImages || [])];
    images.push({ id, role });
    return { ...state, subjectImages: images };
  }

  setCurrentImage(state: DesignState, imageId: string): DesignState {
    return { ...state, currentImageId: imageId };
  }

  setMaterialType(state: DesignState, materialType: string): DesignState {
    return { ...state, currentMaterialType: materialType };
  }

  toJSON(state: DesignState): DesignState {
    return state;
  }

  fromJSON(data: unknown): DesignState {
    const result = DesignStateSchema.safeParse(data);
    if (!result.success) {
      this.logger.warn(`Invalid DesignState, using defaults: ${result.error.message}`);
      return this.createInitialState();
    }
    const state = result.data;
    // Version migration: if stored version is older, log it and upgrade in-place
    if ((state.version ?? 0) < CURRENT_VERSION) {
      this.logger.log(`Migrating DesignState from v${state.version ?? 0} to v${CURRENT_VERSION}`);
      state.version = CURRENT_VERSION;
    }
    return state;
  }
}
