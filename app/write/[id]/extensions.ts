import Image from "@tiptap/extension-image";

/**
 * Carries intrinsic dimensions through the document so the reading page can
 * reserve space before the image loads. The stock Image node drops any
 * attribute it doesn't declare, which is why this extension exists.
 */
export const StoryImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("width"),
        renderHTML: (attrs) =>
          attrs.width ? { width: String(attrs.width) } : {},
      },
      height: {
        default: null,
        parseHTML: (el) => el.getAttribute("height"),
        renderHTML: (attrs) =>
          attrs.height ? { height: String(attrs.height) } : {},
      },
    };
  },
});
