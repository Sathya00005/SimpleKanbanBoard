import crypto from "node:crypto";

export interface ValidationItem {
  id: string;
  text: string;
  status: "pending" | "passed" | "failed";
  failedBy: string | null;
  failedAt: string | null;
  failureReason: string | null;
  testerNotes: string | null;
}

export interface ParsedIssueBody {
  description: string;
  acceptanceCriteria: ValidationItem[];
  testCases: ValidationItem[];
  positiveTestCases: ValidationItem[];
  negativeTestCases: ValidationItem[];
  edgeCases: ValidationItem[];
  technicalNotes: ValidationItem[];
  definitionOfDone: ValidationItem[];
  dependencies: ValidationItem[];
  riskAssessment: any; // Stored as JSON with riskLevel and blockers
}

export interface GitHubLabel {
  name: string;
  color: string;
  description: string;
}

type SectionKey =
  | "description"
  | "acceptanceCriteria"
  | "testCases"
  | "positiveTestCases"
  | "negativeTestCases"
  | "edgeCases"
  | "technicalNotes"
  | "definitionOfDone"
  | "dependencies"
  | "riskAssessment";

const SECTION_HEADINGS: Record<SectionKey, RegExp> = {
  description: /^#{1,6}\s*Description:?\s*$/i,
  acceptanceCriteria: /^#{1,6}\s*Acceptance\s+Criteria:?\s*$/i,
  testCases: /^#{1,6}\s*Test\s+Cases:?\s*$/i,
  positiveTestCases: /^#{1,6}\s*Positive\s+Test\s+Cases:?\s*$/i,
  negativeTestCases: /^#{1,6}\s*Negative\s+Test\s+Cases:?\s*$/i,
  edgeCases: /^#{1,6}\s*Edge\s+Cases:?\s*$/i,
  technicalNotes: /^#{1,6}\s*Technical\s+Notes:?\s*$/i,
  definitionOfDone: /^#{1,6}\s*Definition\s+Of\s+Done:?\s*$/i,
  dependencies: /^#{1,6}\s*Dependencies:?\s*$/i,
  riskAssessment: /^#{1,6}\s*Risk\s+Assessment:?\s*$/i,
};

function detectSection(line: string): SectionKey | null {
  const trimmed = line.trim();
  for (const [key, pattern] of Object.entries(SECTION_HEADINGS) as [SectionKey, RegExp][]) {
    if (pattern.test(trimmed)) {
      return key;
    }
  }
  return null;
}

function createValidationItem(text: string): ValidationItem {
  return {
    id: crypto.randomUUID(),
    text: text.trim() || "No text",
    status: "pending",
    failedBy: null,
    failedAt: null,
    failureReason: null,
    testerNotes: null,
  };
}

function parseListLines(lines: string[]): ValidationItem[] {
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const checkboxMatch = trimmed.match(/^[-*]\s*\[[ xX]\]\s*(.+)$/);
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (checkboxMatch && checkboxMatch[1]) {
      items.push(checkboxMatch[1].trim());
    } else if (bulletMatch && bulletMatch[1]) {
      items.push(bulletMatch[1].trim());
    } else if (numberedMatch && numberedMatch[1]) {
      items.push(numberedMatch[1].trim());
    } else {
      items.push(trimmed);
    }
  }

  return items.map(createValidationItem);
}

export function parseIssueBody(body: string): ParsedIssueBody {
  const emptyResult: ParsedIssueBody = {
    description: "",
    acceptanceCriteria: [],
    testCases: [],
    positiveTestCases: [],
    negativeTestCases: [],
    edgeCases: [],
    technicalNotes: [],
    definitionOfDone: [],
    dependencies: [],
    riskAssessment: { riskLevel: "Low", blockers: [] },
  };

  if (!body?.trim()) {
    return emptyResult;
  }

  const normalized = body.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const sectionLines: Record<SectionKey, string[]> = {
    description: [],
    acceptanceCriteria: [],
    testCases: [],
    positiveTestCases: [],
    negativeTestCases: [],
    edgeCases: [],
    technicalNotes: [],
    definitionOfDone: [],
    dependencies: [],
    riskAssessment: [],
  };

  let currentSection: SectionKey | null = null;
  let foundAnyHeading = false;

  for (const line of lines) {
    const section = detectSection(line);
    if (section) {
      foundAnyHeading = true;
      currentSection = section;
      continue;
    }

    if (currentSection) {
      sectionLines[currentSection].push(line);
    }
  }

  if (!foundAnyHeading) {
    return {
      ...emptyResult,
      description: normalized.trim(),
    };
  }

  const riskLines = sectionLines.riskAssessment.map(l => l.trim()).filter(Boolean);
  let riskLevel = "Low";
  const blockers: string[] = [];
  for (const line of riskLines) {
    if (line.match(/risk level/i)) {
      if (line.match(/high/i)) riskLevel = "High";
      else if (line.match(/medium/i)) riskLevel = "Medium";
    } else if (line.match(/^[-*]\s+(.+)$/)) {
      blockers.push(line.replace(/^[-*]\s+/, ""));
    }
  }

  return {
    description: sectionLines.description.join("\n").trim(),
    acceptanceCriteria: parseListLines(sectionLines.acceptanceCriteria),
    testCases: parseListLines(sectionLines.testCases),
    positiveTestCases: parseListLines(sectionLines.positiveTestCases),
    negativeTestCases: parseListLines(sectionLines.negativeTestCases),
    edgeCases: parseListLines(sectionLines.edgeCases),
    technicalNotes: parseListLines(sectionLines.technicalNotes),
    definitionOfDone: parseListLines(sectionLines.definitionOfDone),
    dependencies: parseListLines(sectionLines.dependencies),
    riskAssessment: { riskLevel, blockers },
  };
}

export function normalizeValidationItems(raw: unknown): ValidationItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => {
    if (typeof item === "string") {
      return createValidationItem(item);
    }

    if (item && typeof item === "object") {
      const record = item as Partial<ValidationItem>;
      return {
        id: record.id || crypto.randomUUID(),
        text: record.text?.trim() || "No text",
        status: (record.status as ValidationItem["status"]) || "pending",
        failedBy: record.failedBy ?? null,
        failedAt: record.failedAt ?? null,
        failureReason: record.failureReason ?? null,
        testerNotes: record.testerNotes ?? null,
      };
    }

    return createValidationItem("No text");
  });
}

export function normalizeGitHubLabels(raw: unknown): GitHubLabel[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        if (!name) return null;
        return { name, color: "", description: "" };
      }

      if (item && typeof item === "object") {
        const record = item as Partial<GitHubLabel>;
        const name = String(record.name || "").trim();
        if (!name) return null;
        return {
          name,
          color: String(record.color || "").trim(),
          description: String(record.description || "").trim(),
        };
      }

      return null;
    })
    .filter((item): item is GitHubLabel => item !== null);
}

export function normalizeTask<T extends Record<string, unknown>>(task: T): T {
  return {
    ...task,
    labels: normalizeGitHubLabels(task.labels),
    acceptanceCriteria: normalizeValidationItems(task.acceptanceCriteria),
    testCases: normalizeValidationItems(task.testCases),
    positiveTestCases: normalizeValidationItems(task.positiveTestCases),
    negativeTestCases: normalizeValidationItems(task.negativeTestCases),
    edgeCases: normalizeValidationItems(task.edgeCases),
    technicalNotes: normalizeValidationItems(task.technicalNotes),
    definitionOfDone: normalizeValidationItems(task.definitionOfDone),
    dependencies: normalizeValidationItems(task.dependencies),
  };
}
