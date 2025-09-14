import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import '@livekit/components-styles';

import { TRPCReactProvider } from "~/trpc/react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Toaster } from "~/components/ui/toaster";
import { Toaster as Sonner } from "~/components/ui/sonner";
import { TimezoneProvider } from "~/contexts/TimezoneContext";

import Clarity from '@microsoft/clarity';
import { env } from "~/env";
import { supabase } from "~/utils/supabase/client";
import { useEffect } from "react";
import SentryAuth from "~/components/auth/SentryAuth";

Clarity.init(env.NEXT_PUBLIC_CLARITY_ID);


export const metadata: Metadata = {
  title: "Clamo - Legal on autopilot",
      description: "Clamo helps you create your legal case and manage your legal tasks with AI",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TooltipProvider>
          <Toaster />
          <Sonner /> 
          <SentryAuth />
          <TRPCReactProvider>
            <TimezoneProvider>
                {children}
            </TimezoneProvider>
          </TRPCReactProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
