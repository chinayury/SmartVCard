#变更记录

本文件只追加，不修改历史记录。

## [0.1.0] —2026-11-13（许可与署名信息规范化）

###变更类型：许可声明规范化 + 署名信息补全（无功能变更）

> 根据项目方确认，许可证保持 AGPL-3.0-or-later；补充开发者「智维ITMSKY」、版权「Copyright (C) 2026 智维ITMSKY」、官网 `http://www.itmsky.com` 与 SPDX 标识，并明确 AGPL 网络服务源码义务。功能零变更。

###变更

- `LICENSE`：GNU AGPL v3.0 官方全文 + 简短版权 / SPDX 头；新增 `NOTICE` 承载完整署名与 AGPL 声明（含网络服务条款），以保持 GitHub 许可证识别。
- `package.json`：`license` 保持 `AGPL-3.0-or-later`；新增 `author`（智维ITMSKY，官网）。
- `README.md`：License 章节补充 SPDX 标识、版权与 AGPL 声明（含网络服务条款），并链接 `NOTICE`。
- `src/lib/version.ts`：新增 `APP_AUTHOR` / `APP_WEBSITE` / `APP_COPYRIGHT_YEAR` / `APP_LICENSE`，界面展示统一引用。
- `src/components/Footer.tsx`、`src/pages/About.tsx`：新增开发者与官网条目；版权行改为「© 2026 智维ITMSKY · Smart VCard」；许可显示保持 AGPL-3.0。
- `src/i18n/locales/zh.json`、`src/i18n/locales/en.json`：补充开发者 / 官网文案；许可说明改为 AGPL-3.0-or-later 并注明网络服务源码义务；修正上一轮遗漏的「MIT 协议」残留。
- `index.html`：`author` 元信息改为智维ITMSKY，新增 `copyright` 元信息。

###验证

- 本地：`npm run typecheck` 0 错误；`npm run lint` 0 告警；`npm test` **102/102** 通过；`npm run build` 成功（PWA 预缓存 33 项）。
- 构建后复跑 `npm test`：**102/102** 通过（含 dist 静态隔离守卫）。
- `LICENSE` 正文与 GNU 官方 `agpl-3.0.txt` 逐字节一致（34,523 字节），文件头含 SPDX 标识，完整 AGPL 声明见 `NOTICE`。

## [0.1.0] —2026-11-13（工程化交付：Git / CI / Docker / Release）

###变更类型：仓库初始化 + 发布流水线 + 容器化部署（无业务功能变更）

> 依据通用执行指令补齐工程化基线：初始化 Git 仓库并推送 GitHub 公开仓库，许可证由 MIT 变更为 AGPL-3.0-or-later（经用户确认），新增 Docker / Nginx 部署与 GitHub Actions CI / Release，清理 README 中的版本号展示。业务代码零改动。

###新增

- `LICENSE`：AGPL-3.0-or-later 全文。
- `.gitignore` / `.dockerignore`：覆盖依赖、构建产物、日志、本地配置与交付包。
- `Dockerfile`：两阶段构建（`node:22-alpine` 构建 → `nginx:1.27-alpine` 托管）。
- `docker-compose.yml` 与 `deploy/nginx.conf`：默认 `8088→80`，`/healthz` 探活，入口与 Service Worker 不缓存、哈希资源长缓存。
- `.github/workflows/ci.yml`：Ubuntu / Windows / macOS 质量门禁 + Docker 镜像冒烟。
- `.github/workflows/release.yml`：`v*` Tag 触发，产出 Windows zip / Linux tar.gz / source zip 与 GHCR 镜像，并清理旧 Release 附件、旧镜像版本与旧 artifacts。

###变更

