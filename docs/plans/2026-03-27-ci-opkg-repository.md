# CI Pipeline & opkg Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `.ipk` packages in CI and upload them with a package index to `engarde.linuxzogno.org` so users can install engarde on running OpenWrt routers via `opkg`.

**Architecture:** GitHub Actions workflow with a build matrix over 3 architectures (x86_64, aarch64_generic, arm_cortex-a7), each downloading the official OpenWrt 23.05.5 SDK, building the packages, then a final upload job that generates the package index and uploads everything to the artifact server.

**Tech Stack:** GitHub Actions, OpenWrt SDK 23.05.5, opkg-make-index, curl uploads.

---

### Task 1: Create the CI Workflow File

**Files:**
- Create: `.github/workflows/build.yml`

This is the main workflow. It has two jobs: `build` (matrix) and `upload`.

- [ ] **Step 1: Create the workflow file**

```yaml
name: Build and Deploy OpenWrt Packages

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - arch: x86_64
            target: x86
            subtarget: "64"
            sdk: openwrt-sdk-23.05.5-x86-64_gcc-12.3.0_musl.Linux-x86_64.tar.xz
          - arch: aarch64_generic
            target: armsr
            subtarget: armv8
            sdk: openwrt-sdk-23.05.5-armsr-armv8_gcc-12.3.0_musl.Linux-x86_64.tar.xz
          - arch: arm_cortex-a7_neon-vfpv4
            target: sunxi
            subtarget: cortexa7
            sdk: openwrt-sdk-23.05.5-sunxi-cortexa7_gcc-12.3.0_musl_eabi.Linux-x86_64.tar.xz

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Cache OpenWrt SDK
        uses: actions/cache@v4
        id: cache-sdk
        with:
          path: sdk.tar.xz
          key: openwrt-sdk-23.05.5-${{ matrix.target }}-${{ matrix.subtarget }}

      - name: Download OpenWrt SDK
        if: steps.cache-sdk.outputs.cache-hit != 'true'
        run: |
          wget -q "https://downloads.openwrt.org/releases/23.05.5/targets/${{ matrix.target }}/${{ matrix.subtarget }}/${{ matrix.sdk }}" -O sdk.tar.xz

      - name: Extract SDK
        run: |
          mkdir -p sdk
          tar xf sdk.tar.xz --strip-components=1 -C sdk

      - name: Configure feeds
        run: |
          cd sdk
          # Add the standard feeds
          cp feeds.conf.default feeds.conf
          # Add our local feed
          echo "src-link engarde ${{ github.workspace }}" >> feeds.conf
          ./scripts/feeds update -a
          ./scripts/feeds install -a -p engarde

      - name: Override PKG_RELEASE with commit count
        run: |
          RELEASE=$(git rev-list --count HEAD)
          sed -i "s/^PKG_RELEASE:=.*/PKG_RELEASE:=${RELEASE}/" sdk/feeds/engarde/engarde/Makefile
          sed -i "s/^PKG_RELEASE:=.*/PKG_RELEASE:=${RELEASE}/" sdk/feeds/engarde/luci-app-engarde/Makefile 2>/dev/null || true

      - name: Build packages
        run: |
          cd sdk
          make defconfig
          make package/engarde-client/compile V=s -j$(nproc)
          make package/engarde-server/compile V=s -j$(nproc)
          make package/luci-app-engarde/compile V=s -j$(nproc)

      - name: Collect packages
        run: |
          mkdir -p packages
          find sdk/bin/ -name '*.ipk' -exec cp {} packages/ \;

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: packages-${{ matrix.arch }}
          path: packages/*.ipk

  upload:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Organize packages by architecture
        run: |
          for dir in artifacts/packages-*/; do
            arch=$(basename "$dir" | sed 's/packages-//')
            mkdir -p "repo/${arch}"
            cp "$dir"/*.ipk "repo/${arch}/"
          done

      - name: Generate package indexes
        run: |
          for arch_dir in repo/*/; do
            cd "$arch_dir"
            # Generate Packages index from ipk control metadata
            for ipk in *.ipk; do
              [ -f "$ipk" ] || continue
              ar -p "$ipk" control.tar.gz | tar xzf - --to-stdout ./control 2>/dev/null || \
                ar -p "$ipk" control.tar.gz | tar xzf - --to-stdout control
              echo "Filename: $ipk"
              echo "Size: $(stat -c %s "$ipk")"
              echo "SHA256sum: $(sha256sum "$ipk" | cut -d' ' -f1)"
              echo ""
            done > Packages
            gzip -9c Packages > Packages.gz
            cd "$OLDPWD"
          done

      - name: Upload to artifact server
        env:
          UPLOAD_KEY: ${{ secrets.UPLOAD_KEY }}
          UPLOAD_URL: ${{ vars.UPLOAD_URL }}
        run: |
          for arch_dir in repo/*/; do
            arch=$(basename "$arch_dir")
            for file in "$arch_dir"/*; do
              filename=$(basename "$file")
              echo "Uploading ${arch}/${filename}"
              curl -4 -f -F "file=@${file}" \
                -F "path=openwrt/23.05/${arch}/${filename}" \
                -F "key=${UPLOAD_KEY}" \
                "${UPLOAD_URL}"
            done
          done
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "feat: add CI workflow for building and uploading OpenWrt packages"
```

