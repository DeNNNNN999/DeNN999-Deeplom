const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

// Helper function to wait for page load
async function waitForPageLoad(driver) {
  await driver.wait(() => {
    return driver.executeScript('return document.readyState').then(readyState => {
      return readyState === 'complete';
    });
  }, 10000);
}

describe('Supplier Management System - Suppliers', function() {
  this.timeout(30000); // Set timeout to 30 seconds
  let driver;

  before(async function() {
    const options = new chrome.Options();
    // Add headless option for CI environments
    if (process.env.CI) {
      options.addArguments('--headless');
      options.addArguments('--disable-gpu');
      options.addArguments('--no-sandbox');
    }
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
      
    // Login before tests
    await driver.get('http://localhost:3000/auth/login');
    await driver.findElement(By.css('input[type="email"]')).sendKeys('admin@example.com');
    await driver.findElement(By.css('input[type="password"]')).sendKeys('admin123');
    await driver.findElement(By.css('button[type="submit"]')).click();
    
    // Wait for dashboard to load
    await driver.wait(until.urlContains('/admin/dashboard'), 5000);
    await waitForPageLoad(driver);
  });

  after(async function() {
    await driver.quit();
  });

  it('should navigate to suppliers page', async function() {
    // Click on Suppliers in the sidebar
    await driver.findElement(By.xpath('//a[contains(text(), "Suppliers")]')).click();
    
    // Wait for suppliers page to load
    await driver.wait(until.urlContains('/suppliers'), 5000);
    await waitForPageLoad(driver);
    
    // Verify we're on the suppliers page
    const pageTitle = await driver.findElement(By.css('h1')).getText();
    assert.equal(pageTitle, 'Suppliers');
  });

  it('should search for suppliers', async function() {
    // Enter search term
    await driver.findElement(By.css('input[placeholder="Search suppliers..."]')).sendKeys('test');
    
    // Click search button
    await driver.findElement(By.xpath('//button[contains(text(), "Search")]')).click();
    
    // Wait for search results to load
    await driver.wait(until.elementLocated(By.css('tbody')), 5000);
  });

  it('should see supplier status badges', async function() {
    // Wait for table to load
    await driver.wait(until.elementLocated(By.css('tbody')), 5000);
    
    // Check if there are any suppliers
    const rows = await driver.findElements(By.css('tbody tr'));
    
    if (rows.length > 0) {
      // Check if status badges are displayed
      const statusBadges = await driver.findElements(By.css('.inline-flex.rounded-full'));
      assert(statusBadges.length > 0, 'Status badges should be displayed');
    }
  });

  it('should navigate to add supplier page', async function() {
    // Click add supplier button
    await driver.findElement(By.xpath('//button[contains(., "Add Supplier")]')).click();
    
    // Wait for add supplier page to load
    await driver.wait(until.urlContains('/suppliers/create'), 5000);
    await waitForPageLoad(driver);
    
    // Navigate back to suppliers list
    await driver.navigate().back();
    await waitForPageLoad(driver);
  });
});