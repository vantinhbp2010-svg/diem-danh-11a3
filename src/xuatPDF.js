export function xuatPDF(title = "Báo cáo điểm danh") {
  try {
    const source = document.body.innerHTML;
    const app = document.querySelector(".container");
    const content = app ? app.outerHTML : source;
    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      window.dispatchEvent(new CustomEvent("app:toast", {
        detail: {
          type: "warning",
          message: "Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup để xuất PDF.",
        },
      }));
      return false;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1, h2, h3 { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #eff6ff; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e0f2fe; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    return true;
  } catch (error) {
    console.error("Lỗi xuất PDF:", error);
    return false;
  }
}
