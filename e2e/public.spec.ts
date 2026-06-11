import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: "LittleCafe" },
  { path: "/pricing", heading: "Pricing" },
  { path: "/gallery", heading: "Gallery" },
  { path: "/menu", heading: "Menu" },
  { path: "/calendar", heading: "Calender" },
  { path: "/partnership", heading: "Partnership" },
  { path: "/waiver", heading: "Waiver" },
  { path: "/contact", heading: "Contact" },
  { path: "/admin", heading: "Administrator login" }
];

test("public routes render core pages", async ({ page, baseURL }) => {
  const base = baseURL ?? "http://127.0.0.1:3000";
  for (const route of routes) {
    await page.goto(`${base}${route.path}`);
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  }
});

test("mobile menu navigates to pricing", async ({ page, baseURL, isMobile }) => {
  test.skip(!isMobile, "mobile-only navigation check");
  const base = baseURL ?? "http://127.0.0.1:3000";
  await page.goto(`${base}/`);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(`${base}/pricing`);
});

test("admin page shows login guard", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Administrator login" })).toBeVisible();
});

test("waiver and contact forms render", async ({ page, baseURL }) => {
  const base = baseURL ?? "http://127.0.0.1:3000";
  await page.goto(`${base}/waiver`);
  await expect(page.getByRole("button", { name: "Submit waiver" })).toBeVisible();
  await page.goto(`${base}/contact`);
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
});
