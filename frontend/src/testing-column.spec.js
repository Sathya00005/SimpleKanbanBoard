const { test, expect } = require('@playwright/test');

test.describe('Testing Column and Reverse Flow', () => {
  test('Failed test automatically pushes task to Backlog', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Locate a task in the testing column and open the modal
    const testingColumn = page.locator('.kanban-column', { hasText: 'Testing' });
    await expect(testingColumn).toBeVisible();
    
    const testingCard = testingColumn.locator('.kanban-card').first();
    const taskTitle = await testingCard.locator('h4').textContent();
    await testingCard.dblclick();

    // Ensure Modal loads
    const modal = page.locator('.modal-content');
    await expect(modal.locator('h3')).toContainText('Testing Phase:');

    // Fill out Test Case 1 (Fail)
    const firstTest = modal.locator('div').filter({ hasText: 'Start Time' }).first();
    await firstTest.locator('input[type="datetime-local"]').nth(0).fill('2026-06-10T10:00');
    await firstTest.locator('input[type="datetime-local"]').nth(1).fill('2026-06-10T10:15');
    await firstTest.locator('select').selectOption('Failed');

    // Handle success dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Task automatically moved to Backlog');
      dialog.accept();
    });

    await page.click('button:has-text("Submit All Results")');

    // Assert Reverse Flow: Verify the task is now in the Backlog
    const backlogColumn = page.locator('.kanban-column', { hasText: 'Backlog' });
    await expect(backlogColumn.locator(`.kanban-card h4:has-text("${taskTitle}")`)).toBeVisible();
  });
});