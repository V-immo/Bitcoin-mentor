import type { NextConfig } from "next";
import * as path from "path";
import * as fs from "fs";

// When running in a git worktree, node_modules is a junction pointing to a sibling worktree.
// Turbopack root must contain both the project AND the junction target to avoid "points out of root" errors.
// Using __dirname/../ (the "worktrees" parent) works when the junction target is a sibling worktree.
// Using repoRoot (3 levels up) also contains the target but breaks dynamic route matching ([...nextauth]).
function getTurbopackRoot(): string {
  const projectDir = path.resolve(__dirname);
  const nodeModulesLink = path.join(projectDir, 'node_modules');

  try {
    // Follow the symlink/junction to its real location
    const realTarget = fs.realpathSync(nodeModulesLink);
    // Walk up from realTarget until we find a directory that also contains the project
    let candidate = path.dirname(realTarget); // parent of the resolved node_modules
    while (candidate !== path.dirname(candidate)) {
      if (projectDir.startsWith(candidate + path.sep) || projectDir === candidate) {
        return candidate;
      }
      candidate = path.dirname(candidate);
    }
  } catch {
    // node_modules is not a symlink/junction — use project dir directly
  }
  return projectDir;
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {
    root: getTurbopackRoot(),
  },
};

export default nextConfig;
