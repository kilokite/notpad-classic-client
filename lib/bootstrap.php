<?php

$config = require dirname(__DIR__) . '/config.php';

date_default_timezone_set(isset($config['timezone']) ? $config['timezone'] : 'Asia/Shanghai');
session_name(isset($config['session_name']) ? $config['session_name'] : 'classic_notepad');
session_set_cookie_params(array(
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
));

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

require_once __DIR__ . '/trpc.php';

function current_token()
{
    return isset($_SESSION['token']) ? (string) $_SESSION['token'] : '';
}

function current_group_id()
{
    return isset($_SESSION['group_id']) && $_SESSION['group_id'] !== ''
        ? (string) $_SESSION['group_id']
        : null;
}

function require_login()
{
    if (current_token() === '') {
        header('Location: login.php');
        exit;
    }
}

function json_response($payload, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body()
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return $_POST;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : array();
}

function page_title($suffix = '')
{
    global $config;
    $name = isset($config['app_name']) ? $config['app_name'] : '资料管理系统';
    return $suffix === '' ? $name : $suffix . ' - ' . $name;
}
