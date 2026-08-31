Ext.ns('Classic', 'Classic.modules');

Classic.boot = window.CLASSIC_BOOT || {};
Classic.activeGroupId = Classic.boot.activeGroupId || '';
Classic.tabs = null;
Classic.statusText = null;

Classic.html = function (value) {
    return Ext.util.Format.htmlEncode(value === null || value === undefined ? '' : String(value));
};

Classic.date = function (value) {
    if (!value) return '';
    var text = String(value).replace('T', ' ');
    return text.length > 19 ? text.substr(0, 19) : text;
};

Classic.bytes = function (value) {
    var n = Number(value || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(1) + ' GB';
};

Classic.assetUrl = function (value) {
    var url = String(value || '');
    if (!url || /^(?:https?:)?\/\//i.test(url)) return url;
    return Classic.boot.assetBaseUrl ? Classic.boot.assetBaseUrl + '/' + url.replace(/^\/+/, '') : url;
};

Classic.setStatus = function (text) {
    if (Classic.statusText) Classic.statusText.setText(text || '就绪');
};

Classic.api = function (procedure, input, success, options) {
    options = options || {};
    Classic.setStatus(options.waitText || '正在处理请求...');
    Ext.Ajax.request({
        url: 'ajax.php',
        method: 'POST',
        jsonData: {procedure: procedure, input: input},
        timeout: options.timeout || 30000,
        callback: function (requestOptions, ok, response) {
            Classic.setStatus('就绪');
            var body;
            try { body = Ext.decode(response.responseText); } catch (ignore) { body = null; }
            if (!ok || !body || !body.success) {
                var message = body && body.message ? body.message : '服务器连接失败，请稍后重试。';
                if (response.status === 401) {
                    Ext.Msg.alert('会话失效', '登录状态已经失效，请重新登录。', function () { location.href = 'login.php'; });
                } else if (!options.silent) {
                    Ext.Msg.alert('操作未完成', Classic.html(message));
                }
                if (options.failure) options.failure(message, response);
                return;
            }
            if (success) success(body.data);
        }
    });
};

Classic.confirm = function (message, callback) {
    Ext.Msg.confirm('请确认', message, function (button) { if (button === 'yes') callback(); });
};

Classic.selected = function (grid, message) {
    var record = grid.getSelectionModel().getSelected();
    if (!record) Ext.Msg.alert('提示', message || '请先选择一条记录。');
    return record;
};

Classic.windowForm = function (config) {
    var form = new Ext.form.FormPanel({
        border: false,
        bodyStyle: 'padding:12px 14px 6px',
        labelWidth: config.labelWidth || 82,
        defaults: {anchor: '100%'},
        items: config.items
    });
    var winConfig = {
        title: config.title,
        iconCls: config.iconCls || 'icon-edit',
        width: config.width || 470,
        modal: true,
        resizable: config.resizable !== false,
        layout: 'fit',
        items: form,
        buttons: [{
            text: config.saveText || '保存', iconCls: 'icon-save',
            handler: function () {
                if (!form.getForm().isValid()) return;
                config.onSave(form.getForm().getValues(), win, form);
            }
        }, {text: '取消', handler: function () { win.close(); }}]
    };
    if (config.height) winConfig.height = config.height;
    else winConfig.autoHeight = true;
    var win = new Ext.Window(winConfig);
    win.show();
    return {window: win, form: form};
};

Classic.arrayStore = function (fields, idProperty) {
    return new Ext.data.JsonStore({fields: fields, idProperty: idProperty || 'id'});
};

Classic.loadArray = function (store, rows) {
    store.loadData(Ext.isArray(rows) ? rows : []);
};

Classic.openModule = function (id) {
    var existing = Classic.tabs.getComponent('tab-' + id);
    if (existing) { Classic.tabs.setActiveTab(existing); return; }
    if (!Classic.modules[id]) return;
    var panel = Classic.modules[id]();
    panel.id = 'tab-' + id;
    panel.closable = id !== 'dashboard';
    Classic.tabs.add(panel).show();
};

Classic.reloadActive = function () {
    var tab = Classic.tabs.getActiveTab();
    if (tab && tab.reloadModule) tab.reloadModule();
};

Classic.simpleTagManager = function (config) {
    var store = Classic.arrayStore(['id', 'name']);
    var grid = new Ext.grid.GridPanel({
        store: store,
        border: false,
        columns: [
            {header: '编号', dataIndex: 'id', width: 65},
            {header: '标签名称', dataIndex: 'name', width: 220}
        ],
        viewConfig: {forceFit: true},
        tbar: [{text: '新建标签', iconCls: 'icon-add', handler: function () {
            Ext.Msg.prompt('新建标签', '请输入标签名称：', function (button, text) {
                if (button !== 'ok' || !Ext.util.Format.trim(text)) return;
                Classic.api(config.prefix + '.createTag', {name: Ext.util.Format.trim(text)}, load);
            });
        }}, {text: '删除标签', iconCls: 'icon-delete', handler: function () {
            var record = Classic.selected(grid); if (!record) return;
            Classic.confirm('确定删除标签“' + Classic.html(record.get('name')) + '”吗？', function () {
                Classic.api(config.prefix + '.deleteTag', {id: Number(record.id)}, load);
            });
        }}, '-', {text: '刷新', iconCls: 'icon-refresh', handler: load}]
    });
    function load() { Classic.api(config.prefix + '.listTags', null, function (data) { Classic.loadArray(store, data); }); }
    var win = new Ext.Window({title: config.title || '标签管理', iconCls: 'icon-tag', width: 390, height: 330, modal: true, layout: 'fit', items: grid});
    win.show(); load();
};

Classic.assignTags = function (config) {
    Classic.api(config.prefix + '.listTags', null, function (tags) {
        var getInput = {}; getInput[config.ownerKey] = config.ownerId;
        Classic.api(config.prefix + '.' + config.getProcedure, getInput, function (selected) {
            var selectedIds = {}, checks = [];
            Ext.each(selected || [], function (tag) { selectedIds[String(tag.id)] = true; });
            Ext.each(tags || [], function (tag) { checks.push({boxLabel: tag.name, name: 'tag_' + tag.id, checked: !!selectedIds[String(tag.id)]}); });
            Classic.windowForm({
                title: config.title || '设置标签', width: 390,
                items: [{xtype: 'checkboxgroup', fieldLabel: '标签', columns: 2, items: checks}],
                onSave: function (values, win, form) {
                    var pending = 0;
                    var complete = function () { pending--; if (pending <= 0) { win.close(); if (config.onComplete) config.onComplete(); } };
                    Ext.each(tags || [], function (tag) {
                        var checked = !!form.getForm().findField('tag_' + tag.id).getValue();
                        if (checked !== !!selectedIds[String(tag.id)]) {
                            pending++;
                            var input = {tag_id: Number(tag.id)}; input[config.ownerKey] = config.ownerId;
                            Classic.api(config.prefix + '.' + (checked ? config.addProcedure : config.removeProcedure), input, complete);
                        }
                    });
                    if (!pending) win.close();
                }
            });
        });
    });
};
