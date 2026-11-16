"use client";

import { registerSchema } from "@greenquote/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, register } from "@/lib/api";

export function RegisterForm() {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await register(values);
      router.push("/quotes/new");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        form.setError("email", {
          message: "This email is already registered. Sign in instead.",
        });
        return;
      }
      form.setError("root", {
        message: "Could not create your account. Please try again.",
      });
    }
  });

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="fullName"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="fullName">Full name</FieldLabel>
              <Input
                {...field}
                id="fullName"
                autoComplete="name"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                {...field}
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                {...field}
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby="password-hint"
              />
              <FieldDescription id="password-hint">
                At least 8 characters.
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Create account
        </Button>
        <FieldDescription>
          Already registered? <Link href="/login">Sign in</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
