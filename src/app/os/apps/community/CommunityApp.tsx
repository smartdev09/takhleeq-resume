/**
 * `Community` — small content window with the project's external touch
 * points. Six entries:
 *   - GitHub repo (link out)
 *   - Star this project (opens the in-app auth/star window)
 *   - Discord (placeholder URL until #community is created)
 *   - Contributing guide (link to CONTRIBUTING.md on the default branch)
 *   - Issue tracker (link to GitHub Issues)
 *
 * The repository slug is read at render time from
 * `process.env.NEXT_PUBLIC_GITHUB_REPO`, defaulting to the upstream
 * `xitanggg/open-resume`.
 */

"use client";

import * as React from "react";
import {
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  ExclamationCircleIcon,
  HandRaisedIcon,
  HeartIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

import type { AppComponentProps } from "os/apps/app-types";
import { useWindowManager } from "os/context/use-window-manager";

const DISCORD_URL =
  process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/openresume";

interface CardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: string;
  onAction: () => void;
  isExternal?: boolean;
  href?: string;
  testId: string;
}

function CommunityCard({
  icon: Icon,
  title,
  description,
  cta,
  onAction,
  isExternal,
  href,
  testId,
}: CardProps) {
  const baseClass =
    "flex h-full flex-col gap-3 rounded-xl border border-os-window-border bg-white p-5 text-left shadow-sm transition hover:border-[color:var(--theme-primary)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--theme-primary)]";
  const Body = (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--theme-primary)]/10">
          <Icon
            className="h-5 w-5 text-[color:var(--theme-primary)]"
            aria-hidden
          />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-gray-700">{description}</p>
      <span className="mt-auto inline-flex items-center text-sm font-medium text-[color:var(--theme-primary)]">
        {cta} →
      </span>
    </>
  );

  if (isExternal && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={baseClass}
        data-testid={testId}
      >
        {Body}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onAction}
      className={baseClass}
      data-testid={testId}
    >
      {Body}
    </button>
  );
}

export default function CommunityApp({
  windowId,
}: AppComponentProps<"community">) {
  const { controls } = useWindowManager();
  const repo =
    process.env.NEXT_PUBLIC_GITHUB_REPO || "xitanggg/open-resume";

  const openAuth = React.useCallback(() => {
    controls.openWindow({ appId: "auth", focusIfExists: true });
  }, [controls]);

  return (
    <div
      data-testid="community-app"
      data-window-id={windowId}
      className="h-full w-full overflow-y-auto bg-os-window text-foreground"
    >
      <article className="mx-auto max-w-2xl px-6 py-8 lg:px-10 lg:py-10">
        <header className="mb-6 border-b border-os-window-border pb-4">
          <p className="text-xs uppercase tracking-wide text-os-ink-muted">
            Community
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Join the OpenResume community
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            OpenResume is a free, open-source project. Contributions of any
            size are welcome — code, docs, templates, translations, even
            kind words on a star.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CommunityCard
            icon={CodeBracketIcon}
            title="GitHub repository"
            description="Source code, releases, and changelog. Watch to follow new releases or fork to start your own."
            cta="Open on GitHub"
            onAction={() => undefined}
            isExternal
            href={`https://github.com/${repo}`}
            testId="community-card-github"
          />
          <CommunityCard
            icon={StarIcon}
            title="Star this project"
            description="Stars are how we measure momentum and unlock one-click PDF export for your account. Takes 5 seconds."
            cta="Star OpenResume"
            onAction={openAuth}
            testId="community-card-star"
          />
          <CommunityCard
            icon={ChatBubbleLeftRightIcon}
            title="Discord chat"
            description="Get help, share resume tips, and chat with other job seekers and contributors in real time."
            cta="Join the Discord"
            onAction={() => undefined}
            isExternal
            href={DISCORD_URL}
            testId="community-card-discord"
          />
          <CommunityCard
            icon={HandRaisedIcon}
            title="Contributing guide"
            description="A friendly walkthrough of the codebase, the dev setup, and how PRs get reviewed. Read this first."
            cta="Read CONTRIBUTING.md"
            onAction={() => undefined}
            isExternal
            href={`https://github.com/${repo}/blob/main/CONTRIBUTING.md`}
            testId="community-card-contributing"
          />
          <CommunityCard
            icon={ExclamationCircleIcon}
            title="Issue tracker"
            description="Found a bug or have a feature idea? File an issue — we triage every report and label good first issues for newcomers."
            cta="Open an issue"
            onAction={() => undefined}
            isExternal
            href={`https://github.com/${repo}/issues`}
            testId="community-card-issues"
          />
          <CommunityCard
            icon={HeartIcon}
            title="Spread the word"
            description="Share OpenResume with friends, classmates, or your university's career center. Every share helps another job seeker."
            cta="Tell a friend"
            onAction={() => undefined}
            isExternal
            href={`https://github.com/${repo}#readme`}
            testId="community-card-share"
          />
        </div>
      </article>
    </div>
  );
}
