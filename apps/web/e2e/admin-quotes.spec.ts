import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

test("an admin lists other users' quotes and finds one by email", async ({
  page,
  request,
}) => {
  // Another user's quote, made through the API so this test stands alone.
  const email = `e2e-${randomUUID()}@test.com`;
  await expect(
    await request.post("/api/auth/register", {
      data: { fullName: "Otto Other", email, password: "e2e-password" },
    }),
  ).toBeOK();
  await expect(
    await request.post("/api/quotes", {
      data: {
        fullName: "Otto Other",
        email,
        address: "Beispielweg 2, 80331 München",
        monthlyConsumptionKwh: 300,
        systemSizeKw: 5,
      },
    }),
  ).toBeOK();

  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@test.com");
  await page.getByLabel("Password").fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Quotes", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/quotes");
  await expect(page.getByRole("heading", { name: "All quotes" })).toBeVisible();
  await page.getByRole("searchbox").fill(email);
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByRole("table")).toHaveAccessibleName(
    "All quotes: 1–1 of 1",
  );
  await expect(page.getByRole("row").filter({ hasText: email })).toHaveCount(1);
});
