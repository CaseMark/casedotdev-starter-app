import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { CaseDevFooter } from "@/components/case-dev-footer";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans" 
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Discovery Desktop",
  description: "E-discovery document management with semantic search",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-white dark:bg-neutral-950">
        <Providers>
          <main className="flex-1 flex flex-col">{children}</main>
          <CaseDevFooter />
        </Providers>
      </body>
    </html>
  );
}
