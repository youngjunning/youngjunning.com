export const articleLicenseName = 'CC BY-NC-SA 4.0';
export const articleLicenseUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';

export function articleNoticeMarkdown(author: string, url: string) {
  return `> **文章作者**：${author}\n> **文章链接**：${url}\n> **版权声明**：除特别声明外，本博客所有文章均采用 [${articleLicenseName}](${articleLicenseUrl}) 授权协议。转载请注明出处：[硅基俊宁](https://youngjunning.com)。`;
}
