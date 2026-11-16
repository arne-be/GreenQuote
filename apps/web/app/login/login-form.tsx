"use client";

import { loginSchema } from "@greenquote/domain";
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
import { ApiError, login } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values);
      router.push("/quotes/new");
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof ApiError && error.status === 401
            ? "Email or password is incorrect."
            : "Could not sign you in. Please try again.",
      });
    }
  });

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)}>
      <FieldGroup>
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
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Sign in
        </Button>
        <FieldDescription>
          Not registered yet? <Link href="/register">Register</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