- `package.json`：`license` 改为 `AGPL-3.0-or-later`（版本号保持 0.1.0，与 `src/lib/version.ts` 一致）。
- `src/components/Footer.tsx`、`src/pages/About.tsx`：界面许可证展示由 `MIT` 同步为 `AGPL-3.0`。
- `README.md`：移除具体版本号展示；补 Docker 部署与 CI / Release 说明；产物名使用 `<version>` 占位；许可证章节改为 AGPL。
- `docs/02-环境部署教程.md`：新增 Docker + Nginx 部署与 CI 说明；npm 要求修正为 10+（Node 22 自带）。
- `.github/workflows/release.yml`：清理 job 改为 API 批量删除；镜像改为 `linux/amd64` 单平台、`--provenance=false --sbom=false` 单清单构建，避免清理未打 Tag 的子清单时破坏索引。

###验证

- 本地：`npm run lint` 0 告警；`npm run build` 成功；`npm test` **102/102** 通过。
- CI（run `43448222309`）：Quality（ubuntu / windows / macos）与 Docker image smoke test 全部成功。
- 测试服务器 Docker 部署：容器 `healthy`；`/healthz` 与外网 8088 首页均 200；`/`、`/sw.js`、`/manifest.webmanifest`、`/favicon.svg`、`/icons/icon-192.png`、`/robots.txt` 均 200。

## [0.1.0] —2026-11-13（项目清理与文档重组）

###变更类型：工程清理 +文档重组（无功能变更）

> 依据「纯代码 + 文档」初始版本整理指令，对项目执行彻底清理与重组：移除 Git 元数据与构建产物，将 11 份交付文档合并为 5 篇标准文档，重写 README 与 CHANGELOG，使文档与代码严格对齐。**无任何业务代码改动，功能零变更。**

###清理原则

1. **单一事实源**：仅保留最新有效基线（2026-11-12 第二轮加固）的代码与文档，删除被替代的冗余版本与可再生产物。
2. **测试保留**：`tests/`（11 个文件、102 项测试）依据全局 AGENTS.md 6.3 测试门禁红线（永久不可豁免）予以保留；本指令「若项目方明确要求测试，则保留 tests/ 并单独说明」的豁免条款适用，故未删除。
3. **可逆优先**：`dist/`、`node_modules/` 可由 `npm run build` / `npm ci` 重新生成；删除项均为可再生或已被替代的内容。

###删除清单

- **Git 元数据与配置**：`.git/`（整个版本库）、`.github/`（CI workflow）、`.gitignore`。交付为非 Git 目录，安全边界由 `.env.example` 文档承载。
- **构建产物与依赖**：`dist/`（可由 `npm run build` 重建）、`node_modules/`（可由 `npm ci` 重建）。
- **历史文档**：`docs/*-v0.1.0-20261112.md`（11 份）与 `docs/README.md`，内容已合并重写为 5 篇标准文档（见下）。

###文档重组（11 份 → 5 篇）

| 新文档 | 合并自 |
|---|---|
| `docs/01-项目介绍与架构.md` | 项目介绍、视觉重构说明（架构与设计部分） |
| `docs/02-环境部署教程.md` | 部署教程 |
| `docs/03-功能使用说明.md` | 使用说明 |
| `docs/04-安全设计说明.md` | 安全审查报告 |
| `docs/05-开发日志.md` | 开发日志、BUG 修复清单、功能优化与新增、借鉴落地记录 |

###根文件更新

- 重写 `README.md`：去除 `.github`/CI/legacy 引用，目录结构与文档索引与最终代码严格对齐。
- 更新 `CHANGELOG.md`（本条目）：如实记录本次清理的影响范围与保留决策。

###保留清单（未删除）

- `src/`：全部源码（业务代码零改动）。
- `tests/`：11 个测试文件（102 项测试，质量证据，依据红线保留）。
- `docs/`：5 篇标准交付文档。
- 工程配置：`package.json`、`package-lock.json`、`vite.config.ts`、`tsconfig*.json`、`eslint.config.js`、`index.html`。
- 运行必需资源：`public/`（favicon / robots / PWA 图标）、`scripts/`（图标生成 / 测试解析 / 交付打包）。
- `README.md`、`CHANGELOG.md`、`.env.example`。

## [0.1.0] —2026-11-08

###变更类型：版本正式化 +全面视觉重构 +缺陷修复 +功能增强 +安全加固

###受影响文件（按目录）

