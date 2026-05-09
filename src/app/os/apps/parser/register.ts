/**
 * Module-side-effect registration for the Resume Parser app.
 *
 * The parser window is wider than most file/data apps because the playground
 * shows the PDF preview side-by-side with the parsing-results table.
 */

import { lazy } from "react";
import { CodeBracketSquareIcon } from "@heroicons/react/24/outline";

import { registerApp } from "../app-registry";

registerApp<"parser">({
  appId: "parser",
  title: () => "Resume Parser",
  icon: CodeBracketSquareIcon,
  desktopLabel: "Resume Parser",
  defaultSize: { width: 1100, height: 720 },
  minSize: { width: 640, height: 480 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: true,
  desktopColumn: "right",
  desktopOrder: 1,
  Component: lazy(() => import("./ParserApp")),
});
