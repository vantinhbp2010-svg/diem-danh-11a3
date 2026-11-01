import { useEffect, useState } from "react";
import { getThongBaoAdmin, setThongBaoAdmin } from "./bannerStorage";
import { useUx } from "./UxContext";

export default function QuanLyThongBao() {
  const { showToast } = useUx();
  const [noiDung, setNoiDung] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getThongBaoAdmin()
      .then((data) => {
        if (!active || !data) return;
        setNoiDung(typeof data.noiDung === "string" ? data.noiDung : "");
        setIsActive(data.isActive === true);
      })
      .catch((error) => {
        if (active) {
          showToast({
            type: "error",
            message: `Không tải được thông báo hiện tại: ${error.message}`,
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  async function handleSave(event) {
    event.preventDefault();
    const trimmed = noiDung.trim();
    if (!trimmed) {
      showToast({ type: "error", message: "Vui lòng nhập nội dung thông báo." });
      return;
    }

    setSaving(true);
    try {
      await setThongBaoAdmin({
        isActive: true,
        noiDung: trimmed,
        ngay: new Date().toISOString(),
      });
      setNoiDung(trimmed);
      setIsActive(true);
      showToast({ type: "success", message: "Đã gửi thông báo toàn trường." });
    } catch (error) {
      showToast({
        type: "error",
        message: `Không thể gửi thông báo: ${error.message}`,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    setSaving(true);
    try {
      await setThongBaoAdmin({
        isActive: false,
        noiDung,
        ngay: new Date().toISOString(),
      });
      setIsActive(false);
      showToast({ type: "success", message: "Đã tắt thông báo toàn trường." });
    } catch (error) {
      showToast({
        type: "error",
        message: `Không thể tắt thông báo: ${error.message}`,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="quan-ly-thong-bao" aria-labelledby="quan-ly-thong-bao-title">
      <h3 id="quan-ly-thong-bao-title">📢 Thông báo toàn trường</h3>
      <p className="quan-ly-thong-bao-status" role="status">
        {loading
          ? "Đang tải trạng thái thông báo..."
          : isActive
            ? "🔴 Thông báo đang hiển thị với mọi người."
            : "⚪ Hiện không có thông báo khẩn đang bật."}
      </p>
      <form onSubmit={handleSave}>
        <label htmlFor="admin-thong-bao-noi-dung">Nội dung thông báo</label>
        <textarea
          id="admin-thong-bao-noi-dung"
          value={noiDung}
          onChange={(event) => setNoiDung(event.target.value)}
          placeholder="Ví dụ: Hôm nay nghỉ học do thời tiết..."
          maxLength={1000}
          rows={4}
          disabled={loading || saving}
        />
        <div className="quan-ly-thong-bao-actions">
          <button type="submit" disabled={loading || saving || !noiDung.trim()}>
            {saving ? "Đang lưu..." : "📢 Gửi thông báo"}
          </button>
          <button
            type="button"
            className="quan-ly-thong-bao-disable"
            onClick={handleDisable}
            disabled={loading || saving || !isActive}
          >
            ⚪ Tắt thông báo
          </button>
        </div>
      </form>
    </section>
  );
}
