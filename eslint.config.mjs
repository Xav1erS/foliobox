import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * 自定义规则：PopoverContent / DialogContent 用 dark-only Tailwind token
 * （bg-card / text-white）时，必须显式加 `dark` 类，否则在浅色主题父级里
 * 会渲染成空白白板。Radix 把内容 portal 到 body，不会自动继承祖先的 dark 类。
 */
const popoverDarkRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "PopoverContent / DialogContent 使用 dark-only token 时必须加 `dark` 类",
    },
    schema: [],
  },
  create(context) {
    const TARGET_COMPONENTS = new Set(["PopoverContent", "DialogContent"]);
    // 只盯 `bg-card`：它通过 CSS 变量在浅/深主题分别解析为白色/深色，
    // 弹窗 portal 到 body 时若没有 `dark` 类会回落到亮色，渲染成白板。
    // text-white / border-white 等是字面量，与主题无关，不在范围内。
    const DARK_ONLY_TOKEN = /\bbg-card\b/;
    const HAS_DARK = /(^|\s)dark(\s|$)/;
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") return;
        if (!TARGET_COMPONENTS.has(node.name.name)) return;
        const classNameAttr = node.attributes.find(
          (attr) =>
            attr.type === "JSXAttribute" &&
            attr.name?.type === "JSXIdentifier" &&
            attr.name.name === "className"
        );
        if (!classNameAttr || !classNameAttr.value) return;
        let value = "";
        if (classNameAttr.value.type === "Literal") {
          value = String(classNameAttr.value.value ?? "");
        } else if (classNameAttr.value.type === "JSXExpressionContainer") {
          // 兜底：抓表达式源码做字符串扫描；覆盖 cn("dark ...", ...) 之类。
          value = context.sourceCode.getText(classNameAttr.value.expression);
        }
        if (!DARK_ONLY_TOKEN.test(value)) return;
        if (HAS_DARK.test(value)) return;
        context.report({
          node: classNameAttr,
          message: `${node.name.name} 使用了 dark-only token (bg-card / text-white)，但 className 没有 'dark'。Radix 会 portal 到 body，弹窗会渲染成白底。请在 className 加上 'dark'。`,
        });
      },
    };
  },
};

const config = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    plugins: {
      "foliobox-local": {
        rules: {
          "popover-needs-dark": popoverDarkRule,
        },
      },
    },
    rules: {
      "foliobox-local/popover-needs-dark": "error",
    },
  },
];

export default config;
