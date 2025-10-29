(function () {
  "use strict";

  var btn = document.getElementById("loadBtn");
  var out = document.getElementById("output");

  function show(obj) {
    try {
      out.textContent = JSON.stringify(obj, null, 2);
    } catch (e) {
      out.textContent = String(obj);
    }
  }

  function xhrJSON(method, url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.responseType = "text";
    xhr.setRequestHeader("Accept", "application/json");
    xhr.timeout = 10000;

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        var text = xhr.responseText || "";
        try {
          var json = text ? JSON.parse(text) : null;
          cb(null, json);
        } catch (err) {
          cb(new Error("Invalid JSON: " + err.message));
        }
      } else {
        cb(new Error("HTTP " + xhr.status + " " + xhr.statusText));
      }
    };

    xhr.ontimeout = function () {
      cb(new Error("Request timed out"));
    };
    xhr.onerror = function () {
      cb(new Error("Network error"));
    };

    xhr.send(null);
  }

  btn.addEventListener("click", function () {
    xhrJSON("GET", "/api/random-verse", function (err, json) {
      if (err) return show({ error: String(err) });
      show(json);
    });
  });

  show({ ready: true, hint: "Click the button to load a random verse." });
})();
