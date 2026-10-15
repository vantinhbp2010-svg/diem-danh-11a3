import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { getAttendance } from "./storage";

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

function getDateRange(days = 6) {
  const arr = [];
  for (let index = days; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    arr.push(date.toISOString().slice(0, 10));
  }
  return arr;
}

function sumStatus(dayData, status) {
  let total = 0;
  Object.values(dayData || {}).forEach((buoiMap) => {
    Object.values(buoiMap || {}).forEach((tietMap) => {
      Object.values(tietMap || {}).forEach((item) => {
        if (item?.trangThai === status) total += 1;
      });
    });
  });
  return total;
}

export default function TabDashboard({ students = [], attendance = {}, today = "" }) {
  const [allAttendance, setAllAttendance] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAttendance()
      .then((data) => {
        if (active) setAllAttendance(data || {});
      })
      .catch((error) => {
        console.warn("Không tải được dashboard:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const mergedData = useMemo(() => {
    const result = { ...allAttendance };
    if (today && attendance && Object.keys(attendance).length) {
      result[today] = attendance;
    }
    return result;
  }, [allAttendance, attendance, today]);

  const dateLabels = useMemo(() => getDateRange(6), []);

  const weeklyAbsence = useMemo(() => {
    return dateLabels.map((date) => {
      const day = mergedData[date] || {};
      return sumStatus(day, "Vắng") + sumStatus(day, "Đi trễ");
    });
  }, [dateLabels, mergedData]);

  const monthlyTrend = useMemo(() => {
    return dateLabels.map((date) => {
      const day = mergedData[date] || {};
      return sumStatus(day, "Đúng giờ") + sumStatus(day, "Có phép");
    });
  }, [dateLabels, mergedData]);

  const todayStats = useMemo(() => {
    const result = { "Đúng giờ": 0, "Đi trễ": 0, "Vắng": 0, "Có phép": 0 };
    const day = mergedData[today] || {};
    Object.values(day).forEach((buoiMap) => {
      Object.values(buoiMap || {}).forEach((tietMap) => {
        Object.values(tietMap || {}).forEach((item) => {
          if (item?.trangThai) result[item.trangThai] = (result[item.trangThai] || 0) + 1;
        });
      });
    });
    return result;
  }, [mergedData, today]);

  const studentStats = useMemo(() => {
    return students
      .map((student) => {
        let vang = 0;
        let tre = 0;
        let dungGio = 0;
        dateLabels.forEach((date) => {
          const day = mergedData[date] || {};
          const studentData = day[student.id] || {};
          Object.values(studentData).forEach((buoiMap) => {
            Object.values(buoiMap || {}).forEach((item) => {
              if (!item || !item.trangThai) return;
              if (item.trangThai === "Vắng") vang += 1;
              if (item.trangThai === "Đi trễ") tre += 1;
              if (item.trangThai === "Đúng giờ") dungGio += 1;
            });
          });
        });
        return { ...student, vang, tre, dungGio };
      })
      .sort((a, b) => b.vang - a.vang);
  }, [dateLabels, mergedData, students]);

  const cardData = useMemo(() => {
    const totalStudents = students.length || 0;
    const average = totalStudents === 0 ? 0 : ((Math.max(0, totalStudents - (todayStats.Vắng || 0) * 0.5)) / totalStudents) * 100;
    return {
      totalStudents,
      avgScore: Number(Math.max(0, Math.min(100, average))).toFixed(1),
    };
  }, [students.length, todayStats]);

  const barData = {
    labels: dateLabels.map((date) => date.slice(5)),
    datasets: [
      {
        label: "Vắng / trễ",
        data: weeklyAbsence,
        backgroundColor: "#f97316",
        borderRadius: 8,
      },
    ],
  };

  const lineData = {
    labels: dateLabels.map((date) => date.slice(5)),
    datasets: [
      {
        label: "Chuyên cần",
        data: monthlyTrend,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const doughnutData = {
    labels: ["Đúng giờ", "Đi trễ", "Vắng", "Có phép"],
    datasets: [
      {
        data: [
          todayStats["Đúng giờ"],
          todayStats["Đi trễ"],
          todayStats["Vắng"],
          todayStats["Có phép"],
        ],
        backgroundColor: ["#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"],
      },
    ],
  };

  const topAbsent = [...studentStats].sort((a, b) => b.vang - a.vang).slice(0, 5);
  const topLate = [...studentStats].sort((a, b) => b.tre - a.tre).slice(0, 5);
  const topOnTime = [...studentStats].sort((a, b) => b.dungGio - a.dungGio).slice(0, 5);

  if (loading) {
    return <div className="dashboard-loading">Đang tính toán dashboard...</div>;
  }

  return (
    <div className="dashboard-panel">
      <div className="dashboard-header">
        <h3>📊 Dashboard chuyên cần</h3>
        <span className="dashboard-pill">{today || "Hôm nay"}</span>
      </div>

      <div className="dashboard-kpis">
        <div className="kpi-card">
          <span>Tổng HS</span>
          <strong>{cardData.totalStudents}</strong>
        </div>
        <div className="kpi-card">
          <span>Điểm TB lớp</span>
          <strong>{cardData.avgScore} / 100</strong>
        </div>
        <div className="kpi-card warning">
          <span>Vắng + trễ</span>
          <strong>{weeklyAbsence.reduce((sum, value) => sum + value, 0)}</strong>
        </div>
        <div className="kpi-card success">
          <span>Đúng giờ</span>
          <strong>{todayStats["Đúng giờ"] || 0}</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card chart-box large">
          <h4>Biểu đồ cột: Vắng / trễ theo tuần</h4>
          <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>

        <div className="dashboard-card chart-box">
          <h4>Biểu đồ tròn: Hôm nay</h4>
          <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>

        <div className="dashboard-card chart-box large">
          <h4>Biểu đồ đường: Xu hướng chuyên cần</h4>
          <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      <div className="top-grid">
        <div className="top-box">
          <h4>Vắng nhiều nhất</h4>
          <ol>
            {topAbsent.map((student) => (
              <li key={student.id}>
                <span>{student.name}</span>
                <strong>{student.vang}</strong>
              </li>
            ))}
          </ol>
        </div>

        <div className="top-box">
          <h4>Trễ nhiều nhất</h4>
          <ol>
            {topLate.map((student) => (
              <li key={student.id}>
                <span>{student.name}</span>
                <strong>{student.tre}</strong>
              </li>
            ))}
          </ol>
        </div>

        <div className="top-box">
          <h4>Chuyên cần nhất</h4>
          <ol>
            {topOnTime.map((student) => (
              <li key={student.id}>
                <span>{student.name}</span>
                <strong>{student.dungGio}</strong>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
