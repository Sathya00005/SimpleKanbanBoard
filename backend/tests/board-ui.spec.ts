import { test, expect } from '@playwright/test';

test.describe('Kanban Board - Fetch and Render Tasks', () => {
  test('Should sign up, render columns, create a task, and verify it renders in the Backlog', async ({ page }) => {
    
    // 1. Sign up a fresh user to ensure a clean DB state for the test
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    
    await page.goto('http://localhost:5173/signup');
    await page.fill('input[name="username"]', `User${timestamp}`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Perform Login
    await expect(page.locator('h2:has-text("Login")')).toBeVisible();
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 3. Verify Board Loads & all 5 columns render correctly
    await expect(page.locator('h2:has-text("Kanban Board")')).toBeVisible();
    const columns = ['Backlog', 'Scheduled', 'Work In Progress', 'Testing', 'Deployed'];
    for (const col of columns) {
      await expect(page.locator(`h3:has-text("${col}")`)).toBeVisible();
    }

    // 4. Create a new task
    const uniqueTaskName = `Playwright E2E Task ${timestamp}`;
    await page.fill('input[placeholder="Task name"]', uniqueTaskName);
    await page.click('button:has-text("Add Task")');

    // 5. Verify the task was fetched and rendered correctly in the Backlog column
    const backlogColumn = page.locator('.kanban-column').filter({ hasText: 'Backlog' });
    const newTaskCard = backlogColumn.locator('.kanban-card').filter({ hasText: uniqueTaskName });
    
    await expect(newTaskCard).toBeVisible();
    await expect(newTaskCard.locator('.kanban-card-status')).toHaveText('Backlog');
  });
});