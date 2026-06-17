#!/usr/bin/env tsx
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printImportReport } from "../src/import/report";
import { runImport } from "../src/import/run-import";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type CliArgs = {
  inputDir: string;
  outputDir: string;
  force: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  let inputDir = "";
  let outputDir = path.resolve(projectRoot, "archive");
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--output" || arg === "-o") {
      outputDir = path.resolve(args[++i] ?? "./archive");
    } else if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (!arg.startsWith("-") && !inputDir) {
      inputDir = path.resolve(arg);
    }
  }

  if (!inputDir) {
    console.error("Usage: npm run import -- <flickr-export-folder> [--output ./archive] [--force]");
    process.exit(1);
  }

  return { inputDir, outputDir, force };
}

async function main(): Promise<void> {
  const { inputDir, outputDir, force } = parseArgs(process.argv);
  process.env.FLICKR_ARCHIVE_PATH = outputDir;

  console.log(`Input:  ${inputDir}`);
  console.log(`Output: ${outputDir}`);

  const report = await runImport({
    inputDir,
    outputDir,
    force,
    onProgress: (progress) => {
      if (progress.current !== undefined && progress.total !== undefined && progress.total > 0) {
        console.log(`${progress.message} (${progress.current}/${progress.total})`);
      } else {
        console.log(progress.message);
      }
    },
  });

  printImportReport(report);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
