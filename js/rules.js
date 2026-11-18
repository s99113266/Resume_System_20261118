/* 共用：欄位顯示與格式規則。驗證與顯示都引用本檔，禁止在單頁 JS 重寫。
   資料格式以 docs/API.md 為單一來源；編輯頁的驗證與動作值於該階段補上。 */
(function (global) {
  "use strict";

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function graduationLabel(value) {
    const status = text(value);
    return status === "畢業" || status === "肄業" ? status : "未提供";
  }

  function genderLabel(value) {
    const labels = { male: "男", female: "女", other: "其他" };
    return labels[text(value)] || "未提供";
  }

  function formatDate(value) {
    const raw = text(value);
    return raw ? raw.replace(/-/g, ".") : "未提供";
  }

  function formatYearMonth(value) {
    const raw = text(value);
    return raw ? raw.replace("-", ".") : "未提供";
  }

  function formatPeriod(start, end) {
    const startText = text(start) ? formatYearMonth(start) : "未提供";
    const endText = text(end) ? formatYearMonth(end) : "至今";
    return startText + " – " + endText;
  }

  global.ResumeApp = global.ResumeApp || {};
  global.ResumeApp.rules = {
    text: text,
    genderLabel: genderLabel,
    formatDate: formatDate,
    graduationLabel: graduationLabel,
    formatYearMonth: formatYearMonth,
    formatPeriod: formatPeriod
  };
})(window);

