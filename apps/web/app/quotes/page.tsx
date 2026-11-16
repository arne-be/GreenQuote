import { quoteListQuerySchema } from "@greenquote/domain";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteTable } from "@/components/quote-table";
import { buttonVariants } from "@/components/ui/button";
import { listQuotes } from "@/lib/api";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { offset } = await searchParams;
  const parsed = quoteListQuerySchema.safeParse({ offset });
  if (!parsed.success) notFound();
  const list = await listQuotes((await cookies()).toString(), parsed.data);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium">Quotes</h1>
        <Link href="/quotes/new" className={buttonVariants()}>
          Request a quote
        </Link>
      </div>
      <QuoteTable list={list} query={parsed.data} caption="Quotes" />
    </main>
  );
}
