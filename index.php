<?php
require __DIR__ . '/lib/bootstrap.php';
require_login();

try {
    $profile = trpc_query('auth.getProfile', null, current_token(), current_group_id());
    $groups = trpc_query('group.list', null, current_token(), null);
    $stats = trpc_query('setting.getUsageStats', null, current_token(), current_group_id());
    $invites = trpc_query('group.myInvites', null, current_token(), null);
} catch (TrpcException $e) {
    if ($e->getCode() === 401) {
        $_SESSION = array();
        header('Location: login.php');
        exit;
    }
    $profile = isset($_SESSION['user']) ? $_SESSION['user'] : array('id' => '', 'name' => '未知用户', 'email' => '');
    $groups = array();
    $stats = array();
    $invites = array();
    $bootError = $e->getMessage();
}

$boot = array(
    'appName' => $config['app_name'],
    'profile' => $profile,
    'groups' => $groups,
    'stats' => $stats,
    'invites' => $invites,
    'activeGroupId' => current_group_id(),
    'assetBaseUrl' => isset($config['asset_base_url']) ? rtrim($config['asset_base_url'], '/') : '',
    'bootError' => isset($bootError) ? $bootError : '',
    'today' => date('Y年n月j日'),
);
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <title><?php echo htmlspecialchars(page_title(), ENT_QUOTES, 'UTF-8'); ?></title>
    <link rel="stylesheet" href="assets/vendor/ext/resources/css/ext-all.css">
    <link rel="stylesheet" href="assets/css/classic.css">
    <script src="assets/vendor/ext/adapter/ext/ext-base.js"></script>
    <script src="assets/vendor/ext/ext-all.js"></script>
    <script src="assets/vendor/ext/src/locale/ext-lang-zh_CN.js"></script>
    <script>window.CLASSIC_BOOT = <?php echo json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP); ?>;</script>
    <script src="assets/js/core.js"></script>
    <script src="assets/js/modules-content.js"></script>
    <script src="assets/js/modules-admin.js"></script>
    <script src="assets/js/app.js"></script>
</head>
<body>
<div id="loading-mask"><div class="loading-box">正在进入管理系统，请稍候...</div></div>
<noscript>
    <div class="noscript-box">
        <h1><?php echo htmlspecialchars($config['app_name'], ENT_QUOTES, 'UTF-8'); ?></h1>
        <p>当前用户：<?php echo htmlspecialchars(isset($profile['name']) ? $profile['name'] : '', ENT_QUOTES, 'UTF-8'); ?></p>
        <p>本系统需要启用 JavaScript 才能进行管理操作。</p>
    </div>
</noscript>
</body>
</html>
