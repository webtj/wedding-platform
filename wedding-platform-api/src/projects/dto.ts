import { z } from 'zod';
import {
  createProjectStageSchema,
  updateProjectSchema,
  updateProjectStageSchema,
  type CreateProjectStageInput,
  type UpdateProjectInput,
  type UpdateProjectStageInput
} from '@wedding/shared';

export { updateProjectSchema, createProjectStageSchema, updateProjectStageSchema };
export type UpdateProjectDto = UpdateProjectInput;
export type CreateProjectStageDto = CreateProjectStageInput;
export type UpdateProjectStageDto = UpdateProjectStageInput;

export const createCoupleInvitationSchema = z.object({
  invitedName: z.string().trim().min(1).max(80),
  invitedPhone: z.string().trim().max(40).optional()
});

export type CreateCoupleInvitationDto = z.infer<typeof createCoupleInvitationSchema>;
