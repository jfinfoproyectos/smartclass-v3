import { visit } from "unist-util-visit";

/**
 * Remark plugin: transforms fenced code blocks with language `mermaid`
 * into <Mermaid> MDX JSX elements.
 *
 * Usage in MDX:
 * ```mermaid
 * graph TD
 *   A --> B
 * ```
 */
export function remarkMermaid() {
  return (tree: any) => {
    visit(tree, "code", (node: any, index: number | undefined, parent: any) => {
      if (!node.lang || node.lang !== "mermaid") return;

      const jsxNode = {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "chart",
            value: node.value,
          },
        ],
        children: [],
        data: { _mdxExplicitJsx: true },
      };

      if (parent && typeof index !== "undefined") {
        parent.children.splice(index, 1, jsxNode);
      }
    });
  };
}
