# UI 样式规范与设计体系 (Unified Obsidian Purple)

> **版本**: V3.0
> **最后更新**: 2026-02-28
> **定位**: VeilBrowser 采用“全局黑曜石紫 (Unified Obsidian Purple)”设计体系。它抛弃了普通 SaaS 的亮色与粗糙暗黑模式，专为高级隐私浏览器、RPA 自动化监控和长时间运营打造。其核心理念是：**极致沉浸、高锐度对比、呼吸光影**。

## 1. 核心设计理念

1. **去边框化与光影融合**：不再使用死板的实线边框分割区域，而是通过微弱的环境光（Radial Glow）和深浅不一的底层背景色（Elevation）来划分空间。
2. **拒绝死黑 (Avoid Pure Black)**：深色模式绝不使用 `#000000`。我们使用带有一丝紫色基因的极深紫黑（Obsidian），让整个界面在暗光下透出高级的质感。
3. **高锐度信息层**：用于阅读的文本（如日志、代码、数据面板）必须具有极高的对比度（Crisp White vs Deep Dark），确保长时间工作不费眼。

## 2. 核心色彩变量 (Tailwind CSS)

所有组件必须严格使用 `index.css` 中定义的 CSS 变量，**严禁在代码中硬编码 HEX 颜色**（尤其是不要使用 Tailwind 默认的 `slate`、`gray` 等色系，它们会破坏紫调氛围）。

| 变量名 | 色值 (HSL) | 用途与语义 |
| :--- | :--- | :--- |
| `--background` | `266 53% 4%` | **全局基底**：极深的黑曜石紫 (`#0a0512`)。用于 `<body>` 和全局最底层的画布。 |
| `--card` / `--popover` | `266 29% 7%` | **内容容器**：稍微悬浮的深色 (`#120d18`)。用于所有主要内容块、模态框、下拉菜单的背景。 |
| `--secondary` | `266 25% 10%` | **次级面板**：更浅一点的紫灰色 (`#181320`)。用于侧边栏 (Sidebar)、次要信息块的背景。 |
| `--muted` | `266 25% 11%` | **弱化背景**：常用于禁用状态或极不重要的斑马线背景 (`#1a1523`)。 |
| `--primary` | `265 66% 50%` | **品牌高亮**：经典高饱和度紫色 (`#722ed1`)。用于主按钮、激活状态、关键进度条。 |
| `--accent` | `265 66% 15%` | **氛围点缀**：微弱的紫光背景。常配合 `--primary` 营造发光感。 |
| `--foreground` | `210 40% 98%` | **主文本色**：高对比度的冷白。用于标题、正文、日志输出。 |
| `--muted-foreground`| `215 20% 65%` | **次级文本色**：清晰的中性灰。用于描述文本、占位符、次要指标。 |
| `--border` / `--input`| `266 20% 14%` | **边框与输入框**：带有微弱紫意的深灰色边框，极其克制。 |

## 3. 关键交互模式规范

### 3.1 侧边栏与导航 (Sidebar & Nav)
- **材质**：采用 `bg-black/20 backdrop-blur-xl`，让全局的环境光能微弱透射过来。
- **选中状态 (Active)**：使用横向微渐变 `bg-gradient-to-r from-primary/20 to-primary/5`，配合微弱的 `border-primary/20`，杜绝大面积的实色填充，营造出类似高级 IDE 的呼吸感。

### 3.2 顶层容器氛围光晕 (Global Glow)
- 在最外层的布局容器上，必须挂载径向渐变：`bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background`。
- **作用**：让原本平面的 Web UI 产生纵深感（Z轴），仿佛屏幕顶部有一盏紫色的氛围灯向下洗墙。

### 3.3 按钮与控制组件 (Buttons & Controls)
- **Primary 按钮**：实色背景 `bg-primary hover:bg-primary/90`，必须带有微弱的发光阴影 `shadow-[0_0_15px_rgba(114,46,209,0.3)]`，点击时带有 `active:scale-95` 微缩效果。
- **Secondary / Ghost 按钮**：使用 `bg-secondary hover:bg-white/5`，不要滥用边框，依靠 Hover 态的底色变化来提示可点击性。

### 3.4 状态徽章 (Status Badges)
状态指示器必须采用 **“极暗底色 + 高亮发光边框/文字”** 的赛博朋克风格：
- **运行中 (Running)**: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
- **错误/中断 (Error)**: `bg-red-500/10 text-red-400 border-red-500/20`
- **挂起/加密 (Pending)**: `bg-blue-500/10 text-blue-400 border-blue-500/20`

## 4. 排版与图标 (Typography & Iconography)

- **字体栈**：
  - UI 界面：`font-sans` (Inter 或系统默认无衬线字体)。
  - 日志/代码/标识符：必须使用 `font-mono` (JetBrains Mono 或等宽字体)，以体现硬核工程感。
- **图标系统**：全面使用 `lucide-solid`。图标大小一般为 `w-4 h-4`，核心标题处可使用 `w-6 h-6 text-primary`。

---
> **开发者约束**：任何新页面的开发，必须在浏览器中检查是否破坏了全局的 `Obsidian Purple` 氛围。不要引入生硬的 `#fff`、`#000` 或默认的 Tailwind 蓝色系。