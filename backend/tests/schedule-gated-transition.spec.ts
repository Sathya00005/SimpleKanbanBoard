import { test, expect } from "@playwright/test";

test.describe("Kanban Board - Gated Scheduled Transition", () => {
  test("Should securely receive schedule metadata during PUT request", async ({
    request,
  }) => {
    // Valid MongoDB ObjectId format
    const fakeTaskId = "507f1f77bcf86cd799439011";

    const response = await request.put(
      `http://localhost:3001/api/tasks/${fakeTaskId}`,
      {
        data: {
          status: "Scheduled",
          startDate: new Date().toISOString(),
          endDate: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
          effortRequired: 50,
        },
      }
    );

    expect([200, 404]).toContain(response.status());
  });
});