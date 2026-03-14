import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5000";

test.describe("זהותון Search E2E", () => {
  test("loads search page with stats", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await expect(page.locator("h1")).toContainText("זהותון");
    await expect(page.locator("header")).toContainText(/\d[\d,]+/, { timeout: 10000 });
  });

  test("search by family name returns results", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("שם משפחה").fill("כהן");
    await page.getByRole("button", { name: "חפש" }).click();
    await expect(page.locator("text=נמצאו")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("table tbody tr")).toHaveCount(50, { timeout: 10000 });
    await expect(page.locator("table tbody tr").first()).toContainText("כהן");
  });

  test("search by family + city narrows results", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("שם משפחה").fill("לוי");
    await page.getByPlaceholder("עיר").fill("חיפה");
    await page.getByRole("button", { name: "חפש" }).click();
    await expect(page.locator("text=נמצאו")).toBeVisible({ timeout: 15000 });
    const text = await page.locator("text=נמצאו").textContent();
    expect(text).toBeTruthy();
  });

  test("search by TZ returns single result", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("ת.ז.").fill("000003749");
    await page.getByRole("button", { name: "חפש" }).click();
    await expect(page.locator("text=נמצאו 1 תוצאות")).toBeVisible({ timeout: 15000 });
  });

  test("clear button resets search", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("שם משפחה").fill("כהן");
    await page.getByRole("button", { name: "נקה" }).click();
    await expect(page.getByPlaceholder("שם משפחה")).toHaveValue("");
  });

  test("Enter key triggers search", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("שם משפחה").fill("לוי");
    await page.getByPlaceholder("שם משפחה").press("Enter");
    await expect(page.locator("text=נמצאו")).toBeVisible({ timeout: 15000 });
  });

  test("theme switcher works", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByTitle("ערכות נושא").click();
    await expect(page.locator("text=ערכת נושא")).toBeVisible();
    await page.locator("text=חצות").click();
    await expect(page.locator("html")).toHaveClass(/theme-midnight/);
  });

  test("pagination works", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("שם משפחה").fill("כהן");
    await page.getByRole("button", { name: "חפש" }).click();
    await expect(page.locator("text=נמצאו")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "הבא" }).click();
    await expect(page.locator("text=2 /")).toBeVisible({ timeout: 10000 });
  });

  test("clicking result opens floating dialog", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("שם משפחה").fill("כהן");
    await page.getByRole("button", { name: "חפש" }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(50, { timeout: 15000 });
    // Click first result
    await page.locator("table tbody tr").first().click();
    // Dialog should appear with tabs (use button role to target tab buttons specifically)
    await expect(page.getByRole("button", { name: "פרטים" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "משפחה" })).toBeVisible();
    await expect(page.getByRole("button", { name: "שכנים" })).toBeVisible();
    await expect(page.getByRole("button", { name: "שכונה" })).toBeVisible();
    await expect(page.getByRole("button", { name: "גיל" })).toBeVisible();
  });

  test("dialog shows person info tab", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("ת.ז.").fill("000003749");
    await page.getByRole("button", { name: "חפש" }).click();
    await expect(page.locator("text=נמצאו 1")).toBeVisible({ timeout: 15000 });
    await page.locator("table tbody tr").first().click();
    // Should show person name in dialog title bar
    await expect(page.locator(".fixed span.font-bold").filter({ hasText: "אלברט כהן" })).toBeVisible({ timeout: 10000 });
    // Should show details in info tab
    await expect(page.locator(".fixed span.font-medium").filter({ hasText: "ירושלים" })).toBeVisible();
    await expect(page.locator(".fixed span.font-medium").filter({ hasText: "שבטי ישראל" })).toBeVisible();
  });

  test("dialog tabs navigate between views", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    await page.getByPlaceholder("ת.ז.").fill("000003749");
    await page.getByRole("button", { name: "חפש" }).click();
    await expect(page.locator("text=נמצאו 1")).toBeVisible({ timeout: 15000 });
    await page.locator("table tbody tr").first().click();
    await expect(page.locator("text=אלברט")).toBeVisible({ timeout: 10000 });

    // Click neighbors tab
    const dialog = page.locator("[dir=rtl] .fixed");
    await dialog.locator("text=שכנים").click();
    await page.waitForTimeout(2000);
    // Should show neighbor controls
    await expect(dialog.locator("text=טווח בתים")).toBeVisible({ timeout: 10000 });

    // Click age tab
    await dialog.locator("button", { hasText: "גיל" }).click();
    await expect(dialog.locator("text=טווח שנים")).toBeVisible({ timeout: 10000 });
  });

  test("favorites pin and unpin", async ({ page }) => {
    await page.goto(`${BASE}/search`);
    // Clear previous favorites
    await page.evaluate(() => localStorage.removeItem("zhutoton-favorites"));
    await page.reload();

    await page.getByPlaceholder("ת.ז.").fill("000003749");
    await page.getByRole("button", { name: "חפש" }).click();
    await expect(page.locator("text=נמצאו 1")).toBeVisible({ timeout: 15000 });
    await page.locator("table tbody tr").first().click();
    await expect(page.locator("text=אלברט")).toBeVisible({ timeout: 10000 });

    // Click pin button in dialog
    const dialog = page.locator("[dir=rtl] .fixed");
    await dialog.locator("button").filter({ has: page.locator("svg.lucide-pin") }).click();

    // Open favorites bar
    await page.getByTitle("מועדפים").click();

    // Favorites bar should show with person chip
    await expect(page.locator("button.font-medium").filter({ hasText: "אלברט כהן" })).toBeVisible({ timeout: 5000 });
  });

  test("API health check", async ({ request }) => {
    const res = await request.get(`${BASE}/api/stats`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.total_people).toBeGreaterThan(8_000_000);
  });

  test("API neighbors endpoint", async ({ request }) => {
    const res = await request.get(`${BASE}/api/neighbors/000003749?radius=10`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.neighbors.length).toBeGreaterThan(0);
    expect(data.person.city).toBe("ירושלים");
  });

  test("API age-group endpoint", async ({ request }) => {
    const res = await request.get(`${BASE}/api/age-group/000003749?range_years=2&per_page=5`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.total).toBeGreaterThan(0);
    expect(data.year_range).toEqual([1917, 1921]);
  });
});
