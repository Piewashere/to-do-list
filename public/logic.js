// public/api-logic.js
(function () {
  "use strict";

  // --------------- DOM helpers ---------------
  function el(id) {
    return document.getElementById(id);
  }
  var out = el("out");

  function show(obj) {
    try {
      out.textContent = JSON.stringify(obj, null, 2);
    } catch (e) {
      out.textContent = String(obj);
    }
  }

  // toQuery(params)
  // Build a URL query string from a plain object, safely.
  // Returns "" if there are no usable params, otherwise returns something like "?a=1&b=two".
  //
  // Rules:
  // - Ignores keys from the prototype chain (uses hasOwnProperty).
  // - Skips values that are undefined, null, or "" (empty string).
  // - Coerces all remaining values to strings.
  // - Uses URLSearchParams to handle encoding (spaces, special characters).
  //
  // Examples:
  //   toQuery({})                           -> ""
  //   toQuery({ q: "milk", done: false })   -> "?q=milk&done=false"
  //   toQuery({ page: 0, limit: 25 })       -> "?page=0&limit=25"
  //   toQuery({ a: undefined, b: null })    -> ""
  //
  // Notes:
  // - Using URLSearchParams avoids manual encoding bugs.
  // - Returning "" makes it easy to do: "/api/list" + toQuery(opts).
  function toQuery(params) {
    if (!params) return "";
    var usp = new URLSearchParams();
    for (var k in params) {
      if (
        Object.prototype.hasOwnProperty.call(params, k) &&
        params[k] !== undefined &&
        params[k] !== null &&
        params[k] !== ""
      ) {
        usp.append(k, String(params[k]));
      }
    }
    var s = usp.toString();
    return s ? "?" + s : "";
  }

  // --------------- synchronous XHR ---------------
  function xhrJSON(method, url) {
    var xhr = new XMLHttpRequest();
    try {
      // Third arg false => synchronous
      xhr.open(method, url, false);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.send(null);
    } catch (e) {
      return { ok: false, status: 0, error: "Network error: " + String(e) };
    }
    var status = xhr.status;
    var text = xhr.responseText || "";
    try {
      var data = JSON.parse(text);
      if (typeof data === "object" && data && !("status" in data)) data.status = status;
      return data;
    } catch (e) {
      return { ok: false, status: status, error: "Invalid JSON", raw: text };
    }
  }

  // --------------- read inputs ---------------
  function currentId() {
    return Number(el("idInp").value || 0);
  }
  function currentText() {
    return el("textInp").value || "";
  }
  function currentDone() {
    return !!el("doneChk").checked;
  }
  function currentQ() {
    return el("qInp").value.trim();
  }

  // --------------- optional rendering helpers ---------------
  function renderListPayload(payload, openEditId) {
    var container = el("out");
    if (!container) return;

    // error / fallback
    if (!payload || payload.ok === false) {
      try {
        container.textContent = JSON.stringify(payload, null, 2);
      } catch (e) {
        container.textContent = String(payload);
      }
      return;
    }

    var items = payload.items;
    if (!Array.isArray(items)) {
      container.textContent = JSON.stringify(payload, null, 2);
      return;
    }

    // clear
    container.innerHTML = "";

    // header
    var hdr = document.createElement("div");
    hdr.className = "mb-2 font-semibold";
    hdr.textContent = "Items: " + items.length;
    container.appendChild(hdr);

    // helper to format dates
    function fmtDate(v) {
      if (!v && v !== 0) return "";
      var d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleString();
      return String(v);
    }

    // creates DOM node for an item and returns it; autoEdit will open the editor immediately
    // isNew: true when node is a locally-created (not-yet-server) item
    function createItemNode(it, autoEdit, isNew) {
      // store id in dataset so handlers always read the current id
      var initialId = it.id || it.itemId || it.itemID || ("temp-" + Math.random().toString(36).slice(2, 9));
      var name = it.text || it.name || it.title || "";
      var done = !!(it.done || it.completed);
      var created = it.createdAt || it.created_at || it.created || "";
      var updated = it.updatedAt || it.updated_at || it.modifiedAt || "";

      var itemEl = document.createElement("div");
      itemEl.className = "p-2 mb-2 bg-white rounded flex items-start gap-3";
      itemEl.dataset.id = initialId;
      if (isNew) itemEl.dataset.new = "1";

      var chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = done;
      chk.className = "h-4 w-4 mt-1";
      chk.title = "Toggle done";
      chk.addEventListener("change", function () {
        chk.disabled = true;
        var idNow = itemEl.dataset.id;
        xhrJSON("GET", "/api/item/toggle" + toQuery({ id: idNow }));
        var refreshed = xhrJSON("GET", "/api/list");
        renderListPayload(refreshed);
        chk.disabled = false;
      });
      itemEl.appendChild(chk);

      var info = document.createElement("div");
      info.style.flex = "1";

      var titleRow = document.createElement("div");
      titleRow.className = "flex items-center gap-2";

      var titleText = document.createElement("div");
      titleText.className = "font-medium";
      titleText.textContent = name + "  #" + initialId;

      var nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = name;
      nameInput.className = "rounded border border-gray-300 p-1 text-sm hidden";
      nameInput.style.minWidth = "200px";

      var editBtn = document.createElement("button");
      editBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="inline h-4 w-4" style="vertical-align:middle;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M3 21l6.75-1.5L21 8.25 16.5 3.75 3 17.25V21z"/></svg>';
      editBtn.setAttribute("title", "Edit");
      editBtn.setAttribute("aria-label", "Edit item name");
      editBtn.setAttribute("data-action", "edit");
      editBtn.className = "px-2 py-1 border border-blue-600 text-blue-600 rounded text-sm";

      var saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.className = "px-2 py-1 border border-green-600 text-green-600 rounded text-sm hidden";

      var cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.className = "px-2 py-1 border border-gray-400 text-gray-700 rounded text-sm hidden";

      editBtn.addEventListener("click", function () {
        titleText.classList.add("hidden");
        nameInput.classList.remove("hidden");
        editBtn.classList.add("hidden");
        saveBtn.classList.remove("hidden");
        cancelBtn.classList.remove("hidden");
        nameInput.focus();
        nameInput.selectionStart = nameInput.selectionEnd = nameInput.value.length;
      });

      cancelBtn.addEventListener("click", function () {
        // if this was a new, unsaved item cancel should remove the node entirely
        if (itemEl.dataset.new) {
          itemEl.remove();
          return;
        }
        nameInput.value = titleText.textContent.replace(/\s+#.*$/, "");
        titleText.classList.remove("hidden");
        nameInput.classList.add("hidden");
        editBtn.classList.remove("hidden");
        saveBtn.classList.add("hidden");
        cancelBtn.classList.add("hidden");
      });

      saveBtn.addEventListener("click", function () {
        var newName = nameInput.value.trim();
        if (newName.length === 0) {
          alert("Name cannot be empty.");
          nameInput.focus();
          return;
        }
        saveBtn.disabled = true;
        nameInput.disabled = true;

        var idNow = itemEl.dataset.id;
        // If this node is a locally-created item (not yet on server) -> call add
        if (itemEl.dataset.new) {
          var res = xhrJSON("GET", "/api/item/add" + toQuery({ text: newName }));
          if (!res || res.ok === false) {
            alert("Create failed: " + (res && (res.error || res.message) ? (res.error || res.message) : JSON.stringify(res)));
            saveBtn.disabled = false;
            nameInput.disabled = false;
            return;
          }
          // server should return new id / item; try to extract it
          var newId = null;
          if (res.item && typeof res.item === "object") {
            newId = res.item.id || res.item.itemId || res.item.itemID;
          }
          if (!newId) newId = res.id || res.itemId || res.itemID;
          if (!newId) {
            // fallback: re-fetch list and replace whole view
            var fresh = xhrJSON("GET", "/api/list");
            renderListPayload(fresh);
            return;
          }
          // update node to reflect server id and persisted state
          itemEl.dataset.id = newId;
          delete itemEl.dataset.new;
          titleText.textContent = newName + "  #" + newId;
          nameInput.value = newName;
          titleText.classList.remove("hidden");
          nameInput.classList.add("hidden");
          editBtn.classList.remove("hidden");
          saveBtn.classList.add("hidden");
          cancelBtn.classList.add("hidden");
          saveBtn.disabled = false;
          nameInput.disabled = false;
          return;
        }

        // otherwise this is an update of an existing item
        var upd = xhrJSON("GET", "/api/item/update" + toQuery({ id: idNow, text: newName }));
        if (upd && upd.ok === false) {
          alert("Update failed: " + (upd.error || JSON.stringify(upd)));
          saveBtn.disabled = false;
          nameInput.disabled = false;
          return;
        }

        // update the UI in-place (no full re-render)
        titleText.textContent = newName + "  #" + idNow;
        nameInput.value = newName;
        titleText.classList.remove("hidden");
        nameInput.classList.add("hidden");
        editBtn.classList.remove("hidden");
        saveBtn.classList.add("hidden");
        cancelBtn.classList.add("hidden");
        saveBtn.disabled = false;
        nameInput.disabled = false;
      });

      titleRow.appendChild(titleText);
      titleRow.appendChild(nameInput);
      titleRow.appendChild(editBtn);
      titleRow.appendChild(saveBtn);
      titleRow.appendChild(cancelBtn);
      info.appendChild(titleRow);

      var meta = document.createElement("div");
      meta.className = "text-xs text-gray-600 mt-1";
      var parts = [];
      var cstr = fmtDate(created);
      var ustr = fmtDate(updated);
      if (cstr) parts.push("created: " + cstr);
      if (ustr) parts.push("updated: " + ustr);
      meta.textContent = parts.join(" | ");
      info.appendChild(meta);

      itemEl.appendChild(info);

      var del = document.createElement("button");
      del.textContent = "Delete";
      del.className = "px-2 py-1 border border-red-600 text-red-600 rounded";
      del.addEventListener("click", function () {
        del.disabled = true;
        xhrJSON("GET", "/api/item/delete" + toQuery({ id: itemEl.dataset.id }));
        var refreshed = xhrJSON("GET", "/api/list");
        renderListPayload(refreshed);
      });
      itemEl.appendChild(del);

      // if requested, open the editor immediately
      if (autoEdit) {
        // run after a brief tick so node can be inserted first
        setTimeout(function () {
          editBtn.click();
        }, 0);
      }

      return itemEl;
    }

    // + New Item button (inserted after header)
    var addRow = document.createElement("div");
    addRow.className = "mb-3";
    var addBtn = document.createElement("button");
    addBtn.textContent = "+ New Item";
    addBtn.className = "px-3 py-1 rounded border border-blue-700 text-blue-700 bg-white";
    addBtn.title = "Create a new item and edit its name";
    addBtn.addEventListener("click", function () {
      addBtn.disabled = true;
      // create a local (unsaved) item node and open its editor immediately.
      // Save will call /api/item/add to persist.
      var temp = { id: "temp-" + Math.random().toString(36).slice(2, 9), text: "" };
      var node = createItemNode(temp, true, true);
      container.insertBefore(node, addRow.nextSibling);
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      addBtn.disabled = false;
    });
    addRow.appendChild(addBtn);
    container.appendChild(addRow);

    // render existing items
    items.forEach(function (it) {
      var id = it.id || it.itemId || it.itemID || "?";
      var auto = openEditId && String(openEditId) === String(id);
      var node = createItemNode(it, auto, false);
      container.appendChild(node);
    });
  }

  // --------------- wire buttons ---------------
  function on(id, type, fn) {
    var node = el(id);
    if (!node) {
      // Useful for debugging in the console but harmless in production.
      console.warn("Missing element for wiring:", id);
      return;
    }
    node.addEventListener(type, fn);
  }

  on("btnHealth", "click", function () {
    var data = xhrJSON("GET", "/api/health");
    show(data);
  });

  on("btnStats", "click", function () {
    var data = xhrJSON("GET", "/api/stats");
    show(data);
  });

  on("btnListAll", "click", function () {
    var data = xhrJSON("GET", "/api/list");
    renderListPayload(data);
  });

  on("btnListOpen", "click", function () {
    var data = xhrJSON("GET", "/api/list" + toQuery({ done: "false" }));
    renderListPayload(data);
  });

  on("btnListDone", "click", function () {
    var data = xhrJSON("GET", "/api/list" + toQuery({ done: "true" }));
    renderListPayload(data);
  });

  on("btnListQuery", "click", function () {
    var q = currentQ();
    if (!q || q.length < 1) return show({ ok: false, error: "Enter a query in Filter" });
    var data = xhrJSON("GET", "/api/list" + toQuery({ q: q }));
    renderListPayload(data);
  });

  on("btnGet", "click", function () {
    var id = currentId();
    if (!id) return show({ ok: false, error: "Enter an id." });
    var data = xhrJSON("GET", "/api/item/get" + toQuery({ id: id }));
    show(data);
  });

  on("btnAdd", "click", function () {
    var text = currentText().trim();
    var done = currentDone();
    if (!text) return show({ ok: false, error: "Enter text to add." });
    var data = xhrJSON("GET", "/api/item/add" + toQuery({ text: text, done: done }));
    show(data);
  });

  on("btnUpdate", "click", function () {
    var id = currentId();
    var params = { id: id };
    if (!id) return show({ ok: false, error: "Enter an id." });

    var text = currentText();
    var hasText = text.trim().length > 0;
    var doneFlag = currentDone();

    if (!hasText && typeof doneFlag !== "boolean") {
      return show({ ok: false, error: "Provide text and/or done to update." });
    }
    if (hasText) params.text = text;
    if (typeof doneFlag === "boolean") params.done = doneFlag;

    var data = xhrJSON("GET", "/api/item/update" + toQuery(params));
    show(data);
  });

  on("btnToggle", "click", function () {
    var id = currentId();
    if (!id) return show({ ok: false, error: "Enter an id." });
    var data = xhrJSON("GET", "/api/item/toggle" + toQuery({ id: id }));
    show(data);
  });

  on("btnDelete", "click", function () {
    var id = currentId();
    if (!id) return show({ ok: false, error: "Enter an id." });
    var data = xhrJSON("GET", "/api/item/delete" + toQuery({ id: id }));
    show(data);
  });

  on("btnClearCompleted", "click", function () {
    var rawData = xhrJSON("GET", "/api/clear-completed");
    // format to display nicely in a text format rather than json
    var data = ("cleared " + (rawData.cleared || 0) + " completed items.");
    show(data);
  });

  // --------------- boot (synchronous) ---------------
  function boot() {
    var h = xhrJSON("GET", "/api/health");
    show(h);
    var list = xhrJSON("GET", "/api/list");
    renderListPayload(list);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
