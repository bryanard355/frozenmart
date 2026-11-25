(function () {
  const $ = (id) => document.getElementById(id);
  const PW_KEY = "frozenmart-admin-pw";
  let password = sessionStorage.getItem(PW_KEY) || "";
  let items = [];        // products being edited
  let savedJson = "";    // snapshot of what is live
  let query = "";
  let photoFor = null;   // index of the product whose photo is being changed

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cur = () => String(SHOP.currency).trim();
  const isDirty = () => JSON.stringify(items) !== savedJson;

  let toastTimer;
  function toast(msg, kind) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (kind === "error" ? " error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), kind === "error" ? 5000 : 2600);
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, { ...opts, headers: { ...(opts.headers || {}), "x-admin-password": password } });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      let fallback = `Something went wrong (${res.status}).`;
      if (res.status === 404 || res.status === 405 || res.status === 501) {
        fallback = "This page can't save from here. Open the admin at https://admin.frozenmart.bryanowusu.club";
      }
      const err = new Error(data.error || fallback);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ---------- login ----------
  async function login(pw) {
    password = pw;
    await api("/api/admin/login", { method: "POST" });
    sessionStorage.setItem(PW_KEY, pw);
  }
  function logout() {
    sessionStorage.removeItem(PW_KEY);
    location.reload();
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("loginBtn");
    btn.disabled = true; btn.textContent = "Checking…";
    $("loginError").hidden = true;
    try {
      await login($("pw").value);
      await openDashboard();
    } catch (err) {
      $("loginError").textContent = err.message;
      $("loginError").hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = "Log in";
    }
  });
  $("logout").addEventListener("click", () => {
    if (isDirty() && !confirm("You have unsaved changes. Log out anyway?")) return;
    savedJson = JSON.stringify(items); // silence the leave warning
    logout();
  });

  async function openDashboard() {
    $("loginView").hidden = true;
    $("appView").hidden = false;
    $("logout").hidden = false;
    $("list").innerHTML = '<p class="muted center">Loading products…</p>';

    let live = null;
    try {
      const res = await fetch("/api/catalog?fresh=" + Date.now(), { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length) live = data.products;
    } catch (e) {}

    items = (live || PRODUCTS).map((p) => ({ ...p }));
    // Starting list isn't live yet, so mark it unsaved to prompt the first save.
    savedJson = live ? JSON.stringify(items) : "";
    $("sourceNote").hidden = !!live;
    render();
  }

  if (password) {
    login(password).then(openDashboard).catch(() => {
      sessionStorage.removeItem(PW_KEY);
      password = "";
    });
  }

  // ---------- rendering ----------
  function stockState(stock) {
    if (stock <= 0) return { cls: "out", label: "Sold out" };
    if (stock <= SHOP.lowStockAt) return { cls: "low", label: "Low stock" };
    return { cls: "ok", label: "In stock" };
  }

  function thumbHtml(p) {
    const src = p.image || `photos/${p.id}.jpg?v=2`;
    return `<span class="a-emoji">${esc(p.emoji || "🧊")}</span><img src="${esc(src)}" alt="" onerror="this.remove()">`;
  }

  function rowHtml(p, i) {
    const s = stockState(Number(p.stock) || 0);
    return `
      <article class="a-item ${s.cls === "out" ? "is-out" : ""}" data-i="${i}">
        <div class="a-photo">
          <button type="button" class="a-thumb" data-act="photo" aria-label="Change photo for ${esc(p.name || "new product")}">
            ${thumbHtml(p)}
            <span class="a-thumb-label">Change photo</span>
            <span class="a-spinner"></span>
          </button>
          ${p.image ? '<button type="button" class="link" data-act="rmphoto">Remove photo</button>' : ""}
        </div>
        <div class="a-fields">
          <label class="f-name">Product name
            <input data-f="name" value="${esc(p.name)}" maxlength="80" placeholder="e.g. Chicken Wings">
          </label>
          <label>Category
            <input data-f="category" value="${esc(p.category)}" list="cats" maxlength="40" placeholder="e.g. Chicken">
          </label>
          <label>Size / pack
            <input data-f="unit" value="${esc(p.unit)}" maxlength="60" placeholder="e.g. 1 kg pack">
          </label>
          <label>Price (${esc(cur())})
            <input data-f="price" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(p.price)}">
          </label>
          <div class="f-stock">
            <span class="f-label">Stock <span class="pill ${s.cls}">${s.label}</span></span>
            <div class="stepper">
              <button type="button" data-act="dec" aria-label="One less">−</button>
              <input data-f="stock" type="number" inputmode="numeric" min="0" step="1" value="${esc(p.stock)}" aria-label="Stock">
              <button type="button" data-act="inc" aria-label="One more">+</button>
            </div>
          </div>
          <label class="f-emoji">Emoji
            <input data-f="emoji" value="${esc(p.emoji || "")}" maxlength="8">
          </label>
        </div>
        <div class="a-actions">
          <button type="button" class="btn-sm" data-act="soldout" ${Number(p.stock) <= 0 ? "disabled" : ""}>Mark sold out</button>
          <button type="button" class="btn-sm danger" data-act="delete">Delete</button>
        </div>
      </article>`;
  }

  function renderStats() {
    const total = items.length;
    const out = items.filter((p) => Number(p.stock) <= 0).length;
    const low = items.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= SHOP.lowStockAt).length;
    const units = items.reduce((n, p) => n + Math.max(0, Number(p.stock) || 0), 0);
    $("stats").innerHTML = `
      <div class="stat"><span>Products</span><strong>${total}</strong></div>
      <div class="stat"><span>Items in stock</span><strong>${units}</strong></div>
      <div class="stat warn"><span>Low stock</span><strong>${low}</strong></div>
      <div class="stat bad"><span>Sold out</span><strong>${out}</strong></div>`;
    $("cats").innerHTML = [...new Set(items.map((p) => p.category).filter(Boolean))]
      .map((c) => `<option value="${esc(c)}">`).join("");
  }

  function render() {
    renderStats();
    const q = query.trim().toLowerCase();
    const rows = items
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !q || `${p.name} ${p.category}`.toLowerCase().includes(q));
    $("list").innerHTML = rows.length
      ? rows.map(({ p, i }) => rowHtml(p, i)).join("")
      : '<p class="muted center">No products match your search.</p>';
    updateSaveBar();
  }

  function rowEl(i) { return $("list").querySelector(`.a-item[data-i="${i}"]`); }
  function rerenderRow(i) {
    const el = rowEl(i);
    if (el) el.outerHTML = rowHtml(items[i], i);
    renderStats();
    updateSaveBar();
  }
  function updateSaveBar() {
    $("savebar").hidden = !isDirty();
    document.body.classList.toggle("has-savebar", isDirty());
  }

  // ---------- editing ----------
  $("list").addEventListener("input", (e) => {
    const input = e.target.closest("[data-f]");
    if (!input) return;
    const i = Number(input.closest(".a-item").dataset.i);
    const f = input.dataset.f;
    let v = input.value;
    if (f === "price") v = v === "" ? 0 : Math.max(0, Number(v));
    if (f === "stock") v = v === "" ? 0 : Math.max(0, Math.floor(Number(v)));
    items[i][f] = v;
    if (f === "stock") {
      // refresh the badge without losing focus
      const s = stockState(v);
      const row = rowEl(i);
      const pill = row.querySelector(".pill");
      pill.className = "pill " + s.cls; pill.textContent = s.label;
      row.classList.toggle("is-out", s.cls === "out");
      row.querySelector('[data-act="soldout"]').disabled = v <= 0;
    }
    renderStats();
    updateSaveBar();
  });

  $("list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const i = Number(btn.closest(".a-item").dataset.i);
    const p = items[i];
    switch (btn.dataset.act) {
      case "inc": p.stock = (Number(p.stock) || 0) + 1; rerenderRow(i); break;
      case "dec": p.stock = Math.max(0, (Number(p.stock) || 0) - 1); rerenderRow(i); break;
      case "soldout": p.stock = 0; rerenderRow(i); break;
      case "rmphoto": delete p.image; rerenderRow(i); break;
      case "delete":
        if (confirm(`Delete "${p.name || "this product"}"? It will be removed from the shop when you save.`)) {
          items.splice(i, 1); render();
        }
        break;
      case "photo": photoFor = i; $("file").click(); break;
    }
  });

  $("search").addEventListener("input", (e) => { query = e.target.value; render(); });

  $("addBtn").addEventListener("click", () => {
    items.unshift({
      id: "p-" + Date.now().toString(36),
      name: "", category: "", unit: "", price: 0, stock: 0, emoji: "🧊",
    });
    query = ""; $("search").value = "";
    render();
    const first = rowEl(0);
    first.classList.add("is-new");
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    first.querySelector('[data-f="name"]').focus({ preventScroll: true });
  });

  // ---------- photos ----------
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file couldn't be opened as a photo. Try a JPG or PNG.")); };
      img.src = url;
    });
  }
  // Shrinks big phone photos to max 1400px so uploads are quick on mobile data.
  async function shrinkPhoto(file, max = 1400) {
    const img = await loadImage(file);
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't prepare the photo."))), "image/jpeg", 0.85)
    );
  }

  $("file").addEventListener("change", async () => {
    const file = $("file").files[0];
    $("file").value = "";
    const i = photoFor; photoFor = null;
    if (!file || i == null || !items[i]) return;
    const row = rowEl(i);
    row && row.classList.add("uploading");
    try {
      const blob = await shrinkPhoto(file);
      const data = await api(`/api/admin/upload?id=${encodeURIComponent(items[i].id)}`, {
        method: "POST", headers: { "content-type": "image/jpeg" }, body: blob,
      });
      items[i].image = data.url;
      rerenderRow(i);
      toast("Photo uploaded. Press Save changes to publish it.");
    } catch (err) {
      row && row.classList.remove("uploading");
      toast(err.message, "error");
      if (err.status === 401) logout();
    }
  });

  // ---------- save ----------
  $("saveBtn").addEventListener("click", async () => {
    const unnamed = items.findIndex((p) => !String(p.name).trim());
    if (unnamed !== -1) {
      query = ""; $("search").value = ""; render();
      const el = rowEl(unnamed);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector('[data-f="name"]').focus({ preventScroll: true });
      toast("Every product needs a name before saving.", "error");
      return;
    }
    const btn = $("saveBtn");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      await api("/api/admin/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ products: items }),
      });
      savedJson = JSON.stringify(items);
      $("sourceNote").hidden = true;
      document.querySelectorAll(".a-item.is-new").forEach((el) => el.classList.remove("is-new"));
      updateSaveBar();
      toast("Saved. Your shop is updated.");
    } catch (err) {
      toast(err.message, "error");
      if (err.status === 401) logout();
    } finally {
      btn.disabled = false; btn.textContent = "Save changes";
    }
  });

  $("discardBtn").addEventListener("click", () => {
    if (!confirm("Discard all unsaved changes?")) return;
    if (savedJson) items = JSON.parse(savedJson);
    else items = PRODUCTS.map((p) => ({ ...p }));
    render();
  });

  window.addEventListener("beforeunload", (e) => {
    if (isDirty() && !$("appView").hidden) { e.preventDefault(); e.returnValue = ""; }
  });
})();
