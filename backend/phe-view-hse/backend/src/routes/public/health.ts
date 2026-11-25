import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import { pool } from "../../db/index.ts";
import env from "../../config/env.config.ts";
import { checkUploadsWritable } from "../../preflight.ts";

// Hasil pemeriksaan yang mahal di-cache 30 detik supaya health check sering tidak membebani server.
const CACHE_MS = 30_000;
const cache: Record<string, { at: number; ok: boolean }> = {};
async function cached(key: string, fn: () => Promise<boolean>): Promise<boolean> {
  const hit = cache[key];
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.ok;
  const ok = await fn().catch(() => false);
  cache[key] = { at: Date.now(), ok };
  return ok;
}

async function dbOk(): Promise<boolean> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000));
  await Promise.race([pool.query("select 1"), timeout]);
  return true;
}

const createRandomNumber: FastifyPluginAsyncTypebox = async (app) => {
  // Health check untuk load balancer, pm2, Docker, atau monitor uptime. Hanya boolean, tanpa path/versi.
  app.route({
    method: "GET",
    url: "/health",
    schema: {
      tags: ["Info"],
      description: "200 bila DB dan folder uploads sehat, 503 bila tidak. csmsAi informatif saja.",
    },
    handler: async (_, res) => {
      const db = await dbOk().catch(() => false);
      const uploads = await cached("uploads", async () => { checkUploadsWritable(); return true; });
      const csmsAi = await cached("csmsAi", async () => {
        const r = await fetch(`${env.csmsAi.serviceUrl.replace(/\/+$/, "")}/health`, { signal: AbortSignal.timeout(3000) });
        return r.ok;
      });
      const healthy = db && uploads;
      res.code(healthy ? 200 : 503).send({ status: healthy ? "ok" : "error", checks: { db, uploads, csmsAi } });
    },
  });

  // Server information route
  app.route({
    method: "GET",
    url: "/server-info",
    schema: {
      tags: ["Info"],
      // summary: "Get Server Information",
      description: "Returns detailed information about the server",
      response: {
        200: {
          type: 'object',
          properties: {
            uptime: { type: 'number' },
            uptimeFormatted: { type: 'string' },
            memoryUsage: {
              type: 'object',
              properties: {
                rss: { type: 'number' },
                heapTotal: { type: 'number' },
                heapUsed: { type: 'number' },
                external: { type: 'number' }
              }
            },
            nodeVersion: { type: 'string' }
          }
        }
      }
    },
    handler: (_, res) => {
      const memoryUsage = process.memoryUsage();
      const uptimeInSeconds = process.uptime();

      // Convert uptime to days, hours, and minutes
      const days = Math.floor(uptimeInSeconds / (24 * 3600));
      const hours = Math.floor((uptimeInSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((uptimeInSeconds % 3600) / 60);

      const formattedUptime = `${days}d ${hours}h ${minutes}m`;
      res.send({
        uptime: uptimeInSeconds,
        uptimeFormatted: formattedUptime,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        },
        nodeVersion: process.version
      });
    }
  });
};

export default createRandomNumber;
