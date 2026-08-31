<?php
require __DIR__ . '/lib/bootstrap.php';

if (current_token() !== '') {
    header('Location: index.php');
    exit;
}

$message = '';
$messageType = 'error';
$activeTab = isset($_POST['mode']) && $_POST['mode'] === 'register' ? 1 : 0;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if ($activeTab === 1) {
            $result = trpc_mutation('auth.register', array(
                'user_id' => trim(isset($_POST['user_id']) ? $_POST['user_id'] : ''),
                'name' => trim(isset($_POST['name']) ? $_POST['name'] : ''),
                'email' => trim(isset($_POST['email']) ? $_POST['email'] : ''),
                'password' => isset($_POST['password']) ? $_POST['password'] : '',
            ));
        } else {
            $result = trpc_mutation('auth.login', array(
                'username' => trim(isset($_POST['username']) ? $_POST['username'] : ''),
                'password' => isset($_POST['password']) ? $_POST['password'] : '',
            ));
        }

        if (!empty($result['success']) && !empty($result['token'])) {
            session_regenerate_id(true);
            $_SESSION['token'] = $result['token'];
            $_SESSION['user'] = isset($result['user']) ? $result['user'] : array();
            header('Location: index.php');
            exit;
        }
        $message = isset($result['message']) ? $result['message'] : '登录失败';
    } catch (Throwable $e) {
        $message = $e->getMessage();
    }
}
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <title><?php echo htmlspecialchars(page_title('用户登录'), ENT_QUOTES, 'UTF-8'); ?></title>
    <link rel="stylesheet" href="assets/vendor/ext/resources/css/ext-all.css">
    <link rel="stylesheet" href="assets/css/classic.css">
    <script src="assets/vendor/ext/adapter/ext/ext-base.js"></script>
    <script src="assets/vendor/ext/ext-all.js"></script>
    <script src="assets/vendor/ext/src/locale/ext-lang-zh_CN.js"></script>
</head>
<body class="auth-body">
<div id="auth-header">
    <div class="auth-brand"><?php echo htmlspecialchars($config['app_name'], ENT_QUOTES, 'UTF-8'); ?></div>
    <div class="auth-subtitle">集中管理您的笔记、文件和协作资料</div>
</div>
<div id="auth-panel"></div>
<div class="auth-footer">建议使用 1024×768 或更高分辨率访问本系统</div>
<script>
Ext.onReady(function () {
    Ext.QuickTips.init();
    var serverMessage = <?php echo json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    var tabs = new Ext.TabPanel({
        activeTab: <?php echo (int) $activeTab; ?>,
        border: false,
        deferredRender: false,
        items: [{
            title: '用户登录',
            layout: 'form',
            bodyStyle: 'padding:22px 30px 12px',
            labelWidth: 82,
            defaults: {anchor: '100%', allowBlank: false},
            items: [
                {xtype: 'textfield', fieldLabel: '用户ID/邮箱', name: 'username', value: <?php echo json_encode(isset($_POST['username']) ? $_POST['username'] : '', JSON_UNESCAPED_UNICODE); ?>},
                {xtype: 'textfield', fieldLabel: '登录密码', name: 'password', inputType: 'password'}
            ]
        }, {
            title: '新用户注册',
            layout: 'form',
            bodyStyle: 'padding:16px 30px 8px',
            labelWidth: 82,
            defaults: {anchor: '100%', allowBlank: false},
            items: [
                {xtype: 'textfield', fieldLabel: '用户ID', name: 'user_id'},
                {xtype: 'textfield', fieldLabel: '显示名称', name: 'name'},
                {xtype: 'textfield', fieldLabel: '电子邮箱', name: 'email', vtype: 'email'},
                {xtype: 'textfield', fieldLabel: '登录密码', name: 'password', inputType: 'password', minLength: 6}
            ]
        }],
        listeners: {
            tabchange: function (panel, tab) {
                Ext.get('auth-mode').dom.value = panel.items.indexOf(tab) === 1 ? 'register' : 'login';
                submitButton.setText(panel.items.indexOf(tab) === 1 ? '注册并登录' : '登 录');
            }
        }
    });
    var submitButton = new Ext.Button({
        text: <?php echo $activeTab === 1 ? "'注册并登录'" : "'登 录'"; ?>,
        icon: 'assets/icons/key.png',
        handler: function () {
            var active = tabs.getActiveTab();
            var values = {};
            active.items.each(function (field) {
                var name = field.getName ? field.getName() : field.name;
                if (name) values[name] = field.getValue();
            });
            var valid = true;
            active.items.each(function (field) { if (!field.validate()) valid = false; });
            if (!valid) return;
            var form = Ext.get('auth-real-form').dom;
            while (form.firstChild) form.removeChild(form.firstChild);
            values.mode = tabs.items.indexOf(active) === 1 ? 'register' : 'login';
            Ext.iterate(values, function (name, value) {
                var input = document.createElement('input');
                input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input);
            });
            form.submit();
        }
    });
    new Ext.Panel({
        renderTo: 'auth-panel', width: 430, height: 320, layout: 'fit', title: '系统登录', iconCls: 'icon-lock',
        items: [tabs], buttons: [submitButton],
        listeners: {afterrender: function () { tabs.getActiveTab().items.itemAt(0).focus(false, 200); }}
    });
    if (serverMessage) Ext.Msg.alert('提示', serverMessage);
});
</script>
<form id="auth-real-form" method="post" action="login.php" style="display:none"><input id="auth-mode" name="mode" value="login"></form>
</body>
</html>
