/**
 * T17 — delivery-adapter seam. The interface a finalized brief PDF is handed to
 * for routing to a channel. Channels (email/SMS/Teams/SharePoint) are OUT of the
 * current scope — this defines the seam so they bolt on later without touching
 * the pipeline. The default registry returns a Noop adapter; the channel stubs
 * exist but throw "not implemented" so nothing sends by accident.
 *
 * Idempotency: deliver() is keyed by (channel, docId) — a second deliver of the
 * same brief to the same channel is a no-op success, so a cron retry never
 * double-sends.
 */

export type DeliveryInput = {
  docId: string; // e.g. EVL-DAILY-2026-09-07
  date: string; // YYYY-MM-DD
  pdf: Buffer;
  byteHash: string;
  subject: string;
};

export type DeliveryResult = { ok: boolean; channel: string; deduped?: boolean; error?: string };

export interface DeliveryAdapter {
  readonly channel: string;
  deliver(input: DeliveryInput): Promise<DeliveryResult>;
}

/** No-op adapter — the safe default. Records deliveries in-memory for idempotency. */
export class NoopDeliveryAdapter implements DeliveryAdapter {
  readonly channel = "noop";
  private sent = new Set<string>();

  async deliver(input: DeliveryInput): Promise<DeliveryResult> {
    const key = `${this.channel}:${input.docId}`;
    if (this.sent.has(key)) return { ok: true, channel: this.channel, deduped: true };
    this.sent.add(key);
    return { ok: true, channel: this.channel };
  }
}

/** Base for real channels — each throws until implemented in a later phase. */
abstract class UnimplementedAdapter implements DeliveryAdapter {
  abstract readonly channel: string;
  async deliver(): Promise<DeliveryResult> {
    throw new Error(`${this.channel} delivery not implemented (out of current scope)`);
  }
}

export class EmailDeliveryAdapter extends UnimplementedAdapter {
  readonly channel = "email";
}
export class SmsDeliveryAdapter extends UnimplementedAdapter {
  readonly channel = "sms";
}
export class TeamsDeliveryAdapter extends UnimplementedAdapter {
  readonly channel = "teams";
}
export class SharePointDeliveryAdapter extends UnimplementedAdapter {
  readonly channel = "sharepoint";
}

const REGISTRY: Record<string, () => DeliveryAdapter> = {
  noop: () => new NoopDeliveryAdapter(),
  email: () => new EmailDeliveryAdapter(),
  sms: () => new SmsDeliveryAdapter(),
  teams: () => new TeamsDeliveryAdapter(),
  sharepoint: () => new SharePointDeliveryAdapter(),
};

// A single shared Noop so idempotency state survives across calls in one process.
const defaultNoop = new NoopDeliveryAdapter();

/** Select an adapter by channel name; defaults to the shared Noop. */
export function getDeliveryAdapter(channel = "noop"): DeliveryAdapter {
  if (channel === "noop") return defaultNoop;
  const make = REGISTRY[channel];
  if (!make) throw new Error(`unknown delivery channel '${channel}'`);
  return make();
}
