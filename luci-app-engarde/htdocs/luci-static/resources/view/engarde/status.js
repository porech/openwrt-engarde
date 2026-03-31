'use strict';
'require view';
'require dom';
'require poll';
'require rpc';
'require uci';

var callGetStatus = rpc.declare({
	object: 'luci.engarde',
	method: 'get_status',
	params: ['instance']
});

var callListInstances = rpc.declare({
	object: 'luci.engarde',
	method: 'list_instances'
});

var callIncludeInterface = rpc.declare({
	object: 'luci.engarde',
	method: 'include_interface',
	params: ['instance', 'interface']
});

var callExcludeInterface = rpc.declare({
	object: 'luci.engarde',
	method: 'exclude_interface',
	params: ['instance', 'interface']
});

var callSwapExclusion = rpc.declare({
	object: 'luci.engarde',
	method: 'swap_exclusion',
	params: ['instance', 'interface']
});

var callResetExclusions = rpc.declare({
	object: 'luci.engarde',
	method: 'reset_exclusions',
	params: ['instance']
});

function renderLastPacket(last) {
	if (last === null || last === undefined)
		return E('em', {}, _('No data'));

	var cls = (last > 10) ? 'label warning' : '';
	return E('span', { 'class': cls }, last + 's');
}

function renderClientStatus(instanceName, data) {
	var interfaces = data.interfaces || [];

	var active = interfaces.filter(function (i) { return i.status === 'active'; });
	var idle = interfaces.filter(function (i) { return i.status === 'idle'; });
	var excluded = interfaces.filter(function (i) { return i.status === 'excluded'; });

	function makeIfaceRow(iface, actions) {
		var cells = [
			E('td', {}, iface.name),
			E('td', {}, iface.senderAddress || '-'),
			E('td', {}, iface.dstAddress || '-'),
			E('td', {}, renderLastPacket(iface.last))
		];

		if (actions) {
			cells.push(E('td', {}, actions));
		}

		return E('tr', {}, cells);
	}

	function makeTable(title, ifaces, actionFn) {
		if (ifaces.length === 0)
			return E('div', { 'class': 'cbi-section' }, [
				E('h4', {}, title),
				E('em', {}, _('None'))
			]);

		var headerCells = [
			E('th', {}, _('Interface')),
			E('th', {}, _('Address')),
			E('th', {}, _('Destination')),
			E('th', {}, _('Last Packet'))
		];

		if (actionFn)
			headerCells.push(E('th', {}, _('Actions')));

		return E('div', { 'class': 'cbi-section' }, [
			E('h4', {}, title),
			E('table', { 'class': 'table' }, [
				E('tr', { 'class': 'tr table-titles' }, headerCells)
			].concat(ifaces.map(function (iface) {
				return makeIfaceRow(iface, actionFn ? actionFn(iface) : null);
			})))
		]);
	}

	var resetBtn = E('button', {
		'class': 'btn',
		'click': function () {
			return callResetExclusions(instanceName).then(function () {
				poll.active() && poll.restart();
			});
		}
	}, _('Reset Exclusions'));

	return E('div', {}, [
		makeTable(_('Active Interfaces'), active, function (iface) {
			return E('button', {
				'class': 'btn cbi-button-remove',
				'click': function () {
					return callExcludeInterface(instanceName, iface.name).then(function () {
						poll.active() && poll.restart();
					});
				}
			}, _('Exclude'));
		}),
		makeTable(_('Idle Interfaces'), idle, function (iface) {
			return E('button', {
				'class': 'btn cbi-button-remove',
				'click': function () {
					return callExcludeInterface(instanceName, iface.name).then(function () {
						poll.active() && poll.restart();
					});
				}
			}, _('Exclude'));
		}),
		makeTable(_('Excluded Interfaces'), excluded, function (iface) {
			return E('button', {
				'class': 'btn cbi-button-action',
				'click': function () {
					return callIncludeInterface(instanceName, iface.name).then(function () {
						poll.active() && poll.restart();
					});
				}
			}, _('Include'));
		}),
		E('div', { 'class': 'cbi-section' }, [resetBtn])
	]);
}

function renderServerStatus(instanceName, data) {
	var sockets = data.sockets || [];

	if (sockets.length === 0)
		return E('div', { 'class': 'cbi-section' }, [
			E('em', {}, _('No connected clients'))
		]);

	return E('div', { 'class': 'cbi-section' }, [
		E('h4', {}, _('Connected Clients')),
		E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', {}, _('Address')),
				E('th', {}, _('Last Packet'))
			])
		].concat(sockets.map(function (sock) {
			return E('tr', {}, [
				E('td', {}, sock.address),
				E('td', {}, renderLastPacket(sock.last))
			]);
		})))
	]);
}

return view.extend({
	load: function () {
		return callListInstances();
	},

	render: function (listResult) {
		var instances = (listResult && listResult.instances) ? listResult.instances : [];

		var container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Engarde Status'))
		]);

		if (instances.length === 0) {
			container.appendChild(
				E('div', { 'class': 'cbi-section' },
					E('em', {}, _('No instances configured.')))
			);
			return container;
		}

		// Create a placeholder div for each instance
		var instanceDivs = {};
		instances.forEach(function (inst) {
			var div = E('div', { 'class': 'cbi-section', 'id': 'engarde-status-' + inst.name }, [
				E('h3', {}, inst.name + ' (' + inst.type + ')'),
				E('em', {}, inst.enabled ? _('Loading...') : _('Disabled'))
			]);
			container.appendChild(div);
			instanceDivs[inst.name] = { div: div, inst: inst };
		});

		// Poll each enabled instance with a web manager
		poll.add(function () {
			var promises = [];

			instances.forEach(function (inst) {
				if (!inst.enabled || !inst.has_webmanager) return;

				promises.push(
					callGetStatus(inst.name).then(function (data) {
						var div = instanceDivs[inst.name].div;
						var content;

						if (data && data.error) {
							content = E('div', { 'class': 'cbi-section' }, [
								E('h3', {}, inst.name + ' (' + inst.type + ')'),
								E('span', { 'class': 'label warning' }, _('Unavailable'))
							]);
						} else if (inst.type === 'client') {
							content = E('div', { 'class': 'cbi-section' }, [
								E('h3', {}, inst.name + ' (' + inst.type + ')'),
								renderClientStatus(inst.name, data)
							]);
						} else {
							content = E('div', { 'class': 'cbi-section' }, [
								E('h3', {}, inst.name + ' (' + inst.type + ')'),
								renderServerStatus(inst.name, data)
							]);
						}

						dom.content(div, Array.from(content.childNodes));
					}).catch(function () {
						var div = instanceDivs[inst.name].div;
						dom.content(div, [
							E('h3', {}, inst.name + ' (' + inst.type + ')'),
							E('span', { 'class': 'label warning' }, _('Unavailable'))
						]);
					})
				);
			});

			return Promise.all(promises);
		}, 2);

		return container;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
