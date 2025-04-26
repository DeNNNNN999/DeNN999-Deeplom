import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to login page', async ({ page }) => {
    await page.goto('/');
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });

  test('should show error message for invalid login', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });
  });

  test('should successfully log in and redirect to dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill in valid credentials
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/, { timeout: 5000 });
    
    // Verify dashboard is loaded
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should log out successfully', async ({ page }) => {
    // First login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*\/admin\/dashboard/, { timeout: 5000 });
    
    // Click user menu
    await page.click('button.rounded-full');
    
    // Click logout
    await page.click('text=Log out');
    
    // Verify redirect to login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});