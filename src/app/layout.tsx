import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { GraduationCap, Library, Settings } from "lucide-react";
import { BotaoTema } from "@/components/BotaoTema";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Aprenda Comigo",
  description: "Aprenda qualquer assunto com vídeos curtos, passo a passo, gerados por IA.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#13121f" },
  ],
};

// Aplica o tema salvo antes da pintura, para não piscar.
const scriptTema = `try{var t=localStorage.getItem('ac-tema');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <header className="sticky top-0 z-20 border-b border-borda bg-fundo/85 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primaria text-white">
                <GraduationCap size={18} />
              </span>
              <span>Aprenda Comigo</span>
            </Link>
            <div className="ml-auto flex items-center gap-1 text-sm">
              <Link href="/trilhas" className="flex items-center gap-1.5 rounded-lg p-2 text-suave hover:text-texto sm:px-3" aria-label="Minhas trilhas">
                <Library size={18} className="sm:hidden" />
                <span className="hidden sm:inline">Minhas trilhas</span>
              </Link>
              <Link href="/configuracoes" className="flex items-center gap-1.5 rounded-lg p-2 text-suave hover:text-texto sm:px-3" aria-label="Configurações">
                <Settings size={18} className="sm:hidden" />
                <span className="hidden sm:inline">Configurações</span>
              </Link>
              <BotaoTema />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
      </body>
    </html>
  );
}
