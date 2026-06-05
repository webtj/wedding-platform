export interface KanbanSubtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

export interface KanbanTask {
  id: string;
  title: string;
  status: string;
  priority: number;
  stageId?: string;
  sortOrder?: number;
  dueDate?: string | null;
  isBlocked?: boolean;
  assigneeType?: string;
  assignees?: KanbanAssignee[];
  taskMaterials?: KanbanTaskMaterial[];
  subtasks?: KanbanSubtask[];
  _count?: { subtasks: number };
}

export interface KanbanStage {
  id: string;
  name: string;
  status?: string;
  sortOrder?: number;
  taskCount: number;
  doneCount: number;
  tasks?: KanbanTask[];
}

export interface KanbanAssignee {
  id: string;
  memberId: string;
  member?: { id: string; displayName: string };
}

export interface KanbanTaskMaterial {
  id: string;
  taskId: string;
  materialId: string;
  confirmed: boolean;
  material?: {
    id: string;
    name: string;
    status: string;
    quantity?: number | null;
  };
}

export interface TenantMember {
  id: string;
  displayName: string;
}
