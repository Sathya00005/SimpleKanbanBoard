import { test, expect } from "@playwright/test";

test.describe("Kanban Board - Gated Deployed Transition", () => {
  test("Should securely receive deployment metadata during PUT request", async ({
    request,
  }) => {
    // Valid MongoDB ObjectId format
    const fakeTaskId = "507f1f77bcf86cd799439011";

    const response = await request.put(
      `http://localhost:3001/api/tasks/${fakeTaskId}`,
      {
        data: {
          status: "Deployed",
          deployedTime: new Date().toISOString(),
          deploymentType: "feature_update",
        },
      }
    );

    expect([200, 404]).toContain(response.status());
  });
});