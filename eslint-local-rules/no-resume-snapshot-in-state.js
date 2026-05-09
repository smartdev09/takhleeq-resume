/**
 * Forbids capturing redux resume data into local React state inside OS app
 * components. Such snapshots break the real-time pop-out sync model where
 * multiple windows must reflect every Redux update without re-mount.
 *
 * Bad:
 *   const [r, setR] = useState(useAppSelector(selectResume));
 *   const [r] = useState(() => store.getState().resume);
 *
 * Good:
 *   const resume = useAppSelector(selectResume);
 */
"use strict";

const SKIP_KEYS = new Set([
  "parent",
  "loc",
  "range",
  "start",
  "end",
  "leadingComments",
  "trailingComments",
  "comments",
  "tokens",
]);

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow snapshotting resume data into useState inside OS app components",
    },
    messages: {
      snapshot:
        "Do not capture resume state in useState; read from useAppSelector each render to keep popped-out windows in sync.",
    },
    schema: [],
  },
  create(context) {
    function isUseStateCall(node) {
      if (!node || node.type !== "CallExpression") return false;
      const callee = node.callee;
      if (callee.type === "Identifier" && callee.name === "useState") return true;
      if (
        callee.type === "MemberExpression" &&
        callee.property &&
        callee.property.name === "useState"
      )
        return true;
      return false;
    }

    function mentionsResumeSelector(node) {
      const visited = new WeakSet();
      let found = false;
      function walk(n) {
        if (!n || typeof n !== "object" || found) return;
        if (visited.has(n)) return;
        visited.add(n);
        if (typeof n.type !== "string") return;
        if (n.type === "Identifier") {
          if (
            n.name === "useAppSelector" ||
            n.name === "selectResume" ||
            n.name === "selectSettings"
          ) {
            found = true;
            return;
          }
        }
        for (const key of Object.keys(n)) {
          if (SKIP_KEYS.has(key)) continue;
          const child = n[key];
          if (!child || typeof child !== "object") continue;
          if (Array.isArray(child)) {
            for (const item of child) walk(item);
          } else if (typeof child.type === "string") {
            walk(child);
          }
        }
      }
      walk(node);
      return found;
    }

    return {
      CallExpression(node) {
        if (!isUseStateCall(node)) return;
        const arg = node.arguments[0];
        if (!arg) return;

        if (arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression") {
          if (mentionsResumeSelector(arg.body)) {
            context.report({ node, messageId: "snapshot" });
          }
          return;
        }
        if (mentionsResumeSelector(arg)) {
          context.report({ node, messageId: "snapshot" });
        }
      },
    };
  },
}
