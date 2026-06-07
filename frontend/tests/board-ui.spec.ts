import { test, expect } from '@playwright/test';

test.describe('Main Board UI Verification', () => {
  test('Should render the main board with 5 static sequential columns', async ({ page }) => {
    // Assuming the frontend runs on standard Vite port
    await page.goto('http://localhost:5173');
    
    const expectedColumns = ['Backlog', 'Scheduled', 'Work In Progress', 'Testing', 'Deployed'];
    
    for (const col of expectedColumns) {
      const columnTestId = `column-${col.toLowerCase().replace(/\s+/g, '-')}`;
      const columnLocator = page.getByTestId(columnTestId);
      
      await expect(columnLocator).toBeVisible();
      await expect(columnLocator.locator('.column-title')).toHaveText(col);
    }
  });
});