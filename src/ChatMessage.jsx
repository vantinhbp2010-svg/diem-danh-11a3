import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";

const CODE_SPAN_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\n]*`+)/g;
const BRACKET_MATH_PATTERN =
  /(^|[^\w!\\])\\?\[\s*([\s\S]*?)\s*\\?\](?!\s*(?:\(|\[))/g;

function formatMathDelimiters(text) {
  return text
    .split(CODE_SPAN_PATTERN)
    .map((part, index) => {
      if (index % 2 === 1) return part;

      return part.replace(BRACKET_MATH_PATTERN, (match, prefix, content) => {
        if (/[\\^_=+\-*/]/.test(content)) {
          return `${prefix}$$${content.trim()}$$`;
        }
        return match;
      });
    })
    .join("");
}

export default function ChatMessage({ text }) {
  const formattedText = formatMathDelimiters(text);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
    >
      {formattedText}
    </ReactMarkdown>
  );
}
