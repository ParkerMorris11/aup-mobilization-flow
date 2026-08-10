import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { MobilizationProvider } from "@/context/MobilizationContext";
import { FLOW_VERSION_LABEL } from "@/lib/constants/flow-version";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: `BSI AUP Mobilization ${FLOW_VERSION_LABEL}`,
  description:
    "Turn your AI Acceptable Use Policy into parsed employee sections, a branded PDF deck, and a Flow Builder export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${fraunces.variable}`}>
        <MobilizationProvider>{children}</MobilizationProvider>
      </body>
    </html>
  );
}
