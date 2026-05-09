/**
 * Module-side-effect registration for the Templates gallery app.
 *
 * Importing this module overwrites the placeholder registry entry seeded
 * by `register-placeholders.ts`. The component is lazy-loaded so the
 * heavyweight templates-data fixture only ships when the user actually
 * opens the gallery.
 *
 * The title resolver disambiguates detail-mode windows (`appProps.templateId`
 * set) by appending the template name, so the dock chip and title bar make
 * it obvious which template the user is previewing.
 */

import { lazy } from "react";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";

import { registerApp } from "../app-registry";
import type { AppPropsMap } from "../app-types";
import { RESUME_TEMPLATES } from "lib/mock/templates-data";

registerApp<"templates">({
  appId: "templates",
  title: (props: AppPropsMap["templates"]) => {
    if (props?.templateId) {
      const t = RESUME_TEMPLATES.find((r) => r.id === props.templateId);
      return t ? `Templates — ${t.name}` : "Templates";
    }
    return "Templates";
  },
  icon: DocumentDuplicateIcon,
  desktopLabel: "Templates",
  defaultSize: { width: 940, height: 660 },
  minSize: { width: 520, height: 420 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: true,
  desktopColumn: "left",
  desktopOrder: 2,
  Component: lazy(() => import("./TemplatesApp")),
});
