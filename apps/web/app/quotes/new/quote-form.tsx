"use client";

import { quoteInputSchema } from "@greenquote/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createQuote } from "@/lib/api";

export function QuoteForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const router = useRouter();
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
  const { errors } = form.formState;

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const quote = await createQuote(values);
      // Replace, so going back does not land on a form that resubmits.
      router.replace(`/quotes/${quote.id}`);
    } catch {
      form.setError("root", {
        message: "Could not request the quote. Please try again.",
      });
    }
  });

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)}>
      <FieldGroup>
        <Field data-invalid={errors.fullName !== undefined}>
          <FieldLabel htmlFor="fullName">Applicant's full name</FieldLabel>
          <Input
            {...form.register("fullName")}
            id="fullName"
            autoComplete="name"
            aria-invalid={errors.fullName !== undefined}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field data-invalid={errors.email !== undefined}>
          <FieldLabel htmlFor="email">Applicant's email</FieldLabel>
          <Input
            {...form.register("email")}
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email !== undefined}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={errors.address !== undefined}>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <Input
            {...form.register("address")}
            id="address"
            autoComplete="street-address"
            aria-invalid={errors.address !== undefined}
          />
          <FieldError errors={[errors.address]} />
        </Field>
        <Field data-invalid={errors.monthlyConsumptionKwh !== undefined}>
          <FieldLabel htmlFor="monthlyConsumptionKwh">
            Monthly consumption (kWh)
          </FieldLabel>
          <Input
            {...form.register("monthlyConsumptionKwh")}
            id="monthlyConsumptionKwh"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            aria-invalid={errors.monthlyConsumptionKwh !== undefined}
          />
          <FieldError errors={[errors.monthlyConsumptionKwh]} />
        </Field>
        <Field data-invalid={errors.systemSizeKw !== undefined}>
          <FieldLabel htmlFor="systemSizeKw">System size (kW)</FieldLabel>
          <Input
            {...form.register("systemSizeKw")}
            id="systemSizeKw"
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.01}
            aria-invalid={errors.systemSizeKw !== undefined}
          />
          <FieldError errors={[errors.systemSizeKw]} />
        </Field>
        <Field data-invalid={errors.downPayment !== undefined}>
          <FieldLabel htmlFor="downPayment">Down payment (€)</FieldLabel>
          <Input
            {...form.register("downPayment")}
            id="downPayment"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            aria-describedby="downPayment-description"
            aria-invalid={errors.downPayment !== undefined}
          />
          <FieldDescription id="downPayment-description">
            Optional. Paid upfront and not financed.
          </FieldDescription>
          <FieldError errors={[errors.downPayment]} />
        </Field>
        <FieldError errors={[errors.root]} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Request quote
        </Button>
      </FieldGroup>
    </form>
  );
}
