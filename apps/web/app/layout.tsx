import "./globals.css";

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "GreenQuote",
  icons: "/cloover-mark.svg",
};

export default function RootLayout({ children }: { children: ReactNode }) {
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
          {/* User name and logout button go here (#8). */}
        </header>
        {children}
      </body>
    </html>
  );
}
