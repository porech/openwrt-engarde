# openwrt-engarde

OpenWrt package feed for [Engarde](https://github.com/porech/engarde), a WireGuard redundancy tunnel that duplicates packets across multiple network interfaces to keep a VPN connection alive even when individual links fail.

## Packages

- **engarde-client** — engarde client binary, procd init script, and UCI configuration skeleton
- **engarde-server** — engarde server binary (depends on engarde-client)
- **luci-app-engarde** — LuCI web interface for configuring instances and monitoring real-time tunnel status

## Install on a running OpenWrt router

Pre-built packages are available for OpenWrt 23.05. SSH into your router, add the signing key and the package repository for your architecture:

```sh
# Add signing key
wget -qO /etc/opkg/keys/f59c896b325e81c9 \
  https://porech.github.io/openwrt-engarde/engarde-repo.pub
```

**x86_64** (VMs, x86 appliances):
```sh
echo "src/gz engarde https://porech.github.io/openwrt-engarde/x86_64" >> /etc/opkg/customfeeds.conf
```

**aarch64_generic** (modern ARM routers):
```sh
echo "src/gz engarde https://porech.github.io/openwrt-engarde/aarch64_generic" >> /etc/opkg/customfeeds.conf
```

**arm_cortex-a7_neon-vfpv4** (older ARM routers):
```sh
echo "src/gz engarde https://porech.github.io/openwrt-engarde/arm_cortex-a7_neon-vfpv4" >> /etc/opkg/customfeeds.conf
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
