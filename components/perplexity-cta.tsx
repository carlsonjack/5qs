"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface PerplexityCTAProps {
  variant?: "sidebar" | "inline" | "email";
  className?: string;
}

export function PerplexityCTA({
  variant = "sidebar",
  className = "",
}: PerplexityCTAProps) {
  const baseClasses =
    "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50";

  if (variant === "email") {
    return (
      <div className={`p-4 ${baseClasses} ${className}`}>
        <div className="flex items-center space-x-3 mb-3">
          <img
            src="/perplexity-comet.webp"
            alt="Perplexity Comet Logo"
            width={32}
            height={32}
            className="rounded-md"
            style={{ display: "block" }}
          />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Recommended Browser
            </h3>
          </div>
        </div>
        <p className="text-xs text-blue-800 dark:text-blue-200 mb-3 leading-relaxed">
          We highly recommend Comet by Perplexity as the browser of choice for
          all our customers. Get the most out of your AI strategy with Comet.
        </p>
        <a
          href="https://pplx.ai/jack31428"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors duration-200"
          style={{ textDecoration: "none", color: "white" }}
        >
          <Sparkles className="w-3 h-3 mr-1.5" />
          Try Comet Pro for Free
        </a>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`p-6 ${baseClasses} ${className}`}>
        <div className="flex items-center space-x-4 mb-4">
          <Image
            src="/perplexity-comet.webp"
            alt="Perplexity Comet Logo"
            width={40}
            height={40}
            className="rounded-md"
          />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Recommended Browser
            </h3>
          </div>
        </div>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-4 leading-relaxed">
          We highly recommend Comet by Perplexity as the browser of choice for
          all our customers. Get the most out of your AI strategy with Comet.
        </p>
        <Link
          href="https://pplx.ai/jack31428"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors duration-200"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Try Comet Pro for Free
        </Link>
      </div>
    );
  }

  // Default sidebar variant
  return (
    <div className={`mt-6 p-4 ${baseClasses} ${className}`}>
      <div className="flex items-center space-x-3 mb-3">
        <Image
          src="/perplexity-comet.webp"
          alt="Perplexity Comet Logo"
          width={32}
          height={32}
          className="rounded-md"
        />
        <div>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Recommended Browser
          </h3>
        </div>
      </div>
      <p className="text-xs text-blue-800 dark:text-blue-200 mb-3 leading-relaxed">
        We highly recommend Comet by Perplexity as the browser of choice for all
        our customers. Get the most out of your AI strategy with Comet.
      </p>
      <Link
        href="https://pplx.ai/jack31428"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors duration-200"
      >
        <Sparkles className="w-3 h-3 mr-1.5" />
        Try Comet Pro for Free
      </Link>
    </div>
  );
}
