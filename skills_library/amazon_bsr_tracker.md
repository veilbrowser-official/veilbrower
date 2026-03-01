# 技能名称: 亚马逊：类目 BSR 榜单监控
# 描述: 自动进入指定的 Best Sellers 类目页面，抓取 Top 10 的产品信息，捕捉市场趋势。
# 所属分类: 亚马逊电商运营套件

## 参数
- {{category_url}}: 亚马逊 Best Sellers 类目的直接链接（例如：https://www.amazon.com/Best-Sellers-Home-Kitchen/zgbs/home-garden/）

## 步骤
1. 导航到目标 BSR 链接：{{category_url}}
2. 页面加载完成后，停留 2 秒，观察页面是否弹出促销或 Cookie 同意横幅，如果有则使用 dismiss_cookie_banner 工具关闭。
3. 执行一次缓慢的向下滚动（scroll_down），确保所有产品的图片和排名数字完成懒加载 (Lazy Load)。
4. 使用 extract_semantic_dom 工具获取页面的核心元素树。
5. 识别页面上标记为 #1 到 #10 的商品卡片（通常包含 `.zg-grid-general-faceout` 或类似类名）。
6. 让 LLM 基于 DOM 或屏幕截图，提取这 Top 10 产品的：排名、产品名称、价格以及评价数。
7. 将整理好的榜单数据格式化为 Markdown 表格，总结当前类目的选品趋势。
8. 输出最终的分析简报。
