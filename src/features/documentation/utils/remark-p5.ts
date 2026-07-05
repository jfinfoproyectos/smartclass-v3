import { visit } from "unist-util-visit";

/**
 * Remark plugin: transforms fenced code blocks with language `p5` or `p5sketch`
 * into <P5Sketch> MDX JSX elements.
 *
 * Usage in MDX:
 * ```p5 My Sketch Title
 * function setup() { createCanvas(400, 300); }
 * function draw() { background(20); }
 * ```
 *
 * The optional meta string after the language tag becomes the `title` prop.
 */
export function remarkP5Sketch() {
  return (tree: any) => {
    visit(tree, "code", (node: any, index: number | undefined, parent: any) => {
      if (!node.lang || !["p5", "p5sketch"].includes(node.lang)) return;

      const attrs: any[] = [
        {
          type: "mdxJsxAttribute",
          name: "code",
          value: node.value,
        },
      ];

      if (node.meta?.trim()) {
        attrs.push({
          type: "mdxJsxAttribute",
          name: "title",
          value: node.meta.trim(),
        });
      }

      const jsxNode = {
        type: "mdxJsxFlowElement",
        name: "P5Sketch",
        attributes: attrs,
        children: [],
        data: { _mdxExplicitJsx: true },
      };

      if (parent && typeof index !== "undefined") {
        parent.children.splice(index, 1, jsxNode);
      }
    });
  };
}
