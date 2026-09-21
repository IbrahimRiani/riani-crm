import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { themeInitScript } from "@/lib/theme/theme";

export const metadata: Metadata = {
  title: "Ibra CRM",
  description: "CRM personal para gestión comercial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
