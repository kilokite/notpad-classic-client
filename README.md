# Classic Client

基于 PHP 与 ExtJS 3 的资料管理客户端，界面和交互按 2010 年前后的后台管理系统习惯实现。客户端通过 PHP 网关访问 `server` 提供的 TRPC 服务，浏览器不会直接接触登录 token。

## 环境要求

- PHP 7.4 或更高版本
- PHP `curl`、`json`、`session` 扩展
- 已启动的 `server` 服务

## 配置

默认连接 `http://127.0.0.1:4000/trpc`。可修改 `config.php` 中的 `trpc_url`，也可通过 `TRPC_URL` 环境变量覆盖。若图片接口返回的是 OSS 对象键而不是完整 URL，还需设置 `asset_base_url` 或 `ASSET_BASE_URL`：

```powershell
$env:TRPC_URL = 'http://127.0.0.1:4000/trpc'
$env:ASSET_BASE_URL = 'https://your-public-oss-host.example.com'
php -S 127.0.0.1:8080
```

然后访问 `http://127.0.0.1:8080/login.php`。

生产部署时应关闭 PHP 错误输出，启用 HTTPS，并保证 `config.php` 不包含可由浏览器直接下载的敏感信息。
