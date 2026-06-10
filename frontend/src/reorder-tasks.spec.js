const { test, expect } = require('@playwright/test');

test.describe('Manual Task Reordering', () => {
  test('Sathya can reorder tasks vertically within the Backlog column', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for the Kanban board and Backlog cards to render
    const backlogColumn = page.locator('.kanban-column', { hasText: 'Backlog' });
    await expect(backlogColumn).toBeVisible();
    
    const backlogCards = backlogColumn.locator('.kanban-card');
    await expect(backlogCards.first()).toBeVisible();
    
    if (await backlogCards.count() > 1) {
      const firstCard = backlogCards.nth(0);
      const secondCard = backlogCards.nth(1);
      
      const firstCardTitle = await firstCard.locator('h4').textContent();
      
      // Simulate drag and drop of the first item onto the second
      await firstCard.dragTo(secondCard);
      
      // Assert the array local state shifted: index 1 should now be the original first card
      const newSecondCardTitle = await backlogCards.nth(1).locator('h4').textContent();
      expect(newSecondCardTitle).toBe(firstCardTitle);
    }
  });
});