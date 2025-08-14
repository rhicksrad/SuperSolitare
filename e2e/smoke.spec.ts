import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('shop opens from summary and boss banner appears on boss round', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Seed (optional)').fill('e2e-smoke-seed')
    await page.getByRole('button', { name: 'New Run' }).click()

    // Small blind
    await page.getByRole('button', { name: 'Start Small' }).click()
    await page.getByRole('button', { name: 'Auto-Win' }).click()
    // open shop from summary overlay "Shop" button
    await page.getByTestId('summary-modal').getByRole('button', { name: 'Shop' }).click()
    // Shop dialog should be visible (by testid)
    await expect(page.getByTestId('shop-modal')).toBeVisible()
    // Close shop
    await page.getByTestId('shop-modal').getByRole('button', { name: 'Close' }).click()
    // Close summary overlay
    await page.getByTestId('summary-modal').getByRole('button', { name: 'Start Next Board' }).click()

    // Big blind
    await page.getByRole('button', { name: 'Start Big' }).click()
    await page.getByRole('button', { name: 'Auto-Win' }).click()
    await page.getByRole('button', { name: 'Start Next Board' }).click()

    // Boss blind
    await page.getByRole('button', { name: 'Start Boss' }).click()
    // Boss banner should be visible (contains boss name chip)
    await expect(page.locator('div').filter({ hasText: /Night Mode|Red Alert|Thin Waste|Glacial Start|Frozen Royals|Suit Tax|Half-Deck|Mirror Moves/ }).first()).toBeVisible()
  })

  test('home shows New Run controls', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'New Run' })).toBeVisible()
    await expect(page.getByPlaceholder('Seed (optional)')).toBeVisible()
  })
})


