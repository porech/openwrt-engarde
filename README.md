# openwrt-engarde

OpenWrt package feed for [Engarde](https://github.com/porech/engarde), a WireGuard redundancy tunnel that duplicates packets across multiple network interfaces to keep a VPN connection alive even when individual links fail.

## Packages

- **engarde-client** — engarde client binary, procd init script, and UCI configuration skeleton
- **engarde-server** — engarde server binary (depends on engarde-client)
- **luci-app-engarde** — LuCI web interface for configuring instances and monitoring real-time tunnel status

## Prerequisites

This feed requires two standard OpenWrt feeds to be present in your build:

- `packages` — provides the Go toolchain used to compile the engarde binaries
- `luci` — provides the LuCI framework required by luci-app-engarde

## Adding the feed

Add the following line to `feeds.conf.default` in your OpenWrt build tree:

```
src-git engarde https://github.com/porech/openwrt-engarde.git
```

Then update and install the feed:

```sh
./scripts/feeds update engarde
./scripts/feeds install -a -f -p engarde
```

## Selecting packages

Run `make menuconfig` and enable the packages you need:

- `engarde-client` and/or `engarde-server`: **Network → VPN**
- `luci-app-engarde`: **LuCI → Applications**

## Documentation

For engarde configuration and usage, refer to the main project repository:
https://github.com/porech/engarde
