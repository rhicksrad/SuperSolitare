import { expect, test } from '@playwright/test'

// The dev build exposes the zustand store as window.__game so specs can both
// drive real UI interactions and fast-forward game state deterministically.

declare global {
  interface Window {
    __game: {
      getState: () => Record<string, unknown> & {
        round: { score: number; target: number; waste: unknown[]; stock: unknown[] } | null
        run: { money: number; ante: number; blindIndex: number } | null
      }
      setState: (patch: Record<string, unknown>) => void
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('full loop: menu → blind → play → cash out → shop → next blind', async ({ page }) => {
  await page.getByTestId('new-run').click()
  await expect(page.getByText('Ante 1 of 8')).toBeVisible()

  await page.getByTestId('play-small').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await expect(page.getByTestId('round-score')).toHaveText('0')

  // deal from stock via keyboard and verify the waste fans out
  await page.keyboard.press('d')
  await expect
    .poll(async () => page.evaluate(() => window.__game.getState().round?.waste.length ?? 0))
    .toBeGreaterThan(0)

  // fast-forward: set score to the target, then cash out through the real UI
  await page.evaluate(() => {
    const s = window.__game.getState()
    window.__game.setState({ round: { ...s.round!, score: s.round!.target } })
  })
  await expect(page.getByTestId('cash-out')).toContainText('Cash Out')
  await page.getByTestId('cash-out').click()

  // shop: money was paid out, offers visible (heading role: voucher blurbs can
  // also contain the words "the shop", which trips strict mode)
  await expect(page.getByRole('heading', { name: 'The Shop' })).toBeVisible()
  await expect(page.getByText('Blind beaten!')).toBeVisible()
  const money = await page.evaluate(() => window.__game.getState().run?.money ?? 0)
  expect(money).toBeGreaterThan(4)

  await page.getByTestId('next-round').click()
  await expect(page.getByText('Ante 1 of 8')).toBeVisible()
  await expect(page.getByTestId('play-big')).toBeVisible()
})

test('conceding below target ends the run', async ({ page }) => {
  await page.getByTestId('new-run').click()
  await page.getByTestId('play-small').click()
  await page.getByTestId('cash-out').click() // score 0 < target → concede
  await expect(page.getByText('Run Over')).toBeVisible()
})

test('save persists across reload', async ({ page }) => {
  await page.getByTestId('new-run').click()
  await page.getByTestId('play-small').click()
  await page.keyboard.press('d')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Continue Run' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue Run' }).click()
  await expect(page.getByTestId('board')).toBeVisible()
  const wasteLen = await page.evaluate(() => window.__game.getState().round?.waste.length ?? 0)
  expect(wasteLen).toBeGreaterThan(0)
})

test('scoring a real foundation play through the UI', async ({ page }) => {
  await page.getByTestId('new-run').click()
  await page.getByTestId('play-small').click()

  // keep dealing until an ace is on top of the waste, then double-click it
  let played = false
  for (let i = 0; i < 30 && !played; i++) {
    const wasteTopIsAce = await page.evaluate(() => {
      const r = window.__game.getState().round as unknown as {
        waste: Array<{ rank: number }>
        tableau: Array<Array<{ rank: number; faceUp: boolean }>>
      } | null
      if (!r) return false
      const top = r.waste[r.waste.length - 1]
      return !!top && top.rank === 1
    })
    if (wasteTopIsAce) {
      const ace = page.locator('[aria-label^="A of"]').last()
      await ace.dblclick()
      played = true
      break
    }
    await page.keyboard.press('d')
    await page.waitForTimeout(50)
  }
  if (played) {
    await expect
      .poll(async () => page.evaluate(() => window.__game.getState().round?.score ?? 0))
      .toBeGreaterThan(0)
  }
})
