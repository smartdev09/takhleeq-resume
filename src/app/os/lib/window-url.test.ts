import {
  serializeWindows,
  deserializeWindowsCompact,
  serializeFullLayout,
  deserializeFullLayout,
  base64UrlEncode,
  base64UrlDecode,
  sanitizeResumeId,
  sanitizeAnchor,
  isKnownAppId,
} from "os/lib/window-url";
import type {
  WindowManagerState,
  WindowState,
} from "os/context/window-types";

function makeWindow(overrides: Partial<WindowState> = {}): WindowState {
  return {
    id: overrides.id ?? "w1",
    appId: overrides.appId ?? "home",
    appProps: overrides.appProps ?? {},
    resumeId: overrides.resumeId,
    parentId: overrides.parentId,
    poppedOutFromTab: overrides.poppedOutFromTab,
    position: overrides.position ?? { x: 100, y: 100 },
    size: overrides.size ?? { width: 700, height: 550 },
    minSize: overrides.minSize ?? { width: 320, height: 200 },
    zIndex: overrides.zIndex ?? 1,
    status: overrides.status ?? "open",
    preStatusGeometry: overrides.preStatusGeometry,
    scrollAnchor: overrides.scrollAnchor,
    isModal: overrides.isModal ?? false,
    openedAt: overrides.openedAt ?? 1000,
    title: overrides.title ?? "Window",
  };
}

function makeState(
  windows: WindowState[],
  zOrder?: string[],
): WindowManagerState {
  const map: Record<string, WindowState> = {};
  for (const w of windows) map[w.id] = w;
  return {
    windows: map,
    zOrder: zOrder ?? windows.map((w) => w.id),
    focusHistory: [],
    desktopSize: { width: 1440, height: 900 },
    hasShownWelcome: true,
    isHydrated: true,
  };
}

describe("isKnownAppId", () => {
  it("recognises known apps", () => {
    expect(isKnownAppId("editor")).toBe(true);
    expect(isKnownAppId("docs")).toBe(true);
  });
  it("rejects unknown apps", () => {
    expect(isKnownAppId("not-an-app")).toBe(false);
    expect(isKnownAppId("")).toBe(false);
  });
});

describe("sanitizeResumeId", () => {
  it("strips disallowed characters", () => {
    expect(sanitizeResumeId("abc-123_DEF")).toBe("abc-123_DEF");
    expect(sanitizeResumeId("abc/123")).toBe("abc123");
    expect(sanitizeResumeId("a b!c")).toBe("abc");
  });
  it("truncates excessively long ids", () => {
    const long = "a".repeat(200);
    expect(sanitizeResumeId(long).length).toBe(64);
  });
});

describe("sanitizeAnchor", () => {
  it("strips # and other punctuation", () => {
    expect(sanitizeAnchor("ai-setup")).toBe("ai-setup");
    expect(sanitizeAnchor("ai/setup")).toBe("aisetup");
  });
});

