/**
 * Worker de renderização de MP4 (roda fora do Next.js, em segundo plano).
 * Processa em sequência todos os jobs com status "fila" em DATA_DIR/jobs.
 * Iniciado automaticamente por POST /api/render; também pode ser rodado à mão:
 *   node scripts/render-worker.mjs
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(raiz, process.env.DATA_DIR || ".data");
const jobsDir = path.join(dataDir, "jobs");
const lock = path.join(jobsDir, "worker.lock");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;

async function lerJob(id) {
  return JSON.parse(await fs.readFile(path.join(jobsDir, `${id}.json`), "utf8"));
}
async function salvarJob(job) {
  const tmp = path.join(jobsDir, `${job.id}.json.tmp`);
  await fs.writeFile(tmp, JSON.stringify(job, null, 2));
  await fs.rename(tmp, path.join(jobsDir, `${job.id}.json`));
}
async function proximo() {
  const arquivos = (await fs.readdir(jobsDir)).filter((f) => f.endsWith(".json"));
  const jobs = await Promise.all(arquivos.map((f) => lerJob(f.replace(/\.json$/, "")).catch(() => null)));
  return jobs.filter((j) => j && j.status === "fila").sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))[0];
}

async function main() {
  await fs.mkdir(jobsDir, { recursive: true });
  try {
    await fs.writeFile(lock, String(process.pid), { flag: "wx" });
  } catch {
    const pid = Number(await fs.readFile(lock, "utf8").catch(() => "0"));
    try {
      if (pid) {
        process.kill(pid, 0);
        return; // já existe um worker vivo
      }
    } catch {}
    await fs.writeFile(lock, String(process.pid));
  }

  let serveUrl;
  try {
    for (let job = await proximo(); job; job = await proximo()) {
      const inicio = Date.now();
      try {
        job.status = "renderizando";
        job.progresso = 0;
        await salvarJob(job);
        serveUrl ??= await bundle({
          entryPoint: path.join(raiz, "src/remotion/index.ts"),
          webpackOverride: (c) => ({
            ...c,
            resolve: { ...c.resolve, alias: { ...(c.resolve?.alias ?? {}), "@": path.join(raiz, "src") } },
          }),
        });
        const inputProps = job.props;
        const composition = await selectComposition({ serveUrl, id: "Aula", inputProps, browserExecutable });
        const saidaRel = `videos/${job.id}.mp4`;
        const saida = path.join(dataDir, saidaRel);
        await fs.mkdir(path.dirname(saida), { recursive: true });
        let ultimo = 0;
        await renderMedia({
          composition,
          serveUrl,
          codec: "h264",
          outputLocation: saida,
          inputProps,
          browserExecutable,
          onProgress: async ({ progress }) => {
            if (progress - ultimo >= 0.05) {
              ultimo = progress;
              job.progresso = progress;
              await salvarJob(job).catch(() => {});
            }
          },
        });
        job.status = "pronto";
        job.progresso = 1;
        job.arquivo = saidaRel;
        job.segundosVideo = composition.durationInFrames / composition.fps;
        job.segundosRender = (Date.now() - inicio) / 1000;
        await salvarJob(job);
        console.log(`[render] ${job.id} pronto em ${job.segundosRender.toFixed(1)}s`);
      } catch (e) {
        console.error(`[render] ${job.id} falhou`, e);
        job.status = "erro";
        job.erro = String(e?.message ?? e).slice(0, 500);
        await salvarJob(job);
      }
    }
  } finally {
    await fs.rm(lock, { force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
