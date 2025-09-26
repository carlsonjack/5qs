import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "5Q Strategy - AI-Powered Business Planning",
  description:
    "Transform your business ideas into comprehensive strategies with our AI-powered 5-question framework. Get personalized business plans, financial projections, and actionable insights in minutes.",
  keywords: [
    "business strategy",
    "AI business planning",
    "startup planning",
    "business plan generator",
    "entrepreneurship",
    "business development",
  ],
  authors: [{ name: "5Q Strategy" }],
  creator: "5Q Strategy",
  publisher: "5Q Strategy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://5qstrategy.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "5Q Strategy - AI-Powered Business Planning",
    description:
      "Transform your business ideas into comprehensive strategies with our AI-powered 5-question framework. Get personalized business plans, financial projections, and actionable insights in minutes.",
    url: "https://5qstrategy.com",
    siteName: "5Q Strategy",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "5Q Strategy - AI-Powered Business Planning",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "5Q Strategy - AI-Powered Business Planning",
    description:
      "Transform your business ideas into comprehensive strategies with our AI-powered 5-question framework.",
    images: ["/logo.png"],
    creator: "@5qstrategy",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Replace with actual verification code
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="icon"
          href="/favicon-16x16.png"
          sizes="16x16"
          type="image/png"
        />
        <link
          rel="icon"
          href="/favicon-32x32.png"
          sizes="32x32"
          type="image/png"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
