import { test, expect } from '@playwright/test';

test('Detailed task view and history timeline', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  const loginHeading = page.locator('h2', { hasText: 'Login' });
  if (await loginHeading.isVisible()) {
    await page.fill('input[type="email"]', 'sathya@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
  }

  await expect(page.locator('.board-container')).toBeVisible();

  const taskCard = page.locator('.kanban-card').first();
  await expect(taskCard).toBeVisible();

  // Click on the task card to trigger the new detailed task view
  await taskCard.click();

  const modal = page.locator('.modal-content', { hasText: 'Task Details:' });
  await expect(modal).toBeVisible();

  await expect(modal.locator('text=Time Tracking Baseline')).toBeVisible();
  await expect(modal.locator('text=Original Estimate:')).toBeVisible();
  await expect(modal.locator('text=Actual Time Spent:')).toBeVisible();
  await expect(modal.locator('text=Remaining Time:')).toBeVisible();
  await expect(modal.locator('text=History Timeline')).toBeVisible();

  await modal.locator('button:has-text("Close")').click();
  await expect(modal).not.toBeVisible();
});