---

### Task 2: Add PKG_RELEASE to the LuCI Makefile

**Files:**
- Modify: `luci-app-engarde/Makefile`

The LuCI Makefile currently uses `luci.mk` which auto-generates versioning. However, to keep the release number consistent and overridable by CI, we should add an explicit `PKG_RELEASE` line.

- [ ] **Step 1: Add PKG_RELEASE to the LuCI Makefile**

The current file is:
```makefile
include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for Engarde
LUCI_DESCRIPTION:=Provides a LuCI interface to configure and monitor Engarde WireGuard redundancy tunnels.
LUCI_DEPENDS:=+engarde-client +luci-base

PKG_LICENSE:=MIT

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot
$(eval $(call BuildPackage,luci-app-engarde))
```

Add `PKG_VERSION` and `PKG_RELEASE` after `include $(TOPDIR)/rules.mk`:

```makefile
include $(TOPDIR)/rules.mk

PKG_VERSION:=2.0.0
PKG_RELEASE:=1

LUCI_TITLE:=LuCI support for Engarde
LUCI_DESCRIPTION:=Provides a LuCI interface to configure and monitor Engarde WireGuard redundancy tunnels.
LUCI_DEPENDS:=+engarde-client +luci-base

PKG_LICENSE:=MIT

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot
$(eval $(call BuildPackage,luci-app-engarde))
```

- [ ] **Step 2: Commit**

```bash
git add luci-app-engarde/Makefile
git commit -m "feat: add explicit PKG_VERSION and PKG_RELEASE to LuCI Makefile"
```

---

### Task 3: Update README with Correct opkg Instructions

**Files:**
- Modify: `README.md`

Replace the current installation instructions with correct per-architecture `opkg` commands.

- [ ] **Step 1: Update the README**

Replace the current "Install on a running OpenWrt router" section with:

