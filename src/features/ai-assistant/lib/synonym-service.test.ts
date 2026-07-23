import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AiSettings } from "@/types/ai";

import { requestSynonyms } from "./synonym-service";

vi.mock("./provider-client", () => ({ requestCompletion: vi.fn() }));
import { requestCompletion } from "./provider-client";

const settings: AiSettings = { provider: "anthropic", model: "m", mode: "on-demand" };
const mocked = vi.mocked(requestCompletion);

function whenModelReturns(text: string) {
  mocked.mockResolvedValue(text);
}

describe("requestSynonyms", () => {
  beforeEach(() => mocked.mockReset());

  it("parses a plain newline list", async () => {
    whenModelReturns("swift\nrapid\nnimble\nfleet");
    expect(await requestSynonyms("quick", "the quick fox", settings, "k")).toEqual([
      "swift",
      "rapid",
      "nimble",
      "fleet",
    ]);
  });

  it("strips bullets, numbering, and surrounding quotes", async () => {
    whenModelReturns('1. "swift"\n- rapid\n• nimble\n2) fleet');
    expect(await requestSynonyms("quick", "ctx", settings, "k")).toEqual([
      "swift",
      "rapid",
      "nimble",
      "fleet",
    ]);
  });

  it("drops the original word (case-insensitively)", async () => {
    whenModelReturns("Quick\nswift\nQUICK\nrapid");
    expect(await requestSynonyms("quick", "ctx", settings, "k")).toEqual(["swift", "rapid"]);
  });

  it("de-duplicates case-insensitively", async () => {
    whenModelReturns("swift\nSwift\nSWIFT\nrapid");
    expect(await requestSynonyms("quick", "ctx", settings, "k")).toEqual(["swift", "rapid"]);
  });

  it("caps the list at 6", async () => {
    whenModelReturns(["a", "b", "c", "d", "e", "f", "g", "h"].join("\n"));
    expect(await requestSynonyms("x", "ctx", settings, "k")).toHaveLength(6);
  });

  it("returns an empty list when nothing usable comes back", async () => {
    whenModelReturns("\n\n   \n");
    expect(await requestSynonyms("quick", "ctx", settings, "k")).toEqual([]);
  });

  it("keeps multi-word phrases", async () => {
    whenModelReturns("in a hurry\nat speed");
    expect(await requestSynonyms("quickly", "ctx", settings, "k")).toEqual([
      "in a hurry",
      "at speed",
    ]);
  });
});