-根目录：`package.json`、`package-lock.json`、`README.md`、`CHANGELOG.md`、`.env.example`、`.gitignore`、`index.html`、`vite.config.ts`
-源码：`src/App.tsx`、`src/main.tsx`、`src/index.css`
-组件：`src/components/{Header,Footer,Layout,Icon,LanguageToggle,CardPreview,Field,Segmented,ConfirmDialog,ImportDialog,ToastHost}.tsx`、`src/components/generator/DeliveryPanel.tsx`
-页面：`src/pages/{Home,Generator,About,PublicCardView,NotFound}.tsx`
-逻辑：`src/lib/{vcard,vcardTypes,vcardParse,qr,cardShare,schema,text,safety,settings,constants,version,download,toastContext}.ts`
-钩子：`src/hooks/{useDocumentHead,useLocalStorage,useQrPreview,useToast}.ts`
-国际化：`src/i18n/index.ts`、`src/i18n/locales/{en,zh}.json`
-脚本：`scripts/make-icons.mjs`、`scripts/node-test-resolver.mjs`
-测试：`tests/{vcard,vcardParse,cardShare,qr,schema,settings,text,i18n}.test.ts`
-静态资源：`public/favicon.svg`、`public/icons/*`
- CI：`.github/workflows/actions.yml`
-历史文件归档：`legacy/`（原 `MainSection.tsx.disabled`、`QRPreview.tsx.disabled`、`useQRCode.ts`、`Navbar.tsx`、`LanguageSwitcher.tsx`、`lib/*.archived`、`public/__click_test.html.used`、`public/manifest.webmanifest`）
-文档：`docs/项目介绍`、`docs/部署教程`、`docs/使用说明`、`docs/BUG修复清单`、`docs/功能优化与新增`、`docs/版本迭代说明`、`docs/安全审查报告`、`docs/同类项目借鉴清单`、`docs/开发日志`

###变更详情

1.版本锁定 v0.1.0，移除 daisyUI beta与未使用的 lodash，升级 zod/vite/vite-plugin-pwa到当前稳定版。
2.重写全部页面与组件为「纸本工坊」浅色视觉体系：纸底 /墨黑 /陶土色 /衬线标题 /细线框 /统一线性 SVG图标。
3.修复分享链接参数位置错误（`?v=` → `#/?v=`）并兼容旧链接。
4.修复 base64url解码 padding错误，改用 TextEncoder/TextDecoder支持中文与 emoji。
5.二维码超限不再触发全局错误覆盖层，改为状态化提示；新增方块 /圆角 /圆点三种样式。
6.新增 `.vcf`导入、复制 vCard文本、SVG导出、打印、系统分享、PNG多尺寸、PWA图标、CSP。
7.姓名顺序按名字本身的文字判定，vCard FN与卡片显示一致。
8. vCard写入器补齐 CRLF、75字节折行、转义、国际区号保留、ISO生日、base64图片不导出。
9.增加56项自动化测试；CI加入 lint + test + build门禁。
10.输出全套交付文档；旧文件移入 `legacy/`保留，不删除。

## [0.1.0] —2026-11-10（补充轮次）

###变更类型：核心缺陷修复 +数据完整性 +性能修复

> 本轮在 v0.1.0 首次交付（typecheck / lint / 56 项测试全绿）的基础上，改用真实解码器与浏览器实测补测，发现前一轮的单测只断言「SVG 里出现了某个标签」而从未验证「二维码真的能扫」，据此修复 7 项缺陷。

###受影响文件

-二维码：`src/lib/qr.ts`、`src/lib/constants.ts`、`src/pages/Generator.tsx`
-vCard：`src/lib/vcard.ts`、`src/lib/vcardParse.ts`
-钩子：`src/hooks/useLocalStorage.ts`
-组件：`src/components/ImportDialog.tsx`
-国际化：`src/i18n/locales/{zh,en}.json`
-测试：`tests/qr.test.ts`、`tests/vcard.test.ts`、`tests/vcardParse.test.ts`、`tests/roundTrip.test.ts`（新增）

###变更详情

