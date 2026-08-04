/**
 * Escapa caracteres especiales de XML para evitar inyecciones o errores sintácticos.
 */
export function escapeXml(str: string): string {
  if (typeof str !== "string") {
    return String(str ?? "");
  }
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface XmlElement {
  tag: string;
  attributes?: Record<string, string | number | boolean | undefined>;
  children?: (XmlElement | string)[];
  render(indentDepth?: number): string;
}

export function createXmlElement(
  tag: string,
  attributes: Record<string, string | number | boolean | undefined> = {},
  children: (XmlElement | string)[] = []
): XmlElement {
  return {
    tag,
    attributes,
    children,
    render(indentDepth = 0): string {
      const indent = "  ".repeat(indentDepth);
      const attrParts: string[] = [];

      for (const [key, val] of Object.entries(attributes)) {
        if (val !== undefined && val !== null) {
          attrParts.push(`${key}="${escapeXml(String(val))}"`);
        }
      }

      const attrString = attrParts.length > 0 ? " " + attrParts.join(" ") : "";

      if (children.length === 0) {
        return `${indent}<${tag}${attrString} />`;
      }

      const isSimpleText = children.every((child) => typeof child === "string");

      if (isSimpleText) {
        const textContent = children.map((c) => escapeXml(c as string)).join("");
        return `${indent}<${tag}${attrString}>${textContent}</${tag}>`;
      }

      const childLines: string[] = [];
      for (const child of children) {
        if (typeof child === "string") {
          childLines.push(`${indent}  ${escapeXml(child)}`);
        } else if (child && typeof child.render === "function") {
          childLines.push(child.render(indentDepth + 1));
        }
      }

      return `${indent}<${tag}${attrString}>\n${childLines.join("\n")}\n${indent}</${tag}>`;
    },
  };
}
