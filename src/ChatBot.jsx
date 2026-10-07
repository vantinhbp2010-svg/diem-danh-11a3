import { useState, useRef, useEffect } from "react";
import { hoiChatBot, resetHistory } from "./gemini";
import "./App.css";

export default function ChatBot() {
  const [mo, setMo] = useState(false);
  const [tinNhan, setTinNhan] = useState([
    {
      vai: "bot",
      noiDung:
        "👋 Xin chào! Mình là trợ lý AI của Trường THPT Bình Long.\n\nEm có thể hỏi mình về **nội quy nhà trường** như:\n• Giờ vào học là mấy giờ?\n• Đồng phục quy định thế nào?\n• Đi trễ bị trừ bao nhiêu điểm?\n• Có được dùng điện thoại không?\n\nEm hỏi gì đi! 🌸",
    },
  ]);
  const [dangGoi, setDangGoi] = useState(false);
  const [input, setInput] = useState("");
  const cuonRef = useRef(null);

  useEffect(() => {
    if (cuonRef.current) {
      cuonRef.current.scrollTop = cuonRef.current.scrollHeight;
    }
  }, [tinNhan]);

  async function guiTin() {
    const cauHoi = input.trim();
    if (!cauHoi || dangGoi) return;

    setTinNhan((prev) => [...prev, { vai: "user", noiDung: cauHoi }]);
    setInput("");
    setDangGoi(true);

    const traLoi = await hoiChatBot(cauHoi);

    setTinNhan((prev) => [...prev, { vai: "bot", noiDung: traLoi }]);
    setDangGoi(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      guiTin();
    }
  }

  function reset() {
    if (!window.confirm("Xóa lịch sử trò chuyện?")) return;
    resetHistory();
    setTinNhan([
      {
        vai: "bot",
        noiDung: "🔄 Đã reset cuộc trò chuyện. Em hỏi mình gì mới nhé!",
      },
    ]);
  }

  // Render tin nhắn với xuống dòng
  function renderTin(text) {
    return text.split("\n").map((line, i) => <div key={i}>{line}</div>);
  }

  return (
    <>
      {/* Nút nổi */}
      {!mo && (
        <button
          className="chatbot-nut-noi"
          onClick={() => setMo(true)}
          title="Hỏi về nội quy trường"
        >
          💬
        </button>
      )}

      {/* Khung chat */}
      {mo && (
        <div className="chatbot-khung">
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <span className="chatbot-avatar">🤖</span>
              <div>
                <b>Trợ lý nội quy</b>
                <p>THPT Bình Long</p>
              </div>
            </div>
            <div className="chatbot-header-right">
              <button onClick={reset} title="Reset">
                🔄
              </button>
              <button onClick={() => setMo(false)} title="Đóng">
                ✖
              </button>
            </div>
          </div>

          <div className="chatbot-body" ref={cuonRef}>
            {tinNhan.map((tn, i) => (
              <div
                key={i}
                className={
                  tn.vai === "user"
                    ? "chatbot-tin user"
                    : "chatbot-tin bot"
                }
              >
                <div className="chatbot-bubble">
                  {renderTin(tn.noiDung)}
                </div>
              </div>
            ))}
            {dangGoi && (
              <div className="chatbot-tin bot">
                <div className="chatbot-bubble chatbot-dang-goi">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Nhập câu hỏi về nội quy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={dangGoi}
              autoFocus
            />
            <button onClick={guiTin} disabled={dangGoi || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}