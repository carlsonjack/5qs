"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-8">
            <p className="text-sm text-muted-foreground lg:ml-64">
              Built by{" "}
              <a
                href="https://www.linkedin.com/in/jackyoungcarlson/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Jack Carlson
              </a>
            </p>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/terms" className="hover:underline">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
