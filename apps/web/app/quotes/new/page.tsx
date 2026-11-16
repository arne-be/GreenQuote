import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api";

import { QuoteForm } from "./quote-form";

export default async function NewQuotePage() {
  const user = await getCurrentUser((await cookies()).toString());
  if (user === null) redirect("/login");
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-medium">Request a quote</h1>
      <QuoteForm fullName={user.fullName} email={user.email} />
    </main>
  );
}
