import {
  FOCUS_HISTORY_LIMIT,
  pushFocus,
  popFocus,
  removeFromFocus,
  pruneFocus,
} from "os/lib/focus-history";

describe("pushFocus", () => {
  it("appends to an empty history", () => {
    expect(pushFocus([], "a")).toEqual(["a"]);
  });

  it("does nothing when the same id is already on top", () => {
    const result = pushFocus(["a", "b"], "b");
    expect(result).toEqual(["a", "b"]);
  });

  it("de-duplicates a previous occurrence and re-promotes to top", () => {
    expect(pushFocus(["a", "b", "c"], "a")).toEqual(["b", "c", "a"]);
  });

  it("respects the configured limit by dropping the oldest entries", () => {
    const long: string[] = [];
    for (let i = 0; i < FOCUS_HISTORY_LIMIT + 5; i += 1) long.push(`w${i}`);
    const result = pushFocus(long, "newest");
    expect(result.length).toBeLessThanOrEqual(FOCUS_HISTORY_LIMIT);
    expect(result[result.length - 1]).toBe("newest");
  });

  it("respects an explicit lower limit override", () => {
    const result = pushFocus(["a", "b", "c"], "d", 2);
    expect(result).toEqual(["c", "d"]);
  });

  it("returns a copy so callers can mutate without aliasing", () => {
    const original = ["a"];
    const result = pushFocus(original, "a");
    expect(result).not.toBe(original);
  });
});

describe("popFocus", () => {
  it("returns empty when given empty", () => {
    expect(popFocus([])).toEqual({
      history: [],
      popped: undefined,
      next: undefined,
    });
  });

  it("pops the only entry", () => {
    expect(popFocus(["a"])).toEqual({
      history: [],
      popped: "a",
      next: undefined,
    });
  });

  it("pops the top and returns the new top as next", () => {
    expect(popFocus(["a", "b", "c"])).toEqual({
      history: ["a", "b"],
      popped: "c",
      next: "b",
    });
  });
});

describe("removeFromFocus", () => {
  it("removes every occurrence of an id", () => {
    expect(removeFromFocus(["a", "b", "a", "c"], "a")).toEqual(["b", "c"]);
  });

  it("returns the input unchanged if the id is not present", () => {
    expect(removeFromFocus(["a", "b"], "c")).toEqual(["a", "b"]);
  });
});

describe("pruneFocus", () => {
  it("drops ids that are not in the existing set", () => {
    const existing = new Set(["a", "c"]);
    expect(pruneFocus(["a", "b", "c", "d"], existing)).toEqual(["a", "c"]);
  });

  it("returns the empty array when nothing is valid", () => {
    expect(pruneFocus(["x", "y"], new Set())).toEqual([]);
  });
});