1.修复二维码「圆角」「圆点」样式因模块墨迹被缩小而无法扫描的问题（圆角改填满单元仅磨角，圆点改互相重叠）；实测墨迹覆盖率 26.3% → 35.4% / 41.4%。
2.修复 PNG 导出在 2048px 下因最近邻放大导致模块宽度不均而无法扫描的问题；改为按目标尺寸直接光栅化、1:1 拷贝。
3.修复导出尺寸过小时密名片低于每模块像素下限而不可扫的问题；导出尺寸改为下限，过密时自动放大并如实提示与命名。
4.修复草稿自动保存无限循环：`useLocalStorage` 的 setter 未固定身份，导致 effect 每次渲染重复触发；实测空闲 5 秒 4 次写入，修复后 0 次。
5.修复导出再导入丢失工作电话 / 工作邮箱 / 工作网站的问题：写侧补齐 `TYPE=CELL/WORK/INTERNET` 参数。
6.修复 LOGO 重新导入落入「照片」字段的问题；并为「品牌简称」「标语」新增 `X-SMARTVCARD-*` 属性，使导出不再丢失展示字段。
7.修复导入对话框重复选择同一文件无反应的问题。
8.新增导出→导入 round-trip 测试套件（5 项）；测试总数 56 → 66 项。
9.以 jsQR 真实解码器对 30 张名片 × 3 样式 × 3 尺寸共 270 组合实测，270/270 解码成功。

## [0.1.0] —2026-11-12（第二轮正式化加固）

###变更类型：同类项目调研借鉴 + 全量审计修复 + 视觉体系重构 + 功能增强 + 安全加固

> 本轮在 v0.1.0 首次交付与 2026-11-10 补充轮的基础上执行完整流程：GitHub/Gitee 两阶段同类项目调研 → 借鉴点落地 → 逐模块审计修复 → 全站视觉重构 → v0.1.0 版本锁定与文档对齐 → 回归验证。测试总数 66 → 102 项，全部通过。

###受影响文件（按目录）

-根目录：`README.md`、`CHANGELOG.md`、`.env.example`、`index.html`、`vite.config.ts`、`package.json`、`package-lock.json`
-设计系统与图标：`src/index.css`、`src/components/Icon.tsx`
-组件：`src/components/{Header,Footer,Layout,LanguageToggle,ToastHost,Field,Segmented,ConfirmDialog,ImportDialog,CardPreview}.tsx`、`src/components/generator/DeliveryPanel.tsx`
-页面：`src/pages/{Home,Generator,About,PublicCardView,NotFound}.tsx`
-逻辑：`src/lib/{vcard,vcardParse,qr,schema,text,safety,constants,download,version}.ts`、`src/lib/pdf.ts`（新增）
-钩子：`src/hooks/useLocalStorage.ts`（沿用）
-国际化：`src/i18n/locales/{en,zh}.json`（键位不变，文案重写 + 新增 6 键）
-测试：`tests/{qrDecode,security}.test.ts`（新增）、`tests/{vcard,vcardParse,roundTrip,schema,text}.test.ts`（扩充）
-静态资源：`public/favicon.svg`、`public/icons/*`（重新生成）、`scripts/make-icons.mjs`
- CI：`.github/workflows/actions.yml`（构建先于测试，使 dist 守卫生效）
-文档：`docs/` 全套 20261112 版 + 两份调研文档

###变更详情

**一、同类项目调研（两阶段）**

1.检索：GitHub 8 组 + Gitee 5 组检索式，185 个去重候选；三轴（相关性/成熟度/参考价值）初筛保留 12 个，精排深读 6 个（MrCrin/swiish、rclement/business-card-generator、kelseykm/vcard4、FloB95/qrcodly、open-qr/openqr、overtonlabs/qr-business-card）。Gitee 检索通道实测不可达（API 返空 / 页面为空壳），已在调研记录中如实声明，未虚构项目。
2.产出 21 条可借鉴要点（B-01～B-21）与 10 项明确不借鉴决策；本轮落地 13 项（B-01、B-02、B-03、B-04、B-05、B-08、B-10、B-11、B-13、B-14、B-16、B-18、B-21），其余 8 项记录为 backlog 并注明理由。

