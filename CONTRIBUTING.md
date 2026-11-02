# Contributing

This repository maintains the `AndreKurait/docker-cache` fork. Open issues and
pull requests here for this fork; preserve ScribeMD's license and attribution.

## Local setup

Use the Node.js version in `package.json`. Yarn is checked into the repository,
so the commands below do not need a global Yarn installation:

```sh
node .yarn/releases/yarn-4.15.0.cjs install --immutable
node .yarn/releases/yarn-4.15.0.cjs test --runInBand
node .yarn/releases/yarn-4.15.0.cjs build
```

`test` type-checks production code and tests, then runs Jest with coverage.
The unit tests mock Docker and the GitHub cache service; they need neither a
Docker daemon nor GitHub credentials. Keep regression tests for behavior fixes.

The `dist/main` and `dist/post` bundles are committed because GitHub Actions
executes them directly. After changing runtime code or dependencies, rebuild
and include those bundles in your pull request. CI rebuilds them and fails if
they differ from the committed files.

## Integration coverage

The Test workflow saves images in one job and restores them in another, verifying
both the cache-hit output and the restored image. It exercises Ubuntu 22.04,
Ubuntu 24.04, and Windows 2025. These checks require a real GitHub Actions cache
service and cannot be reproduced by the mocked unit suite.

No organization secrets or Slack integration are required. Test caches use the
workflow run ID and attempt in their keys. Cleanup runs when the workflow token
can delete caches; fork pull requests leave eviction to GitHub.

## Before opening a pull request

Explain the failure or use case, the resulting behavior, and which checks you
ran. For runner-specific issues, include the runner OS, Docker version, action
version, and a minimal workflow. Remove credentials and private image names
from logs.

Keep existing input/output behavior compatible unless the change explicitly
requires a new release contract. Do not update tags or publish a release as
part of an ordinary pull request.

## Releasing

1. Run the local checks above and let the full Test workflow pass.
2. Update the version metadata, changelog, and README reference together.
3. Rebuild `dist` and confirm a second build produces no diff.
4. Create a new immutable version tag and release with upgrade notes.

Do not move an existing version tag: downstream workflows may pin either the
tag or its commit SHA. Dependency-only changes still require rebuilt bundles
and a new release before consumers can use them.
