import { type Db, quotes, users } from "@greenquote/db";
import type { QuoteInput } from "@greenquote/domain";
import { QuoteService } from "@greenquote/domain/server";
import { hash } from "@node-rs/argon2";
import { subDays } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";

const ADMIN = { fullName: "Admin", email: "admin@test.com" };
const LENA = { fullName: "Lena Fischer", email: "lena@test.com" };
const TOM = { fullName: "Tom Weber", email: "tom@test.com" };
const NINA = { fullName: "Nina Meyer", email: "nina@test.com" };
const DEMO_USERS = [LENA, TOM, NINA];

// One quote per risk band for each user. Two down payments equal the system price
// under PRICING_RULES (@greenquote/domain) to show a principal of 0; the test checks it.
const DEMO_QUOTES: { userEmail: string; daysAgo: number; input: QuoteInput }[] =
  [
    {
      userEmail: LENA.email,
      daysAgo: 2,
      input: {
        fullName: "Jonas Becker",
        email: "jonas.becker@example.com",
        address: "Lindenstraße 12, 10969 Berlin",
        monthlyConsumptionKwh: 450,
        systemSizeKw: 5,
      },
    },
    {
      userEmail: LENA.email,
      daysAgo: 5,
      input: {
        fullName: "Mia Schulz",
        email: "mia.schulz@example.com",
        address: "Bergstraße 4, 69120 Heidelberg",
        monthlyConsumptionKwh: 300,
        systemSizeKw: 8,
        downPayment: 2000,
      },
    },
    {
      userEmail: LENA.email,
      daysAgo: 9,
      input: {
        fullName: "Paul Wagner",
        email: "paul.wagner@example.com",
        address: "Hafenweg 8, 20457 Hamburg",
        monthlyConsumptionKwh: 200,
        systemSizeKw: 4,
        downPayment: 4800,
      },
    },
    {
      userEmail: TOM.email,
      daysAgo: 3,
      input: {
        fullName: "Sophie Hoffmann",
        email: "sophie.hoffmann@example.com",
        address: "Marktplatz 3, 80331 München",
        monthlyConsumptionKwh: 520,
        systemSizeKw: 6,
        downPayment: 1500,
      },
    },
    {
      userEmail: TOM.email,
      daysAgo: 12,
      input: {
        fullName: "Felix Koch",
        email: "felix.koch@example.com",
        address: "Rheinallee 21, 50668 Köln",
        monthlyConsumptionKwh: 260,
        systemSizeKw: 7.5,
      },
    },
    {
      userEmail: TOM.email,
      daysAgo: 20,
      input: {
        fullName: "Emma Richter",
        email: "emma.richter@example.com",
        address: "Schillerstraße 7, 01069 Dresden",
        monthlyConsumptionKwh: 180,
        systemSizeKw: 3.5,
        downPayment: 500,
      },
    },
    {
      userEmail: NINA.email,
      daysAgo: 7,
      input: {
        fullName: "Leon Klein",
        email: "leon.klein@example.com",
        address: "Gartenstraße 15, 70173 Stuttgart",
        monthlyConsumptionKwh: 410,
        systemSizeKw: 4.2,
      },
    },
    {
      userEmail: NINA.email,
      daysAgo: 15,
      input: {
        fullName: "Hannah Wolf",
        email: "hannah.wolf@example.com",
        address: "Am Markt 2, 04109 Leipzig",
        monthlyConsumptionKwh: 350,
        systemSizeKw: 9,
        downPayment: 3000,
      },
    },
    {
      userEmail: NINA.email,
      daysAgo: 26,
      input: {
        fullName: "Noah Schröder",
        email: "noah.schroeder@example.com",
        address: "Mühlenweg 9, 28195 Bremen",
        monthlyConsumptionKwh: 150,
        systemSizeKw: 3,
      },
    },
    {
      userEmail: ADMIN.email,
      daysAgo: 1,
      input: {
        fullName: "Lina Neumann",
        email: "lina.neumann@example.com",
        address: "Königsallee 30, 40212 Düsseldorf",
        monthlyConsumptionKwh: 600,
        systemSizeKw: 6,
        downPayment: 7200,
      },
    },
    {
      userEmail: ADMIN.email,
      daysAgo: 18,
      input: {
        fullName: "Elias Schwarz",
        email: "elias.schwarz@example.com",
        address: "Domstraße 5, 55116 Mainz",
        monthlyConsumptionKwh: 275,
        systemSizeKw: 10,
      },
    },
    {
      userEmail: ADMIN.email,
      daysAgo: 33,
      input: {
        fullName: "Clara Zimmermann",
        email: "clara.zimmermann@example.com",
        address: "Kaiserstraße 11, 60311 Frankfurt am Main",
        monthlyConsumptionKwh: 220,
        systemSizeKw: 5,
        downPayment: 1000,
      },
    },
  ];

/** Seeds the admin; with a demo password also the demo users and their quotes. Idempotent. */
export async function seed(
  db: Db,
  options: { adminPassword: string; demoPassword?: string | undefined },
) {
  await db
    .insert(users)
    .values({
      ...ADMIN,
      passwordHash: await hash(options.adminPassword),
      role: "admin",
    })
    .onConflictDoNothing();
  if (options.demoPassword === undefined) return;

  const passwordHash = await hash(options.demoPassword);
  await db
    .insert(users)
    .values(DEMO_USERS.map((user) => ({ ...user, passwordHash })))
    .onConflictDoNothing();
  const actors = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(
      inArray(users.email, [ADMIN.email, ...DEMO_USERS.map((u) => u.email)]),
    );

  const quoteService = new QuoteService(db);
  // shortcut: check-then-insert without a lock, as the seed is a one-off job; take an advisory lock if it ever runs concurrently.
  for (const { userEmail, daysAgo, input } of DEMO_QUOTES) {
    const actor = actors.find((user) => user.email === userEmail);
    if (actor === undefined)
      throw new Error(`Seed user ${userEmail} not found`);
    const [existing] = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(
        and(
          eq(quotes.userId, actor.id),
          eq(quotes.applicantEmail, input.email),
        ),
      );
    if (existing !== undefined) continue;
    // Through the domain service, so prices and offers come from the real pricing rules.
    const quote = await quoteService.createQuote(actor, input);
    await db
      .update(quotes)
      .set({ createdAt: subDays(new Date(), daysAgo) })
      .where(eq(quotes.id, quote.id));
  }
}
