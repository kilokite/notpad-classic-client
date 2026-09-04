<?php

function h($value)
{
    return htmlspecialchars($value === null ? '' : (string) $value, ENT_QUOTES, 'UTF-8');
}

function format_datetime($value)
{
    if (!$value) {
        return '';
    }
    $text = str_replace('T', ' ', (string) $value);
    return strlen($text) > 19 ? substr($text, 0, 19) : $text;
}

function current_asset_base()
{
    global $config;
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    $cached = '';
    try {
        $settings = trpc_query('setting.getAll', null, current_token(), current_group_id());
        if (is_array($settings)) {
            if (!empty($settings['cdn_prefix'])) {
                $cached = $settings['cdn_prefix'];
            } elseif (!empty($settings['asset_base_url'])) {
                $cached = $settings['asset_base_url'];
            }
        }
    } catch (Throwable $e) {
        $cached = '';
    }

    if ($cached === '' && !empty($config['asset_base_url'])) {
        $cached = $config['asset_base_url'];
    }

    $cached = rtrim((string) $cached, '/');
    return $cached;
}

function public_asset_url($value)
{
    $url = (string) $value;
    if ($url === '') {
        return '';
    }
    if (preg_match('#^(?:https?:)?//#i', $url)) {
        return $url;
    }
    $base = current_asset_base();
    return $base === '' ? $url : $base . '/' . ltrim($url, '/');
}

function public_thumb_url($value, $width = 160)
{
    $url = public_asset_url($value);
    if ($url === '') {
        return '';
    }
    $sep = strpos($url, '?') !== false ? '&' : '?';
    return $url . $sep . 'x-oss-process=image/resize,w_' . (int) $width;
}

function handle_page_auth_error(Throwable $e)
{
    if ($e instanceof TrpcException && $e->getCode() === 401) {
        $_SESSION = array();
        header('Location: login.php');
        exit;
    }
}

function find_tag_by_id($tags, $id)
{
    foreach ((array) $tags as $tag) {
        if (is_array($tag) && isset($tag['id']) && (int) $tag['id'] === (int) $id) {
            return $tag;
        }
    }
    return null;
}

function render_ssr_page($title, $body)
{
    global $config;
    $appName = isset($config['app_name']) ? $config['app_name'] : '资料管理系统';
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    ?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <title><?php echo h(page_title($title)); ?></title>
    <link rel="stylesheet" href="assets/css/classic.css">
</head>
<body class="ssr-body">
<div class="ssr-top">
    <div class="ssr-brand"><?php echo h($appName); ?></div>
    <div class="ssr-nav">
        <a href="index.php">返回管理首页</a>
        <a href="logout.php">退出系统</a>
    </div>
</div>
<div class="ssr-wrap">
    <?php echo $body; ?>
</div>
</body>
</html>
    <?php
    exit;
}
