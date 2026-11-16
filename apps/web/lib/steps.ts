import type { FieldPath, FieldValues } from "react-hook-form";

/** One screen of a step form: its id in `?step=` and the fields it asks for. */
export type Step<TValues extends FieldValues> = {
  id: string;
  fields: readonly FieldPath<TValues>[];
};

/**
 * The index of the step to show for the `?step=` id. A step past `reached`
 * (the furthest step the user got to in memory) has lost its earlier values,
 * as after a reload, so the form starts again at the first step.
 */
export function resolveStep(
  steps: readonly { id: string }[],
  id: string | null,
  reached: number,
): number {
  const index = steps.findIndex((step) => step.id === id);
  return index === -1 || index > reached ? 0 : index;
}
