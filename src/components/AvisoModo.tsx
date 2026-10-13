"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { useStatus } from "@/lib/useStatus";

/** Avisa quando o app está em modo demonstração (sem chaves de API). */
export function AvisoModo({ className = "" }: { className?: string }) {
  const s = useStatus();
  if (!s || (s.claude && s.tts)) return null;
  return (
    <div className={`flex gap-2 rounded-xl border border-destaque/40 bg-destaque/10 p-3 text-sm ${className}`}>
      <Info size={18} className="mt-0.5 shrink-0 text-destaque" />
      <div>
        {!s.claude ? (
          <>
            <strong>Modo demonstração:</strong> sem <code>ANTHROPIC_API_KEY</code>, a trilha e os roteiros usam um
            modelo genérico (não específico do assunto).{" "}
          </>
        ) : null}
        {!s.tts ? <>Sem chave de TTS, a narração usa a voz do próprio navegador. </> : null}
        <Link href="/configuracoes" className="font-semibold text-primaria underline">
          Ver configurações
        </Link>
      </div>
    </div>
  );
}
