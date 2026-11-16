import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

test("a new user registers in three steps with the keyboard, and the browser Back goes to the previous step", async ({
  page,
}) => {
  const email = `e2e-${randomUUID()}@test.com`;

  await page.goto("/register");
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  // Focus starts in the step's input, and Enter goes to the next step.
  await expect(page.getByLabel("Full name")).toBeFocused();
  await page.keyboard.type("Erika Example");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await expect(page).toHaveURL(/\?step=email$/);
  await expect(page.getByLabel("Email")).toBeFocused();
  // An invalid email keeps the user on its step.
  await page.keyboard.type("not-an-email");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText("Step 2 of 3")).toBeVisible();

  await page.goBack();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Erika Example");
  await page.keyboard.press("Enter");

  await expect(page.getByLabel("Email")).toBeFocused();
  await page.getByLabel("Email").fill(email);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Step 3 of 3")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeFocused();
  await page.keyboard.type("e2e-password");
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("heading", { name: "Request a quote" }),
  ).toBeVisible();
});

test("registering with a taken email goes back to the Email step with a link to sign in", async ({
  page,
  request,
}) => {
  const email = `e2e-${randomUUID()}@test.com`;
  await expect(
    await request.post("/api/auth/register", {
      data: { fullName: "Otto Other", email, password: "e2e-password" },
    }),
  ).toBeOK();

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Erika Example");
  await page.keyboard.press("Enter");
  await page.getByLabel("Email").fill(email);
  await page.keyboard.press("Enter");
  await page.getByLabel("Password").fill("e2e-password");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await expect(page).toHaveURL(/\?step=email$/);
  const error = page
    .getByRole("alert")
    .filter({ hasText: "An account with this email already exists." });
  await expect(error).toBeVisible();
  await expect(error.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
});

test("reloading a later step starts again at the first step", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Erika Example");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?step=email$/);

  await page.reload();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByLabel("Full name")).toHaveValue("");
});

test("submitting a step twice at once adds one history entry, so Back goes to the previous step", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Erika Example");
  // Both in one tick, before the first step's validation has finished.
  await page.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.getByText("Step 2 of 3")).toBeVisible();

  await page.goBack();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
});
