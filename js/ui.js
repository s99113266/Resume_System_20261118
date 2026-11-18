/* 共用：DOM 建立、訊息提示、載入與空狀態、圖片替代。
   不得包含欄位名稱或資料格式知識；不得直接呼叫 API。 */
(function (global) {
  "use strict";

  const doc = global.document;

  function el(tag, options) {
    const node = doc.createElement(tag);
    if (!options) {
      return node;
    }
    if (options.className) {
      node.className = options.className;
    }
    if (typeof options.text === "string") {
      node.textContent = options.text;
    }
    if (options.attrs) {
      Object.keys(options.attrs).forEach(function (name) {
        const value = options.attrs[name];
        if (value === null || value === undefined || value === false) {
          return;
        }
        node.setAttribute(name, value === true ? "" : String(value));
      });
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function append(parent, children) {
    children.forEach(function (child) {
      if (child) {
        parent.appendChild(child);
      }
    });
    return parent;
  }

  function initial(name) {
    const text = String(name || "").trim();
    return text ? Array.from(text)[0] : "?";
  }

  function createThumb(src, alt, fallbackText) {
    const wrapper = el("div", { className: "thumb" });
    const fallback = el("div", { className: "thumb__fallback", text: fallbackText });

    if (!src) {
      wrapper.appendChild(fallback);
      return wrapper;
    }

    const image = el("img", {
      attrs: { src: src, alt: alt, loading: "lazy", decoding: "async" }
    });
    image.addEventListener(
      "error",
      function () {
        clear(wrapper);
        wrapper.appendChild(fallback);
      },
      { once: true }
    );
    wrapper.appendChild(image);
    return wrapper;
  }

  function showNotice(container, options) {
    const box = el("div", { className: "notice", attrs: { role: "alert" } });
    const title = el("p", { className: "notice__title", text: options.title });

    append(box, [title]);
    if (options.message) {
      box.appendChild(el("p", { className: "notice__message", text: options.message }));
    }
    if (options.hint) {
      box.appendChild(el("p", { className: "notice__hint", text: options.hint }));
    }
    if (typeof options.onRetry === "function") {
      const actions = el("div", { className: "notice__actions" });
      const button = el("button", {
        className: "button",
        text: "重新載入",
        attrs: { type: "button" }
      });
      button.addEventListener("click", options.onRetry);
      actions.appendChild(button);
      box.appendChild(actions);
    }

    clear(container);
    container.appendChild(box);
    return box;
  }

  function setStatus(node, message) {
    node.textContent = message;
    node.hidden = message === "";
  }

  function reveal(node) {
    node.hidden = false;
    node.dataset.state = "ready";
  }

  function toggleEmpty(listNode, emptyNode, count) {
    listNode.hidden = count === 0;
    emptyNode.hidden = count !== 0;
  }

  global.ResumeApp = global.ResumeApp || {};
  global.ResumeApp.ui = {
    el: el,
    clear: clear,
    append: append,
    initial: initial,
    createThumb: createThumb,
    showNotice: showNotice,
    setStatus: setStatus,
    reveal: reveal,
    toggleEmpty: toggleEmpty
  };
})(window);
