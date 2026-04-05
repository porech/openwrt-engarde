include $(TOPDIR)/rules.mk

PKG_NAME:=engarde
PKG_VERSION:=2.0.0
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/porech/engarde.git
PKG_SOURCE_VERSION:=HEAD
PKG_MIRROR_HASH:=skip

PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=Alessandro Rinaldi <engarde@example.com>

PKG_BUILD_DEPENDS:=golang/host
PKG_BUILD_PARALLEL:=1

GO_PKG:=github.com/porech/engarde/v2

include $(INCLUDE_DIR)/package.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-package.mk

define Package/engarde/Default
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=VPN
  TITLE:=Engarde - WireGuard redundancy tunnel
  URL:=https://engarde.linuxzogno.org
  DEPENDS:=$(GO_ARCH_DEPENDS)
endef

define Package/engarde-client
  $(call Package/engarde/Default)
  TITLE+= (client)
endef

define Package/engarde-server
  $(call Package/engarde/Default)
  TITLE+= (server)
  DEPENDS+= +engarde-client
endef

define Package/engarde-client/description
  Engarde client creates a tunnel over multiple network connections,
  providing redundancy for WireGuard by sending packets through all
  available interfaces simultaneously.
endef

define Package/engarde-server/description
  Engarde server receives tunneled packets from engarde clients and
  forwards them to the local WireGuard instance, providing redundancy
  for WireGuard connections.
endef

GO_PKG_LDFLAGS:=-s -w
GO_PKG_VARS+=CGO_ENABLED=0
GO_PKG_ENABLE_PIE:=0

define Build/Compile
	# Inject pre-built frontend assets if available (CI provides them)
	if [ -d "$(TOPDIR)/frontend-assets" ]; then \
		mkdir -p $(PKG_BUILD_DIR)/internal/assets/browser && \
		$(CP) $(TOPDIR)/frontend-assets/* $(PKG_BUILD_DIR)/internal/assets/browser/; \
	fi
	$(call GoPackage/Build/Compile)
endef

define Package/engarde-client/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(GO_PKG_BUILD_BIN_DIR)/engarde-client $(1)/usr/bin/engarde-client

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/engarde.config $(1)/etc/config/engarde

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/engarde.init $(1)/etc/init.d/engarde

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_DATA) ./files/engarde.defaults $(1)/etc/uci-defaults/99-engarde
endef

define Package/engarde-server/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(GO_PKG_BUILD_BIN_DIR)/engarde-server $(1)/usr/bin/engarde-server
endef

$(eval $(call GoBinPackage,engarde-client))
$(eval $(call BuildPackage,engarde-client))
$(eval $(call GoBinPackage,engarde-server))
$(eval $(call BuildPackage,engarde-server))
