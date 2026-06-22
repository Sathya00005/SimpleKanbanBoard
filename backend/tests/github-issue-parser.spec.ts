import { test, expect } from "@playwright/test";
import {
  parseIssueBody,
  normalizeValidationItems,
  normalizeTask,
} from "../src/services/githubIssueParser.service.js";

const structuredIssue = `## Description
User can request a verification code via email during signup.

## Acceptance Criteria
- User can request verification code
- User receives email with code
- Code expires after 10 minutes

## Test Cases
- Valid email address accepted
- Invalid email rejected

## Edge Cases
- Verification code expires
- User requests code twice in one minute

## Technical Notes
- Use JWT for session management
- Store codes in Redis with TTL
`;

test.describe("GitHub Issue Parser", () => {
  test("parses structured markdown sections", () => {
    const parsed = parseIssueBody(structuredIssue);

    expect(parsed.description).toBe(
      "User can request a verification code via email during signup."
    );
    expect(parsed.acceptanceCriteria).toHaveLength(3);
    expect(parsed.acceptanceCriteria[0]?.text).toBe(
      "User can request verification code"
    );
    expect(parsed.testCases).toHaveLength(2);
    expect(parsed.edgeCases).toHaveLength(2);
    expect(parsed.technicalNotes).toHaveLength(2);
  });

  test("handles headings with trailing colons", () => {
    const issue = structuredIssue.replace(
      "## Acceptance Criteria",
      "## Acceptance Criteria:"
    );

    const parsed = parseIssueBody(issue);

    expect(parsed.acceptanceCriteria).toHaveLength(3);
    expect(parsed.description).not.toContain("## Acceptance Criteria");
  });

  test("handles checkbox list items", () => {
    const issue = `## Description
Signup verification flow.

## Acceptance Criteria
- [ ] User can request verification code
- [x] User receives email with code
`;

    const parsed = parseIssueBody(issue);

    expect(parsed.acceptanceCriteria[0]?.text).toBe(
      "User can request verification code"
    );
    expect(parsed.acceptanceCriteria[1]?.text).toBe(
      "User receives email with code"
    );
  });

  test("falls back to full body when no headings exist", () => {
    const body = "Plain issue body without markdown sections.";
    const parsed = parseIssueBody(body);

    expect(parsed.description).toBe(body);
    expect(parsed.acceptanceCriteria).toEqual([]);
    expect(parsed.testCases).toEqual([]);
  });

  test("normalizeValidationItems converts strings and null safely", () => {
    expect(normalizeValidationItems(null)).toEqual([]);
    expect(normalizeValidationItems(["First case"])[0]?.text).toBe("First case");
    expect(normalizeValidationItems([{ text: "Existing item" }])[0]?.text).toBe(
      "Existing item"
    );
  });

  test("normalizeTask defaults missing arrays to empty lists", () => {
    const normalized = normalizeTask({
      id: "task-1",
      name: "Example",
      acceptanceCriteria: null,
      testCases: undefined,
      edgeCases: undefined,
      technicalNotes: undefined,
    } as any);

    expect(normalized.acceptanceCriteria).toEqual([]);
    expect(normalized.testCases).toEqual([]);
    expect(normalized.edgeCases).toEqual([]);
    expect(normalized.technicalNotes).toEqual([]);
  });
});
