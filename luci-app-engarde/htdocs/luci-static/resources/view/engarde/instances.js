'use strict';
'require form';
'require uci';
'require view';
'require tools.widgets as widgets';

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('engarde'),
			uci.load('network')
		]);
	},

	render: function () {
		var m, s, o;

		m = new form.Map('engarde', _('Engarde'),
			_('Engarde creates a tunnel over multiple network connections, providing redundancy for WireGuard by duplicating packets across all available interfaces.'));

		// Global settings
		s = m.section(form.NamedSection, 'global', 'engarde', _('Global Settings'));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable Engarde'));
		o.default = '0';
		o.rmempty = false;

		// Instances
		s = m.section(form.TypedSection, 'instance', _('Instances'));
		s.addremove = true;
		s.anonymous = false;
		s.addbtntitle = _('Add instance');

		o = s.option(form.ListValue, 'type', _('Type'));
		o.value('client', _('Client'));
		o.value('server', _('Server'));
		o.rmempty = false;

		o = s.option(form.Flag, 'enabled', _('Enabled'));
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.Value, 'description', _('Description'),
			_('Display name for this instance'));
		o.optional = true;

		o = s.option(form.Value, 'listen_addr', _('Listen Address'));
		o.datatype = 'ipaddr';
		o.rmempty = false;

		o = s.option(form.Value, 'listen_port', _('Listen Port'));
		o.datatype = 'port';
		o.rmempty = false;

		o = s.option(form.Value, 'dst_addr', _('Destination Address'));
		o.datatype = 'host';
		o.rmempty = false;

		o = s.option(form.Value, 'dst_port', _('Destination Port'));
		o.datatype = 'port';
		o.rmempty = false;

		o = s.option(form.Value, 'write_timeout', _('Write Timeout'),
			_('Socket write timeout in milliseconds. Set to -1 to disable.'));
		o.datatype = 'integer';
		o.default = '10';
		o.optional = true;

		// Client-only: excluded interfaces
		o = s.option(widgets.DeviceSelect, 'excluded_interface', _('Excluded Interfaces'),
			_('Network interfaces to exclude from sending packets.'));
		o.multiple = true;
		o.noaliases = true;
		o.optional = true;
		o.depends('type', 'client');

		// Client-only: interface labels
		o = s.option(form.DynamicList, 'interface_label', _('Interface Labels'),
			_('Human-readable labels for network interfaces, shown in the status page and embedded dashboard. ' +
			  'Format: interface=label (e.g. mv0=Vodafone, mv1=TIM).'));
		o.optional = true;
		o.depends('type', 'client');
		o.placeholder = 'mv0=ISP Name';

		// Server-only: client timeout
		o = s.option(form.Value, 'client_timeout', _('Client Timeout'),
			_('Seconds of inactivity before a client is considered disconnected.'));
		o.datatype = 'uinteger';
		o.default = '30';
		o.optional = true;
		o.depends('type', 'server');

		// Web manager settings
		o = s.option(form.Value, 'webmanager_addr', _('Web Manager Address'),
			_('Bind address for the web manager. Defaults to 127.0.0.1.'));
		o.datatype = 'ipaddr';
		o.default = '127.0.0.1';
		o.optional = true;

		o = s.option(form.Value, 'webmanager_port', _('Web Manager Port'),
			_('Port for the web manager. Leave empty to disable.'));
		o.datatype = 'port';
		o.optional = true;

		o = s.option(form.Value, 'webmanager_username', _('Web Manager Username'));
		o.optional = true;

		o = s.option(form.Value, 'webmanager_password', _('Web Manager Password'));
		o.optional = true;
		o.password = true;

		// Destination overrides section
		s = m.section(form.TypedSection, 'dst_override', _('Destination Overrides'),
			_('Override the destination address for specific network interfaces (client instances only).'));
		s.addremove = true;
		s.anonymous = true;
		s.addbtntitle = _('Add override');

		o = s.option(form.Value, 'instance', _('Instance'),
			_('Name of the client instance this override applies to.'));
		o.rmempty = false;

		o = s.option(form.Value, 'interface', _('Interface'),
			_('Network interface name.'));
		o.rmempty = false;

		o = s.option(form.Value, 'dst_addr', _('Destination Address'));
		o.datatype = 'host';
		o.rmempty = false;

		o = s.option(form.Value, 'dst_port', _('Destination Port'));
		o.datatype = 'port';
		o.rmempty = false;

		return m.render();
	}
});
