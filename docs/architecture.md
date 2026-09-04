# Classic Client 技术说明

Classic Client（`notpad-classic-client`）是一套面向桌面浏览器的资料管理前端。界面按 2010 年前后 ExtJS 后台的习惯来做：左侧树导航、中间多页签、表格/缩略图列表、工具栏按钮、模态窗。

它**不直接访问业务 API**。浏览器只跟 PHP 页面和网关说话；PHP 再用服务端 token 去调 `server` 的 tRPC。登录 token 只存在 PHP Session 里，前端 JS 拿不到。

本文说明它怎么分层、怎么鉴权、页面怎么组织、以及各业务模块的实现约定。

---

## 1. 在整个仓库里的位置

```
浏览器 (ExtJS 3)
    │  表单 / Ext.Ajax / 文件上传
    ▼
PHP Classic Client          ← 本目录
    │  Session 中的 token + x-group-id
    ▼
server tRPC  (默认 http://127.0.0.1:4000/trpc)
    │
    ▼
MySQL / 对象存储 (OSS)
```

同一套 `server` 也给 Vue 客户端用。Classic Client 是另一套壳，不共享前端代码。

启动方式见根目录 [README.md](../README.md)：配置 `trpc_url`（或环境变量 `TRPC_URL`），用 PHP 内置服务器打开 `login.php`。

---

## 2. 目录结构

| 路径 | 作用 |
| --- | --- |
| `login.php` / `logout.php` | 登录注册、销毁 Session |
| `index.php` | 登录后主壳：注入 `CLASSIC_BOOT`，加载 ExtJS |
| `ajax.php` | 业务 RPC 白名单网关，供 Ext.Ajax 调用 |
| `upload.php` | 图片/文件上传：拿签名 URL → PUT 到 OSS → 登记记录 |
| `note.php` / `tag.php` | PHP 直出的预览页（笔记 Markdown、标签下内容） |
| `lib/bootstrap.php` | 配置、Session、登录检查、JSON 辅助 |
| `lib/trpc.php` | 用 curl 调 tRPC query / mutation |
| `lib/page.php` | SSR 页面公共函数：转义、CDN、整页 HTML |
| `lib/markdown.php` | 服务端 Markdown → 安全 HTML |
| `assets/js/core.js` | `Classic.*` 公共能力 |
| `assets/js/app.js` | Viewport：顶栏、导航树、页签 |
| `assets/js/modules-content.js` | 首页、笔记、待办、书签、图片、文件 |
| `assets/js/modules-admin.js` | 群组、聊天、资料、设备、设置 |
| `assets/vendor/ext` | ExtJS 3 |
| `assets/icons` | Fugue 图标 |
| `config.php` | 本地配置，勿提交敏感信息 |

---

## 3. 鉴权与工作区

### 3.1 Token 不进浏览器

1. `login.php` POST 到 PHP，PHP 调 `auth.login` / `auth.register`。
2. 成功后 `session_regenerate_id`，把 `token`、`user` 写入 `$_SESSION`。
3. Cookie 只带 Session（`httponly`、`samesite=Lax`，HTTPS 时 `secure`）。
4. 之后所有 tRPC 请求由 PHP 加上请求头 `token`；群组上下文加 `x-group-id`。

`logout.php` 清空 Session 并删 Cookie。

### 3.2 工作区

`$_SESSION['group_id']` 为空表示个人资料，非空表示当前群组。

主界面顶栏的工作区下拉会调网关里的特殊过程 `session.setGroup`（只改 Session，不转发 tRPC），然后整页刷新。切换前会用 `group.getById` 校验该群组是否存在。

### 3.3 启动数据

`index.php` 在服务端拉齐启动包，写成 `window.CLASSIC_BOOT`：

- 用户资料、群组列表、用量统计、待处理邀请
- `assetBaseUrl`：图片 CDN 前缀（见第 7 节）
- 启动失败时的 `bootError`（401 会踢回登录）

前端不再用 token 去拉这些首屏数据。

---

## 4. tRPC 网关

