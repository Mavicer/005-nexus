import { expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { currentUser } = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: currentUser }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/lib/blog-sso", () => ({
  blogOrigin: () => "https://mavicer.cc",
  blogSsoEnabled: () => false,
}));
import Layout from "@/app/layout";
function findAccount(node: ReactNode): ReactElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findAccount(child);
      if (found) return found;
    }
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) return;
  if (typeof node.type === "function" && node.type.name === "AccountNavigation")
    return node;
  return findAccount(node.props.children);
}
it.each([
  ["visitor", null, false],
  ["member", { userId: "member", email: "member", isAdmin: false }, false],
  ["administrator", { userId: "owner", email: "owner", isAdmin: true }, true],
])(
  "only administrators receive the management link: %s",
  async (_role, user, allowed) => {
    currentUser.mockResolvedValue(user);
    const tree = await Layout({ children: null });
    const account = findAccount(tree)!;
    expect(account).toBeDefined();
    const render = account.type as () => Promise<ReactNode>;
    const html = renderToStaticMarkup(await render());
    expect(html.includes('href="/admin/events"')).toBe(allowed);
    expect(html.includes("管理")).toBe(allowed);
  },
);
