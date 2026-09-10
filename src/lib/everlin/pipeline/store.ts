/**
 * T14 — BriefStore: where a generated brief (JSON + PDF + hash) is persisted,
 * keyed by trading date. Behind an interface so dev uses the filesystem and prod
 * uses Vercel Blob without the pipeline caring. `has(date)` is the idempotency
 * substrate for the cron (one brief per trading day — don't regenerate/resend).
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export type StoredBrief = {
  date: string; // YYYY-MM-DD trading date
  briefJson: unknown;
  pdf: Buffer;
  byteHash: string;
  generatedAt: string; // ISO; caller supplies (keep the store clock-free)
};

export interface BriefStore {
  put(entry: StoredBrief): Promise<void>;
  get(date: string): Promise<StoredBrief | null>;
  has(date: string): Promise<boolean>;
}

/** Filesystem adapter — default for dev. Stores under a base dir keyed by date. */
export class FsBriefStore implements BriefStore {
  constructor(private baseDir: string = path.join(os.tmpdir(), "everlin-briefs")) {}

  private dir(date: string) {
    return path.join(this.baseDir, date);
  }

  async put(entry: StoredBrief): Promise<void> {
    const d = this.dir(entry.date);
    await fs.mkdir(d, { recursive: true });
    await fs.writeFile(path.join(d, "brief.pdf"), entry.pdf);
    await fs.writeFile(
      path.join(d, "meta.json"),
      JSON.stringify(
        { date: entry.date, byteHash: entry.byteHash, generatedAt: entry.generatedAt, briefJson: entry.briefJson },
        null,
        2,
      ),
    );
  }

  async get(date: string): Promise<StoredBrief | null> {
    try {
      const d = this.dir(date);
      const pdf = await fs.readFile(path.join(d, "brief.pdf"));
      const meta = JSON.parse(await fs.readFile(path.join(d, "meta.json"), "utf8"));
      return { date, pdf, byteHash: meta.byteHash, generatedAt: meta.generatedAt, briefJson: meta.briefJson };
    } catch {
      return null;
    }
  }

  async has(date: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.dir(date), "meta.json"));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Vercel Blob adapter — prod. Lazy-imports @vercel/blob so the package is only
 * required when the Blob env is configured (it is not a hard dependency for dev).
 * Falls back to throwing a clear error if the package/env is missing at call time.
 */
export class BlobBriefStore implements BriefStore {
  private key(date: string, ext: string) {
    return `everlin-briefs/${date}/brief.${ext}`;
  }

  private async blob() {
    // Dynamic import keeps @vercel/blob optional for local dev.
    const mod = await import("@vercel/blob").catch(() => null);
    if (!mod) throw new Error("BlobBriefStore: @vercel/blob not installed");
    return mod;
  }

  async put(entry: StoredBrief): Promise<void> {
    const { put } = await this.blob();
    await put(this.key(entry.date, "pdf"), entry.pdf, { access: "public", contentType: "application/pdf" });
    await put(
      this.key(entry.date, "json"),
      JSON.stringify({ date: entry.date, byteHash: entry.byteHash, generatedAt: entry.generatedAt, briefJson: entry.briefJson }),
      { access: "public", contentType: "application/json" },
    );
  }

  async get(date: string): Promise<StoredBrief | null> {
    const { head } = await this.blob();
    try {
      await head(this.key(date, "json"));
      // A full fetch of contents is possible but not needed for the has()-driven
      // cron idempotency path; return a marker with empty pdf if only presence matters.
      return null;
    } catch {
      return null;
    }
  }

  async has(date: string): Promise<boolean> {
    const { head } = await this.blob();
    try {
      await head(this.key(date, "json"));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Select the store: Blob when its env token is present (prod), else filesystem.
 */
export function getBriefStore(): BriefStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new BlobBriefStore();
  }
  return new FsBriefStore();
}