### 4.1 `lib/trpc.php`

- Query：`GET {trpc_url}/{procedure}?input={json}`
- Mutation：`POST` JSON body
- 从响应里取出 `result.data`（兼容 `result.data.json`）
- 错误统一打成 `TrpcException`，尽量抽出可读 `message`

### 4.2 `ajax.php`

浏览器只允许 POST：

```json
{ "procedure": "notepad.getNotes", "input": { "page": 0 } }
```

过程名必须在白名单里，并标明是 query 还是 mutation。不在名单中的直接 400。

网关自己处理、不转发 tRPC 的过程：

| 过程 | 作用 |
| --- | --- |
| `session.setGroup` | 写 Session 工作区 |
| `notepad.renderNote` | 拉笔记 + 标签，用 PHP 渲染 Markdown，返回 `html` |

401 会清 Session，前端弹窗后跳转 `login.php`。

---

## 5. ExtJS 主壳

`app.js` 搭一个 `border` Viewport：

- **北**：标题、用户、工作区下拉、回首页、刷新当前页
- **西**：功能树，点击叶子调用 `Classic.openModule(id)`
- **中**：`Ext.TabPanel`，首页不可关，其它模块可关

没有底部状态栏。`Classic.setStatus` 仍在，但没有绑定 UI。

模块按需打开：已存在的页签会被激活，否则执行 `Classic.modules[id]()` 再 `add`。刷新按钮调用当前页签的 `reloadModule`（各模块自己挂上）。

脚本加载顺序：`core.js` → `modules-content.js` → `modules-admin.js` → `app.js`。

---

## 6. 交互约定

刻意不用「双击打开」和「先选中再点工具栏」。

1. **单击行 / 缩略图**：执行默认动作（笔记预览、书签预览、图片大图、进目录/下载文件、待办编辑、打开群组成员、标签预览）。
2. **行内操作链接**：预览、修改、删除、标签等，每条记录自己带图标+文字。点链接会 `stopEvent`，不会再触发默认动作。
3. **工具栏**：只放不依赖当前行的动作——新建、上传、标签管理、查询、翻页、刷新。

公共实现在 `core.js`：

- `Classic.actionHtml` / `actionColumn`：操作列 HTML
- `Classic.bindRowActions(grid, handlers, defaultAction)`：单元格点链接 + 行单击默认动作
- `Classic.bindViewActions`：图片 DataView 同样规则
- `Classic.windowForm`：表单弹窗。必须给**明确高度**（按字段估算，或调用方传入），`layout: 'fit'`。ExtJS 3 里 `autoHeight` 配 `fit` 会把内容区高度算成 0。
- `Classic.openPage`：在主 Tab 里打开可关闭的预览页签，同 id 复用。

翻页统一是「上一页 / 下一页」，每页 30 条，offset/page 语义跟对应 tRPC 接口一致。

---

## 7. 图片地址与 CDN

接口里的 `url` 经常是 OSS 对象键，不是完整 URL。

拼接顺序：

1. 用户设置 `cdn_prefix`（`setting.set`）
2. 用户设置 `asset_base_url`
3. `config.php` / 环境变量 `ASSET_BASE_URL`

`index.php` 启动时算好 `CLASSIC_BOOT.assetBaseUrl`。前端用：

- `Classic.assetUrl(key)`：完整地址
- `Classic.thumbUrl(key, w)`：再加上 `x-oss-process=image/resize,w_*`

系统设置页顶部可以改 CDN 前缀，保存后立刻改 `Classic.boot.assetBaseUrl`。

PHP 预览页用 `lib/page.php` 的 `public_asset_url` / `public_thumb_url`，规则相同。

---

## 8. 上传

浏览器不能直传 OSS（没有 token）。`upload.php` 流程：

1. Ext 表单 `fileUpload: true` POST 到 `upload.php`（`kind=image|file`）
2. PHP 调 `image_bed.getUploadUrl` 或 `file_drive.getUploadUrl`
3. PHP 用 curl `PUT` 临时文件到签名 URL
4. 再 `addImage` / `addFile` 登记
5. 用 `<textarea>{json}</textarea>` 回给 Ext 的 `form.submit`（iframe 上传的老协议）

