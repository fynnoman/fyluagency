import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Fylu Agency · Dashboard",
  description:
    "Internes Dashboard für Fylu Marketing & Design: Kunden, Leads, Rechnungen, KPIs.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <div className="min-h-screen flex">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
              {children}
            </div>
          </main>
        </div>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
