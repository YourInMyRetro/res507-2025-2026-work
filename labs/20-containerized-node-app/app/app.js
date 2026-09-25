import Fastify from "fastify";
import formbody from "@fastify/formbody";
import view from "@fastify/view";
import handlebars from "handlebars";
import postgres from "@fastify/postgres";

export async function buildApp() {
  // Create Fastify instance
  const app = Fastify({ logger: true });

  // Register plugins
  await app.register(postgres, {
    connectionString: process.env.DATABASE_URL ?? 'postgres://postgres@localhost/postgres'
  })
  await app.register(formbody);
  await app.register(view, {
    engine: { handlebars: handlebars },
    root: new URL("./views/", import.meta.url).pathname
  });

  // Health check endpoint
  app.get("/health", async () => ({ ok: true }));

  // Get all quotes endpoint
  app.get("/", async (_req, reply) => {
    const result = await app.pg.query('SELECT author, text FROM quotes ORDER BY created_at DESC')
    const quotes = result.rows;
    return reply.view("index.hbs", { quotes });
  });

  // JSON API: list all quotes
  app.get("/api/quotes", async () => {
    const result = await app.pg.query('SELECT id, author, text, created_at FROM quotes ORDER BY created_at DESC');
    return result.rows;
  });

  // Post new quote endpoint
  app.post("/quotes", async (req, reply) => {
    const author = (req.body?.author ?? "").trim();
    const text = (req.body?.text ?? "").trim();

    if (!text) {
      // Keep it simple: redirect back
      return reply.redirect("/");
    }

    await app.pg.query('INSERT INTO quotes (author, text) VALUES ($1, $2)', [author || "anonymous", text]);

    app.log.info({quote: { author: author || "anonymous", text }}, 'New quote added');

    return reply.redirect("/");
  });
  
  return app;
};
