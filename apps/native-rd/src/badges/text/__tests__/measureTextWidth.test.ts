import { measureTextWidth } from "../measureTextWidth";

describe("measureTextWidth", () => {
  it("returns 0 for empty input", () => {
    expect(measureTextWidth("", 16)).toBe(0);
  });

  it("scales linearly with text length", () => {
    const single = measureTextWidth("A", 16);
    const tenChars = measureTextWidth("AAAAAAAAAA", 16);
    expect(tenChars).toBeCloseTo(single * 10);
  });

  it("scales linearly with font size", () => {
    const small = measureTextWidth("HELLO", 10);
    const large = measureTextWidth("HELLO", 30);
    expect(large).toBeCloseTo(small * 3);
  });

  it("matches the 0.7em char-width approximation", () => {
    expect(measureTextWidth("ABCDE", 20)).toBeCloseTo(5 * 20 * 0.7);
  });
});
