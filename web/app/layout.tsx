import type { Metadata } from "next";
import "./globals.css";
import "./lab.css";
export const metadata: Metadata = {
  title: "Pairs Trading | Twenty-Year Strategy Lab",
  description:
    "Explore 5,032 daily sessions, compare ten stock and pairs strategies, replay historical decisions and export formula-driven analysis.",
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
