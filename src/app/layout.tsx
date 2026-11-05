import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { FeedbackProvider } from "@/components/Feedback";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gerenciador de Tarefas",
    template: "%s · Gerenciador de Tarefas",
  },
  description: "Gerenciador de tarefas com Next.js e tRPC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // A variável da fonte fica no <html> porque o Tailwind declara --font-sans
    // em :root, onde --font-geist-sans precisa estar definida.
    <html lang="pt-BR" className={geistSans.variable}>
      <body>
        <TRPCReactProvider>
          <FeedbackProvider>
            <main className="mx-auto w-full max-w-2xl px-5 pt-12 pb-28 sm:px-6 sm:pt-20">
              {children}
            </main>
          </FeedbackProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
