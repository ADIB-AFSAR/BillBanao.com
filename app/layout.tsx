import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

export const metadata: Metadata = {
  title: "BillBanao.com",
  description: "Business billing, GST invoicing and receipts.",
  openGraph: {
    title: "BillBanao.com",
    description: "Business billing, GST invoicing and receipts.",
    url: "https://billbanaodotcom.vercel.app",
    siteName: "BillBanao.com",
    type: "website",
    images: [
      {
        url: "/billbanao-og-image-v4.jpg",
        width: 1200,
        height: 630,
        alt: "BillBanao.com",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "BillBanao.com",
    description: "Business billing, GST invoicing and receipts.",
    images: ["/billbanao-og-image-v4.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <ServiceWorkerRegister />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--ink)",
              color: "var(--paper)",
              border: "none",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </body>
    </html>
  );
}
