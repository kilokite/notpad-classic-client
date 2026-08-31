(function () {
    var roleNames = {owner: '所有者', admin: '管理员', editor: '编辑成员', viewer: '只读成员'};

    Classic.modules.groups = function () {
        var store = Classic.arrayStore(['id', 'name', 'description', 'role', 'owner_id', 'created_at']);
        var grid = new Ext.grid.GridPanel({
            title: '群组管理', iconCls: 'icon-group', store: store, stripeRows: true,
            columns: [
                {header: '群组名称', dataIndex: 'name', width: 260, renderer: function (v) { return '<span class="grid-link">' + Classic.html(v) + '</span>'; }},
                {header: '我的角色', dataIndex: 'role', width: 100, renderer: function (v) { return roleNames[v] || v; }},
                {header: '说明', dataIndex: 'description', width: 420, renderer: Classic.html},
                {header: '建立时间', dataIndex: 'created_at', width: 145, renderer: Classic.date}
            ],
            viewConfig: {forceFit: true, emptyText: '尚未加入任何群组'},
            tbar: [
                {text: '新建群组', iconCls: 'icon-add', handler: function () { editGroup(); }},
                {text: '修改资料', iconCls: 'icon-edit', handler: function () { var r = Classic.selected(grid); if (r) editGroup(r); }},
                {text: '成员和邀请', iconCls: 'icon-user', handler: manageGroup},
                {text: '切换到此群组', icon: 'assets/icons/arrow-switch.png', handler: switchGroup}, '-',
                {text: '接受邀请码', iconCls: 'icon-key', handler: acceptCode},
                {text: '我的邀请', icon: 'assets/icons/mail.png', handler: showMyInvites}, '-',
                {text: '退出/删除群组', iconCls: 'icon-delete', handler: leaveOrDelete},
                '->', {text: '刷新', iconCls: 'icon-refresh', handler: load}
            ],
            listeners: {rowdblclick: manageGroup}
        });
        function load() { Classic.api('group.list', null, function (data) { Classic.loadArray(store, data); Classic.boot.groups = data || []; }); }
        function editGroup(record) {
            Classic.windowForm({title: record ? '修改群组资料' : '新建群组', width: 510, items: [
                {xtype: 'textfield', fieldLabel: '群组名称', name: 'name', allowBlank: false, value: record ? record.get('name') : ''},
                {xtype: 'textarea', fieldLabel: '群组说明', name: 'description', height: 110, value: record ? record.get('description') : ''}
            ], onSave: function (values, win) { if (record) values.groupId = String(record.id); Classic.api(record ? 'group.update' : 'group.create', values, function () { win.close(); load(); }); }});
        }
        function switchGroup() { var r = Classic.selected(grid); if (!r) return; Classic.api('session.setGroup', {group_id: String(r.id)}, function () { location.reload(); }); }
        function acceptCode() { Ext.Msg.prompt('接受群组邀请', '请输入邀请代码：', function (b, text) { if (b === 'ok' && text) Classic.api('group.acceptInvite', {inviteCode: text}, function () { Ext.Msg.alert('提示', '已加入群组。'); load(); }); }); }
        function showMyInvites() {
            Classic.api('group.myInvites', null, function (rows) {
                var inviteStore = Classic.arrayStore(['id', 'group_id', 'group_name', 'role', 'created_at']); Classic.loadArray(inviteStore, rows);
                var inviteGrid = new Ext.grid.GridPanel({store: inviteStore, border: false, columns: [
                    {header: '群组', dataIndex: 'group_name', width: 180, renderer: function (v, m, r) { return Classic.html(v || r.get('group_id')); }},
                    {header: '邀请角色', dataIndex: 'role', width: 100, renderer: function (v) { return roleNames[v] || v; }},
                    {header: '邀请时间', dataIndex: 'created_at', width: 140, renderer: Classic.date}
                ], viewConfig: {forceFit: true, emptyText: '没有待处理邀请'}});
                var win = new Ext.Window({title: '我的群组邀请', icon: 'assets/icons/mail.png', width: 520, height: 300, modal: true, layout: 'fit', items: inviteGrid, buttons: [{text: '接受邀请', handler: function () { var r = Classic.selected(inviteGrid); if (!r) return; Classic.api('group.acceptInvite', {inviteId: String(r.id)}, function () { win.close(); load(); }); }}, {text: '关闭', handler: function () { win.close(); }}]}); win.show();
            });
        }
        function leaveOrDelete() {
            var r = Classic.selected(grid); if (!r) return;
            if (r.get('role') === 'owner') {
                Classic.confirm('您是群组所有者。确定永久删除群组“' + Classic.html(r.get('name')) + '”及其全部资料吗？', function () { Classic.api('group.delete', String(r.id), load); });
            } else {
                Classic.confirm('确定退出群组“' + Classic.html(r.get('name')) + '”吗？', function () { Classic.api('group.leave', String(r.id), load); });
            }
        }
        function manageGroup() {
            var group = Classic.selected(grid); if (!group) return;
            var memberStore = Classic.arrayStore(['user_id', 'id', 'name', 'email', 'role', 'joined_at'], 'user_id');
            var inviteStore = Classic.arrayStore(['id', 'invited_user_id', 'user_id', 'role', 'invite_code', 'expires_at', 'created_at']);
            var codeStore = Classic.arrayStore(['id', 'invite_code', 'role', 'expires_at', 'created_at']);
            var memberGrid = new Ext.grid.GridPanel({title: '成员列表', store: memberStore, stripeRows: true, columns: [
                {header: '用户ID', dataIndex: 'user_id', width: 130, renderer: function (v, m, r) { return Classic.html(v || r.get('id')); }},
                {header: '姓名', dataIndex: 'name', width: 130},
                {header: '邮箱', dataIndex: 'email', width: 190},
                {header: '角色', dataIndex: 'role', width: 100, renderer: function (v) { return roleNames[v] || v; }},
                {header: '加入时间', dataIndex: 'joined_at', width: 140, renderer: Classic.date}
            ], viewConfig: {forceFit: true}, tbar: [
                {text: '邀请用户', iconCls: 'icon-add', handler: inviteUser},
                {text: '修改角色', iconCls: 'icon-edit', handler: changeRole},
                {text: '移除成员', iconCls: 'icon-delete', handler: removeMember},
                {text: '转让所有权', icon: 'assets/icons/arrow-switch.png', handler: transferOwner}, '->',
                {text: '刷新', iconCls: 'icon-refresh', handler: loadMembers}
            ]});
            var inviteGrid = new Ext.grid.GridPanel({title: '直接邀请', store: inviteStore, stripeRows: true, columns: [
                {header: '受邀用户', dataIndex: 'invited_user_id', width: 180, renderer: function (v, m, r) { return Classic.html(v || r.get('user_id')); }},
                {header: '角色', dataIndex: 'role', width: 100, renderer: function (v) { return roleNames[v] || v; }},
                {header: '建立时间', dataIndex: 'created_at', width: 140, renderer: Classic.date},
                {header: '到期时间', dataIndex: 'expires_at', width: 140, renderer: Classic.date}
            ], viewConfig: {forceFit: true}, tbar: [{text: '撤销邀请', iconCls: 'icon-delete', handler: function () { var r = Classic.selected(inviteGrid); if (r) Classic.api('group.removeInvite', String(r.id), loadInvites); }}, '->', {text: '刷新', iconCls: 'icon-refresh', handler: loadInvites}]});
            var codeGrid = new Ext.grid.GridPanel({title: '邀请链接', store: codeStore, stripeRows: true, columns: [
                {header: '邀请码', dataIndex: 'invite_code', width: 260},
                {header: '角色', dataIndex: 'role', width: 100, renderer: function (v) { return roleNames[v] || v; }},
                {header: '到期时间', dataIndex: 'expires_at', width: 150, renderer: function (v) { return v ? Classic.date(v) : '长期有效'; }}
            ], viewConfig: {forceFit: true}, tbar: [{text: '生成邀请码', iconCls: 'icon-add', handler: createCode}, {text: '撤销邀请码', iconCls: 'icon-delete', handler: function () { var r = Classic.selected(codeGrid); if (r) Classic.api('group.removeInvite', String(r.id), loadCodes); }}, '->', {text: '刷新', iconCls: 'icon-refresh', handler: loadCodes}]});
            var tabs = new Ext.TabPanel({activeTab: 0, border: false, items: [memberGrid, inviteGrid, codeGrid]});
            var win = new Ext.Window({title: '成员和邀请 - ' + group.get('name'), iconCls: 'icon-group', width: 780, height: 480, modal: true, layout: 'fit', items: tabs}); win.show(); loadMembers(); loadInvites(); loadCodes();
            function loadMembers() { Classic.api('group.listMembers', String(group.id), function (data) { Classic.loadArray(memberStore, data); }); }
            function loadInvites() { Classic.api('group.listPendingInvites', String(group.id), function (data) { Classic.loadArray(inviteStore, data); }, {silent: true}); }
            function loadCodes() { Classic.api('group.listInviteCodes', String(group.id), function (data) { Classic.loadArray(codeStore, data); }, {silent: true}); }
            function roleCombo(value) { return {xtype: 'combo', fieldLabel: '成员角色', name: 'role', hiddenName: 'role', mode: 'local', triggerAction: 'all', editable: false, allowBlank: false, value: value || 'editor', store: [['admin', '管理员'], ['editor', '编辑成员'], ['viewer', '只读成员']]}; }
            function inviteUser() { Classic.windowForm({title: '邀请用户加入群组', width: 400, items: [{xtype: 'textfield', fieldLabel: '用户ID', name: 'userId', allowBlank: false}, roleCombo('editor')], onSave: function (v, w) { v.groupId = String(group.id); Classic.api('group.inviteUser', v, function () { w.close(); loadInvites(); }); }}); }
            function changeRole() { var r = Classic.selected(memberGrid); if (!r || r.get('role') === 'owner') return; Classic.windowForm({title: '修改成员角色', width: 380, items: [roleCombo(r.get('role'))], onSave: function (v, w) { v.groupId = String(group.id); v.userId = String(r.get('user_id') || r.get('id')); Classic.api('group.updateMemberRole', v, function () { w.close(); loadMembers(); }); }}); }
            function removeMember() { var r = Classic.selected(memberGrid); if (!r) return; Classic.confirm('确定将该成员移出群组吗？', function () { Classic.api('group.removeMember', {groupId: String(group.id), userId: String(r.get('user_id') || r.get('id'))}, loadMembers); }); }
            function transferOwner() { var r = Classic.selected(memberGrid); if (!r) return; Classic.confirm('转让后您将变为管理员。确定继续吗？', function () { Classic.api('group.transferOwnership', {groupId: String(group.id), newOwnerId: String(r.get('user_id') || r.get('id'))}, function () { win.close(); load(); }); }); }
            function createCode() { Classic.windowForm({title: '生成群组邀请码', width: 400, items: [roleCombo('editor'), {xtype: 'numberfield', fieldLabel: '有效小时', name: 'expiresInHours', allowDecimals: false, allowNegative: false, emptyText: '留空表示长期有效'}], onSave: function (v, w) { v.groupId = String(group.id); v.expiresInHours = v.expiresInHours ? Number(v.expiresInHours) : null; Classic.api('group.createInviteLink', v, function (data) { w.close(); loadCodes(); Ext.Msg.alert('邀请码', '请将以下邀请码交给对方：<br><br><b>' + Classic.html(data.invite_code || '') + '</b>'); }); }}); }
        }
        grid.reloadModule = load; grid.on('afterrender', load, grid, {single: true}); return grid;
    };

    Classic.modules.chat = function () {
        var groupRows = [], groupData = Classic.boot.groups || [];
        Ext.each(groupData, function (g) { groupRows.push([String(g.id), g.name]); });
        var groupCombo = new Ext.form.ComboBox({width: 190, mode: 'local', triggerAction: 'all', editable: false, store: groupRows, value: Classic.activeGroupId || (groupRows.length ? groupRows[0][0] : '')});
        var messages = [], messageBox = new Ext.Panel({region: 'center', autoScroll: true, bodyCssClass: 'chat-list', html: '<span class="muted">请选择群组并刷新消息。</span>'});
        var input = new Ext.form.TextArea({region: 'center', height: 58, emptyText: '请输入消息内容...'});
        var sendPanel = new Ext.Panel({region: 'south', height: 88, split: false, layout: 'border', bodyStyle: 'padding:6px', items: [input, {region: 'east', xtype: 'button', width: 82, text: '发送消息', icon: 'assets/icons/balloon--plus.png', handler: send}]});
        var panel = new Ext.Panel({title: '群组交流', iconCls: 'icon-chat', layout: 'border', tbar: ['选择群组：', groupCombo, {text: '刷新消息', iconCls: 'icon-refresh', handler: load}, '-', {xtype: 'tbtext', text: '消息按时间顺序显示'}], items: [messageBox, sendPanel]});
        function render() { var html = []; Ext.each(messages, function (m) { html.push('<div class="chat-line"><span class="chat-name">' + Classic.html(m.user_name || m.user_id) + '</span><span class="chat-meta">' + Classic.html(Classic.date(m.created_at)) + '</span><div class="chat-content">' + Classic.html(m.content) + '</div></div>'); }); messageBox.body.update(html.length ? html.join('') : '<span class="muted">暂无消息。</span>'); messageBox.body.dom.scrollTop = messageBox.body.dom.scrollHeight; }
        function load() { var gid = groupCombo.getValue(); if (!gid) { Ext.Msg.alert('提示', '当前没有可用群组。'); return; } Classic.api('groupChat.list', {groupId: gid, beforeId: null, limit: 100}, function (data) { messages = data || []; render(); }); }
        function send() { var gid = groupCombo.getValue(), text = Ext.util.Format.trim(input.getValue()); if (!gid || !text) return; Classic.api('groupChat.send', {groupId: gid, content: text}, function (data) { messages.push(data); input.setValue(''); render(); }); }
        panel.reloadModule = load; panel.on('afterrender', function () { if (groupCombo.getValue()) load(); }, panel, {single: true}); return panel;
    };

    Classic.modules.profile = function () {
        var p = Classic.boot.profile || {};
        var form = new Ext.form.FormPanel({title: '个人资料', iconCls: 'icon-user', bodyStyle: 'padding:18px', labelWidth: 100, width: 620, defaults: {width: 330}, items: [
            {xtype: 'displayfield', fieldLabel: '用户ID', value: Classic.html(p.id || '')},
            {xtype: 'textfield', fieldLabel: '显示名称', name: 'name', allowBlank: false, value: p.name || ''},
            {xtype: 'textfield', fieldLabel: '电子邮箱', name: 'email', allowBlank: false, vtype: 'email', value: p.email || ''},
            {xtype: 'textfield', fieldLabel: '修改密码', name: 'password', inputType: 'password', minLength: 6},
            {xtype: 'displayfield', fieldLabel: '密码说明', value: '<span class="muted">不修改密码请保持为空。</span>'}
        ], buttons: [{text: '保存资料', iconCls: 'icon-save', handler: function () { if (!form.getForm().isValid()) return; var v = form.getForm().getValues(); Classic.api('auth.updateProfile', v, function (data) { Classic.boot.profile = data.user || Classic.boot.profile; Ext.Msg.alert('提示', '个人资料已保存。'); }); }}]});
        return new Ext.Panel({title: '个人资料', iconCls: 'icon-user', autoScroll: true, bodyStyle: 'padding:15px;background:#fff', items: form});
    };

    Classic.modules.tokens = function () {
        var store = Classic.arrayStore(['token', 'created_at', 'used_at', 'user_agent', 'alias'], 'token');
        var grid = new Ext.grid.GridPanel({title: '登录设备', iconCls: 'icon-key', store: store, stripeRows: true, columns: [
            {header: '设备名称', dataIndex: 'alias', width: 150, renderer: function (v) { return Classic.html(v || '未命名设备'); }},
            {header: '浏览器/设备信息', dataIndex: 'user_agent', width: 390, renderer: Classic.html},
            {header: '建立时间', dataIndex: 'created_at', width: 145, renderer: Classic.date},
            {header: '最近使用', dataIndex: 'used_at', width: 145, renderer: Classic.date},
            {header: 'Token 摘要', dataIndex: 'token', width: 150, renderer: function (v) { return Classic.html(String(v).substr(0, 12) + '...'); }}
        ], viewConfig: {forceFit: true, emptyText: '没有登录设备记录'}, tbar: [
            {text: '设备命名', iconCls: 'icon-edit', handler: rename},
            {text: '注销设备', iconCls: 'icon-delete', handler: revoke}, '->',
            {text: '刷新', iconCls: 'icon-refresh', handler: load}
        ]});
        function load() { Classic.api('auth.getTokens', null, function (data) { Classic.loadArray(store, data); }); }
        function rename() { var r = Classic.selected(grid); if (!r) return; Ext.Msg.prompt('设备命名', '请输入便于识别的设备名称：', function (b, text) { if (b === 'ok') Classic.api('auth.setTokenAlias', {tokenHash: String(r.id), alias: text}, load); }, null, false, r.get('alias')); }
        function revoke() { var r = Classic.selected(grid); if (!r) return; Classic.confirm('注销后该设备需要重新登录，是否继续？', function () { Classic.api('auth.revokeToken', {tokenHash: String(r.id)}, load); }); }
        grid.reloadModule = load; grid.on('afterrender', load, grid, {single: true}); return grid;
    };

    Classic.modules.settings = function () {
        var store = Classic.arrayStore(['key', 'value'], 'key');
        var cdnField = new Ext.form.TextField({
            fieldLabel: '图片 CDN 前缀', name: 'cdn_prefix', anchor: '100%',
            emptyText: '例如 https://cdn.example.com',
            value: Classic.boot.assetBaseUrl || ''
        });
        var cdnForm = new Ext.form.FormPanel({
            region: 'north', height: 92, border: false, bodyStyle: 'padding:10px 14px 0', labelWidth: 100,
            items: [cdnField],
            buttons: [{text: '保存 CDN 前缀', iconCls: 'icon-save', handler: function () {
                var value = Ext.util.Format.trim(cdnField.getValue() || '');
                Classic.api('setting.set', {key: 'cdn_prefix', value: value}, function () {
                    Classic.setAssetBaseUrl(value);
                    Ext.Msg.alert('提示', '图片 CDN 前缀已保存，缩略图和大图将立即使用新地址。');
                    load();
                });
            }}]
        });
        var grid = new Ext.grid.GridPanel({
            region: 'center', title: '全部设置项', store: store, stripeRows: true,
            columns: [
                {header: '设置项', dataIndex: 'key', width: 240},
                {header: '设置值', dataIndex: 'value', width: 560, renderer: Classic.html}
            ],
            viewConfig: {forceFit: true, emptyText: '暂无自定义设置'},
            tbar: [
                {text: '新增设置', iconCls: 'icon-add', handler: function () { edit(); }},
                {text: '修改', iconCls: 'icon-edit', handler: function () { var r = Classic.selected(grid); if (r) edit(r); }},
                {text: '删除', iconCls: 'icon-delete', handler: remove}, '-',
                {text: '重新统计资料', icon: 'assets/icons/sum.png', handler: function () {
                    Classic.confirm('重新统计可能需要一些时间，确定继续吗？', function () {
                        Classic.api('setting.recalculateStats', null, function (data) {
                            Classic.boot.stats = data || {};
                            Ext.Msg.alert('提示', '资料统计已经更新。');
                        });
                    });
                }},
                '->', {text: '刷新', iconCls: 'icon-refresh', handler: load}
            ]
        });
        var panel = new Ext.Panel({title: '系统设置', iconCls: 'icon-setting', layout: 'border', items: [cdnForm, grid]});
        function load() {
            Classic.api('setting.getAll', null, function (data) {
                var rows = [];
                if (Ext.isArray(data)) rows = data;
                else Ext.iterate(data || {}, function (key, value) { rows.push({key: key, value: value}); });
                Classic.loadArray(store, rows);
                Classic.applyCdnPrefix(data || {});
                cdnField.setValue(Classic.boot.assetBaseUrl || '');
            });
        }
        function edit(record) { Classic.windowForm({title: record ? '修改设置' : '新增设置', width: 500, items: [
            {xtype: 'textfield', fieldLabel: '设置项', name: 'key', allowBlank: false, readOnly: !!record, value: record ? record.get('key') : ''},
            {xtype: 'textarea', fieldLabel: '设置值', name: 'value', height: 100, value: record ? record.get('value') : ''}
        ], onSave: function (v, w) { Classic.api('setting.set', v, function () { w.close(); load(); }); }}); }
        function remove() { var r = Classic.selected(grid); if (!r) return; Classic.confirm('确定删除设置项“' + Classic.html(r.id) + '”吗？', function () { Classic.api('setting.remove', {key: String(r.id)}, load); }); }
        panel.reloadModule = load; panel.on('afterrender', load, panel, {single: true}); return panel;
    };
}());
