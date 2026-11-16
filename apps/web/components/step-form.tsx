"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type {
  FieldValues,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { resolveStep, type Step } from "@/lib/steps";

/**
 * A form asked one step at a time. The step is in the URL (`?step=<id>`, none
 * on the first step; one history entry per step) so the browser Back button
 * goes to the previous step; the values stay in memory only.
 */
export function StepForm<
  TValues extends FieldValues,
  TSteps extends readonly [Step<TValues>, ...Step<TValues>[]],
>({
  form,
  steps,
  onSubmit,
  submitLabel,
  isLeaving,
  children,
}: {
  form: UseFormReturn<TValues>;
  steps: TSteps;
  onSubmit: SubmitHandler<TValues>;
  submitLabel: string;
  /** True while the next page loads, so a second click cannot submit again. */
  isLeaving: boolean;
  children: (step: TSteps[number]) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  // The furthest step the user has reached with valid earlier steps.
  const reached = useRef(0);
  const step: TSteps[number] = steps[index] ?? steps[0];
  const isLast = index === steps.length - 1;

  const router = useRouter();
  // A reload on a later step has lost the earlier values: start again.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("step")) {
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    const show = () => {
      const requested = new URLSearchParams(window.location.search).get("step");
      const shown = resolveStep(steps, requested, reached.current);
      if (shown === 0 && requested !== null) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      setIndex(shown);
    };
    window.addEventListener("popstate", show);
    return () => window.removeEventListener("popstate", show);
  }, [steps]);

  const { setFocus } = form;
  const firstField = step.fields[0];
  useEffect(() => {
    if (firstField) setFocus(firstField);
  }, [firstField, setFocus]);

  // Back through the history, so the browser's Back and Forward stay in step.
  const goBackTo = (target: number) => {
    if (target >= 0 && target < index) window.history.go(target - index);
  };

  const goBackToFirstInvalidStep = () => {
    goBackTo(
      steps.findIndex((s) =>
        s.fields.some((name) => form.getFieldState(name).invalid),
      ),
    );
  };

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    goBackToFirstInvalidStep();
  }, goBackToFirstInvalidStep);

  // Set while a step validates, so a second Enter cannot push its step twice.
  const isAdvancing = useRef(false);
  const next = async () => {
    const following = steps[index + 1];
    if (!following || isAdvancing.current) return;
    isAdvancing.current = true;
    let isValid: boolean;
    try {
      isValid = await form.trigger(step.fields);
    } finally {
      isAdvancing.current = false;
    }
    if (!isValid) return;
    reached.current = Math.max(reached.current, index + 1);
    window.history.pushState(null, "", `?step=${following.id}`);
    setIndex(index + 1);
  };

  return (
    // Enter submits the form, which goes to the next step until the last.
    <form
      noValidate
      onSubmit={(event) => {
        if (isLast) {
          void submit(event);
          return;
        }
        event.preventDefault();
        void next();
      }}
    >
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          Step {index + 1} of {steps.length}
        </p>
        {children(step)}
        <FieldError errors={[form.formState.errors.root]} />
        <div className="flex gap-3">
          {index > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.history.back()}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1"
            disabled={isLast && (form.formState.isSubmitting || isLeaving)}
          >
            {isLast ? submitLabel : "Next"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
