import { describe, expect, it } from "vitest";

function emailMatchesAllowlist(userEmail: string | undefined, adminEmail: string) {
  return Boolean(userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

describe("admin allowlist matching", () => {
  it("matches configured admin email without case sensitivity", () => {
    expect(emailMatchesAllowlist("Owner@LittleCafe.test", "owner@littlecafe.test")).toBe(true);
  });

  it("rejects nonmatching emails", () => {
    expect(emailMatchesAllowlist("guest@example.com", "owner@littlecafe.test")).toBe(false);
  });
});
