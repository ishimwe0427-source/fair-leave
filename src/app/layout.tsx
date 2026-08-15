import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import { APP_NAME, COMPANY_NAME } from "@/lib/constants";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const space = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | ${COMPANY_NAME}`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "FairLeave is an enterprise leave management system for international construction and operations teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${space.variable} h-full`}>
      <body className="min-h-full bg-canvas text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
