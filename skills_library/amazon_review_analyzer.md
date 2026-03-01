# 技能名称: 亚马逊：Listing 评价深度语义分析
# 描述: 自动进入指定 ASIN 的商品页面，收集最新及最有用的买家评价 (Reviews)，并调用 LLM 总结产品的核心优缺点，用于改良自有产品。
# 所属分类: 亚马逊电商运营套件

## 参数
- {{asin}}: 目标商品的 ASIN 码（例如：B08FBGXZL4）
- {{marketplace}}: 亚马逊站点后缀（默认 com）
- {{review_count}}: 计划分析的评价页数（默认 2）

## 步骤
1. 导航到 https://www.amazon.{{marketplace}}/dp/{{asin}}
2. 页面加载后，执行向下滚动动作，模拟买家浏览主图和五点描述 (Bullet Points)。
3. 定位到页面下方的 "Customer reviews" 区域。
4. 点击 "See all reviews" 链接，进入完整的评价列表页面。
5. 在评价页面中，找到 "Sort by" 下拉菜单。如果是为了分析产品缺陷，可以模拟点击并选择 "Recent"（最新）或过滤出 1-star / 2-star 的评价。
6. 使用 read_page_text 抓取当前页面的买家评价正文。
7. 如果 {{review_count}} 大于 1，定位并使用拟人物理点击 "Next page" 按钮，并重复步骤 6。
8. 将收集到的所有 Review 文本发送给 LLM，要求 LLM 基于这些真实反馈生成一份《产品优缺点与改良建议分析报告》。
9. 任务完成，输出报告。
