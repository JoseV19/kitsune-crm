import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CustomCursor } from "@/components/custom-cursor"; 
import { SakuraBackground } from "@/components/sakura-background";

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
    <html lang="es">
      <body className={`${inter.className} bg-black`}>
        {/* <CustomCursor /> */}
        
        <SakuraBackground />
        
          <div className="relative z-10">
              {children}
          </div>
      </body>
    </html>
  );
}