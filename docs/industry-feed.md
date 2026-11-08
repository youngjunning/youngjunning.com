# 自建行业资讯源接入

`/aihot` 的“我的关注”读取自建 AIHOT 开源引擎的公开精选接口；周刊仍是本站单独核对原文后写成的文章。`aihot.news` 是上游运营站，不是站内动态的数据源。

将服务端环境变量 `INDUSTRY_FEED_ORIGIN` 设置为**自己部署的实例根地址**，例如 `https://news.example.com`。页面请求该地址的 `/api/v1/items?mode=selected&window=7d&by=published&limit=12`，最多等待 5 秒，并按 60 秒重新验证。未配置、不可用和空结果分别显示对应状态。变量只在服务端使用，不要加 `NEXT_PUBLIC_` 前缀。

自建实例需要独立运行 AIHOT 的 API、worker、web 和 PostgreSQL；在其实例 `/admin` 管理信源、类别与精选规则。部署按[上游部署文档](https://github.com/KKKKhazix/AIHOT/blob/main/docs/deploy.md)，定制按[上游定制文档](https://github.com/KKKKhazix/AIHOT/blob/main/docs/customize.md)。本站的 Next.js 发布不启动采集 worker 或数据库。

若两站读同一实例，该实例只可发布两站均获准展示的来源；内部或敏感信源需要单独实例和访问边界。两站各自配置环境变量，不能把公司站的私有数据通过公开站输出。配置后分别核验两站实际页面、条目与原文链接，并确认来源和显示范围。
