export const articleReuseNotice = '欢迎分享链接；摘录请注明作者和原文。全文转载或商用，先和作者打声招呼；文中第三方内容仍按各自授权使用。';

export function articleNoticeMarkdown(author: string, url: string) {
  return `> **文章作者**：${author}\n> **原文链接**：${url}\n> **转载说明**：${articleReuseNotice}`;
}
