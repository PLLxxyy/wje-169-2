export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  id: number;
  name: string;
  manager_id: number;
  manager_name?: string;
  estimated_hours: number;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  created_at: string;
  actual_hours?: number;
}

export interface Task {
  id: number;
  project_id: number;
  name: string;
  estimated_hours: number;
  created_at: string;
  actual_hours?: number;
}

export type TimeEntryStatus = 'pending' | 'approved' | 'rejected';

export interface TimeEntry {
  id: number;
  user_id: number;
  user_name?: string;
  project_id: number;
  project_name?: string;
  task_id: number;
  task_name?: string;
  date: string;
  hours: number;
  description: string;
  status: TimeEntryStatus;
  created_at: string;
  approved_at?: string | null;
}

export interface ProjectStats {
  projectId: number;
  projectName: string;
  estimatedHours: number;
  actualHours: number;
  usageRate: number;
  memberCount: number;
}

export interface PersonalStats {
  totalHours: number;
  byProject: Array<{
    projectId: number;
    projectName: string;
    hours: number;
    percentage: number;
  }>;
  calendarData: Array<{
    date: string;
    hours: number;
  }>;
}

export interface ProjectDetailStats extends ProjectStats {
  tasks: Array<{
    taskId: number;
    taskName: string;
    estimatedHours: number;
    actualHours: number;
  }>;
  members: Array<{
    userId: number;
    userName: string;
    approvedHours: number;
    pendingHours: number;
    totalHours: number;
  }>;
}

export interface OverviewStats {
  totalProjects: number;
  totalUsers: number;
  totalHours: number;
  pendingCount: number;
  projectUsage: Array<{
    projectId: number;
    projectName: string;
    estimatedHours: number;
    actualHours: number;
  }>;
  memberRanking: Array<{
    userId: number;
    userName: string;
    totalHours: number;
    projectCount: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
