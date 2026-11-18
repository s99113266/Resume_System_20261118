/* 共用：資料讀取。所有資料請求都必須經過本檔，其他檔案不得直接呼叫 fetch。
   讀取順序：後端 API → 範例資料檔（預覽模式，只讀）。
   儲存與動作欄位屬於編輯頁階段，尚未建立。 */
(function (global) {
  "use strict";

  const API_URL = "api/resume";
  const PREVIEW_URL = "data/resume.json";
  const SECTION_KEYS = [
    "basicInfo",
    "education",
    "experience",
    "portfolio",
    "skills",
    "certificates",
    "desiredPositions",
    "introduction",
    "introductionEn"
  ];

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function isCollection(value) {
    return isPlainObject(value) && SECTION_KEYS.every(function (key) {
      return key in value;
    });
  }

  async function requestJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    return response.json();
  }

  async function loadResume() {
    if (global.location.protocol === "file:") {
      return { success: false, reason: "file-protocol" };
    }

    try {
      const payload = await requestJson(API_URL);
      if (isPlainObject(payload) && payload.success === false) {
        return { success: false, reason: "api-failed" };
      }
      const data = isPlainObject(payload) && payload.success === true ? payload.data : payload;
      if (isCollection(data)) {
        return { success: true, data: data, source: "api" };
      }
      return { success: false, reason: "api-invalid" };
    } catch (error) {
      // 後端尚未實作時，改讀範例資料檔。
    }

    try {
      const data = await requestJson(PREVIEW_URL);
      if (isCollection(data)) {
        return { success: true, data: data, source: "preview" };
      }
      return { success: false, reason: "preview-invalid" };
    } catch (error) {
      return { success: false, reason: "network" };
    }
  }

  global.ResumeApp = global.ResumeApp || {};
  global.ResumeApp.api = { loadResume: loadResume };
})(window);
