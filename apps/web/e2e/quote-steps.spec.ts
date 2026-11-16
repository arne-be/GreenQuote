import { randomUUID } from "node:crypto";

import { expect, type Locator, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await expect(
    await page.request.post("/api/auth/register", {
      data: {
        fullName: "Erika Example",
        email: `e2e-${randomUUID()}@test.com`,
        password: "e2e-password",
      },
    }),
  ).toBeOK();
  await page.goto("/quotes/new");
});

test("a user requests a quote in six steps with the keyboard, and the summary's preview is the saved quote", async ({
  page,
}) => {
  const preview = page.getByRole("region", { name: "Preview" });

  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await expect(page.getByLabel("Applicant's full name")).toBeFocused();
  await expect(page.getByLabel("Applicant's full name")).toHaveValue(
    "Erika Example",
  );
  await expect(preview).toContainText("Enter the system size");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await page.keyboard.type("Musterstraße 1, 10115 Berlin");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Step 3 of 6")).toBeVisible();
  await page.keyboard.type("400");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Step 4 of 6")).toBeVisible();
  await expect(page.getByLabel("System size (kW)")).toBeFocused();
  await page.keyboard.type("6");
  // The price, band and APR appear as the size is entered.
  await expect(value(preview, "System price")).toHaveText("7.200 €");
  await expect(value(preview, "Risk band")).toHaveText("A");
  await expect(value(preview, "APR")).toHaveText("6,9 %");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Step 5 of 6")).toBeVisible();
  await page.goBack();
  await expect(page.getByText("Step 4 of 6")).toBeVisible();
  await expect(page.getByLabel("System size (kW)")).toHaveValue("6");
  await page.keyboard.press("Enter");

  await expect(page.getByLabel("Down payment (€)")).toBeFocused();
  await page.keyboard.type("1000");
  await expect(value(preview, "Principal")).toHaveText("6.200 €");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Step 6 of 6")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request quote" }),
  ).toBeFocused();
  const terms = ["System price", "Risk band", "APR", "Principal"];
  const expected = await Promise.all(
    terms.map((term) => value(preview, term).innerText()),
  );
  const monthlyPayments = await Promise.all(
    ["5 years", "10 years", "15 years"].map((term) =>
      monthlyPayment(offerCard(page, term, preview)),
    ),
  );
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("heading", { name: "Quote for Erika Example" }),
  ).toBeVisible();
  const details = page.locator("dl");
  for (const [index, term] of terms.entries()) {
    await expect(value(details, term)).toHaveText(expected[index] ?? "");
  }
  for (const [index, term] of ["5 years", "10 years", "15 years"].entries()) {
    const offer = offerCard(page, term);
    expect(await monthlyPayment(offer)).toBe(monthlyPayments[index]);
  }
});

test("the summary's Edit goes back to its step", async ({ page }) => {
  await fillUpToDownPayment(page, "6");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByRole("button", { name: "Edit address" }).click();
  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await expect(page.getByLabel("Address")).toBeFocused();
});

test("the down payment slider stops at the system price, and a lower size lowers the down payment", async ({
  page,
}) => {
  await fillUpToDownPayment(page, "6");
  const slider = page.getByRole("slider", { name: "Down payment" });
  await slider.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "7200");
  await expect(page.getByLabel("Down payment (€)")).toHaveValue("7200");

  await page.goBack();
  await page.getByLabel("System size (kW)").fill("5");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByLabel("Down payment (€)")).toHaveValue("6000");
  await expect(page.getByText("Lowered to the new system price")).toBeVisible();
});

async function fillUpToDownPayment(page: Page, systemSizeKw: string) {
  await page.getByRole("button", { name: "Next" }).click();
  for (const [label, entered] of [
    ["Address", "Musterstraße 1, 10115 Berlin"],
    ["Monthly consumption (kWh)", "400"],
    ["System size (kW)", systemSizeKw],
  ] as const) {
    await page.getByLabel(label).fill(entered);
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("Step 5 of 6")).toBeVisible();
}

/** The value shown for a term in a description list. */
function value(list: Locator, term: string) {
  return list
    .locator("dt", { hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd");
}

/** The offer card for a term, in the preview or on the results page. */
function offerCard(page: Page, term: string, within: Page | Locator = page) {
  return within
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: term, exact: true }) });
}

async function monthlyPayment(offer: Locator) {
  return (await offer.innerText()).match(/[\d.]+(,\d+)?\s€/)?.[0];
}
