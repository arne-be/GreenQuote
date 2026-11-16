"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** A labelled input bound to a form field, with its error below. */
export function TextField<TValues extends FieldValues>({
  control,
  name,
  label,
  error,
  ...inputProps
}: {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  label: string;
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
          <FieldError errors={[fieldState.error]}>
            {fieldState.error && error}
          </FieldError>
        </Field>
      )}
    />
  );
}
