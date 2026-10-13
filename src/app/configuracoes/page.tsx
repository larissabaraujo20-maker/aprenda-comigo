"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useStatus } from "@/lib/useStatus";

type CustoMes = {
  claude: { usd: number; inputTokens: number; outputTokens: number; chamadas: number };
  tts: { usd: number; caracteres: number };
  render: { usd: number; minutos: number };
};

const usd = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export default function Configuracoes() {
  const s = useStatus();
  const [custos, setCustos] = useState<Record<string, CustoMes> | null>(null);
  useEffect(() => {
    fetch("/api/custos").then((r) => r.json()).then(setCustos).catch(() => setCustos({}));
  }, []);

  const itens: [string, boolean, string][] = s
    ? [
        ["IA de conteúdo (Claude)", s.claude, s.claude ? `Modelo: ${s.modelo}` : "Defina ANTHROPIC_API_KEY — sem ela o app usa o modo demonstração"],
        ["Narração (TTS)", Boolean(s.tts), s.tts ? `Provedor: ${s.tts}` : "Defina OPENAI_API_KEY ou ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID — sem ela, usa a voz do navegador"],
        ["Render de MP4", s.renderMp4, s.renderMp4 ? "Ativo neste servidor (Chrome + ffmpeg via Remotion)" : "Desativado (ambiente serverless)"],
        ["YouTube (Fase 3)", s.youtube, s.youtube ? "Chave configurada" : "Opcional: YOUTUBE_API_KEY"],
      ]
    : [];

  const meses = Object.entries(custos ?? {}).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold">Configurações</h1>

      <section className="mt-6">
        <h2 className="mb-2 font-bold">Serviços</h2>
        <p className="mb-3 text-sm text-suave">
          As chaves ficam só no servidor (arquivo <code>.env.local</code> ou variáveis de ambiente da hospedagem) e nunca
          são enviadas ao navegador.
        </p>
        <ul className="flex flex-col gap-2">
          {itens.map(([nome, ok, det]) => (
            <li key={nome} className="cartao flex items-start gap-3 p-3">
              {ok ? <CheckCircle2 className="shrink-0 text-sucesso" size={20} /> : <XCircle className="shrink-0 text-suave" size={20} />}
              <div>
                <div className="font-semibold">{nome}</div>
                <div className="text-sm text-suave">{det}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-bold">Gastos por mês (estimativa)</h2>
        {meses.length === 0 ? (
          <p className="text-sm text-suave">Nenhum gasto registrado ainda.</p>
        ) : (
          <div className="cartao overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-suave">
                <tr className="border-b border-borda">
                  <th className="p-3">Mês</th>
                  <th className="p-3">IA (tokens)</th>
                  <th className="p-3">TTS</th>
                  <th className="p-3">Render</th>
                  <th className="p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {meses.map(([mes, c]) => (
                  <tr key={mes} className="border-b border-borda last:border-0">
                    <td className="p-3 font-semibold">{mes}</td>
                    <td className="p-3">
                      {usd(c.claude.usd)}
                      <div className="text-xs text-suave">
                        {num(c.claude.inputTokens / 1000)}k entrada · {num(c.claude.outputTokens / 1000)}k saída · {c.claude.chamadas} chamadas
                      </div>
                    </td>
                    <td className="p-3">
                      {usd(c.tts.usd)}
                      <div className="text-xs text-suave">{num(c.tts.caracteres)} caracteres</div>
                    </td>
                    <td className="p-3">
                      {usd(c.render.usd)}
                      <div className="text-xs text-suave">{num(c.render.minutos)} min de vídeo</div>
                    </td>
                    <td className="p-3 font-semibold">{usd(c.claude.usd + c.tts.usd + c.render.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-suave">
          Calculado com preços de tabela (Claude, OpenAI/ElevenLabs). Render local não tem custo; defina
          RENDER_COST_PER_MIN para estimar um servidor pago.
        </p>
      </section>
    </div>
  );
}
