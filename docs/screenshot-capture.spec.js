import { test, expect } from '@playwright/test';

const baseURL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:5000';
const forceDemoData = process.env.SCREENSHOT_FORCE_DEMO !== 'false';
const pauseForTiles = async (page) => page.waitForTimeout(1600);

test.use({
  viewport: { width: 1440, height: 1000 },
});

test('capture hackathon demo screenshots', async ({ page }) => {
  if (forceDemoData) {
    await page.route('**/api/reports**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Screenshot demo mode' }),
        });
        return;
      }
      await route.continue();
    });
  }

  await page.goto(baseURL);
  await expect(page.getByText('OneHealth')).toBeVisible();
  await pauseForTiles(page);
  await page.screenshot({ path: 'docs/screenshots/dashboard-map.png', fullPage: true });

  await page.locator('label').filter({ hasText: 'Sector' }).locator('select').selectOption('animal');
  await page.locator('label').filter({ hasText: 'Alert level' }).locator('select').selectOption('high');
  await page.locator('label').filter({ hasText: 'Min weekly cases' }).locator('input').fill('8');
  await pauseForTiles(page);
  await page.screenshot({ path: 'docs/screenshots/map-filters.png', fullPage: true });

  await page.getByRole('button', { name: /Alerts/ }).click();
  await expect(page.getByText('How it was flagged')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/alert-explainability.png', fullPage: true });

  await page.getByRole('button', { name: /Data pipeline/ }).click();
  await expect(page.getByText('Data sources')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/pipeline.png', fullPage: true });

  await page.getByRole('button', { name: /Dashboard/ }).click();
  await page.locator('input[type="file"]').setInputFiles('data/sample-one-health.csv');
  await expect(page.getByText('CSV live upload active')).toBeVisible();
  await pauseForTiles(page);
  await page.screenshot({ path: 'docs/screenshots/csv-upload.png', fullPage: true });
});
