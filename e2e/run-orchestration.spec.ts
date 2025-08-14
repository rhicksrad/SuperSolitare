import { test, expect } from '@playwright/test'

test.describe('Run orchestration', () => {
  test('reaches A2 with fixed seed using debug wins', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Seed (optional)').fill('e2e-seed-123')
    await page.getByRole('button', { name: 'New Run' }).click()

    // Small blind (UI labels are Start Small / Auto-Win)
    await page.getByRole('button', { name: 'Start Small' }).click()
    await page.getByRole('button', { name: 'Auto-Win' }).click()
    await page.getByRole('button', { name: 'Start Next Board' }).click()

    // Big blind
    await page.getByRole('button', { name: 'Start Big' }).click()
    await page.getByRole('button', { name: 'Auto-Win' }).click()
    await page.getByRole('button', { name: 'Start Next Board' }).click()

    // Boss blind
    await page.getByRole('button', { name: 'Start Boss' }).click()
    await page.getByRole('button', { name: 'Auto-Win' }).click()

    // After boss success we should be at Round 2 (select header label)
    await expect(page.locator('div').filter({ hasText: /^Round: 2$/ }).first()).toBeVisible()
  })

  test('failing a board blocks progression', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Seed (optional)').fill('e2e-seed-fail')
    await page.getByRole('button', { name: 'New Run' }).click()
    await page.getByRole('button', { name: 'Start Small' }).click()
    // Immediately complete without reaching target should fail; ensure Complete is visible
    await page.getByRole('button', { name: 'Complete' }).click()
    // No Start Next Board button should appear on fail
    await expect(page.getByRole('button', { name: 'Start Next Board' })).toHaveCount(0)
  })
})


