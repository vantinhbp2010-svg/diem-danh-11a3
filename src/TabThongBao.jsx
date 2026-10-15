import { useEffect, useMemo, useState } from "react";
import { getAttendanceByDate } from "./storage";
import { getLichSuGui, luuLichSuGui } from "./thongBaoStorage";
import { renderMauThongBao } from "./mauThongBao";

function getStatusForStudent(studentId, buoi, attendanceData) {
  const buoiData = attendanceData[studentId]?.[buoi] || {};
  const match = Object.entries(buoiData).find(([, value]) =>
    value && ["Vắng", "Có phép", "Đi trễ"].includes(value.trangThai)
  );

  if (!match) return null;
  return {
    status: match[1].trangThai,
    tiet: Number(match[0].replace("tiet", "")),
    phut: match[1].phutTre || 0,
  };
}

export default function TabThongBao({ students = [], maLop = "11A3", selectedDate = "" }) {
  const [date, setDate] = useState(selectedDate || new Date().toISOString().slice(0, 10));
  const [buoi, setBuoi] = useState("sang");
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getAttendanceByDate(date).then((data) => setAttendanceData(data || {}));
    setHistory(getLichSuGui(maLop, date));
  }, [date, maLop]);

  const danhSachGui = useMemo(() => {
    const rows = [];
    students.forEach((student) => {
      const result = getStatusForStudent(student.id, buoi, attendanceData);
      if (!result) return;
      rows.push({
        ...student,
        ...result,
        statusLabel: result.status,
      });
    });
    return rows;
  }, [attendanceData, buoi, students]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length === 0 && danhSachGui.length) {
        return danhSachGui.map((item) => item.id);
      }
      return prev.filter((id) => danhSachGui.some((item) => item.id === id));
    });
  }, [danhSachGui]);

  const selectedStudents = danhSachGui.filter((item) => selectedIds.includes(item.id));

  const fullContent = selectedStudents
    .map((student) => {
      const type = student.statusLabel === "Vắng" ? "vang" : student.statusLabel === "Đi trễ" ? "tre" : "coPhep";
      return renderMauThongBao(type, {
        ten: student.name,
        tiet: student.tiet,
        buoi,
        ngay: date,
        phut: student.phut,
      });
    })
    .join("\n\n---\n\n");

  function toggleStudent(studentId) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function copyList() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullContent || "");
      }
      window.alert("Đã sao chép danh sách thông báo.");
    } catch (error) {
      window.prompt("Sao chép danh sách sau:", fullContent || "");
    }
  }

  function openZalo(student) {
    const phone = student.phone || student.sdt || "";
    if (!phone) return;
    window.open(`https://zalo.me/${phone}`, "_blank", "noopener");
  }

  function openSMS(student) {
    const phone = student.phone || student.sdt || "";
    if (!phone) return;
    const text = selectedStudents
      .filter((item) => item.id === student.id)
      .map((item) => renderMauThongBao(item.statusLabel === "Vắng" ? "vang" : item.statusLabel === "Đi trễ" ? "tre" : "coPhep", {
        ten: item.name,
        tiet: item.tiet,
        buoi,
        ngay: date,
        phut: item.phut,
      }))
      .join("\n");
    window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
  }

  function saveHistoryNow() {
    const payload = selectedStudents.map((student) => ({
      id: student.id,
      name: student.name,
      status: student.statusLabel,
      tinh: buoi,
      tiet: student.tiet,
      text: renderMauThongBao(
        student.statusLabel === "Vắng" ? "vang" : student.statusLabel === "Đi trễ" ? "tre" : "coPhep",
        { ten: student.name, tiet: student.tiet, buoi, ngay: date, phut: student.phut }
      ),
    }));

    luuLichSuGui(maLop, date, payload);
    setHistory(getLichSuGui(maLop, date));
    window.alert("Đã lưu lịch sử gửi thông báo.");
  }

  return (
    <div className="notify-panel">
      <div className="notify-toolbar">
        <label>
          Ngày
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          Buổi
          <select value={buoi} onChange={(event) => setBuoi(event.target.value)}>
            <option value="sang">Sáng</option>
            <option value="chieu">Chiều</option>
          </select>
        </label>
      </div>

      <div className="notify-list">
        {danhSachGui.length === 0 ? (
          <p className="empty-state">Không có học sinh vắng / đi trễ / có phép trong ngày này.</p>
        ) : (
          danhSachGui.map((student) => (
            <label key={student.id} className="notify-item">
              <input
                type="checkbox"
                checked={selectedIds.includes(student.id)}
                onChange={() => toggleStudent(student.id)}
              />
              <div>
                <strong>{student.name}</strong>
                <span>
                  {student.statusLabel} • tiết {student.tiet}
                </span>
              </div>
              <div className="notify-actions">
                <button type="button" onClick={() => openZalo(student)}>📱 Zalo</button>
                <button type="button" onClick={() => openSMS(student)}>💬 SMS</button>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="notify-message-box">
        <h4>Soạn tin nhắn</h4>
        <textarea
          rows={8}
          value={fullContent}
          onChange={(event) => {}}
          aria-label="Nội dung thông báo"
        />
        <div className="notify-actions-row">
          <button type="button" onClick={copyList}>📋 Copy tất cả</button>
          <button type="button" className="primary" onClick={saveHistoryNow}>💾 Lưu lịch sử</button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="history-box">
          <h4>Lịch sử gửi gần đây</h4>
          <ul>
            {history.slice(-5).reverse().map((item, index) => (
              <li key={`${item.id || index}-${index}`}>
                <strong>{item.name}</strong> — {item.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
