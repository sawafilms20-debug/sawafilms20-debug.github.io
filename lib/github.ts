import { GH_OWNER, GH_REPO, GH_BRANCH } from "@/app/admin/config";

/* A thin GitHub client for the publish step.

   Everything a publish writes goes out as ONE commit through the Git Data API.
   Writing file-by-file through the contents API means a half-published site
   whenever the third of eleven requests fails. */

const API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`;
export const RAW = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}`;

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(e.message || `GitHub ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type TreeEntry = {
  path: string;
  mode: "100644";
  type: "blob";
  /** Text content, or a sha of null to delete the path. */
  content?: string;
  sha?: null;
};

export async function readRepoFile(path: string): Promise<string | null> {
  const r = await fetch(`${RAW}/${path}`, { cache: "no-store" });
  return r.ok ? r.text() : null;
}

export async function listDir(
  token: string,
  path: string
): Promise<{ name: string; type: string; path: string }[]> {
  const r = await fetch(`${API}/contents/${path}?ref=${GH_BRANCH}`, {
    headers: headers(token),
  });
  if (!r.ok) return [];
  const items = await r.json();
  return Array.isArray(items) ? items : [];
}

/** Commits every entry at once and moves the branch. Returns the commit sha. */
export async function commitTree(
  token: string,
  entries: TreeEntry[],
  message: string
): Promise<string> {
  const ref = await json<{ object: { sha: string } }>(
    await fetch(`${API}/git/ref/heads/${GH_BRANCH}`, { headers: headers(token) })
  );
  const parent = ref.object.sha;
  const parentCommit = await json<{ tree: { sha: string } }>(
    await fetch(`${API}/git/commits/${parent}`, { headers: headers(token) })
  );
  const tree = await json<{ sha: string }>(
    await fetch(`${API}/git/trees`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree: entries }),
    })
  );
  const commit = await json<{ sha: string }>(
    await fetch(`${API}/git/commits`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }),
    })
  );
  await json(
    await fetch(`${API}/git/refs/heads/${GH_BRANCH}`, {
      method: "PATCH",
      headers: headers(token),
      body: JSON.stringify({ sha: commit.sha }),
    })
  );
  return commit.sha;
}
