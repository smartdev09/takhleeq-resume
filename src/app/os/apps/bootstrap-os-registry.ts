/**
 * Synchronous registry bootstrap with correct ordering.
 *
 * `register-real-apps.ts` only contains static `import "./x/register"` side
 * effects. If we imported it from `OSRoot` *before* calling
 * `registerAllPlaceholderApps()`, hoisting would still run the real
 * registrations first — then `OSRoot`'s `ensurePlaceholdersRegistered()`
 * would run and **overwrite every app back to PlaceholderApp**, which is
 * why users saw "Phase 3 will replace this body…" forever.
 *
 * Here we call `registerAllPlaceholderApps()` first, then `require()` the
 * real-app barrel so the final registry entries are the Phase-3 components.
 */

"use client";

import { registerAllPlaceholderApps } from "./placeholders/register-placeholders";

registerAllPlaceholderApps();

require("./register-real-apps");
