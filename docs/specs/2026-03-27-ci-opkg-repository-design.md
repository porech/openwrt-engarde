# CI Pipeline & opkg Repository Design

## Overview

Add a GitHub Actions CI workflow to the `openwrt-engarde` repository that builds `.ipk` packages using the official OpenWrt 23.05 SDK, generates `opkg` package indexes, and uploads everything to `engarde.linuxzogno.org` so that users can install engarde on running OpenWrt routers via `opkg`.

## Target Architectures

| opkg architecture | SDK target/subtarget | Common devices |
|-------------------|---------------------|----------------|
| x86_64 | `x86/64` | VMs, x86 appliances |
| aarch64_generic | `armsr/armv8` | Modern ARM routers (GL.iNet, NanoPi, RPi4) |
| arm_cortex-a7_neon-vfpv4 | `sunxi/cortexa7` | Older ARM routers |

OpenWrt version: **23.05.5** (current stable point release).

## Packages Built

- **engarde-client** — architecture-specific (Go binary + init script + UCI config)
- **engarde-server** — architecture-specific (Go binary, depends on engarde-client)
- **luci-app-engarde** — architecture-independent (`_all.ipk`, JS/shell/JSON only)

## Versioning

- `PKG_VERSION` is maintained manually in the Makefile (semver, e.g., `2.0.0`)
- `PKG_RELEASE` is injected by CI as the commit count (`git rev-list --count HEAD`)
- Resulting package version: `2.0.0-3`, `2.0.0-4`, etc.
- `opkg upgrade` detects the incrementing release number and offers updates
- When `PKG_VERSION` is bumped manually, the release count continues from commit history

## CI Workflow

### Trigger

On every push to `main`.

### Jobs

**Job 1: `build` (matrix over 3 architectures)**

For each architecture:

1. Check out the `openwrt-engarde` repo
2. Cache the OpenWrt SDK tarball (keyed on `openwrt-23.05.5-<target>-<subtarget>`)
3. Download and extract the SDK if not cached from `https://downloads.openwrt.org/releases/23.05.5/targets/<target>/<subtarget>/`
4. Configure the SDK:
   - Add `openwrt-engarde` as a local feed (symlink or `src-link` in `feeds.conf`)
   - Run `./scripts/feeds update -a && ./scripts/feeds install -a`
5. Override `PKG_RELEASE` by patching the Makefile with the commit count
6. Build the packages: `make package/engarde-client/compile package/engarde-server/compile package/luci-app-engarde/compile V=s`
7. Collect `.ipk` files from `bin/packages/*/engarde/`
8. Upload as GitHub Actions artifacts (grouped by architecture)

**Job 2: `upload` (runs after all `build` jobs succeed)**

1. Download all artifacts from the build matrix
2. For each architecture directory:
   a. Generate `Packages` index by extracting `control` metadata from each `.ipk`
   b. Generate `Packages.gz` (gzipped version of `Packages`)
3. Upload all files to the artifact server:
   - Path: `openwrt/23.05/<arch>/<filename>`
   - Method: `curl -4 -F 'file=@<file>' -F 'path=openwrt/23.05/<arch>/<filename>' -F 'key=$UPLOAD_KEY' "$UPLOAD_URL"`
   - Server URL becomes: `https://engarde.linuxzogno.org/builds/openwrt/23.05/<arch>/`

### SDK URL Pattern

```
https://downloads.openwrt.org/releases/23.05.5/targets/<target>/<subtarget>/openwrt-sdk-23.05.5-<target>-<subtarget>_gcc-12.3.0_musl.Linux-x86_64.tar.xz
```

Note: The exact filename includes the GCC version and may vary. The workflow should glob-match or list the directory to find the SDK tarball.

## Server Directory Structure

```
builds/openwrt/23.05/x86_64/
  engarde-client_2.0.0-3_x86_64.ipk
  engarde-server_2.0.0-3_x86_64.ipk
  luci-app-engarde_2.0.0-3_all.ipk
  Packages
  Packages.gz

builds/openwrt/23.05/aarch64_generic/
  engarde-client_2.0.0-3_aarch64_generic.ipk
  engarde-server_2.0.0-3_aarch64_generic.ipk
  luci-app-engarde_2.0.0-3_all.ipk
  Packages
  Packages.gz

builds/openwrt/23.05/arm_cortex-a7_neon-vfpv4/
  engarde-client_2.0.0-3_arm_cortex-a7_neon-vfpv4.ipk
  engarde-server_2.0.0-3_arm_cortex-a7_neon-vfpv4.ipk
  luci-app-engarde_2.0.0-3_all.ipk
  Packages
  Packages.gz
```

Each push to main overwrites the previous files. No versioned history on the server.

## Package Index Generation

The `Packages` file is a text file with one stanza per `.ipk`, containing fields extracted from the package's `control` file plus `Filename`, `Size`, and `SHA256sum`. Format:

```
Package: engarde-client
Version: 2.0.0-3
Depends: libc
Architecture: x86_64
Filename: engarde-client_2.0.0-3_x86_64.ipk
Size: 3145728
SHA256sum: abc123...
```

Generation approach: install `opkg-utils` (available via pip or as a standalone script) in the upload job, or use a shell script that:
1. For each `.ipk`, extract `control.tar.gz` then the `control` file
2. Append `Filename:`, `Size:`, `SHA256sum:` fields
3. Concatenate all stanzas into `Packages`
4. `gzip -k Packages` to produce `Packages.gz`

## User Installation

On a running OpenWrt 23.05 router:

```sh
# For x86_64 (replace with your architecture)
echo "src/gz engarde https://engarde.linuxzogno.org/builds/openwrt/23.05/x86_64" >> /etc/opkg/customfeeds.conf
opkg update
opkg install engarde-client luci-app-engarde
```

## README Updates

Both READMEs (in `engarde` and `openwrt-engarde` repos) need to be updated with correct per-architecture `opkg` instructions, replacing the incorrect instructions currently present.

## Secrets and Variables

The `openwrt-engarde` repo needs these GitHub secrets/variables (same values as the main `engarde` repo):

- Secret: `UPLOAD_KEY` — authentication key for the artifact server
- Variable: `UPLOAD_URL` — upload endpoint URL

## Future Work (Out of Scope)

- Cross-repo trigger: `engarde` push triggers `openwrt-engarde` rebuild
- Additional architectures based on user demand
- OpenWrt 24.x support when it stabilizes
- Signed package index (usign)
