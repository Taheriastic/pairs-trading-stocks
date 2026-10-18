import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Pairs Trading Stocks | FP&A and Historical Pair Research",
  description:
    "A filing-backed FP&A scenario planner and point-in-time historical pairs research case study for KO/PEP and MSFT/ORCL.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
