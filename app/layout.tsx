import { Wordmark } from "@/components/logo";
import { SiteNav } from "@/components/site-nav";
import { StatsStrip } from "@/components/stats-strip";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistDisplay = Geist({
  variable: "--font-geist-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lineage — the company brain that knows why",
    template: "%s · Lineage",
  },
  description:
    "Lineage answers why decisions were made, what went stale, and who to ask — every answer shows the path it came from.",
};

const themeScript = `(function(){try{var t=localStorage.getItem("lineage-theme")||"dark";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistDisplay.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
            <Wordmark />
            <div className="ml-auto flex items-center gap-1">
              <SiteNav />
              <Separator orientation="vertical" className="mx-1 h-6" />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <StatsStrip />
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
            <p>
              Lineage is a knowledge graph over your company&apos;s decisions. Every answer shows
              the path it came from — no path, no answer.
            </p>
            <p className="sm:ml-auto">
              Demo build ·{" "}
              <Link href="/review" className="rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                review queue
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
