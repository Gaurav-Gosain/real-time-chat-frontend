import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { Inter as FontSans } from "next/font/google";

import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <div
          className={cn(
            "min-h-[100svh] bg-background font-sans antialiased",
            fontSans.variable,
          )}
        >
          <Toaster />
          <Component {...pageProps} />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
