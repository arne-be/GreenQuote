"use client";

import { type QuoteInput, quoteInputSchema } from "@greenquote/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { ApiError, createQuote } from "@/lib/api";

export function QuoteForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const router = useRouter();
  // Stays true while the next page loads, so a second click cannot submit again.
  const [isLeaving, setIsLeaving] = useState(false);
  const form = useForm({
    resolver: zodResolver(quoteInputSchema),
    defaultValues: {
      fullName,
      email,
      address: "",
      monthlyConsumptionKwh: "",
      systemSizeKw: "",
      downPayment: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const quote = await createQuote(values);
      setIsLeaving(true);
      // Replace, so going back does not land on a form that resubmits.
      router.replace(`/quotes/${quote.id}`);
    } catch (error) {
      let hasFieldError = false;
      if (error instanceof ApiError) {
        for (const { path, message } of error.fieldErrors) {
          const field = path[0];
          if (isQuoteField(field)) {
            form.setError(field, { message });
            hasFieldError = true;
          }
        }
      }
      if (!hasFieldError) {
        form.setError("root", {
          message: "Could not request the quote. Please try again.",
        });
      }
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
              <FieldLabel htmlFor="fullName">Applicant's full name</FieldLabel>
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
              <FieldLabel htmlFor="email">Applicant's email</FieldLabel>
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
          name="address"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Input
                {...field}
                id="address"
                autoComplete="street-address"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="monthlyConsumptionKwh"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="monthlyConsumptionKwh">
                Monthly consumption (kWh)
              </FieldLabel>
              <Input
                {...field}
                id="monthlyConsumptionKwh"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="systemSizeKw"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="systemSizeKw">System size (kW)</FieldLabel>
              <Input
                {...field}
                id="systemSizeKw"
                type="number"
                inputMode="decimal"
                min={0.01}
                step={0.01}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="downPayment"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="downPayment">Down payment (€)</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="downPayment"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                aria-describedby="downPayment-description"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription id="downPayment-description">
                Optional. The part you pay upfront. It lowers the principal, the
                amount you finance.
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || isLeaving}
        >
          Request quote
        </Button>
      </FieldGroup>
    </form>
  );
}

function isQuoteField(field: unknown): field is keyof QuoteInput {
  return typeof field === "string" && field in quoteInputSchema.shape;
}
