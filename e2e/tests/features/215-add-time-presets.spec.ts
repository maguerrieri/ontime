import { expect, test, type Page } from '@playwright/test';

/** Reads the running timer's accumulated added time from the integration poll endpoint. */
async function getAddedTime(request: import('@playwright/test').APIRequestContext): Promise<number> {
  const response = await request.get('/api/poll');
  const body = await response.json();
  return body.payload.timer.addedTime;
}

/** Dismisses the "Welcome to Ontime" modal if it is shown (first startup on a fresh data dir). */
async function dismissWelcome(page: Page): Promise<void> {
  const close = page.getByRole('button', { name: 'close welcome modal' });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

test('preset buttons apply the configured add/remove amount', async ({ page, request }) => {
  await page.goto('/editor');
  await dismissWelcome(page);

  // start from a clean rundown with a single event (self-contained, independent of prior tests)
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Rundown menu' }).click();
  await page.getByRole('menuitem', { name: 'Clear all' }).click();
  await page.getByRole('button', { name: 'Delete all' }).click();
  await page.getByRole('button', { name: 'Create Event' }).click();
  await page.getByRole('button', { name: 'Event' }).nth(4).click();

  // start the event so add-time is enabled (a fresh start resets addedTime to 0)
  await page.getByTestId('entry-1').getByRole('button', { name: 'Start event' }).click();
  await expect(page.getByTestId('entry-1').getByTestId('rundown-event')).toHaveAttribute('data-running');
  await expect.poll(() => getAddedTime(request)).toBe(0);

  // the main playback add-time control lives inside the timer-control panel
  const timerControl = page.getByTestId('panel-timer-control');

  // default presets are 1 min and 5 min
  await timerControl.getByRole('button', { name: 'Add 1m', exact: true }).click();
  await expect.poll(() => getAddedTime(request)).toBe(60_000);

  await timerControl.getByRole('button', { name: 'Add 5m', exact: true }).click();
  await expect.poll(() => getAddedTime(request)).toBe(360_000);

  await timerControl.getByRole('button', { name: 'Remove 1m', exact: true }).click();
  await expect.poll(() => getAddedTime(request)).toBe(300_000);
});

test('type-in toggle hides the amount field and survives a reload', async ({ page }) => {
  await page.goto('/editor');
  await dismissWelcome(page);

  const timerControl = page.getByTestId('panel-timer-control');

  // the type-in amount field is shown by default, presets alongside it
  await expect(timerControl.getByTestId('time-input-addtime')).toBeVisible();
  await expect(timerControl.getByRole('button', { name: 'Add 1m', exact: true })).toBeVisible();

  // hide the type-in field from the settings panel
  await page.getByRole('button', { name: 'Toggle settings' }).click();
  await page.getByRole('button', { name: 'Add-time presets' }).click();
  await page.getByTestId('toggle-add-time-input').click();
  await page.getByRole('button', { name: 'Toggle settings' }).click();

  // the type-in field is gone, but the presets remain
  await expect(timerControl.getByTestId('time-input-addtime')).toBeHidden();
  await expect(timerControl.getByRole('button', { name: 'Add 1m', exact: true })).toBeVisible();

  // the preference persists across a reload (localStorage)
  await page.reload();
  await dismissWelcome(page);
  const timerControlAfterReload = page.getByTestId('panel-timer-control');
  await expect(timerControlAfterReload.getByTestId('time-input-addtime')).toBeHidden();
  await expect(timerControlAfterReload.getByRole('button', { name: 'Add 1m', exact: true })).toBeVisible();
});
