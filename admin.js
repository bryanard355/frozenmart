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

  // Big green confirmation banner (stays ~5 seconds, tap to close).
  let savedTimer;
  function showSaved(msg) {
    const b = $("savedBanner");
    $("savedText").textContent = msg;
    b.hidden = false;
    b.classList.remove("in"); void b.offsetWidth; b.classList.add("in");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (b.hidden = true), 5000);
  }
  function markRowSaved(i) {
    const row = rowEl(i);
    if (!row) return;
    row.classList.add("just-saved");
    setTimeout(() => row.classList.remove("just-saved"), 6000);
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

  // All photos of a product (first = cover). Older saves used a single "image".
  function imgs(p) {
    if (Array.isArray(p.images) && p.images.length) return p.images.slice();
    return p.image ? [p.image] : [];
  }
  function setImgs(p, list) {
    if (list.length) { p.images = list; p.image = list[0]; }
    else { delete p.images; delete p.image; }
  }
  function thumbHtml(p) {
    const src = imgs(p)[0] || `photos/${p.id}.jpg?v=2`;
    return `<span class="a-emoji">${esc(p.emoji || "🧊")}</span><img src="${esc(src)}" alt="" onerror="this.remove()">`;
  }

  function rowHtml(p, i) {
    const s = stockState(Number(p.stock) || 0);
    return `
      <article class="a-item ${s.cls === "out" ? "is-out" : ""}" data-i="${i}">
        <div class="a-photo">
          <button type="button" class="a-thumb" data-act="photo" aria-label="Add a photo for ${esc(p.name || "new product")}">
            ${thumbHtml(p)}
            <span class="a-thumb-label">${imgs(p).length ? "+ Add photo" : "Add photo"}</span>
            <span class="a-spinner"></span>
          </button>
          ${imgs(p).length ? `<div class="a-gallery">
            ${imgs(p).map((src, n) => `
              <span class="a-mini ${n === 0 ? "is-cover" : ""}">
                <button type="button" data-act="cover" data-n="${n}" title="${n === 0 ? "Cover photo" : "Make this the cover photo"}"><img src="${esc(src)}" alt=""></button>
                <button type="button" class="a-mini-x" data-act="rmphoto" data-n="${n}" aria-label="Remove photo ${n + 1}">×</button>
              </span>`).join("")}
          </div>
          <span class="a-photo-hint">${imgs(p).length > 1 ? "Tap a photo to make it the cover" : ""}</span>` : ""}
          ${imgs(p).length < 8 ? `<button type="button" class="a-upload" data-act="photo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
            Add photo</button>` : ""}
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

  // Starting-list products that aren't in the list yet (matched by id or name).
  function missingStarters() {
    const ids = new Set(items.map((p) => p.id));
    const names = new Set(items.map((p) => String(p.name).trim().toLowerCase()));
    return PRODUCTS.filter((p) => !ids.has(p.id) && !names.has(p.name.toLowerCase()));
  }
  function renderStarterPick() {
    const miss = missingStarters();
    const pick = $("starterPick");
    pick.hidden = !miss.length;
    pick.innerHTML = '<option value="">+ Add from your list…</option>' +
      miss.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(cur())} ${esc(p.price)}${imgs(p).length ? ` · ${imgs(p).length} photo${imgs(p).length > 1 ? "s" : ""}` : ""}</option>`).join("");
  }

  function render() {
    renderStats();
    renderStarterPick();
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
      case "rmphoto": {
        const list = imgs(p); list.splice(Number(btn.dataset.n), 1); setImgs(p, list); rerenderRow(i); break;
      }
      case "cover": {
        const list = imgs(p); const [pick] = list.splice(Number(btn.dataset.n), 1); list.unshift(pick); setImgs(p, list); rerenderRow(i); break;
      }
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

  // Prepares a photo for upload: shrinks it if the browser can read it, otherwise
  // sends the original when it's already a web format (JPG/PNG/WebP).
  async function preparePhoto(file) {
    try {
      return { blob: await shrinkPhoto(file), type: "image/jpeg" };
    } catch (err) {
      if (/^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 4 * 1024 * 1024) return { blob: file, type: file.type };
      throw new Error(`"${file.name}" can't be used. Please choose a JPG or PNG photo (on iPhone: Settings → Camera → Formats → Most Compatible, or send yourself a screenshot).`);
    }
  }

  async function uploadPhotos(i, files) {
    const p = items[i];
    if (!p || !files.length) return;
    const room = 8 - imgs(p).length;
    if (room <= 0) { toast("This product already has 8 photos. Remove one first.", "error"); return; }
    files = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)).slice(0, room);
    if (!files.length) { toast("Please choose a photo file.", "error"); return; }
    const row = rowEl(i);
    row && row.classList.add("uploading");
    let added = 0;
    for (const [n, file] of files.entries()) {
      try {
        if (files.length > 1) toast(`Uploading photo ${n + 1} of ${files.length}…`);
        const { blob, type } = await preparePhoto(file);
        const data = await api(`/api/admin/upload?id=${encodeURIComponent(p.id)}`, {
          method: "POST", headers: { "content-type": type }, body: blob,
        });
        setImgs(p, [...imgs(p), data.url].slice(0, 8));
        added++;
      } catch (err) {
        toast(err.message, "error");
        if (err.status === 401) { logout(); return; }
      }
    }
    rerenderRow(items.indexOf(p));
    if (!added) return;
    // Publish straight away so the photo shows on the shop without an extra step.
    if (String(p.name).trim() && items.every((x) => String(x.name).trim())) {
      const ok = await saveAll(true);
      if (ok) {
        const msg = added > 1 ? `${added} photos added to ${p.name}` : `Photo added to ${p.name}`;
        showSaved(msg);
        markRowSaved(items.indexOf(p));
      }
    } else {
      toast("Photo added. Give the product a name, then press Save changes.");
    }
  }

  $("file").addEventListener("change", () => {
    const files = [...$("file").files];
    $("file").value = "";
    const i = photoFor; photoFor = null;
    if (i != null) uploadPhotos(i, files);
  });

  // Drag & drop photos onto a product (computer).
  $("list").addEventListener("dragover", (e) => {
    const row = e.target.closest(".a-item");
    if (!row || !e.dataTransfer || ![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    document.querySelectorAll(".a-item.drop").forEach((el) => el !== row && el.classList.remove("drop"));
    row.classList.add("drop");
  });
  $("list").addEventListener("dragleave", (e) => {
    const row = e.target.closest(".a-item");
    if (row && !row.contains(e.relatedTarget)) row.classList.remove("drop");
  });
  $("list").addEventListener("drop", (e) => {
    const row = e.target.closest(".a-item");
    if (!row) return;
    e.preventDefault();
    row.classList.remove("drop");
    uploadPhotos(Number(row.dataset.i), [...e.dataTransfer.files]);
  });

  // ---------- save ----------
  async function saveAll(quiet) {
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
      if (!quiet) showSaved("All changes saved");
      return true;
    } catch (err) {
      toast(err.message, "error");
      if (err.status === 401) logout();
      return false;
    } finally {
      btn.disabled = false; btn.textContent = "Save changes";
    }
  }

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
    await saveAll(false);
  });

  // ---------- flyer / starting list ----------
  const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z]/g, "");
  function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  // Finds the product in the current list that is the same as a flyer product
  // (same id, same name, or a near spelling like "Gizard" for "Gizzard").
  function findMatch(flyer, list) {
    const n = norm(flyer.name);
    return list.find((p) => p.id === flyer.id) ||
      list.find((p) => norm(p.name) === n) ||
      list.find((p) => { const m = norm(p.name); return m.length > 3 && editDistance(m, n) <= (n.length > 6 ? 2 : 1); });
  }

  // Picker: add one flyer product and publish it.
  $("starterPick").addEventListener("change", async (e) => {
    const p = PRODUCTS.find((x) => x.id === e.target.value);
    e.target.value = "";
    if (!p) return;
    items.unshift(JSON.parse(JSON.stringify(p)));
    query = ""; $("search").value = "";
    render();
    const first = rowEl(0);
    first.classList.add("is-new");
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    if (items.every((x) => String(x.name).trim()) && await saveAll(true)) {
      showSaved(`${p.name} added`);
      markRowSaved(0);
    }
  });

  // Switch the whole list to the flyer products, keeping stock and photos you already set.
  $("starterBtn").addEventListener("click", async () => {
    const used = new Set();
    const next = PRODUCTS.map((flyer) => {
      const mine = findMatch(flyer, items.filter((x) => !used.has(x)));
      const copy = JSON.parse(JSON.stringify(flyer));
      if (mine) {
        used.add(mine);
        copy.id = mine.id;
        copy.stock = mine.stock;
        if (imgs(mine).length) setImgs(copy, imgs(mine));
      }
      return copy;
    });
    const removed = items.filter((x) => !used.has(x)).map((x) => x.name);
    const kept = [...used].map((x) => x.name);
    const NL = String.fromCharCode(10);
    const msg = ["Switch your shop to the flyer products?", "",
      ...PRODUCTS.map((p) => `• ${p.name} (${cur()} ${p.price})`),
      ...(kept.length ? ["", "Keeps your stock and photos for: " + kept.join(", ")] : []),
      ...(removed.length ? ["", "Removes: " + removed.join(", ")] : []),
      "", "This is saved to your shop straight away."].join(NL);
    if (!confirm(msg)) return;
    items = next;
    query = ""; $("search").value = "";
    render();
    if (await saveAll(true)) {
      showSaved("Your shop now shows the flyer products");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
