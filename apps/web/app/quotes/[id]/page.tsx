import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { getQuote } from "@/lib/api";
import {
  formatDate,
  formatKw,
  formatKwh,
  formatMoney,
  formatPercent,
} from "@/lib/format";

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote((await cookies()).toString(), id);
  if (quote === null) notFound();

  const details = [
    ["Applicant", quote.fullName],
    ["Email", quote.email],
    ["Address", quote.address],
    ["Monthly consumption", formatKwh(quote.monthlyConsumptionKwh)],
    ["System size", formatKw(quote.systemSizeKw)],
    ["System price", formatMoney(quote.systemPrice)],
    ["Down payment", formatMoney(quote.downPayment)],
    ["Principal", formatMoney(quote.principal)],
    ["Risk band", quote.riskBand],
    ["APR", formatPercent(quote.apr)],
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-medium">Quote for {quote.fullName}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Requested on {formatDate(new Date(quote.createdAt))}
      </p>
      <dl className="grid gap-4 rounded-3xl bg-muted p-6 sm:grid-cols-2">
        {details.map(([term, value]) => (
          <div key={term}>
            <dt className="text-sm font-semibold">{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-12 mb-6 text-xl font-medium">Offers</h2>
      <ul className="grid gap-8 sm:grid-cols-3">
        {quote.offers.map((offer) => (
          <li
            key={offer.termYears}
            className="rounded-xl bg-card p-6 shadow-[0_24px_64px_rgba(0,0,0,.12),0_2px_8px_rgba(0,0,0,.06)]"
          >
            <h3 className="font-semibold">{offer.termYears} years</h3>
            <p className="my-2 text-3xl font-semibold tabular-nums">
              {formatMoney(offer.monthlyPayment)}
            </p>
            <p className="text-sm text-muted-foreground">
              per month at {formatPercent(offer.apr)} APR on{" "}
              {formatMoney(offer.principalUsed)}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
