import { registerSchema } from "@greenquote/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFormControl } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { registerSteps } from "./register-steps";

describe("registerSteps", () => {
  it("asks for the full name, then the email, then the password", () => {
    expect(registerSteps.map((step) => step.fields)).toEqual([
      ["fullName"],
      ["email"],
      ["password"],
    ]);
  });

  it("validates each step's own field only", async () => {
    const { formControl } = createFormControl({
      resolver: zodResolver(registerSchema),
      defaultValues: { fullName: "Erika Example", email: "nope", password: "" },
    });
    const [name, email, password] = registerSteps;

    expect(await formControl.trigger(name.fields)).toBe(true);
    expect(await formControl.trigger(email.fields)).toBe(false);
    expect(formControl.getFieldState("email").error?.message).toBeDefined();
    expect(formControl.getFieldState("password").invalid).toBe(false);
    expect(await formControl.trigger(password.fields)).toBe(false);
  });
});
