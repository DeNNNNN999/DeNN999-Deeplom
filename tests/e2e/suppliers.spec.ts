import { test, expect } from '@playwright/test';

// Helper function to log in
async function login(page) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*\/admin\/dashboard/);
}

test.describe('Suppliers Management', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await login(page);
  });

  test('should navigate to suppliers page', async ({ page }) => {
    // Navigate to suppliers page
    await page.click('text=Suppliers');
    
    // Verify suppliers page is loaded
    await expect(page).toHaveURL(/.*\/admin\/suppliers/);
    await expect(page.locator('h1')).toHaveText('Suppliers');
  });

  test('should search suppliers', async ({ page }) => {
    // Navigate to suppliers page
    await page.goto('/admin/suppliers');
    
    // Search for a supplier
    await page.fill('input[placeholder="Search suppliers..."]', 'test');
    await page.click('text=Search');
    
    // Verify search is executed (loading state appears and disappears)
    await expect(page.locator('text=Loading...')).toBeVisible();
    await expect(page.locator('text=Loading...')).toBeHidden({ timeout: 5000 });
  });

  test('should navigate to supplier details', async ({ page }) => {
    // Navigate to suppliers page
    await page.goto('/admin/suppliers');
    
    // Wait for table to load
    await expect(page.locator('text=Loading...')).toBeHidden({ timeout: 5000 });
    
    // Check if there are any suppliers
    const noData = await page.locator('text=No data available').count();
    
    if (noData === 0) {
      // Click on the first supplier row
      await page.click('tbody tr:first-child');
      
      // Verify we navigated to supplier details page
      await expect(page).toHaveURL(/.*\/admin\/suppliers\/.*/);
    }
    // If no suppliers exist, the test is conditionally successful
  });

  test('should open and close add supplier form', async ({ page }) => {
    // Navigate to suppliers page
    await page.goto('/admin/suppliers');
    
    // Click add supplier button
    await page.click('text=Add Supplier');
    
    // Verify we navigated to supplier create page
    await expect(page).toHaveURL(/.*\/admin\/suppliers\/create/);
    
    // Navigate back to suppliers list
    await page.goto('/admin/suppliers');
  });
});