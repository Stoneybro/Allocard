import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import Web3Providers from "@/components/Web3Providers";

export const metadata: Metadata = {
  title: "Allocard",
  description: "Trustless Corporate Expense Cards built on MetaMask Smart Accounts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="h-dvh overflow-hidden antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider>
            <Web3Providers>
              {children}
            </Web3Providers>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
