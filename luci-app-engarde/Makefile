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
