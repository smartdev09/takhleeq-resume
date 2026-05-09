/**
 * GitHub API client helpers used by the OAuth flow.
 */

/** Exchange an OAuth `code` for an `access_token`. */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set");
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "No access_token returned"
    );
  }

  return data.access_token;
}

/** Returns the authenticated user's GitHub username. */
export async function getUsername(accessToken: string): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub /user request failed: ${res.status}`);
  }

  const data = (await res.json()) as { login?: string };
  if (!data.login) throw new Error("GitHub /user response missing login");
  return data.login;
}

/**
 * Returns `true` if the authenticated user has starred `owner/repo`.
 * GitHub returns 204 (starred) or 404 (not starred).
 */
export async function hasStarred(
  accessToken: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/user/starred/${owner}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (res.status === 204) return true;
  if (res.status === 404) return false;
  throw new Error(`GitHub starred check failed: ${res.status}`);
}
