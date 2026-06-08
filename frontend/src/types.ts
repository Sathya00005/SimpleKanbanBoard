export interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  userId?: string;
  createdAt?: string;
  testCases?: string[];
  failedAt?: string;
}