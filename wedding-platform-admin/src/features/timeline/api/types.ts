export type CalendarDayItem = {
  date: string;
  isWeekend: boolean;
  projects: Array<{ id: string; no: string; name: string; venue: string | null }>;
  tasks: Array<{ id: string; title: string; time: string | null; projectId: string; projectName: string; priority: number }>;
};

export type CalendarStats = {
  projects: number;
  activeProjects: number;
  pendingTasks: number;
  doneTasks: number;
};

export type CalendarData = {
  today: string;
  monthStart: string;
  monthEnd: string;
  view: 'recent' | 'natural';
  mode: 'project' | 'task';
  stats: CalendarStats;
  days: CalendarDayItem[];
};

export type CalendarQuery = {
  mode: 'project' | 'task';
  view: 'recent' | 'natural';
  date: string;
};
