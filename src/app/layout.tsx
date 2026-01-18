import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { SakuraBackground } from "@/components/sakura-background";
import { esES } from "@clerk/localizations";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kitsune CRM",
  icons: {
    icon: '/logo-kiriko.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es">
        <body className={`${inter.className} bg-black`}>
          <SakuraBackground />
          <div className="relative">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
