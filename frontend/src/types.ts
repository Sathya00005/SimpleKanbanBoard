export interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  userId: string;
  createdAt: string;
  
  // 🔽 ADD THESE NEW FIELDS TO MATCH THE CURRENT ARCHITECTURE 🔽
  workStatus?: string;       // e.g., "Pending" | "Completed"
  startDate?: string | null;
  endDate?: string | null;
  effortRequired?: number | null;
  deployedTime?: string | null;
  deploymentType?: string | null;
}