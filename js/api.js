/* 共用：資料讀取。所有資料請求都必須經過本檔，其他檔案不得直接呼叫 fetch。
   讀取順序：Webhook API（POST）→ 範例資料檔（預覽模式，只讀）。
   網址與方法登記於 docs/API.md 第 1 節。
   儲存與動作欄位屬於編輯頁階段，尚未建立。 */
(function (global) {
  "use strict";

  const API_URL = "https://hook.eu1.make.com/t98j1ts3bk6jt0a79q5iad4ok8mgqpj3";
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

  async function requestJson(url, method, body) {
    const options = {
      method: method,
      headers: { Accept: "application/json" },
      cache: "no-store"
    };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    return response.json();
  }

  async function loadResume(action) {
    if (global.location.protocol === "file:") {
      return { success: false, reason: "file-protocol" };
    }

    try {
      const body = action ? { action: action } : {};
      const payload = await requestJson(API_URL, "POST", body);
      if (isPlainObject(payload) && payload.success === false) {
        return { success: false, reason: "api-failed" };
      }
      const data = isPlainObject(payload) && payload.success === true ? payload.data : payload;
      if (isCollection(data)) {
        return { success: true, data: data, source: "api" };
      }
      return { success: false, reason: "api-invalid" };
    } catch (error) {
      // API 讀取失敗時，改讀範例資料檔。
    }

    try {
      const data = await requestJson(PREVIEW_URL, "GET");
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
