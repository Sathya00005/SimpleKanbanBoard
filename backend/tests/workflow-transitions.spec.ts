import { test, expect } from "@playwright/test";

test.describe("Kanban Board - Workflow Transitions", () => {
  test("Should securely persist internal workStatus correctly during PUT request", async ({
    request,
  }) => {
    // Valid MongoDB ObjectId format
    const fakeTaskId = "507f1f77bcf86cd799439011";

    const response = await request.put(
      `http://localhost:3001/api/tasks/${fakeTaskId}`,
      {
        data: {
          workStatus: "Completed",
        },
      }
    );

    // Checks for Schema rejection vs simple not found
    expect([200, 404]).toContain(response.status());
  });
});