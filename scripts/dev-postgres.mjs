/* A local Postgres for development, with nothing to install.

   PGlite is Postgres compiled to WASM; this wraps it in the real wire protocol
   so the `pg` driver — and therefore the dashboard — connects to it exactly as
   it would to Railway.

     node scripts/dev-postgres.mjs            # ./.pgdata, port 5433
     node scripts/dev-postgres.mjs ./tmp 5544

   Then point .env.development.local at it:
     DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres

   Never use this in production: it is a single-process database in a folder. */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const dir = process.argv[2] || "./.pgdata";
const port = Number(process.argv[3] || 5433);

const db = await PGlite.create({ dataDir: dir });
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await server.start();
console.log(`pglite listening on 127.0.0.1:${port} (dataDir ${dir})`);

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
}
