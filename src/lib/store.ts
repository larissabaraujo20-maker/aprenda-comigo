"use client";

import { useSyncExternalStore } from "react";
import type { Trilha } from "./types";

/**
 * Fase 1: trilhas salvas no localStorage do navegador (sem login).
 * Na Fase 2 isso vira tabelas no Supabase.
 */
const CHAVE = "ac-trilhas-v1";
const EVENTO = "ac-trilhas-mudou";

let cacheBruto: string | null = null;
let cacheLista: Trilha[] = [];

function ler(): Trilha[] {
  if (typeof window === "undefined") return [];
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {}
  if (bruto !== cacheBruto) {
    cacheBruto = bruto;
    try {
      cacheLista = bruto ? (JSON.parse(bruto) as Trilha[]) : [];
    } catch {
      cacheLista = [];
    }
  }
  return cacheLista;
}

function gravar(lista: Trilha[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch (e) {
    console.error("Não foi possível salvar no navegador", e);
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function listarTrilhas() {
  return ler();
}

export function obterTrilha(id: string) {
  return ler().find((t) => t.id === id);
}

export function salvarTrilha(t: Trilha) {
  const lista = ler().filter((x) => x.id !== t.id);
  gravar([t, ...lista]);
}

export function atualizarTrilha(id: string, fn: (t: Trilha) => Trilha) {
  const lista = ler();
  const i = lista.findIndex((t) => t.id === id);
  if (i < 0) return;
  const nova = [...lista];
  nova[i] = fn(structuredClone(lista[i]));
  gravar(nova);
}

export function removerTrilha(id: string) {
  gravar(ler().filter((t) => t.id !== id));
}

function assinar(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

const VAZIO: Trilha[] = [];
export function useTrilhas() {
  return useSyncExternalStore(assinar, ler, () => VAZIO);
}

export function useTrilha(id: string) {
  const lista = useTrilhas();
  return lista.find((t) => t.id === id);
}

export function progresso(t: Trilha) {
  return t.etapas.length ? Math.round((t.concluidas.length / t.etapas.length) * 100) : 0;
}

export const novoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
