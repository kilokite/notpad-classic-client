Ext.onReady(function () {
    Ext.BLANK_IMAGE_URL = 'assets/vendor/ext/resources/images/default/s.gif';
    Ext.QuickTips.init();
    Ext.Msg.buttonText.yes = '是'; Ext.Msg.buttonText.no = '否';

    var profile = Classic.boot.profile || {};
    var groupRows = [['', '个人工作区']];
    Ext.each(Classic.boot.groups || [], function (group) { groupRows.push([String(group.id), '群组：' + group.name]); });
    var workspace = new Ext.form.ComboBox({
        width: 190, mode: 'local', triggerAction: 'all', editable: false,
        store: groupRows, value: Classic.activeGroupId,
        listeners: {select: function (combo) {
            Classic.api('session.setGroup', {group_id: combo.getValue()}, function () { location.reload(); });
        }}
    });

    var header = new Ext.Panel({
        region: 'north', height: 80, border: false,
        html: '<div class="app-header"><div class="app-title"><strong>' + Classic.html(Classic.boot.appName || '资料管理系统') + '</strong><span>个人资料与协作信息管理平台</span></div>' +
            '<div class="app-user">欢迎您，<b>' + Classic.html(profile.name || profile.id || '') + '</b><br><a href="#" onclick="Classic.openModule(\'profile\');return false">个人资料</a><a href="logout.php">退出系统</a></div></div>',
        bbar: ['当前工作区：', workspace, '-', {text: '管理首页', iconCls: 'icon-home', handler: function () { Classic.openModule('dashboard'); }}, {text: '刷新当前页', iconCls: 'icon-refresh', handler: Classic.reloadActive}, '->', {xtype: 'tbtext', text: Classic.html(Classic.boot.today || '')}]
    });

    var tree = new Ext.tree.TreePanel({
        region: 'west', title: '功能导航', width: 205, minSize: 165, maxSize: 280, split: true,
        rootVisible: false, autoScroll: true, border: true,
        root: new Ext.tree.AsyncTreeNode({children: [
            {text: '管理首页', module: 'dashboard', iconCls: 'icon-home', leaf: true},
            {text: '资料管理', cls: 'nav-root', expanded: true, children: [
                {text: '笔记管理', module: 'notes', iconCls: 'icon-note', leaf: true},
                {text: '待办事项', module: 'todo', iconCls: 'icon-todo', leaf: true},
                {text: '书签管理', module: 'bookmarks', iconCls: 'icon-bookmark', leaf: true}
            ]},
            {text: '文件资料', cls: 'nav-root', expanded: true, children: [
                {text: '图片管理', module: 'images', iconCls: 'icon-image', leaf: true},
                {text: '文件管理', module: 'files', iconCls: 'icon-drive', leaf: true}
            ]},
            {text: '群组协作', cls: 'nav-root', expanded: true, children: [
                {text: '群组与成员', module: 'groups', iconCls: 'icon-group', leaf: true},
                {text: '群组交流', module: 'chat', iconCls: 'icon-chat', leaf: true}
            ]},
            {text: '系统管理', cls: 'nav-root', expanded: true, children: [
                {text: '个人资料', module: 'profile', iconCls: 'icon-user', leaf: true},
                {text: '登录设备', module: 'tokens', iconCls: 'icon-key', leaf: true},
                {text: '系统设置', module: 'settings', iconCls: 'icon-setting', leaf: true}
            ]}
        ]}),
        listeners: {click: function (node) { if (node.attributes.module) Classic.openModule(node.attributes.module); }}
    });

    var dashboard = Classic.modules.dashboard(); dashboard.itemId = 'tab-dashboard';
    Classic.tabs = new Ext.TabPanel({region: 'center', activeTab: 0, enableTabScroll: true, resizeTabs: true, minTabWidth: 95, items: [dashboard]});
    Classic.statusText = {
        setText: function (text) {
            var el = Ext.get('app-status-text');
            if (el) el.update(Classic.html(text || '就绪'));
        }
    };
    var status = new Ext.Panel({
        region: 'south', height: 24, border: false,
        html: '<div class="app-status"><span id="app-status-text">就绪</span><span class="app-status-right">TRPC 服务：由 PHP 网关连接&nbsp;&nbsp;|&nbsp;&nbsp;ExtJS 3 管理客户端</span></div>'
    });

    new Ext.Viewport({layout: 'border', items: [header, tree, Classic.tabs, status]});
    var mask = Ext.get('loading-mask'); if (mask) mask.fadeOut({remove: true, duration: 0.25});
    if (Classic.boot.bootError) Ext.Msg.alert('服务器提示', Classic.html(Classic.boot.bootError));
});
