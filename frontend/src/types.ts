export interface ValidationItem {
  id: string;
  text: string;
  status: "pending" | "passed" | "failed";
  failedBy: string | null;
  failedAt: string | null;
  failureReason: string | null;
  testerNotes: string | null;
  labels?: string[]; // 👈 Added this to allow label/tag arrays on criteria and test cases
}
export interface GitHubLabel {
  name: string;
  color?: string;
  description?: string;
}

export type Priority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low";

export interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  userId: string;
  labels?: GitHubLabel[];

  createdAt: string;
  updatedAt?: string;

  workStatus?: string;

  startDate?: string | null;
  endDate?: string | null;

  effortRequired?: number | null;

  deployedTime?: string | null;
  deploymentType?: string | null;

  githubRepo?: string;
  githubIssueId?: string;

  priority?: Priority;

  isClosed?: boolean;
  closedAt?: string | null;
  closedBy?: string | null;

  acceptanceCriteria?: ValidationItem[];
  testCases?: ValidationItem[];

  positiveTestCases?: ValidationItem[];
  negativeTestCases?: ValidationItem[];

  edgeCases?: ValidationItem[];

  technicalNotes?: ValidationItem[];

  definitionOfDone?: ValidationItem[];

  deploymentDetails?: any;
  testingSummary?: any;
  failureReasons?: any;

  dependencies?: ValidationItem[];

  githubMetadata?: any;
  attachments?: any;

  riskAssessment?: any;
  aiAnalysis?: any;

  overtimeReason?: string | null;

  timeLogs?: Array<{
    hoursSpent: number;
    description: string;
    logDate: string;
  }>;

  history?: Array<{
    createdAt: string;
    eventType: string;
    details: string;
  }>;
}