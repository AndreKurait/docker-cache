# Security

Report suspected vulnerabilities privately to **andrekurait@gmail.com**.
Include the affected action version, runner environment, impact, and a minimal
reproduction. Do not post credentials, private image contents, or exploit
details in a public issue while a report is being assessed.

The latest release is the maintenance target. Security fixes are released under
a new version; existing version tags are not moved.

## Cache trust

This action archives Docker images and stores them in GitHub Actions caches.
GitHub's cache access rules apply, including eligible base-branch cache access
from pull requests. Do not cache images containing secrets or private data that
those workflows should not read.

Use immutable action versions or commit SHAs and choose cache keys that reflect
your image inputs and runner platform. The `read-only` option prevents uploads
by this action; it does not add access control to existing caches.
