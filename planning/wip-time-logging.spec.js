const { test, expect } = require('@playwright/test');

test.describe('WIP Time Logging and Status Toggle', () => {
  test('Sathya can log time and toggle status to Completed', async ({ page }) => {
    // Navigate to the board and click a WIP task
    await page.goto('http://localhost:3000');
    
    // Assuming Sathya is already logged in or utilizing a storage state
    const wipColumn = page.locator('.column-wip');
    await expect(wipColumn).toBeVisible();
    
    // Open the first WIP task
    await wipColumn.locator('.task-card').first().click();
    
    // Verify modal is open
    const modal = page.locator('.modal-content');
    await expect(modal.locator('h2')).toContainText('Work In Progress');
    
    // Handle the success alert automatically
    page.on('dialog', dialog => dialog.accept());

    // Log 2.5 hours of time
    await page.fill('input[type="date"]', '2026-06-10');
    await page.fill('input[type="number"]', '2.5');
    await page.fill('textarea', 'Initial backend scaffolding and db wiring.');
    await page.click('button:has-text("Save Time Log")');
    
    // Toggle work status to Completed
    const statusText = modal.locator('.status-toggle h3');
    await expect(statusText).toContainText('Pending');
    
    await page.click('button:has-text("Mark as Completed")');
    
    // Ensure the UI updates immediately
    await expect(statusText).toContainText('Completed');
    await page.click('button:has-text("Close")');
  });
});