import type { Metadata } from 'next';
import './globals.css';
import { Inter, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});
const spaceGrotesk = Space_Grotesk({subsets:['latin'],variable:'--font-mono'});

export const metadata: Metadata = {
  title: 'Order Tracker | Single-User Shipment Sync',
  description: 'Connect your email accounts, automatically track shipping updates, and manage your inventory - all in one dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, spaceGrotesk.variable)}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
