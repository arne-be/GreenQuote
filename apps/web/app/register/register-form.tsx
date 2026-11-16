"use client";

import { type RegisterInput, registerSchema } from "@greenquote/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { StepForm } from "@/components/step-form";
import { TextField } from "@/components/text-field";
import { FieldDescription } from "@/components/ui/field";
import { ApiError, register } from "@/lib/api";

import { registerSteps } from "./register-steps";

export function RegisterForm() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const handleSubmit = async (values: RegisterInput) => {
    try {
      await register(values);
      setIsLeaving(true);
      router.push("/quotes/new");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // The step form goes back to the Email step to show this.
        form.setError("email", { type: "taken" });
        return;
      }
      form.setError("root", {
        message: "Could not register you. Please try again.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <StepForm
        form={form}
        steps={registerSteps}
        submitLabel="Create account"
        isLeaving={isLeaving}
        onSubmit={handleSubmit}
      >
        {(step) =>
          ({
            name: (
              <TextField
                control={form.control}
                name="fullName"
                label="Full name"
                autoComplete="name"
              />
            ),
            email: (
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                error={
                  form.formState.errors.email?.type === "taken" && (
                    <>
                      An account with this email already exists.{" "}
                      <Link href="/login" className="underline">
                        Sign in
                      </Link>
                    </>
                  )
                }
              />
            ),
            password: (
              <TextField
                control={form.control}
                name="password"
                label="Password"
                type="password"
                autoComplete="new-password"
              />
            ),
          })[step.id]
        }
      </StepForm>
      <FieldDescription>
        Already registered? <Link href="/login">Sign in</Link>
      </FieldDescription>
    </div>
  );
}
