import { lazy, Suspense, useState, useRef, useEffect } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { hoiChatBot, resetHistory } from "./groq";
import "./App.css";

const ChatMessage = lazy(() => import("./ChatMessage"));

export default function ChatBot() {
  const [mo, setMo] = useState(false);
  const [tinNhan, setTinNhan] = useState([
    {
      vai: "bot",
      noiDung:
        "👋 Xin chào! Mình là trợ lý AI của Trường THPT Bình Long.\n\nEm có thể hỏi mình về **nội quy nhà trường** như:\n• Giờ vào học là mấy giờ?\n• Đồng phục quy định thế nào?\n• Đi trễ bị trừ bao nhiêu điểm?\n\nHoặc nếu em cần tính toán, mình cũng sẵn sàng giúp nhé! 🌸",
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

    setTinNhan((prev) => [
      ...prev,
      { vai: "user", noiDung: cauHoi },
      { vai: "bot", noiDung: "" },
    ]);
    setInput("");
    setDangGoi(true);

    try {
      const traLoi = await hoiChatBot(cauHoi, (_chunk, fullText) => {
        setTinNhan((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].vai === "bot") {
            updated[lastIndex] = { vai: "bot", noiDung: fullText };
          }
          return updated;
        });
      });

      setTinNhan((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].vai === "bot") {
          updated[lastIndex] = { vai: "bot", noiDung: traLoi };
        }
        return updated;
      });
    } catch (err) {
      console.error("Lỗi nhận phản hồi chatbot:", err);
      setTinNhan((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].vai === "bot") {
          updated[lastIndex] = {
            vai: "bot",
            noiDung: "❌ Không thể nhận câu trả lời lúc này. Em thử lại sau nhé!",
          };
        }
        return updated;
      });
    } finally {
      setDangGoi(false);
    }
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

  function renderTin(text) {
    return (
      <Suspense fallback={<span>{text}</span>}>
        <ChatMessage text={text} />
      </Suspense>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <>
      <AnimatePresence mode="wait">
        {!mo && (
          <motion.button
            className="chatbot-nut-noi"
            onClick={() => setMo(true)}
            title="Hỏi trợ lý học tập"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              y: { repeat: Infinity, duration: 2 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            💬
          </motion.button>
        )}

        {mo && (
          <motion.div
            className="chatbot-khung"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="chatbot-header">
              <div className="chatbot-header-left">
                <span className="chatbot-avatar">🤖</span>
                <div>
                  <b>Trợ lý học tập</b>
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
              {dangGoi && tinNhan[tinNhan.length - 1]?.noiDung === "" && (
                <div className="chatbot-tin bot">
                  <div className="chatbot-bubble chatbot-dang-goi">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Nhắc người dùng tránh gửi tin nhắn quá nhanh */}
            <div className="chatbot-note">
              ⚠️ Vui lòng không gửi tin nhắn quá nhanh để tránh bị giới hạn.
            </div>

            <div className="chatbot-input">
              <input
                type="text"
                placeholder="Hỏi về nội quy hoặc bài tập..."
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
          </motion.div>
      )}
      </AnimatePresence>
      </>
    </MotionConfig>
  );
}