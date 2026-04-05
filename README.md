# openwrt-engarde

OpenWrt package feed for [Engarde](https://github.com/porech/engarde), a WireGuard redundancy tunnel that duplicates packets across multiple network interfaces to keep a VPN connection alive even when individual links fail.

## Packages

- **engarde-client** — engarde client binary, procd init script, and UCI configuration skeleton
- **engarde-server** — engarde server binary (depends on engarde-client)
- **luci-app-engarde** — LuCI web interface for configuring instances and monitoring real-time tunnel status

## Supported OpenWrt versions

Pre-built packages are available for the following OpenWrt releases:

| OpenWrt | Status | Architectures |
|---------|--------|---------------|
| 25.12   | Current stable | x86_64, aarch64_generic, arm_cortex-a7_neon-vfpv4 |
| 24.10   | Old stable | x86_64, aarch64_generic, arm_cortex-a7_neon-vfpv4 |

Packages are rebuilt automatically on every push to `main` against all supported releases.

## Install on a running OpenWrt router

SSH into your router, add the signing key and the package repository for your architecture. Replace `RELEASE` with your OpenWrt version branch (`24.10` or `25.12`).

```sh
# Add signing key
wget -qO /etc/opkg/keys/f59c896b325e81c9 \
  https://porech.github.io/openwrt-engarde/engarde-repo.pub
```

**x86_64** (VMs, x86 appliances):
```sh
echo "src/gz engarde https://porech.github.io/openwrt-engarde/RELEASE/x86_64" >> /etc/opkg/customfeeds.conf
```

**aarch64_generic** (modern ARM routers):
```sh
echo "src/gz engarde https://porech.github.io/openwrt-engarde/RELEASE/aarch64_generic" >> /etc/opkg/customfeeds.conf
```

**arm_cortex-a7_neon-vfpv4** (older ARM routers):
```sh
echo "src/gz engarde https://porech.github.io/openwrt-engarde/RELEASE/arm_cortex-a7_neon-vfpv4" >> /etc/opkg/customfeeds.conf
```

For example, on OpenWrt 25.12 with x86_64:
```sh
echo "src/gz engarde https://porech.github.io/openwrt-engarde/25.12/x86_64" >> /etc/opkg/customfeeds.conf
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
