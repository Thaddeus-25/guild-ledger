import { describe, expect, it } from "vitest";
import { loginErrorMessage, UNREACHABLE_MESSAGE, validateLogin, validateNewPassword } from "./authMessages";

describe("validateLogin", () => {
  it("asks for both email and password", () => {
    expect(validateLogin("", "")).toEqual({
      ok: false,
      errors: { email: "Enter your email.", password: "Enter your password." },
    });
  });

  it("trims spaces a phone keyboard may add to the email", () => {
    expect(validateLogin("  Me@Mail.com ", "pw")).toEqual({ ok: true, email: "Me@Mail.com" });
  });
});

describe("loginErrorMessage", () => {
  it("says the archives can't be reached when there's no connection", () => {
    expect(loginErrorMessage({ status: 0 })).toBe(UNREACHABLE_MESSAGE);
    expect(loginErrorMessage({ name: "AuthRetryableFetchError" })).toBe(UNREACHABLE_MESSAGE);
  });

  it("asks to wait after too many tries", () => {
    const message = "Too many tries. Wait a few minutes and try again.";
    expect(loginErrorMessage({ status: 429 })).toBe(message);
    expect(loginErrorMessage({ code: "over_request_rate_limit" })).toBe(message);
  });

  it("doesn't say whether the email or the password was wrong", () => {
    expect(loginErrorMessage({ status: 400, code: "invalid_credentials" })).toBe(
      "That email and password don't match.",
    );
  });
});

describe("validateNewPassword", () => {
  it("needs at least 8 characters", () => {
    expect(validateNewPassword("short", "short")).toBe("Use at least 8 characters.");
  });

  it("needs both copies to match", () => {
    expect(validateNewPassword("longenough", "different1")).toBe("The two passwords don't match.");
  });

  it("accepts a good password", () => {
    expect(validateNewPassword("longenough", "longenough")).toBeNull();
  });
});
