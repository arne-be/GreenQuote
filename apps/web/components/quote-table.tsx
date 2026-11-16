import type { QuoteList, QuoteListQuery } from "@greenquote/domain";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatKw, formatMoney } from "@/lib/format";

/** A page of quotes with previous/next links; admins also see who requested each quote and for whom. */
export function QuoteTable({
  list,
  query,
  caption,
  isAdminView = false,
}: {
  list: QuoteList;
  query: QuoteListQuery;
  caption: string;
  isAdminView?: boolean;
}) {
  const { q, limit, offset } = query;
  const pageHref = (pageOffset: number) =>
    `?${new URLSearchParams({ ...(q ? { q } : {}), offset: String(pageOffset) })}`;
  const last = offset + list.items.length;

  return (
    <>
      <Table>
        <TableCaption className="text-left">
          {caption}:{" "}
          {list.items.length === 0
            ? "none"
            : `${offset + 1}–${last} of ${list.total}`}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Date</TableHead>
            {isAdminView && <TableHead scope="col">User</TableHead>}
            {isAdminView && <TableHead scope="col">Applicant</TableHead>}
            <TableHead scope="col" className="text-right">
              System size
            </TableHead>
            <TableHead scope="col" className="text-right">
              System price
            </TableHead>
            <TableHead scope="col">Risk band</TableHead>
            <TableHead scope="col">
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.items.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell>{formatDate(new Date(quote.createdAt))}</TableCell>
              {isAdminView && <NameAndEmailCell {...quote.user} />}
              {isAdminView && <NameAndEmailCell {...quote} />}
              <TableCell className="text-right tabular-nums">
                {formatKw(quote.systemSizeKw)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(quote.systemPrice)}
              </TableCell>
              <TableCell>{quote.riskBand}</TableCell>
              <TableCell>
                <Link
                  href={`/quotes/${quote.id}`}
                  className={buttonVariants({ variant: "link" })}
                >
                  View
                  <span className="sr-only"> quote for {quote.fullName}</span>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <nav aria-label="Pages" className="mt-4 flex justify-between">
        {offset > 0 ? (
          <Link
            href={pageHref(Math.max(0, offset - limit))}
            className={buttonVariants({ variant: "outline" })}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        {last < list.total && (
          <Link
            href={pageHref(offset + limit)}
            className={buttonVariants({ variant: "outline" })}
          >
            Next
          </Link>
        )}
      </nav>
    </>
  );
}

function NameAndEmailCell({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  return (
    <TableCell>
      {fullName}
      <br />
      <span className="text-muted-foreground">{email}</span>
    </TableCell>
  );
}
