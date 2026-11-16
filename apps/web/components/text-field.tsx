"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** A labelled input bound to a form field, with its hint and error below. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  error,
  ...inputProps
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: ReactNode;
  /** Replaces the error message, for an error that needs a link. */
  error?: ReactNode;
} & Omit<ComponentProps<typeof Input>, "name" | "id">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            {...inputProps}
            {...field}
            id={name}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]}>
            {fieldState.error && error}
          </FieldError>
        </Field>
      )}
    />
  );
}
