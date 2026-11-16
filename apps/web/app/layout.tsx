import "./globals.css";

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/api";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "GreenQuote",
  icons: "/cloover-mark.svg",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser((await cookies()).toString());

  return (
    <html lang="de" className={dmSans.variable}>
      <body>
        <header className="flex items-center justify-between gap-4 px-4 py-6 sm:px-8">
          <Link href="/">
            <Image
              src="/cloover-logo.svg"
              alt="Cloover"
              width={120}
              height={21}
              priority
            />
          </Link>
          {user !== null && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold">{user.fullName}</span>
              <LogoutButton />
            </div>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
