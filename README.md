# Aprenda Comigo

App web (responsivo) que ensina qualquer assunto com **vídeos curtos, narrados e passo a passo**, gerados automaticamente.

Você digita o que quer aprender → responde 3 perguntas → recebe uma **trilha** de 3 a 10 etapas (editável) → cada etapa vira um **vídeo** com cenas animadas, narração em pt-BR e legendas → assiste no player com o passo a passo em texto ao lado.

**Status: Fase 1 (MVP) concluída.** Veja [o que falta](#pendências-e-limitações).

## Como funciona

```
pedido + calibragem
   └─► POST /api/trilha    Claude → JSON da trilha (validado com Zod)
          └─► você edita / remove / reordena as etapas
                 └─► fila no navegador, uma etapa por vez (a que você está vendo vai primeiro)
                        └─► POST /api/roteiro
                              1. Claude → roteiro em cenas (contrato JSON, validado; se vier
                                 inválido, os erros voltam para o Claude corrigir, até 3 tentativas)
                              2. TTS → um áudio WAV por cena, com duração exata
                              3. cache em disco (o mesmo pedido reaproveita tudo)
                        └─► Player Remotion: a composição toca no navegador, cada cena
                            dura exatamente o tempo da sua narração
                        └─► "Gerar MP4" → POST /api/render → worker em segundo plano
                            (Remotion + Chrome headless + ffmpeg) → download
```

| Parte | Onde |
|---|---|
| Contrato do roteiro (schemas Zod) | `src/lib/schemas.ts` |
| Prompts e regras pedagógicas | `src/lib/server/prompts.ts` |
| Chamada ao Claude + autocorreção do JSON | `src/lib/server/claude.ts` |
| Narração (OpenAI TTS / ElevenLabs) | `src/lib/server/tts.ts` |
| Cache e arquivos locais | `src/lib/server/storage.ts` → pasta `.data/` |
| Registro de custos | `src/lib/server/costs.ts` |
| Vídeo (cenas, diagramas, legendas, "Passo X de N") | `src/remotion/LessonVideo.tsx` |
| Paleta compartilhada app ↔ vídeo | `src/remotion/theme.ts` + `src/app/globals.css` |
| Worker de render MP4 | `scripts/render-worker.mjs` |
| Fila de geração (no navegador) | `src/lib/fila.ts` |
| Trilhas salvas (localStorage) | `src/lib/store.ts` |

### Modo demonstração

Sem `ANTHROPIC_API_KEY`, o app continua funcionando de ponta a ponta com uma trilha e roteiros **genéricos** (o mesmo modelo de texto para qualquer assunto), para você ver o fluxo, o player e o MP4. Sem chave de TTS, a narração usa a **voz pt-BR do navegador** (sincronizada cena a cena no player; nesse caso o MP4 sai sem áudio). Um aviso amarelo mostra quando o modo demo está ativo.

## Rodar localmente

Pré-requisitos: Node.js 20+ (testado com 22). Para o MP4: o Remotion baixa um Chrome headless sozinho na primeira renderização e usa o próprio ffmpeg.

```bash
npm install
cp .env.example .env.local   # preencha as chaves (opcional: sem elas, modo demo)
npm run dev                  # http://localhost:3000
```

Produção local: `npm run build && npm start`. Para abrir no celular na mesma rede Wi-Fi: `npm run dev -- -H 0.0.0.0` e acesse `http://IP-DO-COMPUTADOR:3000`.

Checagens: `npm run typecheck` e `npm run lint`.

## Chaves de API

| Variável | Para quê | Onde criar |
|---|---|---|
| `ANTHROPIC_API_KEY` | Trilha e roteiros (obrigatória para conteúdo real) | https://console.anthropic.com/settings/keys (precisa de créditos em Billing) |
| `OPENAI_API_KEY` **ou** | Narração pt-BR (voz `nova`, modelo `gpt-4o-mini-tts`) | https://platform.openai.com/api-keys |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` | Narração (vozes mais naturais, mais cara) | https://elevenlabs.io/app/settings/api-keys; o Voice ID fica na Voice Library |
| `YOUTUBE_API_KEY` | Fase 3 ("Veja também") | Google Cloud Console → ative a "YouTube Data API v3" → Credenciais |
| `SUPABASE_URL` / chaves | Fase 2 (login, progresso, storage) | https://supabase.com/dashboard → Project Settings → API |

Nenhuma variável usa o prefixo `NEXT_PUBLIC_`, então nada chega ao navegador. O modelo padrão é `claude-opus-5-5`; para gastar menos, use `ANTHROPIC_MODEL=claude-sonnet-5-5`. Se o filtro de segurança do Claude recusar um pedido, a API tenta de novo num modelo de fallback recomendado (`fallbacks: "default"`).

## Publicar

**Vercel** (mais simples para o app):
1. Importe o repositório em https://vercel.com/new (detecta Next.js sozinho).
2. Em *Settings → Environment Variables*, adicione as chaves acima.
3. Deploy.

**Netlify**: importe o repositório em https://app.netlify.com (o plugin de Next.js é automático) e adicione as mesmas variáveis.

⚠️ Na Fase 1, em Vercel/Netlify:
- o cache e os áudios ficam em `/tmp`, que é **temporário** (somem entre execuções; a Fase 2 leva isso para o Supabase Storage);
- o botão **Gerar MP4 fica oculto**: essas plataformas não rodam Chrome + ffmpeg por minutos. Para MP4 em produção: rode num servidor com disco (Railway, Render, Fly.io, uma VPS com `npm run build && npm start`) ou troque o worker por **Remotion Lambda** (planejado);
- a geração de uma etapa pode levar de 20 a 60 s; o plano Hobby da Vercel limita funções a 60 s. Se der timeout, use o plano Pro (até 300 s, já configurado em `maxDuration`) ou um servidor próprio.

## O que foi testado de verdade (Fase 1)

Teste automatizado no navegador (Playwright + Chromium) contra o build de produção, **em modo demonstração** (este ambiente não tinha chaves de API):
- tela inicial → exemplo clicável → 3 perguntas → trilha gerada → editar título, remover e reordenar etapas → gerar vídeos;
- fila: "Gerando etapa X de N…", primeira etapa liberada enquanto as outras geram; todas ficaram prontas;
- player: play, clique num passo do texto pula para a cena, "Mais devagar", "Explicar de outro jeito" (gera um roteiro novo), "Próxima etapa" (progresso foi a 25%), troca 16:9 ↔ 9:16;
- **MP4 renderizado** pelo worker (h264, 1280×720, 70 s, em ~90 s) e servido para download;
- celular (390 px) em modo escuro, "Minhas trilhas", Configurações; nenhum erro no console;
- typecheck, lint e `next build` limpos.

**Não testado**, porque não havia chaves: as chamadas reais ao Claude, ao OpenAI TTS e à ElevenLabs. O código segue a documentação oficial (o SDK da Anthropic foi checado pelo typecheck), mas o primeiro teste com as suas chaves é o que vai confirmar.

## Pendências e limitações

- **Fase 2** (não feita): login com Supabase, painel com progresso no servidor, quizzes com reexplicação, "Tenho uma dúvida" com mini-vídeo, favoritos, histórico de dúvidas.
- **Fase 3**: vídeos do YouTube em "Veja também". Já existem antes da hora: formato vertical 9:16 (player e MP4) e uma tela de custos simples (Configurações).
- Na Fase 1 as trilhas ficam no `localStorage`: são por navegador e não sincronizam entre aparelhos.
- A fila de geração roda no navegador: se você fechar a aba, ela continua quando você abrir a trilha de novo.
- As ilustrações são ícones Lucide e diagramas simples (caixas e setas); imagens geradas por IA não estão incluídas.
- No modo demo com voz do navegador, a qualidade e o ritmo da voz variam conforme o aparelho; a duração de cada cena é estimada.
- Os custos são estimativas pelos preços de tabela (`src/lib/server/costs.ts`); confira no painel de cada provedor.
