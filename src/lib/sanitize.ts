import sanitizeHtml from "sanitize-html";

export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["a", "b", "i", "em", "strong", "br", "p"],
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href;
        if (href) {
          try {
            const url = new URL(href, "https://example.com");
            if (url.protocol !== "http:" && url.protocol !== "https:") {
              delete attribs.href;
            }
          } catch {
            delete attribs.href;
          }
        }
        if (attribs.target === "_blank") {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  });
}

export function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
}