**二、审计修复（6 项，详见 BUG修复清单）**

1.修复 Logo 自动保存数据丢失：Logo 迁入独立存储键 `smart-vcard-logo-v1`，草稿自动保存不再覆盖已保存的 Logo；兼容旧版内联 Logo 的一次性迁移。
2.修复字段长度上限双源不一致：`FIELD_LIMITS` 成为 schema 与 `mergeWithDefaults` 的唯一事实源，导入/恢复的值不再超出表单自身上限。
3.修复导入超大文件的错误文案误报（按字符数在校验前给出"文件过大"而非"未找到 vCard"）。
4.修复 `TEL;TYPE=VOICE` 被误判为工作电话。
5.修复制表符未从 vCard 值中剥离。
6.修复残缺地址写入 junk ADR 行（借鉴 B-04）：street 与 city 齐全才输出 `ADR;TYPE=WORK`（B-05）。

**三、视觉重构：「纸本工坊」→「靛格制签 / Indigo Grid」**

1.新视觉体系：冷纸画布 `#f4f6fa`、墨蓝 `#16213a`、靛蓝主色 `#2b4acb`、松绿/琥珀辅色；无衬线粗体标题（全面替换衬线体系）；12–14px 圆角 + 柔和投影 + 1px 细线；编号徽标、胶囊标签、幽灵序号。
2.布局重构：首页能力清单改为 2×2 卡片、三步流程改为带幽灵序号的卡片；工坊分组改为徽标标题白卡；交付台三栏白卡；分享页卡片化；关于页版本信息成卡。
3.标题文案中英双语重写（键位不变，由 i18n 测试保证对齐）。
4.25 个图标全部重画（2px 描边、圆角线帽的几何风格）。
5.功能零变更：所有 id/name/选择器/nonce/对外契约保留；浅色单主题、无背景装饰。

**四、功能增强**

1.新增矢量 PDF 导出（A6，jspdf + svg2pdf.js 动态加载，首屏包体不受影响；实测输出合法 PDF）。
2.新增"复制二维码图片"（ClipboardItem，不支持时降级下载 PNG 并如实提示）。
3.表单字段新增字数计数器（接近上限时显示 已用/上限）。
4.二维码 vCard 载荷改用 LF 不折行（借鉴 B-03），.vcf 下载保持 CRLF + 75 字节折行；实测可降 QR 版本。
5.导入多名片文件时提示"检测到 N 张，已载入第 1 张"（借鉴 B-11）。
6.解析器支持引号参数值与 RFC 6868 `^` 转义（借鉴 B-10、B-13）。
7.QR SVG 根节点增加稳定 class `svc-qr`（借鉴 B-21）。

**五、测试与安全**

1.新增像素级二维码解码回环测试（B-01）：jsQR 解码渲染结果，断言与载荷逐字节一致；覆盖 CJK/emoji/重音/转义分号/密集备注；square 与 rounded 走 SVG 端到端，三样式走矩阵级回环（dots 在 Node 端 jsQR 的二值化局限已如实记录）。
2.新增静态隔离守卫测试（B-02）：dist 无第三方引用、无内联脚本、CSP 指令断言、src 无 console、产物无 eval。
3.jspdf 升级至 4.2.1，消除 12 条 critical 级公告；生产依赖审计 0 漏洞；全量（含 dev）12 条均在构建期工具链，不进入 dist（由守卫测试验证）。
4.CI 调整为先构建后测试，使 dist 守卫在流水线真实生效。

**六、版本与工程**

1.版本锁定 v0.1.0（`src/lib/version.ts` 与 `package.json` 一致）。
2.重建 git 仓库：原 worktree 指向的父仓库已不存在，`git init` 建立新基线并提交本轮全部改动。
3.新增 devDependencies：jsqr、pngjs（解码回环测试）；新增 dependencies：jspdf、svg2pdf.js（PDF 导出，运行时动态加载）。
4.输出 20261112 全套交付文档，与本轮最终代码严格对齐。
