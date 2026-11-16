"use client";

import { loginSchema } from "@greenquote/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import {
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { ApiError, login } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  // Stays true while the next page loads, so a second click cannot submit again.
  const [isLeaving, setIsLeaving] = useState(false);
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values);
      setIsLeaving(true);
      router.push("/quotes");
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
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <FieldError errors={[form.formState.errors.root]} />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || isLeaving}
        >
          Sign in
        </Button>
        <FieldDescription>
          Not registered yet? <Link href="/register">Register</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
