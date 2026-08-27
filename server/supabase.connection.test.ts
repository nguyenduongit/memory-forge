import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("authenticates a lightweight settings request with the publishable key", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(url).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
    expect(key).toMatch(/^(sb_publishable_|eyJ)/);

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key! },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