---

## 9. 业务模块怎么做

### 9.1 首页

三块统计/快捷入口/系统信息 + 最近动态。动态调 `timeline`。区块标题和条目都带图标。

### 9.2 笔记

表格：标题、时间、行内操作。查询栏有标签下拉（`notepad.getNotes` 的 `tag_id`）。

- 默认动作 /「预览」：`notepad.renderNote`，PHP 渲染 Markdown 后塞进新页签
- 「修改」：模态表单写原文（仍是 Markdown 源码）
- 「标签」：复选框批量加减
- 独立地址：`note.php?id=`，服务端同一套 `render_markdown`

### 9.3 待办

左列表、右事项。点列表是切换当前列表（换工作区，不是「选中再操作」）。事项单击进入编辑。

### 9.4 书签

表格 + 类型/标签/关键字筛选。单击预览页签（标题、标签、地址、摘录）。「打开」对外链 `window.open`。

### 9.5 图片

`Ext.DataView` 缩略图网格，不是表格。卡片上有「大图 / 重命名 / 标签」。单击缩略图看原图。工具栏只有上传、标签管理、筛选。

### 9.6 文件

面包屑 + 表格。点目录进入，点文件取 `getDownloadUrl` 后打开。

### 9.7 群组 / 聊天 / 账号 / 设置

群组、成员、邀请都在行内操作。聊天按选中的群组拉 `groupChat`。设置页上方是 CDN，下方是任意 `user_settings` 键值，并可重算用量。

---

## 10. PHP 直出页与 Markdown

`note.php`、`tag.php` 不走 Ext，适合收藏链接或从标签跳进笔记。

`lib/markdown.php` 在服务端把笔记正文收成 HTML：

- 标题、段落、列表、引用、分割线
- 围栏代码块、行内代码
- 链接、图片、粗体/斜体/删除线
- GFM 表
- 文本先转义；URL 只允许 `http(s)`、`mailto`、相对路径、`/`，拒绝 `javascript:` 等
- 相对图片键会套 CDN

管理端预览和 `note.php` 共用这一套，避免两套渲染结果不一致。

---

## 11. 安全上多做的几件事

- 过程白名单，浏览器不能任意点 tRPC
- Token 不进 JS、不进 LocalStorage
- 输出用 `Classic.html` / PHP `h()` 转义；Markdown 只输出解析后的安全 HTML
- 上传校验 `kind` 与 MIME（图片必须 `image/*`）
- 工作区切换前校验群组

生产环境应关 PHP 错误输出、走 HTTPS，并避免 `config.php` 被静态下载。

---

## 12. 和 Vue 客户端的差异（实现层面）

| | Classic | Vue `client/` |
| --- | --- | --- |
| UI | ExtJS 3，桌面后台 | Vuetify SPA |
| 鉴权 | PHP Session 代理 token | 浏览器持有 token 调 tRPC |
| 笔记预览 | PHP 渲染 Markdown | 前端 markdown-it |
| 图片 | DataView + OSS 缩略图参数 | 卡片网格 + 同一套 OSS 参数 |
| CDN | 设置项 / 环境变量 / config | 前端也可配，实现位置不同 |

业务数据模型、分页和标签接口是同一套 server。

---

## 13. 改代码时从哪下手

1. 新接口：先在 `ajax.php` 白名单登记，再在对应 `Classic.modules.*` 里调 `Classic.api`。
2. 新列表：行内操作 + `bindRowActions` 第三参默认动作；工具栏不要放「依赖选中行」的按钮。
3. 新表单弹窗：走 `Classic.windowForm`，或自己给 Window **写死 height** 且 `layout: 'fit'`。
4. 新预览：能 SSR 的放 `*.php` + `lib/page.php`；管理端里用 `Classic.openPage`。
5. 图片 URL：不要写死域名，走 `assetUrl` / `public_asset_url`。
