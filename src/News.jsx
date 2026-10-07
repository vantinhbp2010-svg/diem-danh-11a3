import { useState, useEffect, useRef } from "react";
import {
  getAllNews,
  addNews,
  duyetTin,
  toggleGhim,
  xoaTin,
  uploadAnh,
} from "./newsStorage";
import "./App.css";

export default function News({ laGiaoVien, tenNguoiDung }) {
  const [danhSach, setDanhSach] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("hienthi");

  const [ten, setTen] = useState(tenNguoiDung || "");
  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [anhFile, setAnhFile] = useState(null);
  const [anhPreview, setAnhPreview] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [thongBao, setThongBao] = useState("");
  const [xemAnh, setXemAnh] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getAllNews();
      setDanhSach(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Nén ảnh trước khi upload — giảm 3MB → 200KB
  function nenAnh(file, maxWidth = 1200, quality = 0.75) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = (h * maxWidth) / w;
            w = maxWidth;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              const newFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, "") + ".jpg",
                { type: "image/jpeg" }
              );
              resolve({
                file: newFile,
                preview: canvas.toDataURL("image/jpeg", quality),
              });
            },
            "image/jpeg",
            quality
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function chonAnh(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setThongBao("❌ File không phải ảnh");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setThongBao("❌ Ảnh quá lớn — tối đa 10MB");
      return;
    }

    try {
      setThongBao("⏳ Đang nén ảnh...");
      const { file: fileNen, preview } = await nenAnh(file);
      setAnhFile(fileNen);
      setAnhPreview(preview);
      setThongBao(
        `✅ Đã nén: ${(file.size / 1024).toFixed(0)} KB → ${(
          fileNen.size / 1024
        ).toFixed(0)} KB`
      );
      setTimeout(() => setThongBao(""), 3000);
    } catch (err) {
      setThongBao("❌ Lỗi nén ảnh: " + err.message);
    }
  }

  function xoaAnh() {
    setAnhFile(null);
    setAnhPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDang() {
    if (!ten.trim()) return setThongBao("❌ Chưa nhập tên");
    if (!tieuDe.trim()) return setThongBao("❌ Chưa nhập tiêu đề");
    if (!noiDung.trim()) return setThongBao("❌ Chưa nhập nội dung");

    setDangGui(true);
    setThongBao("⏳ Đang xử lý...");

    try {
      let anhUrl = null;

      if (anhFile) {
        setThongBao("⏳ Đang tải ảnh lên ImgBB...");
        anhUrl = await uploadAnh(anhFile);
      }

      await addNews({
        ten,
        tieuDe,
        noiDung,
        vaiTro: laGiaoVien ? "giaovien" : "hocsinh",
        anhUrl,
      });

      setThongBao(
        laGiaoVien ? "✅ Đã đăng tin" : "✅ Đã gửi — chờ giáo viên duyệt"
      );

      setTieuDe("");
      setNoiDung("");
      xoaAnh();
      await loadData();

      setTimeout(() => {
        setThongBao("");
        setTab("hienthi");
      }, 1500);
    } catch (err) {
      setThongBao("❌ Lỗi: " + err.message);
    } finally {
      setDangGui(false);
    }
  }

  async function handleDuyet(id) {
    if (!window.confirm("Duyệt tin này?")) return;
    await duyetTin(id);
    await loadData();
  }

  async function handleXoa(id) {
    if (!window.confirm("Xóa tin này? Không thể hoàn tác!")) return;
    await xoaTin(id);
    await loadData();
  }

  async function handleGhim(id, ghim) {
    await toggleGhim(id, ghim);
    await loadData();
  }

  const tinDaDuyet = danhSach.filter((n) => n.daDuyet === true);
  const tinChoDuyet = danhSach.filter((n) => n.daDuyet !== true);

  function formatTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}, ${dd}/${mm}/${yyyy}`;
  }

  return (
    <>
      <div className="news-tabs">
        <button
          className={tab === "hienthi" ? "active" : ""}
          onClick={() => setTab("hienthi")}
        >
          📰 Bản tin ({tinDaDuyet.length})
        </button>
        {laGiaoVien && (
          <button
            className={tab === "chuDuyet" ? "active" : ""}
            onClick={() => setTab("chuDuyet")}
          >
            ⏳ Chờ duyệt ({tinChoDuyet.length})
          </button>
        )}
        <button
          className={tab === "dang" ? "active" : ""}
          onClick={() => setTab("dang")}
        >
          ✍️ Đăng tin
        </button>
      </div>

      {thongBao && <div className="msg">{thongBao}</div>}
      {loading && <p style={{ textAlign: "center" }}>⏳ Đang tải...</p>}

      {tab === "hienthi" && !loading && (
        <>
          {tinDaDuyet.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
              📭 Chưa có bản tin nào
            </p>
          ) : (
            <div className="news-list">
              {tinDaDuyet.map((n) => (
                <div
                  key={n.id}
                  className={`news-card ${n.ghim ? "ghim" : ""}`}
                >
                  <div className="news-header">
                    <div className="news-author">
                      <span className="news-badge">
                        {n.vaiTro === "giaovien"
                          ? "✅ Giáo viên"
                          : "🧑 Học sinh"}
                      </span>
                      <b>{n.ten}</b>
                    </div>
                    <div className="news-actions">
                      {n.ghim && <span>📌</span>}
                      {laGiaoVien && (
                        <>
                          <button
                            onClick={() => handleGhim(n.id, n.ghim)}
                            style={{ background: "none", padding: 4 }}
                          >
                            {n.ghim ? "📍" : "📌"}
                          </button>
                          <button
                            onClick={() => handleXoa(n.id)}
                            style={{ background: "none", padding: 4 }}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <h3 className="news-title">{n.tieuDe}</h3>
                  <p className="news-content">{n.noiDung}</p>

                  {n.anhUrl && (
                    <img
                      src={n.anhUrl}
                      alt="Ảnh bản tin"
                      className="news-image"
                      onClick={() => setXemAnh(n.anhUrl)}
                    />
                  )}

                  <p className="news-time">{formatTime(n.thoiGian)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "chuDuyet" && laGiaoVien && !loading && (
        <>
          {tinChoDuyet.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
              ✅ Không có tin chờ duyệt
            </p>
          ) : (
            <div className="news-list">
              {tinChoDuyet.map((n) => (
                <div key={n.id} className="news-card cho-duyet">
                  <div className="news-header">
                    <div className="news-author">
                      <span className="news-badge pending">⏳ Chờ duyệt</span>
                      <b>{n.ten}</b>
                    </div>
                    <div className="news-actions">
                      <button
                        onClick={() => handleDuyet(n.id)}
                        style={{ background: "#10b981", padding: "5px 12px" }}
                      >
                        ✅ Duyệt
                      </button>
                      <button
                        onClick={() => handleXoa(n.id)}
                        style={{
                          background: "#ef4444",
                          padding: "5px 12px",
                          marginLeft: 6,
                        }}
                      >
                        ❌ Từ chối
                      </button>
                    </div>
                  </div>
                  <h3 className="news-title">{n.tieuDe}</h3>
                  <p className="news-content">{n.noiDung}</p>

                  {n.anhUrl && (
                    <img
                      src={n.anhUrl}
                      alt="Ảnh"
                      className="news-image"
                      onClick={() => setXemAnh(n.anhUrl)}
                    />
                  )}

                  <p className="news-time">{formatTime(n.thoiGian)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "dang" && (
        <div className="news-form">
          <h3>✍️ Đăng bản tin mới</h3>
          {!laGiaoVien && (
            <p
              style={{
                background: "#fef3c7",
                padding: 10,
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              ⚠️ Tin của học sinh sẽ chờ <b>giáo viên duyệt</b>.
            </p>
          )}

          <div className="news-form-group">
            <label>Tên của bạn</label>
            <input
              type="text"
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn An"
              disabled={dangGui}
            />
          </div>

          <div className="news-form-group">
            <label>Tiêu đề</label>
            <input
              type="text"
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
              placeholder="Ví dụ: Thông báo nộp bài"
              disabled={dangGui}
            />
          </div>

          <div className="news-form-group">
            <label>Nội dung</label>
            <textarea
              rows="6"
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              placeholder="Nhập nội dung..."
              disabled={dangGui}
            />
          </div>

          <div className="news-form-group">
            <label>Ảnh đính kèm (không bắt buộc, tối đa 10MB)</label>

            {!anhPreview ? (
              <label className="upload-anh-btn">
                📷 Chọn ảnh từ máy
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={chonAnh}
                  disabled={dangGui}
                  style={{ display: "none" }}
                />
              </label>
            ) : (
              <div className="anh-preview">
                <img src={anhPreview} alt="Preview" />
                <button
                  onClick={xoaAnh}
                  type="button"
                  disabled={dangGui}
                  className="xoa-anh-btn"
                >
                  ✖ Xóa ảnh
                </button>
              </div>
            )}
          </div>

          <button onClick={handleDang} disabled={dangGui}>
            {dangGui ? "⏳ Đang gửi..." : "📤 Đăng tin"}
          </button>
        </div>
      )}

      {xemAnh && (
        <div className="modal-anh" onClick={() => setXemAnh(null)}>
          <img src={xemAnh} alt="Xem ảnh" />
          <button className="modal-close" onClick={() => setXemAnh(null)}>
            ✖
          </button>
        </div>
      )}
    </>
  );
}