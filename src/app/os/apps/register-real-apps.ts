/**
 * Master registration barrel — imports every Phase-3 app's `register.ts`
 * for its module-load `registerApp(...)` side effect.
 *
 * Loaded only via `bootstrap-os-registry.ts` after placeholders are seeded.
 * Do not static-import this module from `OSRoot` before
 * `registerAllPlaceholderApps()` or placeholders will overwrite these entries.
 *
 * Order is purely cosmetic — the registry is keyed by `appId`, not by
 * insertion order — but we group by Phase 3 subagent for readability.
 */

// 3D — content apps
import "./home/register";
import "./docs/register";
import "./help/register";
import "./community/register";

// 3E — file / data apps
import "./myResumes/register";
import "./templates/register";
import "./parser/register";
import "./importer/register";

// 3F — editor + tool suite
import "./editor/register";
import "./analyzer/register";
import "./coverLetter/register";
import "./jobMatcher/register";

// 3G — auth + setup
import "./auth/register";
import "./aiSetup/register";

// Desktop utility
import "./trash/register";

export {};
