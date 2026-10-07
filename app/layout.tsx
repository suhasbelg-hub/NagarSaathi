import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NagarSaathi · Companion for Civic Change",
    template: "%s · NagarSaathi"
  },
  description: "A clear, accountable way to report civic issues and follow them through to verified resolution.",
  applicationName: "NagarSaathi",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F766E"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
