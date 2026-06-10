export interface TimeLog {
  id: string;
  taskId: string;
  logDate: string;
  hoursSpent: number;
  description: string;
  createdAt: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  eventType: string;
  details: string;
  createdAt: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  userId: string;
  workStatus?: string;       
  startDate?: string | null;
  endDate?: string | null;
  effortRequired?: number | null;
  deployedTime?: string | null;
  deploymentType?: string | null;
  testCases?: string[];
  
  // 🔽 ADD THESE TWO LINES TO CONNECT THE PIECES 🔽
  timeLogs?: TimeLog[];
  history?: TaskHistory[];
}