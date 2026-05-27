export type ProcessTemplate = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  _count?: { stages: number };
  stages?: TemplateStage[];
};

export type TemplateStage = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  tasks?: TemplateTask[];
};

export type TemplateTask = {
  id: string;
  title: string;
  description?: string | null;
  assigneeType: string;
  assignedRoleId?: string | null;
  assignedRole?: { id: string; name: string } | null;
  assignees?: { id: string; memberId: string; member: { id: string; displayName: string } }[];
  priority: number;
  offsetDays: number;
  sortOrder: number;
};

export type TemplateFilters = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
};