describe("serializeWindows", () => {
  it("serializes a single window with no resume id", () => {
    const state = makeState([makeWindow({ id: "a", appId: "home" })]);
    expect(serializeWindows(state)).toBe("home");
  });

  it("serializes editor with resume id", () => {
    const state = makeState([
      makeWindow({ id: "a", appId: "editor", resumeId: "abc-123" }),
    ]);
    expect(serializeWindows(state)).toBe("editor:abc-123");
  });

  it("joins parent + popped-out child with /", () => {
    const editor = makeWindow({
      id: "e",
      appId: "editor",
      resumeId: "abc-123",
    });
    const analyzer = makeWindow({
      id: "a",
      appId: "analyzer",
      resumeId: "abc-123",
      parentId: "e",
      poppedOutFromTab: "analyzer",
    });
    const state = makeState([editor, analyzer]);
    expect(serializeWindows(state)).toBe("editor:abc-123/analyzer");
  });

  it("joins multiple unrelated windows with comma in z-order", () => {
    const tpl = makeWindow({ id: "t", appId: "templates" });
    const ed = makeWindow({ id: "e", appId: "editor", resumeId: "abc-123" });
    const state = makeState([tpl, ed]);
    expect(serializeWindows(state)).toBe("templates,editor:abc-123");
  });

  it("encodes scroll anchor on a window", () => {
    const state = makeState([
      makeWindow({ id: "a", appId: "home", scrollAnchor: "features" }),
    ]);
    expect(serializeWindows(state)).toBe("home#features");
  });

  it("encodes scroll anchor on docs", () => {
    const state = makeState([
      makeWindow({ id: "a", appId: "docs", scrollAnchor: "ai-setup" }),
    ]);
    expect(serializeWindows(state)).toBe("docs#ai-setup");
  });

  it("emits a child resume id when it differs from the parent", () => {
    const editor = makeWindow({
      id: "e",
      appId: "editor",
      resumeId: "abc-123",
    });
    const analyzer = makeWindow({
      id: "a",
      appId: "analyzer",
      resumeId: "different",
      parentId: "e",
    });
    const state = makeState([editor, analyzer]);
    expect(serializeWindows(state)).toBe("editor:abc-123/analyzer:different");
  });

  it("returns empty string when there are no windows", () => {
    expect(serializeWindows(makeState([]))).toBe("");
  });

  it("ignores zOrder entries that no longer exist in windows", () => {
    const state = makeState(
      [makeWindow({ id: "a", appId: "home" })],
      ["a", "missing"],
    );
    expect(serializeWindows(state)).toBe("home");
  });
});

describe("deserializeWindowsCompact", () => {
  it("returns empty for empty / non-string input", () => {
    expect(deserializeWindowsCompact("")).toEqual([]);
    expect(
      deserializeWindowsCompact(undefined as unknown as string),
    ).toEqual([]);
  });

  it("parses single editor with resume id", () => {
    expect(deserializeWindowsCompact("editor:abc-123")).toEqual([
      { appId: "editor", resumeId: "abc-123" },
    ]);
  });

  it("parses parent + popped-out child", () => {
    expect(deserializeWindowsCompact("editor:abc-123/analyzer")).toEqual([
      { appId: "editor", resumeId: "abc-123" },
      { appId: "analyzer", resumeId: "abc-123" },
    ]);
  });

  it("parses multiple unrelated windows", () => {
    expect(deserializeWindowsCompact("templates,editor:abc-123")).toEqual([
      { appId: "templates" },
      { appId: "editor", resumeId: "abc-123" },
    ]);
  });

  it("parses scroll anchor", () => {
    expect(deserializeWindowsCompact("home#features")).toEqual([
      { appId: "home", scrollAnchor: "features" },
    ]);
  });

  it("parses docs anchor", () => {
    expect(deserializeWindowsCompact("docs#ai-setup")).toEqual([
      { appId: "docs", scrollAnchor: "ai-setup" },
    ]);
  });

  it("drops unknown app ids silently", () => {
    expect(deserializeWindowsCompact("notanapp,editor:abc")).toEqual([
      { appId: "editor", resumeId: "abc" },
    ]);
  });

  it("ignores empty segments and trailing commas", () => {
    expect(deserializeWindowsCompact(",home,,docs,")).toEqual([
      { appId: "home" },
      { appId: "docs" },
    ]);
  });

  it("safely handles a path-traversal-style resume id payload", () => {
    // Path-traversal attempts split on '/' and then drop unknown segments
    // (`..`, `etc`). Only the leading `editor:abc` survives, with its resume
    // id preserved verbatim because it is already safe.
    expect(deserializeWindowsCompact("editor:abc/../../etc")).toEqual([
      { appId: "editor", resumeId: "abc" },
    ]);
  });

  it("treats a child without resume id as inheriting from the parent", () => {
    const out = deserializeWindowsCompact("editor:abc-123/coverLetter");
    expect(out[1]).toEqual({ appId: "coverLetter", resumeId: "abc-123" });
  });

  it("respects an explicit child resume id override", () => {
    expect(
      deserializeWindowsCompact("editor:abc-123/analyzer:other"),
    ).toEqual([
      { appId: "editor", resumeId: "abc-123" },
      { appId: "analyzer", resumeId: "other" },
    ]);
  });
});

