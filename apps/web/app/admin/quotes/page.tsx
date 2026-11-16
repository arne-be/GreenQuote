import { quoteListQuerySchema } from "@greenquote/domain";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { QuoteTable } from "@/components/quote-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser, listQuotes } from "@/lib/api";

// UX only: the API scopes the list by role, so a non-admin here would still see only their own quotes.
export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookie = (await cookies()).toString();
  const user = await getCurrentUser(cookie);
  if (user?.role !== "admin") redirect("/quotes");
  const { q, offset } = await searchParams;
  const parsed = quoteListQuerySchema.safeParse({ q, offset });
  if (!parsed.success) notFound();
  const list = await listQuotes(cookie, parsed.data);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-medium">All quotes</h1>
      <form role="search" className="mb-6 flex max-w-md gap-2">
        <label htmlFor="q" className="sr-only">
          Search by user or applicant name or email
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          maxLength={100}
          defaultValue={parsed.data.q}
          placeholder="Name or email"
          // Same height as the button next to it.
          className="h-12"
        />
        <Button type="submit">Search</Button>
      </form>
      <QuoteTable
        list={list}
        query={parsed.data}
        caption="All quotes"
        isAdminView
      />
    </main>
  );
}
