import { test, expect } from '@playwright/test';

test.describe('Create Task UI Form', () => {
  test('Should open the modal, allow input, handle dynamic test cases, and close properly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    const modal = page.getByTestId('create-task-modal');
    await expect(modal).not.toBeVisible();
    
    // Open modal
    await page.getByTestId('btn-open-create-task').click();
    await expect(modal).toBeVisible();
    
    // Fill out basic form
    await page.getByTestId('input-task-name').fill('Setup Authentication');
    await page.getByTestId('input-task-desc').fill('Implement JWT based auth for Sathya');
    
    // Handle dynamic test cases
    await page.getByTestId('input-test-case-0').fill('Login succeeds with right creds');
    await page.getByTestId('add-test-case').click();
    await page.getByTestId('input-test-case-1').fill('Login fails with wrong creds');
    
    // Submit form
    await page.getByTestId('btn-submit').click();
    await expect(modal).not.toBeVisible();
  });

  test('Should validate required fields before closing', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.getByTestId('btn-open-create-task').click();
    
    // Leave name empty and attempt submit
    await page.getByTestId('btn-submit').click();
    const modal = page.getByTestId('create-task-modal');
    await expect(modal).toBeVisible(); // HTML5 Validation intercepts it
  });
});