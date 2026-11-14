# Smart VCard · 智能名片

> Indigo Grid Edition（靛格制签）
> 本地优先、中英双语的 vCard 名片工坊。填写一次，当场校样，然后以二维码、`.vcf`、PNG、SVG、PDF 或纸质卡片交付。所有计算都在浏览器里完成，不上传、不注册、无埋点。

开发者：智维ITMSKY · 官网：<http://www.itmsky.com> · 版权：Copyright (C) 2026 智维ITMSKY

## 目录

- [项目简介](#项目简介)
- [功能清单](#功能清单)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [部署（Docker）](#部署docker)
- [目录结构](#目录结构)
- [数据与隐私](#数据与隐私)
- [可用脚本](#可用脚本)
- [质量基线](#质量基线)
- [交付文档](#交付文档)
- [许可与信息](#许可与信息)

## 项目简介

Smart VCard 是一个**纯浏览器运行的 vCard 名片工坊**：把联系方式整理成一张可扫码、可保存、可打印的数字名片，并同时导出为联系人文件、位图、矢量图与矢量 PDF。

当前版本经历两轮加固（2026-11-08 首交付 → 2026-11-10 补充轮 → 2026-11-12 第二轮正式化），在保留核心场景（双语表单 → 实时二维码 → 下载 .vcf/PNG）的同时：

1. **修复真实缺陷**：分享链接解析、base64 解码、二维码可扫性（墨迹几何 / PNG 光栅化 / 密度下限）、草稿自动保存循环、导出再导入丢字段、Logo 串位与丢失、残缺地址垃圾行等 20 项。
2. **同类项目调研借鉴**：GitHub/Gitee 两阶段调研（185 候选 → 6 个深读），21 条借鉴点落地 13 项——像素级解码回环测试、静态隔离守卫、LF 二维码载荷、矢量 PDF 导出、复制二维码图片、字数计数器、引号参数解析等。
3. **视觉体系**：以「靛格制签 / Indigo Grid」重写所有页面、标题与图标（冷画布、墨蓝、靛蓝主色、无衬线粗体、圆角投影）；保留全部业务功能。

代码托管于 GitHub，CI 在 Ubuntu / Windows / macOS 上执行同一套质量门禁，并额外构建 Docker 镜像做冒烟测试；推送 `v*` Tag 后自动发布静态包与容器镜像。

## 功能清单

### 工坊（表单 + 校样）

- 中英双语界面，顶栏一键切换，语言选择记忆在本机。
- 28 个字段：姓名（中/英文名按名字本身排序）、称谓/后缀/中间名/昵称、生日、头像 URL、手机/工作电话、双邮箱、双网站、公司/职位/品牌简称/一句话、Logo 上传与 URL、完整工作地址、LinkedIn、X、微信号、备注。
- 除「名」外全部可选；空字段不会生成空的 vCard 属性。
- 名片与二维码随输入实时更新（220 ms 防抖）。
- 草稿自动保存到本机 `localStorage`；**Logo 独立存储**，刷新不丢。
- 字段接近字数上限时显示 `已用/上限` 计数器。
- 表单校验：http(s) URL 白名单、邮箱格式、电话字符集、真实日历日期、逐字段长度上限（`FIELD_LIMITS` 单一事实源）。

### 二维码

- 双通道：网页链接（微信可用，默认）/ 原生 vCard（系统相机，LF 紧凑载荷）。
- 三种模块样式：方块 / 圆角 / 圆点；定位角始终为实心方块以保证识别率。
- 五墨色预设（靛蓝默认）+ 自定义取色；始终白底，四角静区保留。
- 载荷超限（>2200 B）时给出可操作的提示，而非让页面崩溃。
- 导出：.vcf、PNG(512/1024/2048)、SVG、**PDF(A6 矢量)**、打印；复制 vCard 文本、**复制二维码图片**（不支持时降级下载 PNG 并提示）、系统分享。
- **可扫性保证**：模块墨迹填满单元、PNG 按目标尺寸光栅化、8px/模块密度下限自动放大；**jsQR 像素级回环测试**持续验证。

### 分享

- 链接形态：`…/#/?v=<base64url(JSON)>`，参数放在 hash 里以适配 HashRouter 与静态子路径部署。
- 空字段被剔除；Unicode 通过 TextEncoder 编码，中文与 emoji 安全。
- 分享链接不含 Logo 图片；不可信链接只保留 http(s) URL。
- 分享页提供「保存到通讯录」、复制 vCard、系统分享；微信内提示改用浏览器打开。
- 兼容旧版 `…/?v=…` 链接。

### 导入

- 粘贴 vCard 文本或选择 `.vcf` 文件，已识别属性回填表单。
- 支持 3.0 / 4.0 输入、折行展开、属性分组（`item1.TEL`）、参数（含引号包裹值）、RFC 6868 `^` 转义、转义分隔符。
- 文件上限 256KB / 65,536 字符，超限提示「文件过大」。
- **多名片提示**：一个文件含多张名片时载入第 1 张并如实告知。
- **往返无损**：成对字段写入 `TYPE` 参数；「品牌简称」「标语」以 `X-SMARTVCARD-*` 承载；`LOGO` 与 `PHOTO` 分流还原。
- 地址整体往返：street 与 city 齐全才写入 `ADR;TYPE=WORK`（残缺地址不写垃圾行）。

### PWA 与离线

- 可安装到主屏；预缓存全部构建产物，离线可用。
- 内含 192/512 PNG 图标、maskable 图标、Apple touch icon（`npm run icons` 重新生成）。
- 应用级 CSP、禁止 `object`/`frame`/外部脚本、不允许第三方请求——由 dist 静态隔离守卫测试持续断言。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | React 19 + TypeScript 5 | 函数组件 + Hooks |
| 构建 | Vite 8 | 路由级懒加载分包 |
| 样式 | Tailwind CSS 4 | `@theme` 设计令牌，无额外 UI 框架 |
| 表单 | react-hook-form + Zod 4 | 类型化 schema |
| 国际化 | i18next + react-i18next | 中英两套完整文案（键位一致） |
| 二维码 | qrcode + 自绘 SVG 渲染 | 强制 byte 模式，定位角实心 |
| PDF | jspdf 4 + svg2pdf.js 2 | 运行时动态加载，首屏零成本 |
| 路由 | react-router-dom 7 | HashRouter 适配静态部署 |
| SEO | @unhead/react | 标题与 description |
| PWA | vite-plugin-pwa | 预缓存 + 安装 |
| 测试 | node:test + jsQR | 102 项，含解码回环与安全守卫 |

## 快速开始

### 环境要求

- Node.js ≥ 22.15（测试脚本依赖 Node 同步 `registerHooks`）。
- npm 10+（Node 22 自带）。

### 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务
npm run dev
# → http://localhost:5173

# 3. 质量门禁（先构建后测试，安全守卫对 dist 断言）
npm run verify

# 4. 预览构建结果
npm run preview
```

> 部署到任意静态托管的子路径时，保持 `vite.config.ts` 中 `base: "./"` 即可，无需额外修改；应用使用 HashRouter，托管方无需 SPA rewrite 规则。

## 部署（Docker）

```bash
# 构建并启动（默认映射 8088 端口）
docker compose up -d --build

# 健康检查与状态
curl -fsS http://localhost:8088/healthz
docker compose ps
```

- 端口可用环境变量覆盖：`SMARTVCARD_PORT=9090 docker compose up -d`。
- 镜像采用两阶段构建：Node 22 执行 `npm ci && npm run build`，产物由 Nginx 1.27 Alpine 托管；`/healthz` 供容器与 CI 探活。
- 不想用容器时，把 `dist/` 交给任意静态托管即可（Nginx / COS / OSS / Vercel / GitHub Pages）。

## 目录结构

```
smart-vcard/
├── public/
│ ├── favicon.svg        # 靛蓝品牌图标
│ ├── robots.txt
│ └── icons/             # 生成的 PWA PNG 图标
├── scripts/
│ ├── make-icons.mjs     # 零依赖 PNG 图标生成器
│ ├── make-archive.mjs   # 交付 ZIP 打包（UTF-8 文件名）
│ └── node-test-resolver.mjs
├── src/
│ ├── App.tsx / main.tsx # 路由 + 懒加载 + 全局错误兜底
│ ├── index.css          # 「靛格制签」设计令牌与 Tailwind 层
│ ├── components/        # Header/Footer/Layout/CardPreview/Icon/Field/…
│ │ └── generator/DeliveryPanel.tsx
│ ├── hooks/             # useDocumentHead / useLocalStorage / useQrPreview / useToast
│ ├── i18n/locales/{en,zh}.json
│ ├── lib/               # vcard / vcardParse / vcardTypes / cardShare / qr / pdf / schema / text / safety / settings / constants / version / download / toastContext
│ └── pages/             # Home / Generator / About / PublicCardView / NotFound
├── tests/               # node:test 单元 / 契约 / 解码 / 安全守卫测试（11 个文件，102 项）
├── docs/                # 5 篇标准交付文档
├── deploy/nginx.conf    # 静态托管与反向代理配置（容器内使用）
├── .github/workflows/   # CI（三平台质量门禁 + Docker 冒烟）与 Release 流水线
├── Dockerfile / docker-compose.yml
├── index.html / vite.config.ts / tsconfig*.json / eslint.config.js
├── CHANGELOG.md / README.md / LICENSE / .env.example
└── package.json / package-lock.json
```

## 数据与隐私

- 无后端、无第三方脚本、无埋点；`src/` 无 `console` 调用（守卫测试）。
- 草稿：`smart-vcard-draft-v1`（不含 Logo）；Logo：`smart-vcard-logo-v1`；设置：`smart-vcard-settings-v1`；语言：`smart-vcard-lang`。
- 分享链接把数据放在 URL 的 `#` 片段中，HTTP 请求不会把这段内容发送给托管方；但链接被转发给谁，谁就能读到，因此不应在其中写入敏感信息。
- 用户若填写 http(s) 远程图片地址，名片在打开时会向该地址发起图片请求（http 明文图被页面 CSP 阻断，属有意收窄）。

## 可用脚本

| 命令 | 用途 |
|---|---|
| `npm run dev` | 启动开发服务 |
| `npm test` | 运行全部测试（106 项） |
| `npm run test:watch` | 监听模式跑测试 |
| `npm run lint` | ESLint 静态检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run build` | 类型检查 + 生产构建（含 CSP 注入与 PWA） |
| `npm run verify` | 一键质量门禁：lint + build + test（守卫对 dist 断言） |
| `npm run preview` | 本地预览构建产物 |
| `npm run icons` | 重新生成 PWA PNG 图标 |
| `npm run archive` | 打包交付 ZIP（UTF-8 文件名，排除 node_modules/日志） |

## 质量基线

- 测试 **106/106** 通过（vcard / vcardParse / roundTrip / qr / qrDecode / schema / settings / text / i18n / security / cardShare）。
- `tsc -b` 与 `eslint .` 零告警。
- 生产依赖 `npm audit --omit=dev` **0 漏洞**。
- 质量门禁本地复现：`npm run verify`。
- CI：GitHub Actions 在 Ubuntu / Windows / macOS 运行同一套门禁，并构建 Docker 镜像检查 `/healthz`、`/`、`/sw.js`。
- Release：推送 `v*` Tag 触发，产出 `SmartVCard-<version>-Windows-x64.zip`、`SmartVCard-<version>-Linux-x64.tar.gz`、`SmartVCard-<version>-source.zip` 及 `ghcr.io/<owner>/smartvcard:<version>` / `:latest` 镜像；发布后自动清理旧附件、旧镜像版本与旧 artifacts。

## 交付文档

完整交付文档位于 [`docs/`](docs/)，按阅读顺序组织，共 5 篇，与当前代码严格对齐：

| 文档 | 路径 |
|---|---|
| 01 项目介绍与架构 | [docs/01-项目介绍与架构.md](docs/01-项目介绍与架构.md) |
| 02 环境部署教程 | [docs/02-环境部署教程.md](docs/02-环境部署教程.md) |
| 03 功能使用说明 | [docs/03-功能使用说明.md](docs/03-功能使用说明.md) |
| 04 安全设计说明 | [docs/04-安全设计说明.md](docs/04-安全设计说明.md) |
| 05 开发日志 | [docs/05-开发日志.md](docs/05-开发日志.md) |
| 变更记录 | [CHANGELOG.md](CHANGELOG.md) |
| 环境变量说明 | [.env.example](.env.example) |

## 许可与信息

开发者：智维ITMSKY  
版权：Copyright (C) 2026 智维ITMSKY  
官网：http://www.itmsky.com  
许可证：GNU Affero General Public License v3.0 or later（AGPL-3.0-or-later，见 LICENSE）  
SPDX-License-Identifier: AGPL-3.0-or-later

> 本程序是自由软件：你可以遵照 GNU Affero 通用公共许可证第3版或后续版本的规定，重新分发和/或修改它。  
> 本程序旨在广泛共享，但不提供任何担保；甚至不包含适销性和特定用途适用性的默示保证。详情请参阅 GNU Affero General Public License。  
> 如果你修改本程序并通过网络向公众提供服务（SaaS、Web、API等在线服务），你必须向该服务的使用者提供对应修改后的完整源代码。  
> 你应当随本程序一同收到 GNU Affero General Public License 的副本；如未收到，详见 <https://www.gnu.org/licenses/>。
