# docker-cache

[![Test](https://github.com/AndreKurait/docker-cache/actions/workflows/test.yaml/badge.svg)](https://github.com/AndreKurait/docker-cache/actions/workflows/test.yaml)
[![Latest release](https://img.shields.io/github/v/release/AndreKurait/docker-cache)](https://github.com/AndreKurait/docker-cache/releases)

Cache **built and pulled Docker images** between GitHub Actions runs.

This is Andre Kurait's maintained fork of
[ScribeMD/docker-cache](https://github.com/ScribeMD/docker-cache), originally
created by Kurt von Laven. It retains the original MIT license and attribution.
The fork updates the action runtime, cache client, and runner compatibility.

## Usage

Place this step **after checkout and before pulling or building Docker images**:

```yaml
- name: Cache Docker images
  uses: AndreKurait/docker-cache@0.7.1
  with:
    key: docker-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('compose.yaml') }}
```

Replace `compose.yaml` with the files that determine your image versions, such
as `docker-compose.yml` or Dockerfiles. Check those files out before calculating
the key. Your later steps can pull, build, and run Docker images normally.

The example selects release [0.7.1](https://github.com/AndreKurait/docker-cache/releases/tag/0.7.1).
For a full commit pin, replace `0.7.1` with the SHA listed in that release's
notes. Existing version tags are not moved. To migrate from the original action,
change the owner from `ScribeMD` to `AndreKurait` and select a release.

## How it works

1. On a cache hit, restore the image archive and run `docker load`.
2. On a cache miss, record images already present on the runner.
3. After a successful job, save images pulled or built after that initial
   snapshot with `docker save`, then upload the archive to GitHub's cache.

Images present before the action runs are excluded from a new archive. This
avoids uploading the runner's preinstalled images. A cache hit is never saved
again, and `read-only: "true"` disables saving after a miss.

This caches whole images, including pulled images; it does **not** implement
Docker layer caching. For build-layer caching, see
[docker/build-push-action](https://github.com/docker/build-push-action).

## Inputs and outputs

| Input       | Required | Default   | Meaning                                                                         |
| ----------- | -------- | --------- | ------------------------------------------------------------------------------- |
| `key`       | Yes      | —         | Exact cache key. Include the runner OS, architecture, and image-version inputs. |
| `read-only` | No       | `"false"` | Set to `"true"` to restore without saving a new cache.                          |

| Output      | Meaning                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cache-hit` | `"true"` when GitHub restored the exact requested cache key; `"false"` otherwise. It reports the cache lookup, not whether `docker load` succeeded. |

`restore-keys` is intentionally unsupported: repeatedly saving partial restores
can accumulate obsolete images. Change the key when your image versions change.
For mutable tags such as `latest`, changing the remote image alone will not
invalidate an existing cache.

## Runner requirements

- A GitHub Actions runner that supports Node.js 24; self-hosted runners need
  version **2.327.1 or later**.
- Docker installed and accessible to the runner account.
- Bash at `/usr/bin/bash` on Linux, or Git for Windows at
  `C:\Program Files\Git\bin\bash.exe`.
- CI exercises `ubuntu-22.04`, `ubuntu-24.04`, and `windows-2025`. Windows runners
  use Windows containers; the action briefly retries Docker startup.

The action itself does not require extra `GITHUB_TOKEN` permissions. Other
workflow steps, such as checkout or publishing images, may need their own.

## Cache boundaries

GitHub controls cache scope, size limits, and eviction. Cache entries are
immutable, so use a new key to replace an archive. See
[GitHub's cache documentation](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows).

Only cache images you are comfortable exposing to workflows that can read the
repository's caches. In particular, pull requests can access eligible caches
from their base branch. Do not put credentials or other secrets inside cached
images. `read-only` controls uploads; it does not restrict who can read a cache.

## Development and support

- [Contributing](CONTRIBUTING.md): local checks, integration tests, and releases.
- [Security](SECURITY.md): private vulnerability reporting.
- [Issues](https://github.com/AndreKurait/docker-cache/issues): bugs and feature requests.
- [Releases](https://github.com/AndreKurait/docker-cache/releases) and [changelog](CHANGELOG.md).

Licensed under [MIT](LICENSE).
