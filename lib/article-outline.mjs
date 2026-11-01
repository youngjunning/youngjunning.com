import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize from 'rehype-sanitize';

// Use the reader's exact rendering pipeline so Unicode, repeated headings,
// historical HTML and sanitization prefixes produce the same anchor IDs.
export function articleOutline(markdown) {
  const processor=unified().use(remarkParse).use(remarkGfm).use(remarkRehype,{allowDangerousHtml:true}).use(rehypeRaw).use(rehypeSlug).use(rehypeSanitize);
  const tree=processor.runSync(processor.parse(markdown)),headings=[];
  const text=node=>node.type==='text'?node.value:(node.children||[]).map(text).join('');
  function visit(node){
    if(node.type==='element'&&['h2','h3'].includes(node.tagName)&&node.properties?.id)headings.push({id:String(node.properties.id),label:text(node),level:Number(node.tagName.slice(1))});
    for(const child of node.children||[])visit(child);
  }
  visit(tree);return headings;
}
