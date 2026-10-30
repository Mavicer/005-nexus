import { expect, it } from "vitest";
import { escapeLike, searchTerms } from "../search";
it("normalizes case, full-width input and multiple keyword spacing", () => {
  expect(searchTerms("  ＱＯＤＥＲ   线上 \n Qoder  ")).toEqual([
    "qoder",
    "线上",
  ]);
  expect(searchTerms("网络安全 CTF")).toEqual(["网络安全", "ctf"]);
});
it("treats SQL LIKE wildcards and backslashes as literal search text", () => {
  expect(escapeLike("100%_\\")).toBe("100\\%\\_\\\\");
});
