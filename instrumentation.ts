/* Next's startup hook. Migrations run here, from the application booting —
   not from a command someone has to remember to run. A failure is logged and
   swallowed: the first request that needs the database retries the runner, and
   a migration problem must not take the whole site down. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;
  try {
    const { migrate } = await import("./lib/db");
    await migrate();
    console.log("[rk] migrations up to date");
  } catch (e) {
    console.error("[rk] migration failed at startup:", e);
  }
}