```markdown
# openwrt-engarde

OpenWrt package feed for [Engarde](https://github.com/porech/engarde), a WireGuard redundancy tunnel that duplicates packets across multiple network interfaces to keep a VPN connection alive even when individual links fail.

## Packages

- **engarde-client** — engarde client binary, procd init script, and UCI configuration skeleton
- **engarde-server** — engarde server binary (depends on engarde-client)
- **luci-app-engarde** — LuCI web interface for configuring instances and monitoring real-time tunnel status

## Install on a running OpenWrt router

Pre-built packages are available for OpenWrt 23.05. SSH into your router and add the package repository for your architecture:

**x86_64** (VMs, x86 appliances):
```sh
echo "src/gz engarde https://engarde.linuxzogno.org/builds/openwrt/23.05/x86_64" >> /etc/opkg/customfeeds.conf
```

**aarch64_generic** (modern ARM routers):
```sh
echo "src/gz engarde https://engarde.linuxzogno.org/builds/openwrt/23.05/aarch64_generic" >> /etc/opkg/customfeeds.conf
```

**arm_cortex-a7_neon-vfpv4** (older ARM routers):
```sh
echo "src/gz engarde https://engarde.linuxzogno.org/builds/openwrt/23.05/arm_cortex-a7_neon-vfpv4" >> /etc/opkg/customfeeds.conf
```

Then install:
```sh
opkg update
opkg install engarde-client luci-app-engarde
```

Open LuCI and navigate to **Services → Engarde** to configure your instances.

## Build from source (OpenWrt SDK)

This feed requires two standard OpenWrt feeds:

- `packages` — provides the Go toolchain used to compile the engarde binaries
- `luci` — provides the LuCI framework required by luci-app-engarde

Add the following line to `feeds.conf.default` in your OpenWrt build tree:

```
src-git engarde https://github.com/porech/openwrt-engarde.git
```

Then update and install the feed:

```sh
./scripts/feeds update engarde
./scripts/feeds install -a -p engarde
```

Run `make menuconfig` and enable the packages you need:

- `engarde-client` and/or `engarde-server`: **Network → VPN**
- `luci-app-engarde`: **LuCI → Applications**

## Documentation

For engarde configuration and usage, refer to the main project repository:
https://github.com/porech/engarde
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with correct per-architecture opkg instructions"
```

---

### Task 4: Update Main engarde README

**Files:**
- Modify: `/Users/alerinaldi/engarde/README.md` (on the `feature/openwrt-and-luci-support` branch)

Update the OpenWrt section in the main repo's README to match.

- [ ] **Step 1: Update the OpenWrt / LuCI section**

Replace the current OpenWrt / LuCI section with:

```markdown
## OpenWrt / LuCI

engarde is available as OpenWrt packages with full LuCI integration:

- **engarde-client** / **engarde-server** — procd service management and UCI configuration
- **luci-app-engarde** — configure and monitor engarde instances from the LuCI web interface

### Install on a running OpenWrt 23.05 router

SSH into your router and add the package repository for your architecture:

**x86_64:** `echo "src/gz engarde https://engarde.linuxzogno.org/builds/openwrt/23.05/x86_64" >> /etc/opkg/customfeeds.conf`

**aarch64_generic:** `echo "src/gz engarde https://engarde.linuxzogno.org/builds/openwrt/23.05/aarch64_generic" >> /etc/opkg/customfeeds.conf`

**arm_cortex-a7_neon-vfpv4:** `echo "src/gz engarde https://engarde.linuxzogno.org/builds/openwrt/23.05/arm_cortex-a7_neon-vfpv4" >> /etc/opkg/customfeeds.conf`

Then install:

```sh
opkg update
opkg install engarde-client luci-app-engarde
```

Open LuCI and navigate to **Services → Engarde** to configure your instances.

### Build from source

See the [openwrt-engarde](https://github.com/porech/openwrt-engarde) repository for instructions on building from source with the OpenWrt SDK.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update OpenWrt section with correct opkg instructions"
```

---

### Task 5: Configure GitHub Secrets and Test

**Files:**
- None (GitHub settings)

- [ ] **Step 1: Add secrets to the openwrt-engarde repo**

Run:
```bash
gh secret set UPLOAD_KEY --repo porech/openwrt-engarde
gh variable set UPLOAD_URL --repo porech/openwrt-engarde
```

Enter the same values used in the main `engarde` repo.

- [ ] **Step 2: Push all changes and verify the workflow runs**

```bash
cd /tmp/openwrt-engarde
git push
```

Check the Actions tab: `gh run list --repo porech/openwrt-engarde`

- [ ] **Step 3: Verify packages are uploaded**

After the workflow completes, verify the packages are accessible:

```bash
curl -s https://engarde.linuxzogno.org/builds/openwrt/23.05/x86_64/Packages
```

Expected: A text file with `Package:`, `Version:`, `Filename:`, `Size:`, `SHA256sum:` stanzas for engarde-client, engarde-server, and luci-app-engarde.
