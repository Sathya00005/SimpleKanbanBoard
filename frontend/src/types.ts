export interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  userId: string;
  createdAt: string;
  workStatus?: string;
  startDate?: string | null;
  endDate?: string | null;
  effortRequired?: number | null;
  deployedTime?: string | null;
  deploymentType?: string | null;
  
  // 🔽 ADD THIS LINE TO DEFINE THE ARRAY PASS-THROUGH 🔽
  testCases?: string[]; 
  timeLogs?: Array<{ hoursSpent: number; description: string; logDate: string }>;
  history?: Array<{ createdAt: string; eventType: string; details: string }>;
}