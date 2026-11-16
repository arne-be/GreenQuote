"use client";

import {
  centsToEuros,
  DOWN_PAYMENT_ABOVE_SYSTEM_PRICE,
  type QuoteInput,
  quoteInputSchema,
  type QuoteResult,
} from "@greenquote/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Controller,
  useForm,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";

import { StepForm } from "@/components/step-form";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ApiError, createQuote } from "@/lib/api";
import { formatKw, formatKwh, formatMoney, formatPercent } from "@/lib/format";

import {
  lowerDownPayment,
  previewQuote,
  type QuoteFormValues,
  quoteSteps,
} from "./quote-steps";

type QuoteStepId = (typeof quoteSteps)[number]["id"];

const DOWN_PAYMENT_STEP = quoteSteps.findIndex(
  (step) => step.id === "down-payment",
);

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
  // True while the slider is dragged, so the preview announces only where it settles.
  const [isSliding, setIsSliding] = useState(false);
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
  const [monthlyConsumptionKwh, systemSizeKw, downPayment] = useWatch({
    control: form.control,
    name: ["monthlyConsumptionKwh", "systemSizeKw", "downPayment"],
  });
  const preview = previewQuote({
    monthlyConsumptionKwh,
    systemSizeKw,
    downPayment,
  });

  const handleSubmit = async (values: QuoteInput) => {
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
  };

  return (
    <StepForm
      form={form}
      steps={quoteSteps}
      submitLabel="Request quote"
      isLeaving={isLeaving}
      onSubmit={handleSubmit}
      preview={(step) =>
        preview && (
          <QuotePreview
            result={preview}
            showsOffers={quoteSteps.indexOf(step) >= DOWN_PAYMENT_STEP}
            isSliding={isSliding}
          />
        )
      }
    >
      {(step, goBackTo) =>
        ({
          applicant: (
            <>
              <TextField
                control={form.control}
                name="fullName"
                label="Applicant's full name"
                autoComplete="name"
              />
              <TextField
                control={form.control}
                name="email"
                label="Applicant's email"
                type="email"
                autoComplete="email"
              />
            </>
          ),
          address: (
            <TextField
              control={form.control}
              name="address"
              label="Address"
              autoComplete="street-address"
            />
          ),
          consumption: (
            <TextField
              control={form.control}
              name="monthlyConsumptionKwh"
              label="Monthly consumption (kWh)"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
            />
          ),
          size: (
            <TextField
              control={form.control}
              name="systemSizeKw"
              label="System size (kW)"
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
            />
          ),
          "down-payment": (
            <DownPaymentStep
              form={form}
              systemPriceCents={preview?.systemPriceCents ?? 0}
              onSlidingChange={setIsSliding}
            />
          ),
          summary: <Summary values={form.getValues()} goBackTo={goBackTo} />,
        })[step.id]
      }
    </StepForm>
  );
}

function DownPaymentStep({
  form,
  systemPriceCents,
  onSlidingChange,
}: {
  form: UseFormReturn<QuoteFormValues, unknown, QuoteInput>;
  systemPriceCents: number;
  onSlidingChange: (isSliding: boolean) => void;
}) {
  const [isLowered, setIsLowered] = useState(false);
  const { getValues, setValue } = form;
  // The user may have gone back and lowered the system size below the down payment.
  useEffect(() => {
    const lowered = lowerDownPayment(
      getValues("downPayment"),
      systemPriceCents,
    );
    if (lowered === undefined) return;
    setValue("downPayment", lowered);
    setIsLowered(true);
  }, [getValues, setValue, systemPriceCents]);

  const maxEuros = centsToEuros(systemPriceCents);
  return (
    <Controller
      control={form.control}
      name="downPayment"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="downPayment">Down payment (€)</FieldLabel>
          <Slider
            aria-label="Down payment"
            min={0}
            max={maxEuros}
            step={100}
            value={[Math.min(Number(field.value) || 0, maxEuros)]}
            onValueChange={([euros]) => field.onChange(String(euros ?? 0))}
            onPointerDown={() => onSlidingChange(true)}
            // After pointerup and pointercancel alike, as the slider captures the pointer.
            onLostPointerCapture={() => onSlidingChange(false)}
            className="mt-2"
          />
          {/* The range the slider covers. */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatMoney(0)}</span>
            <span>{formatMoney(maxEuros)}</span>
          </div>
          <Input
            {...field}
            value={field.value ?? ""}
            id="downPayment"
            type="number"
            inputMode="decimal"
            min={0}
            max={maxEuros}
            step={0.01}
            aria-describedby="downPayment-description"
            aria-invalid={fieldState.invalid}
          />
          <FieldDescription id="downPayment-description">
            {isLowered && "Lowered to the new system price. "}
            Optional, up to the system price of {formatMoney(maxEuros)}. The
            part you pay upfront. It lowers the principal, the amount you
            finance.
          </FieldDescription>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function Summary({
  values,
  goBackTo,
}: {
  values: QuoteFormValues;
  goBackTo: (id: QuoteStepId) => void;
}) {
  const rows: [term: string, value: string, step: QuoteStepId][] = [
    ["Applicant", values.fullName, "applicant"],
    ["Email", values.email, "applicant"],
    ["Address", values.address, "address"],
    [
      "Monthly consumption",
      formatKwh(Number(values.monthlyConsumptionKwh)),
      "consumption",
    ],
    ["System size", formatKw(Number(values.systemSizeKw)), "size"],
    [
      "Down payment",
      formatMoney(Number(values.downPayment) || 0),
      "down-payment",
    ],
  ];
  return (
    <dl className="flex flex-col gap-4">
      {rows.map(([term, value, step]) => (
        <div key={term}>
          <dt className="text-sm font-semibold">{term}</dt>
          <dd className="flex items-center justify-between gap-4">
            <span className="min-w-0 break-words">{value}</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => goBackTo(step)}
            >
              Edit<span className="sr-only"> {term.toLowerCase()}</span>
            </Button>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function QuotePreview({
  result,
  showsOffers,
  isSliding,
}: {
  result: QuoteResult;
  /** From the down payment step on, which sets the principal. */
  showsOffers: boolean;
  isSliding: boolean;
}) {
  return (
    <section
      aria-labelledby="preview-heading"
      aria-live="polite"
      aria-busy={isSliding}
      className="flex flex-col gap-4 rounded-3xl bg-muted p-6"
    >
      <h2 id="preview-heading" className="text-lg font-medium">
        Preview
      </h2>
      <dl className="grid grid-cols-2 gap-4">
        <PreviewValue
          term="System price"
          value={formatMoney(centsToEuros(result.systemPriceCents))}
        />
        <PreviewValue term="APR" value={formatPercent(result.apr)} />
        {showsOffers && result.principalCents >= 0 && (
          <PreviewValue
            term="Principal"
            value={formatMoney(centsToEuros(result.principalCents))}
          />
        )}
      </dl>
      {showsOffers &&
        (result.principalCents < 0 ? (
          <p className="text-sm">{DOWN_PAYMENT_ABOVE_SYSTEM_PRICE}.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {result.offers.map((offer) => (
              <li key={offer.termYears} className="rounded-xl bg-card p-4">
                <h3 className="text-sm font-semibold">
                  {offer.termYears} years
                </h3>
                <p className="text-xl font-semibold tabular-nums">
                  {formatMoney(centsToEuros(offer.monthlyPaymentCents))}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    per month
                  </span>
                </p>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

function PreviewValue({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function isQuoteField(field: unknown): field is keyof QuoteInput {
  return typeof field === "string" && field in quoteInputSchema.shape;
}
