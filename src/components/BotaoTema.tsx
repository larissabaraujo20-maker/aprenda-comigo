"use client";

import { Moon, Sun } from "lucide-react";

export function BotaoTema() {
  const alternar = () => {
    const escuro = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("ac-tema", escuro ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={alternar} className="rounded-lg p-2 text-suave hover:text-texto" aria-label="Alternar modo claro/escuro">
      <Sun size={18} className="hidden dark:block" />
      <Moon size={18} className="dark:hidden" />
    </button>
  );
}
