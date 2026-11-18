/* 瀏覽頁專用：把整份合輯拆成頁面各區塊並渲染。
   共用邏輯一律放在 js/api.js、js/ui.js、js/rules.js。 */
(function (global) {
  "use strict";

  const App = global.ResumeApp || {};
  const api = App.api;
  const ui = App.ui;
  const rules = App.rules;
  const doc = global.document;

  const nodes = {
    status: doc.getElementById("resume-status"),
    notice: doc.getElementById("resume-notice"),
    resume: doc.getElementById("resume"),
    photo: doc.getElementById("profile-photo"),
    name: doc.getElementById("resume-name"),
    basicGroup: doc.getElementById("group-basic"),
    basicFacts: doc.getElementById("basic-facts"),
    contactGroup: doc.getElementById("group-contact"),
    contactFacts: doc.getElementById("contact-facts"),
    introText: doc.getElementById("intro-text"),
    introEmpty: doc.getElementById("intro-empty"),
    introTabs: Array.prototype.slice.call(doc.querySelectorAll(".intro__tab")),
    educationList: doc.getElementById("education-list"),
    educationEmpty: doc.getElementById("education-empty"),
    experienceList: doc.getElementById("experience-list"),
    experienceEmpty: doc.getElementById("experience-empty"),
    skillsList: doc.getElementById("skills-list"),
    skillsEmpty: doc.getElementById("skills-empty"),
    certificatesList: doc.getElementById("certificates-list"),
    certificatesEmpty: doc.getElementById("certificates-empty"),
    positionsList: doc.getElementById("positions-list"),
    positionsEmpty: doc.getElementById("positions-empty"),
    portfolioList: doc.getElementById("portfolio-list"),
    portfolioEmpty: doc.getElementById("portfolio-empty"),
    printButton: doc.getElementById("print-button"),
    dataNote: doc.getElementById("data-note")
  };

  const intro = { zh: "", en: "", lang: "zh" };

  const ERROR_COPY = {
    "file-protocol": {
      title: "需要以靜態伺服器開啟",
      message: "直接開啟檔案時，瀏覽器會阻擋讀取 JSON 資料。",
      hint: "請在專案資料夾啟動簡易靜態伺服器（例如 npx serve 或 python -m http.server），再開啟 http://localhost 下的 index.html。"
    },
    default: {
      title: "讀取履歷資料失敗",
      message: "目前無法取得履歷資料。",
      hint: "請確認 data/resume.json 存在且格式正確，或稍後重新載入。"
    }
  };

  function factItem(label, valueNode) {
    const item = ui.el("li", { className: "facts__item" });
    valueNode.classList.add("facts__value");
    item.appendChild(ui.el("span", { className: "facts__label", text: label }));
    item.appendChild(valueNode);
    return item;
  }

  function fillPhoto(basicInfo) {
    const fallback = function () {
      ui.clear(nodes.photo);
      nodes.photo.appendChild(
        ui.el("div", { className: "profile__fallback", text: ui.initial(basicInfo.name) })
      );
    };

    ui.clear(nodes.photo);
    const photoUrl = rules.text(basicInfo.photoUrl);
    if (!photoUrl) {
      fallback();
      return;
    }

    const image = ui.el("img", {
      attrs: {
        src: photoUrl,
        alt: rules.text(basicInfo.name) ? rules.text(basicInfo.name) + "的照片" : "個人照片",
        decoding: "async"
      }
    });
    image.addEventListener("error", fallback, { once: true });
    nodes.photo.appendChild(image);
  }

  function fillDetails(basicInfo) {
    const birthday = rules.text(basicInfo.birthday);
    const gender = rules.text(basicInfo.gender);
    const idNumber = rules.text(basicInfo.idNumber);
    const mobile = rules.text(basicInfo.mobile);
    const email = rules.text(basicInfo.email);
    const basicItems = [];
    const contactItems = [];

    if (birthday) {
      basicItems.push(factItem("生日", ui.el("span", { text: rules.formatDate(birthday) })));
    }
    if (gender) {
      basicItems.push(factItem("性別", ui.el("span", { text: rules.genderLabel(gender) })));
    }
    if (idNumber) {
      basicItems.push(factItem("身分證字號", ui.el("span", { text: idNumber })));
    }
    if (mobile) {
      contactItems.push(
        factItem(
          "手機",
          ui.el("a", {
            text: mobile,
            attrs: { href: "tel:" + mobile.replace(/[^0-9+]/g, "") }
          })
        )
      );
    }
    if (email) {
      contactItems.push(
        factItem("信箱", ui.el("a", { text: email, attrs: { href: "mailto:" + email } }))
      );
    }

    ui.clear(nodes.basicFacts);
    ui.append(nodes.basicFacts, basicItems);
    nodes.basicGroup.hidden = basicItems.length === 0;

    ui.clear(nodes.contactFacts);
    ui.append(nodes.contactFacts, contactItems);
    nodes.contactGroup.hidden = contactItems.length === 0;
  }

  function renderPositions(list) {
    const items = (Array.isArray(list) ? list : []).filter(function (position) {
      return rules.text(position) !== "";
    });

    ui.clear(nodes.positionsList);
    items.forEach(function (position) {
      nodes.positionsList.appendChild(ui.el("li", { text: position }));
    });
    ui.toggleEmpty(nodes.positionsList, nodes.positionsEmpty, items.length);
  }

  function showIntro(lang) {
    intro.lang = lang === "en" ? "en" : "zh";
    const body = intro[intro.lang];

    nodes.introTabs.forEach(function (tab) {
      tab.setAttribute("aria-pressed", tab.dataset.lang === intro.lang ? "true" : "false");
    });
    nodes.introText.lang = intro.lang === "en" ? "en" : "zh-Hant";
    nodes.introText.textContent = body;
    nodes.introText.hidden = body === "";
    nodes.introEmpty.hidden = body !== "";
  }

  function renderEducation(list) {
    const items = Array.isArray(list) ? list : [];

    ui.clear(nodes.educationList);
    items.forEach(function (item) {
      const row = ui.el("li", { className: "entry" });
      const body = ui.el("div");
      const meta = [rules.text(item.department), rules.graduationLabel(item.graduationStatus)]
        .filter(function (part) {
          return part !== "";
        })
        .join("　·　");

      row.appendChild(
        ui.el("p", { className: "entry__period", text: rules.formatYearMonth(item.graduationDate) })
      );
      body.appendChild(
        ui.el("h3", {
          className: "entry__title",
          text: rules.text(item.schoolName) || "未提供學校名稱"
        })
      );
      if (meta) {
        body.appendChild(ui.el("p", { className: "entry__meta", text: meta }));
      }
      row.appendChild(body);
      nodes.educationList.appendChild(row);
    });
    ui.toggleEmpty(nodes.educationList, nodes.educationEmpty, items.length);
  }

  function renderExperience(list) {
    const items = Array.isArray(list) ? list : [];

    ui.clear(nodes.experienceList);
    items.forEach(function (item) {
      const row = ui.el("li", { className: "entry" });
      const body = ui.el("div");
      const meta = [];

      if (rules.text(item.jobTitle)) {
        meta.push(rules.text(item.jobTitle));
      }
      if (rules.text(item.salary)) {
        meta.push("薪資：" + rules.text(item.salary));
      }

      row.appendChild(
        ui.el("p", {
          className: "entry__period",
          text: rules.formatPeriod(item.startDate, item.resignDate)
        })
      );
      body.appendChild(
        ui.el("h3", {
          className: "entry__title",
          text: rules.text(item.companyName) || "未提供公司名稱"
        })
      );
      if (meta.length > 0) {
        body.appendChild(ui.el("p", { className: "entry__meta", text: meta.join("　·　") }));
      }
      if (rules.text(item.jobDescription)) {
        body.appendChild(ui.el("p", { className: "entry__body", text: rules.text(item.jobDescription) }));
      }
      row.appendChild(body);
      nodes.experienceList.appendChild(row);
    });
    ui.toggleEmpty(nodes.experienceList, nodes.experienceEmpty, items.length);
  }

  function renderSkills(list) {
    const items = (Array.isArray(list) ? list : []).filter(function (skill) {
      return rules.text(skill) !== "";
    });

    ui.clear(nodes.skillsList);
    items.forEach(function (skill) {
      nodes.skillsList.appendChild(ui.el("li", { text: skill }));
    });
    ui.toggleEmpty(nodes.skillsList, nodes.skillsEmpty, items.length);
  }

  function renderCertificates(list) {
    const items = Array.isArray(list) ? list : [];

    ui.clear(nodes.certificatesList);
    items.forEach(function (item) {
      const row = ui.el("li", { className: "certificate" });
      const body = ui.el("div");
      const name = rules.text(item.name) || "未提供證照名稱";
      const imageUrl = rules.text(item.imageUrl);

      row.appendChild(ui.createThumb(imageUrl, name + "照片", "無照片"));
      body.appendChild(ui.el("p", { className: "certificate__name", text: name }));
      if (imageUrl) {
        body.appendChild(
          ui.el("a", {
            className: "text-link",
            text: "查看證照照片",
            attrs: { href: imageUrl, target: "_blank", rel: "noopener noreferrer" }
          })
        );
      }
      row.appendChild(body);
      nodes.certificatesList.appendChild(row);
    });
    ui.toggleEmpty(nodes.certificatesList, nodes.certificatesEmpty, items.length);
  }

  function renderPortfolio(list) {
    const items = Array.isArray(list) ? list : [];

    ui.clear(nodes.portfolioList);
    items.forEach(function (item) {
      const row = ui.el("li", { className: "portfolio__item" });
      const body = ui.el("div");
      const linkUrl = rules.text(item.linkUrl);

      row.appendChild(ui.createThumb(rules.text(item.imageUrl), "作品圖片", "無圖片"));
      if (rules.text(item.description)) {
        body.appendChild(
          ui.el("p", { className: "portfolio__description", text: rules.text(item.description) })
        );
      }
      if (linkUrl) {
        body.appendChild(
          ui.el("a", {
            className: "text-link",
            text: "開啟作品連結",
            attrs: { href: linkUrl, target: "_blank", rel: "noopener noreferrer" }
          })
        );
      }
      row.appendChild(body);
      nodes.portfolioList.appendChild(row);
    });
    ui.toggleEmpty(nodes.portfolioList, nodes.portfolioEmpty, items.length);
  }

  function render(data, source) {
    const basicInfo = data.basicInfo || {};
    const name = rules.text(basicInfo.name) || "未提供姓名";

    nodes.name.textContent = name;
    doc.title = name + "｜履歷";
    fillPhoto(basicInfo);
    fillDetails(basicInfo);

    intro.zh = rules.text(data.introduction);
    intro.en = rules.text(data.introductionEn);
    showIntro("zh");

    renderEducation(data.education);
    renderExperience(data.experience);
    renderSkills(data.skills);
    renderCertificates(data.certificates);
    renderPositions(data.desiredPositions);
    renderPortfolio(data.portfolio);

    nodes.dataNote.textContent =
      source === "preview" ? "目前顯示範例資料：data/resume.json" : "";
    nodes.dataNote.hidden = source !== "preview";
  }

  function showError(reason) {
    const copy = ERROR_COPY[reason] || ERROR_COPY.default;

    nodes.resume.hidden = true;
    delete nodes.resume.dataset.state;
    nodes.notice.hidden = false;
    ui.setStatus(nodes.status, "");
    ui.showNotice(nodes.notice, {
      title: copy.title,
      message: copy.message,
      hint: copy.hint,
      onRetry: load
    });
  }

  async function load() {
    nodes.notice.hidden = true;
    ui.clear(nodes.notice);
    nodes.resume.hidden = true;
    nodes.printButton.disabled = true;
    ui.setStatus(nodes.status, "正在讀取履歷資料…");

    const result = await api.loadResume();
    if (!result.success) {
      showError(result.reason);
      return;
    }

    render(result.data, result.source);
    ui.setStatus(nodes.status, "");
    ui.reveal(nodes.resume);
    nodes.printButton.disabled = false;
  }

  function bindControls() {
    nodes.introTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        showIntro(tab.dataset.lang);
      });
    });
    nodes.printButton.addEventListener("click", function () {
      global.print();
    });
  }

  function init() {
    bindControls();
    load();
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
