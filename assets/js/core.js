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

Classic.normalizeAssetBase = function (value) {
    return String(value || '').replace(/\/+$/, '');
};

Classic.setAssetBaseUrl = function (value) {
    Classic.boot.assetBaseUrl = Classic.normalizeAssetBase(value);
};

Classic.assetUrl = function (value) {
    var url = String(value || '');
    if (!url || /^(?:https?:)?\/\//i.test(url)) return url;
    return Classic.boot.assetBaseUrl ? Classic.boot.assetBaseUrl + '/' + url.replace(/^\/+/, '') : url;
};

Classic.thumbUrl = function (value, width) {
    var url = Classic.assetUrl(value);
    if (!url) return '';
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + 'x-oss-process=image/resize,w_' + (width || 240);
};

Classic.applyCdnPrefix = function (settings) {
    var prefix = '';
    if (settings && settings.cdn_prefix) prefix = settings.cdn_prefix;
    else if (settings && settings.asset_base_url) prefix = settings.asset_base_url;
    else prefix = Classic.boot.assetBaseUrl || '';
    Classic.setAssetBaseUrl(prefix);
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

Classic.actionIcons = {
    preview: 'assets/icons/eye.png',
    edit: 'assets/icons/pencil.png',
    tags: 'assets/icons/tag.png',
    remove: 'assets/icons/cross.png',
    open: 'assets/icons/folder-open.png',
    rename: 'assets/icons/pencil.png',
    download: 'assets/icons/download.png',
    toggle: 'assets/icons/tick.png',
    members: 'assets/icons/users.png',
    switch: 'assets/icons/arrow-switch.png',
    leave: 'assets/icons/door-open-out.png',
    accept: 'assets/icons/tick.png',
    role: 'assets/icons/user--pencil.png',
    transfer: 'assets/icons/arrow-switch.png',
    revoke: 'assets/icons/cross.png'
};

Classic.actionHtml = function (actions) {
    var parts = [];
    Ext.each(actions || [], function (item) {
        var icon = item.icon || Classic.actionIcons[item.act];
        var img = icon ? '<img src="' + Classic.html(icon) + '" alt="">' : '';
        parts.push('<a href="#" class="row-act" data-act="' + Classic.html(item.act) + '">' + img + Classic.html(item.text) + '</a>');
    });
    return parts.join('<span class="row-act-sep">|</span>');
};

Classic.actionColumn = function (actions, width) {
    return {
        header: '操作',
        dataIndex: 'id',
        width: width || 180,
        sortable: false,
        menuDisabled: true,
        renderer: function (value, meta, record) {
            var list = Ext.isFunction(actions) ? actions(record) : actions;
            return Classic.actionHtml(list);
        }
    };
};

Classic.bindRowActions = function (grid, handlers, defaultAction) {
    grid.on('cellclick', function (g, rowIndex, colIndex, e) {
        var target = e.getTarget('a.row-act');
        if (!target) return;
        e.stopEvent();
        var act = target.getAttribute('data-act');
        var record = g.getStore().getAt(rowIndex);
        if (record && handlers[act]) handlers[act](record);
    });
    if (defaultAction) {
        grid.on('rowclick', function (g, rowIndex, e) {
            if (e && e.getTarget && e.getTarget('a.row-act')) return;
            var record = g.getStore().getAt(rowIndex);
            if (record) defaultAction(record);
        });
    }
};

Classic.openPage = function (id, title, iconCls, html) {
    var existing = Classic.tabs.getComponent(id);
    if (existing) {
        existing.setTitle(title);
        if (existing.body) existing.body.update(html);
        else existing.update(html);
        Classic.tabs.setActiveTab(existing);
        return existing;
    }
    var panel = new Ext.Panel({
        id: id,
        title: title,
        iconCls: iconCls || 'icon-info',
        closable: true,
        autoScroll: true,
        html: html
    });
    Classic.tabs.add(panel).show();
    return panel;
};

Classic.tagChips = function (tags) {
    if (!tags || !tags.length) return '<span class="muted">暂无标签</span>';
    var html = [];
    Ext.each(tags, function (tag) {
        html.push('<span class="preview-tag">' + Classic.html(tag.name || tag) + '</span>');
    });
    return html.join('');
};

Classic.openTagPreview = function (kind, tag) {
    var name = tag.get ? tag.get('name') : tag.name;
    var id = tag.get ? tag.id : tag.id;
    var tabId = 'page-tag-' + kind + '-' + id;
    var title = '标签：' + name;
    var loading = '<div class="preview-page"><h2>' + Classic.html(name) + '</h2><div class="muted">正在读取该标签下的内容...</div></div>';
    Classic.openPage(tabId, title, 'icon-tag', loading);
    function render(items) {
        var html = ['<div class="preview-page"><h2>' + Classic.html(name) + '</h2>'];
        if (!items || !items.length) html.push('<div class="muted">该标签下暂无内容。</div>');
        else {
            html.push('<ul class="preview-list">');
            Ext.each(items, function (item) { html.push('<li>' + Classic.html(item) + '</li>'); });
            html.push('</ul>');
        }
        html.push('</div>');
        Classic.openPage(tabId, title, 'icon-tag', html.join(''));
    }
    if (kind === 'note') {
        Classic.api('notepad.getNotes', {page: 0, tag_id: Number(id)}, function (rows) {
            render(Ext.map(rows || [], function (row) { return row.title || '未命名笔记'; }));
        });
        return;
    }
    if (kind === 'bookmark') {
        Classic.api('bookmark.list', {offset: 0, sort: 'time_desc', search: '', type: null, tag_id: Number(id)}, function (rows) {
            render(Ext.map(rows || [], function (row) { return row.title || '未命名书签'; }));
        });
        return;
    }
    Classic.api('image_bed.list', {
        user_id: String((Classic.boot.profile || {}).id || ''),
        offset: 0, sort: 'time_desc', search: '', tag_id: Number(id)
    }, function (rows) {
        render(Ext.map(rows || [], function (row) { return row.name || '未命名图片'; }));
    });
};

Classic.bindViewActions = function (view, handlers, defaultAction) {
    view.on('click', function (dv, index, node, e) {
        var record = dv.getStore().getAt(index);
        if (!record) return;
        var target = e.getTarget('a.row-act');
        if (target) {
            e.stopEvent();
            var act = target.getAttribute('data-act');
            if (handlers[act]) handlers[act](record);
            return;
        }
        if (defaultAction) defaultAction(record);
    });
};

Classic.estimateFormHeight = function (items) {
    var height = 118;
    Ext.each(items || [], function (item) {
        if (!item || item.xtype === 'hidden') return;
        if (item.xtype === 'textarea') {
            height += (Number(item.height) || 80) + 32;
            return;
        }
        if (item.xtype === 'checkboxgroup') {
            var count = item.items && item.items.length ? item.items.length : 1;
            var columns = Number(item.columns) || 1;
            height += Math.ceil(count / columns) * 24 + 40;
            return;
        }
        height += 48;
    });
    return Math.max(200, Math.min(height, 560));
};

Classic.windowForm = function (config) {
    var items = config.items || [];
    if (!items.length) {
        items = [{xtype: 'displayfield', hideLabel: true, value: '<span class="muted">暂无内容</span>'}];
    }
    var form = new Ext.form.FormPanel({
        border: false,
        bodyStyle: 'padding:12px 14px 8px',
        labelWidth: config.labelWidth || 82,
        defaults: {anchor: '100%'},
        autoScroll: true,
        items: items
    });
    var win = new Ext.Window({
        title: config.title,
        iconCls: config.iconCls || 'icon-edit',
        width: config.width || 470,
        height: config.height || Classic.estimateFormHeight(items),
        minHeight: 180,
        modal: true,
        constrain: true,
        resizable: config.resizable !== false,
        layout: 'fit',
        items: form,
        buttons: [{
            text: config.saveText || '保存', iconCls: 'icon-save',
            handler: function () {
                if (!form.getForm().isValid()) return;
                config.onSave(form.getForm().getValues(), win, form);
            }
        }, {text: '取消', iconCls: 'icon-close', handler: function () { win.close(); }}]
    });
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
            {header: '标签名称', dataIndex: 'name', width: 160},
            Classic.actionColumn([{act: 'preview', text: '预览'}, {act: 'remove', text: '删除'}], 140)
        ],
        viewConfig: {forceFit: true},
        tbar: [{text: '新建标签', iconCls: 'icon-add', handler: function () {
            Ext.Msg.prompt('新建标签', '请输入标签名称：', function (button, text) {
                if (button !== 'ok' || !Ext.util.Format.trim(text)) return;
                Classic.api(config.prefix + '.createTag', {name: Ext.util.Format.trim(text)}, load);
            });
        }}, {text: '刷新', iconCls: 'icon-refresh', handler: load}]
    });
    Classic.bindRowActions(grid, {
        preview: function (record) {
            if (config.onPreview) config.onPreview(record);
        },
        remove: function (record) {
            Classic.confirm('确定删除标签“' + Classic.html(record.get('name')) + '”吗？', function () {
                Classic.api(config.prefix + '.deleteTag', {id: Number(record.id)}, load);
            });
        }
    }, function (record) {
        if (config.onPreview) config.onPreview(record);
    });
    function load() { Classic.api(config.prefix + '.listTags', null, function (data) { Classic.loadArray(store, data); }); }
    var win = new Ext.Window({
        title: config.title || '标签管理', iconCls: 'icon-tag', width: 390, height: 330, modal: true, layout: 'fit', items: grid,
        listeners: {close: function () { if (config.onClose) config.onClose(); }}
    });
    win.show(); load();
};

Classic.tagFilterCombo = function (prefix, onChange) {
    var store = new Ext.data.ArrayStore({fields: ['id', 'name']});
    var combo = new Ext.form.ComboBox({
        width: 140, mode: 'local', triggerAction: 'all', editable: false,
        valueField: 'id', displayField: 'name', store: store, value: '0'
    });
    combo.reloadTags = function () {
        Classic.api(prefix + '.listTags', null, function (data) {
            var rows = [['0', '全部标签']];
            Ext.each(data || [], function (tag) { rows.push([String(tag.id), tag.name]); });
            store.loadData(rows);
            if (!combo.getValue()) combo.setValue('0');
        }, {silent: true});
    };
    combo.getTagId = function () {
        var value = combo.getValue();
        return value && value !== '0' ? Number(value) : null;
    };
    if (onChange) combo.on('select', onChange);
    combo.reloadTags();
    return combo;
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
                items: checks.length
                    ? [{xtype: 'checkboxgroup', fieldLabel: '标签', columns: 2, items: checks}]
                    : [{xtype: 'displayfield', hideLabel: true, value: '<span class="muted">暂无标签，请先在标签管理中创建。</span>'}],
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
