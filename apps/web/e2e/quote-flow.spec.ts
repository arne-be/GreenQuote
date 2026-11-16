import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

test("a new user requests a quote once, even clicking submit twice, and sees the offers and the quote list", async ({
  page,
}) => {
  const email = `e2e-${randomUUID()}@test.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Erika Example");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Password").fill("e2e-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByRole("heading", { name: "Request a quote" }),
  ).toBeVisible();
  await page.getByLabel("Address").fill("Musterstraße 1, 10115 Berlin");
  await page.getByLabel("Monthly consumption (kWh)").fill("400");
  await page.getByLabel("System size (kW)").fill("6");
  // Hold the results page for a moment, the time a slow network would take to load it.
  const isResultsPage = (url: URL) => /^\/quotes\/[^/]+$/.test(url.pathname);
  await page.route(isResultsPage, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  const resultsRequested = page.waitForRequest((request) =>
    isResultsPage(new URL(request.url())),
  );
  const submit = page.getByRole("button", { name: "Request quote" });
  await submit.click();
  await resultsRequested;
  // A second click while the results load must not request a second quote.
  // The mouse, not submit.click(), which would wait for the button to be enabled.
  const box = await submit.boundingBox();
  if (box === null) throw new Error("The submit button is not visible.");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(
    page.getByRole("heading", { name: "Quote for Erika Example" }),
  ).toBeVisible();
  for (const term of ["5 years", "10 years", "15 years"]) {
    await expect(
      page.getByRole("heading", { name: term, exact: true }),
    ).toBeVisible();
  }

  await page.goto("/quotes");
  await expect(page.getByRole("table")).toHaveAccessibleName(
    "Quotes: 1–1 of 1",
  );
  await expect(
    page.getByRole("columnheader", { name: "Applicant" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table").getByText("Erika Example", { exact: true }),
  ).toBeVisible();
});
