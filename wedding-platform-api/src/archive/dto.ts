import {
  archiveProjectSchema,
  completeProjectSchema,
  createArchivePackageSchema,
  type ArchiveProjectInput,
  type CompleteProjectInput,
  type CreateArchivePackageInput
} from '@wedding/shared';

export { archiveProjectSchema, completeProjectSchema, createArchivePackageSchema };
export type ArchiveProjectDto = ArchiveProjectInput;
export type CompleteProjectDto = CompleteProjectInput;
export type CreateArchivePackageDto = CreateArchivePackageInput;
