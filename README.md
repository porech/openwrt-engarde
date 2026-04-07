# openwrt-engarde

OpenWrt package feed for [Engarde](https://github.com/porech/engarde), a WireGuard redundancy tunnel that duplicates packets across multiple network interfaces to keep a VPN connection alive even when individual links fail.

## Packages

- **engarde-client** — engarde client binary, procd init script, and UCI configuration skeleton
- **engarde-server** — engarde server binary (depends on engarde-client)
- **luci-app-engarde** — LuCI web interface for configuring instances and monitoring real-time tunnel status

## Supported OpenWrt versions

Pre-built packages are available for the following OpenWrt releases:

| OpenWrt | Status | Package format | Architectures |
|---------|--------|----------------|---------------|
| 25.12   | Current stable | apk | x86_64, aarch64_generic, arm_cortex-a7_neon-vfpv4 |
| 24.10   | Old stable | ipk (opkg) | x86_64, aarch64_generic, arm_cortex-a7_neon-vfpv4 |

Packages are rebuilt automatically on every push to `main` against all supported releases.

### Available architectures

| Architecture | Devices |
|-------------|---------|
| `x86_64` | VMs, x86 mini-PCs |
| `aarch64_generic` | Modern ARM routers (RPi 4, NanoPi, etc.) |
| `arm_cortex-a7_neon-vfpv4` | Older ARM routers |

## Install on OpenWrt 25.12 (apk)

SSH into your router and run:

```sh
# Add signing key
wget -qO /etc/apk/keys/engarde-apk.pem \
  https://porech.github.io/openwrt-engarde/engarde-apk.pem

# Add feed
ARCH=$(cat /etc/apk/arch)
echo "https://porech.github.io/openwrt-engarde/25.12/${ARCH}/packages.adb" \
  >> /etc/apk/repositories.d/customfeeds.list

# Install
apk update
apk add engarde-client luci-app-engarde
```

## Install on OpenWrt 24.10 (opkg)

```sh
# Add signing key
wget -qO /etc/opkg/keys/f59c896b325e81c9 \
  https://porech.github.io/openwrt-engarde/engarde-repo.pub

# Add feed
ARCH=$(. /etc/os-release; echo $OPENWRT_ARCH)
echo "src/gz engarde https://porech.github.io/openwrt-engarde/24.10/${ARCH}" \
  >> /etc/opkg/customfeeds.conf

# Install
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
