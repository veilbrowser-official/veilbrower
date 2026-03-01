# 技能名称: 亚马逊：深度竞品情报搜集
# 描述: 模拟真实买家进行关键词搜索，提取首页竞品的核心指标（如价格、评分、Prime 标识），用于选品与市场调研。
# 所属分类: 亚马逊电商运营套件

## 参数
- {{keyword}}: 需要调研的产品关键词（例如：standing desk converter）
- {{marketplace}}: 亚马逊站点后缀（例如：com, co.uk, de，默认 com）

## 步骤
1. 导航到 https://www.amazon.{{marketplace}}/
2. 检查页面是否出现 "Enter the characters you see below" (验证码)。如果出现，等待人类接管或尝试通过 L2 轨迹随机点击周围空白处。
3. 检查左上角的配送地址 (Deliver to)。如果不是目标国家，建议先弹窗提示需要注入对应的邮编。
4. 定位顶部的搜索框（通常 id="twotabsearchtextbox"）。
5. 执行物理拟人输入（带有类泊松分布延迟）：输入关键词 {{keyword}}。
6. 按下回车键或使用贝塞尔轨迹点击搜索图标 (id="nav-search-submit-button")。
7. 等待页面加载完成，执行 2-3 次“拟人化瀑布流滚动 (scroll_human)”，模拟真实买家在对比搜索结果。
8. 提取当前页面的语义 DOM，识别前 5-10 个自然搜索结果（排除 Sponsored 广告位）。
9. 使用 read_page_text 或 LLM 视觉能力提取这几个竞品的：标题、价格、评分（如 4.5 out of 5 stars）、评论数量。
10. 将提取的竞品情报汇总为一份结构化的中文报告，并存入当前任务的 Artifacts 库中。
