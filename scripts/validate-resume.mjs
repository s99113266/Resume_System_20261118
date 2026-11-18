#!/usr/bin/env node
/**
 * 履歷資料合輯驗證腳本（零相依套件，只使用 Node.js 內建模組）
 *
 * 用法：
 *   node scripts/validate-resume.mjs               # 驗證 data/resume.json
 *   node scripts/validate-resume.mjs <檔案路徑>     # 驗證指定的 JSON 檔
 *
 * 檢查項目：
 *   1. 檔案可讀取且為合法 JSON
 *   2. 根層區段齊全、沒有未定義的區段
 *   3. 每個區段的型別、欄位、必填、格式（日期、網址、身分證字號、手機、信箱）
 *   4. 層數不超過 3 層（清單項目內只能放字串／null，不可再放物件或陣列）
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_FILE = "data/resume.json";

const DATE_YMD = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DATE_YM = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;
const DATE_YM_OPTIONAL = /^(19|20)\d{2}(-(0[1-9]|1[0-2]))?$/;
const ID_NUMBER = /^[A-Z][12]\d{8}$/;
const MOBILE = /^09\d{2}-?\d{3}-?\d{3}$/;
const URL_PATTERN = /^https?:\/\//;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field = (key, label, extra = {}) => ({ key, label, type: "string", ...extra });

const SECTION_RULES = {
  basicInfo: {
    label: "基本資料＋聯繫方式",
    kind: "object",
    fields: [
      field("name", "姓名", { nonEmpty: true }),
      field("birthday", "生日", { pattern: DATE_YMD, hint: "YYYY-MM-DD" }),
      field("idNumber", "身分證字號", { pattern: ID_NUMBER, hint: "1 碼大寫英文 + 9 碼數字" }),
      field("photoUrl", "照片網址", { pattern: URL_PATTERN, hint: "http(s):// 開頭的圖片網址" }),
      field("gender", "性別", { enum: ["male", "female", "other"] }),
      field("mobile", "手機號碼", { pattern: MOBILE, hint: "09xxxxxxxx" }),
      field("email", "信箱", { pattern: EMAIL, hint: "name@example.com" }),
    ],
  },
  education: {
    label: "學歷",
    kind: "array",
    itemFields: [
      field("schoolName", "學校名稱", { nonEmpty: true }),
      field("department", "科系"),
      field("graduationDate", "肄/畢業年分", { pattern: DATE_YM_OPTIONAL, hint: "YYYY-MM 或 YYYY" }),
      field("graduationStatus", "肄/畢業", { enum: ["畢業", "肄業"] }),
    ],
  },
  experience: {
    label: "經歷",
    kind: "array",
    itemFields: [
      field("companyName", "公司名稱", { nonEmpty: true }),
      field("startDate", "任職區間（到職年月）", { pattern: DATE_YM, hint: "YYYY-MM" }),
      field("resignDate", "離職年月", {
        type: "stringOrNull",
        pattern: DATE_YM,
        hint: "YYYY-MM，在職中請填 null",
      }),
      field("jobTitle", "職稱"),
      field("salary", "薪資"),
      field("jobDescription", "工作內容"),
    ],
  },
  portfolio: {
    label: "作品集",
    kind: "array",
    itemFields: [
      field("imageUrl", "作品圖片網址", { pattern: URL_PATTERN, hint: "http(s):// 開頭" }),
      field("linkUrl", "作品連結網址", { pattern: URL_PATTERN, hint: "http(s):// 開頭" }),
      field("description", "作品簡介"),
    ],
  },
  skills: { label: "技能", kind: "stringArray", unique: true },
  certificates: {
    label: "證照／證書",
    kind: "array",
    itemFields: [
      field("name", "證照／證書名稱", { nonEmpty: true }),
      field("imageUrl", "證照照片網址", { pattern: URL_PATTERN, hint: "http(s):// 開頭" }),
    ],
  },
  desiredPositions: { label: "希望職缺", kind: "stringArray", unique: true },
  introduction: { label: "簡介", kind: "string" },
  introductionEn: { label: "英文簡介", kind: "string" },
};

const EXPECTED_KEYS = Object.keys(SECTION_RULES);

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const typeName = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

function checkValue(value, rule, path, errors) {
  if (rule.type === "stringOrNull" && value === null) return;

  if (typeof value !== "string") {
    const expected = rule.type === "stringOrNull" ? "字串或 null" : "字串";
    errors.push(`${path} 應為${expected}，實際為 ${typeName(value)}`);
    return;
  }
  if (rule.nonEmpty && value.trim() === "") {
    errors.push(`${path}（${rule.label}）不可為空字串`);
  }
  if (rule.pattern && !rule.pattern.test(value)) {
    errors.push(`${path}（${rule.label}）格式錯誤，應為 ${rule.hint}，實際為 "${value}"`);
  }
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${path}（${rule.label}）只能是 ${rule.enum.join(" / ")}，實際為 "${value}"`);
  }
}

function checkObjectFields(object, fields, path, errors) {
  for (const key of Object.keys(object)) {
    if (!fields.some((rule) => rule.key === key)) {
      errors.push(`${path}.${key} 不是定義中的欄位`);
    }
  }
  for (const rule of fields) {
    const fieldPath = `${path}.${rule.key}`;
    if (!Object.hasOwn(object, rule.key)) {
      errors.push(`${fieldPath}（${rule.label}）缺少必填欄位`);
      continue;
    }
    checkValue(object[rule.key], rule, fieldPath, errors);
  }
}

function checkStringArray(list, section, path, errors) {
  list.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (typeof item !== "string") {
      errors.push(`${itemPath} 應為字串，實際為 ${typeName(item)}`);
      return;
    }
    if (item.trim() === "") errors.push(`${itemPath} 不可為空字串`);
  });
  if (section.unique) {
    const seen = new Set();
    list.forEach((item, index) => {
      if (typeof item !== "string") return;
      if (seen.has(item)) errors.push(`${path}[${index}] 重複的項目 "${item}"`);
      seen.add(item);
    });
  }
}

function checkItemArray(list, section, path, errors) {
  list.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isPlainObject(item)) {
      errors.push(`${itemPath} 應為物件（完整 JSON），實際為 ${typeName(item)}`);
      return;
    }
    checkObjectFields(item, section.itemFields, itemPath, errors);
  });
}

function validate(data) {
  const errors = [];
  const summary = [];

  if (!isPlainObject(data)) {
    return {
      errors: [`根層應為物件（JSON 合輯），實際為 ${typeName(data)}`],
      summary,
    };
  }

  for (const key of Object.keys(data)) {
    if (!Object.hasOwn(SECTION_RULES, key)) {
      errors.push(`根層出現未定義的區段 "${key}"`);
    }
  }
  for (const key of EXPECTED_KEYS) {
    if (!Object.hasOwn(data, key)) {
      errors.push(`根層缺少區段 "${key}"（${SECTION_RULES[key].label}）`);
    }
  }

  const actualOrder = Object.keys(data).filter((key) => Object.hasOwn(SECTION_RULES, key));
  const expectedOrder = EXPECTED_KEYS.filter((key) => Object.hasOwn(data, key));
  if (actualOrder.join() !== expectedOrder.join()) {
    summary.push(`提醒：區段順序與範本不同，建議依 ${EXPECTED_KEYS.join(" -> ")} 排列`);
  }

  for (const key of EXPECTED_KEYS) {
    if (!Object.hasOwn(data, key)) continue;

    const section = SECTION_RULES[key];
    const value = data[key];

    if (section.kind === "object") {
      if (!isPlainObject(value)) {
        errors.push(`${key}（${section.label}）應為物件，實際為 ${typeName(value)}`);
        continue;
      }
      checkObjectFields(value, section.fields, key, errors);
      summary.push(`${key}（${section.label}）：${Object.keys(value).length} 個欄位`);
      continue;
    }

    if (section.kind === "string") {
      checkValue(value, { label: section.label, type: "string" }, key, errors);
      summary.push(
        `${key}（${section.label}）：${typeof value === "string" ? value.length : 0} 個字元`,
      );
      continue;
    }

    if (!Array.isArray(value)) {
      errors.push(`${key}（${section.label}）應為陣列，實際為 ${typeName(value)}`);
      continue;
    }

    if (section.kind === "stringArray") {
      checkStringArray(value, section, key, errors);
    } else {
      checkItemArray(value, section, key, errors);
    }
    summary.push(`${key}（${section.label}）：${value.length} 筆`);
  }

  return { errors, summary };
}

const target = resolve(process.argv[2] ?? DEFAULT_FILE);

let raw;
try {
  raw = readFileSync(target, "utf8");
} catch (error) {
  console.error(`✗ 無法讀取檔案：${target}`);
  console.error(`  ${error.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw.replace(/^\uFEFF/, ""));
} catch (error) {
  console.error(`✗ JSON 解析失敗：${target}`);
  console.error(`  ${error.message}`);
  process.exit(1);
}

const { errors, summary } = validate(data);

if (errors.length > 0) {
  console.error(`✗ 驗證失敗：${target}`);
  for (const message of errors) console.error(`  - ${message}`);
  console.error(`\n共 ${errors.length} 個問題。結構上限為 3 層：根層 -> 區段 -> 清單項目欄位。`);
  process.exit(1);
}

console.log(`✓ 驗證通過：${target}`);
console.log("  結構層數：3 層以內（根層 -> 區段 -> 清單項目欄位；清單項目內僅能有字串／null）");
for (const line of summary) console.log(`  - ${line}`);
console.log("  讀取結果：success = true");
