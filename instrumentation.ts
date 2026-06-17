export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertImportEnvironment } = await import("./src/lib/env-check");
    assertImportEnvironment();
  }
}