describe("compact round-trip", () => {
  const cases: Array<[string, string]> = [
    ["single editor", "editor:abc-123"],
    ["editor + analyzer", "editor:abc-123/analyzer"],
    ["templates + editor", "templates,editor:abc-123"],
    ["home anchor", "home#features"],
    ["docs anchor", "docs#ai-setup"],
  ];
  it.each(cases)("%s round-trips", (_name, encoded) => {
    const specs = deserializeWindowsCompact(encoded);
    // synthesize a minimal state and re-serialize
    const windows: WindowState[] = specs.map((s, idx) =>
      makeWindow({
        id: `w${idx}`,
        appId: s.appId,
        resumeId: s.resumeId,
        scrollAnchor: s.scrollAnchor,
        parentId: idx > 0 && encoded.includes("/") ? "w0" : undefined,
      }),
    );
    const state = makeState(windows);
    expect(serializeWindows(state)).toBe(encoded);
  });
});

describe("serializeFullLayout / deserializeFullLayout", () => {
  it("round-trips a populated layout", () => {
    const w = makeWindow({
      id: "w",
      appId: "editor",
      resumeId: "abc-123",
      scrollAnchor: "skills",
      position: { x: 200, y: 150 },
      size: { width: 900, height: 650 },
    });
    const state = makeState([w]);
    const encoded = serializeFullLayout(state);
    const decoded = deserializeFullLayout(encoded);
    expect(decoded).toHaveLength(1);
    expect(decoded[0]).toMatchObject({
      appId: "editor",
      resumeId: "abc-123",
      scrollAnchor: "skills",
      position: { x: 200, y: 150 },
      size: { width: 900, height: 650 },
      zIndex: 0,
    });
  });

  it("returns [] for empty input", () => {
    expect(deserializeFullLayout("")).toEqual([]);
  });

  it("returns [] for malformed base64", () => {
    expect(deserializeFullLayout("!!!not-base64!!!")).toEqual([]);
  });

  it("returns [] for valid base64 but invalid JSON", () => {
    expect(deserializeFullLayout(base64UrlEncode("not json"))).toEqual([]);
  });

  it("returns [] when JSON is not an object", () => {
    expect(deserializeFullLayout(base64UrlEncode("123"))).toEqual([]);
  });

  it("returns [] when JSON has no windows array", () => {
    expect(
      deserializeFullLayout(base64UrlEncode(JSON.stringify({ v: 1 }))),
    ).toEqual([]);
  });

  it("filters out unknown app entries", () => {
    const payload = JSON.stringify({
      v: 1,
      windows: [
        { appId: "home" },
        { appId: "notreal" },
        { appId: "editor", resumeId: "abc" },
      ],
    });
    const decoded = deserializeFullLayout(base64UrlEncode(payload));
    expect(decoded.map((s) => s.appId)).toEqual(["home", "editor"]);
  });

  it("ignores invalid position / size shapes", () => {
    const payload = JSON.stringify({
      v: 1,
      windows: [
        {
          appId: "home",
          position: { x: "bad", y: 5 },
          size: { width: -1, height: 5 },
        },
      ],
    });
    const decoded = deserializeFullLayout(base64UrlEncode(payload));
    expect(decoded[0].position).toBeUndefined();
    expect(decoded[0].size).toBeUndefined();
  });

  it("accepts non-finite zIndex by dropping it", () => {
    const payload = JSON.stringify({
      v: 1,
      windows: [{ appId: "home", zIndex: Number.NaN }],
    });
    const decoded = deserializeFullLayout(base64UrlEncode(payload));
    expect(decoded[0].zIndex).toBeUndefined();
  });
});

describe("base64Url helpers", () => {
  it("round-trips ASCII", () => {
    expect(base64UrlDecode(base64UrlEncode("hello world"))).toBe("hello world");
  });

  it("round-trips unicode", () => {
    const value = "résumé ✓";
    expect(base64UrlDecode(base64UrlEncode(value))).toBe(value);
  });

  it("uses url-safe characters", () => {
    const encoded = base64UrlEncode("\xff\xff\xff\xff\xff");
    expect(encoded).not.toMatch(/[+/=]/);
  });
});
