#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outputPath = join(root, "Employee-AUP-Policy.pdf");
const port = 3014;
const url = `http://127.0.0.1:${port}/pdf-print`;

async function waitForServer(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* server not ready */
    }
    await sleep(500);
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function waitForPdf(path, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const info = await stat(path);
      if (info.size > 1000) return;
    } catch {
      /* not written yet */
    }
    await sleep(300);
  }
  throw new Error(`PDF was not created at ${path}`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);

  for (const bin of candidates) {
    try {
      await run(bin, ["--version"], { stdio: "ignore" });
      return bin;
    } catch {
      /* try next */
    }
  }

  throw new Error(
    "Chrome/Chromium not found. Set CHROME_PATH or install google-chrome."
  );
}

async function printToPdf(chrome, targetUrl, pdfPath) {
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      `--print-to-pdf=${pdfPath}`,
      "--no-pdf-header-footer",
      targetUrl,
    ],
    { stdio: "ignore", detached: true }
  );

  try {
    await waitForPdf(pdfPath);
  } finally {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

async function main() {
  await mkdir(dirname(outputPath), { recursive: true });

  const server = spawn(
    "npm",
    ["run", "start", "--", "--port", String(port), "--hostname", "127.0.0.1"],
    {
      cwd: root,
      stdio: "ignore",
      detached: true,
    }
  );

  try {
    await waitForServer();
    const chrome = await findChrome();
    await printToPdf(chrome, url, outputPath);
    await access(outputPath);
    console.log(`\nPDF created: ${outputPath}`);
  } finally {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
    await sleep(300);
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch {
      /* already stopped */
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
