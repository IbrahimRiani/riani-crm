import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ibra CRM",
  description: "CRM personal para gestión comercial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
