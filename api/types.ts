export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface UserWithPassword extends User {
  password: string;
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
  task_progress?: number;
}

export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: number;
  project_id: number;
  name: string;
  estimated_hours: number;
  status: TaskStatus;
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

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateProjectRequest {
  name: string;
  managerId: number;
  estimatedHours: number;
  startDate: string;
  endDate: string;
}

export interface CreateTaskRequest {
  name: string;
  estimatedHours: number;
}

export interface CreateTimeEntryRequest {
  projectId: number;
  taskId: number;
  date: string;
  hours: number;
  description: string;
}

export interface ProjectStats {
  projectId: number;
  projectName: string;
  estimatedHours: number;
  actualHours: number;
  usageRate: number;
  memberCount: number;
  taskProgress: number;
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
