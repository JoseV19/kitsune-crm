import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CustomCursor } from "@/components/CustomCursor"; 
import { SakuraBackground } from "@/components/SakuraBackground"; 
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
      <body className={`${inter.className} cursor-none bg-black`}>
        <CustomCursor />
        
        {/* 2. FONDO ANIMADO DE PÉTALOS */}
        <SakuraBackground />
        
        <div className="relative z-10">
            {children}
        </div>
      </body>
    </html>
  );
}