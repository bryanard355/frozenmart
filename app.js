(function () {
  const $ = (id) => document.getElementById(id);
  const CART_KEY = "frozenmart-cart";
  let activeCategory = "All";
  let cart = loadCart();

  // ---------- helpers ----------
  function money(n) {
    return SHOP.currency + Number(n).toFixed(2);
  }
  function stockState(p) {
    if (p.stock <= 0) return { cls: "out", label: "Sold out" };
    if (p.stock <= SHOP.lowStockAt) return { cls: "low", label: "Only " + p.stock + " left" };
    return { cls: "ok", label: "In stock" };
  }
  function findProduct(id) {
    return PRODUCTS.find((p) => p.id === id);
  }
  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch (e) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  // Product photo: uses p.image if set, otherwise looks for photos/<id>.jpg / .jpeg / .png / .webp.
  // If no photo is found, the emoji behind it shows instead.
  const PHOTO_EXTS = ["jpg", "jpeg", "png", "webp"];
  // Bump this when photos change so browsers fetch fresh copies instead of old saved ones.
  const PHOTO_V = "?v=2";
  // All photos of a product (first one is the cover).
  function productImages(p) {
    if (Array.isArray(p.images) && p.images.length) return p.images.filter(Boolean);
    return p.image ? [p.image] : [];
  }
  function photoHtml(p) {
    const cover = productImages(p)[0];
    const first = cover ? cover : `photos/${p.id}.${PHOTO_EXTS[0]}${PHOTO_V}`;
    const tries = cover ? "" : PHOTO_EXTS.slice(1).join(",");
    return `<span class="ph-emoji" aria-hidden="true">${p.emoji || "🧊"}</span>` +
      `<img class="ph-img" src="${escapeHtml(first)}" alt="${escapeHtml(p.name)}" loading="lazy" ` +
      `data-id="${escapeHtml(p.id)}" data-tries="${tries}" onerror="nextPhoto(this)">`;
  }
  window.nextPhoto = function (img) {
    const tries = (img.dataset.tries || "").split(",").filter(Boolean);
    if (!tries.length) { img.remove(); return; }
    img.dataset.tries = tries.slice(1).join(",");
    img.src = `photos/${img.dataset.id}.${tries[0]}${PHOTO_V}`;
  };

  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1600);
  }

  // ---------- shop info ----------
  document.title = SHOP.name + " · " + SHOP.tagline;
  $("shopName").textContent = SHOP.name;
  $("shopTagline").textContent = SHOP.tagline;
  $("footerText").textContent = SHOP.footer;
  $("year").textContent = new Date().getFullYear();
  if (SHOP.location) {
    $("locationText").textContent = SHOP.location;
    $("promoLocation").textContent = SHOP.location;
  }
  $("phoneList").innerHTML = (SHOP.phones || []).map((n) =>
    `<a href="tel:${escapeHtml(String(n).replace(/[^\d+]/g, ""))}">${escapeHtml(n)}</a>`
  ).join("");


  // ---------- WhatsApp contact ----------
  const waDigits = String(SHOP.whatsappNumber).replace(/\D/g, "");
  const waLink = "https://wa.me/" + waDigits + "?text=" + encodeURIComponent("Hi " + SHOP.name + "! I have a question.");
  // e.g. 233509691257 -> +233 50 969 1257
  const waPretty = waDigits.length === 12
    ? "+" + waDigits.replace(/(\d{3})(\d{2})(\d{3})(\d{4})/, "$1 $2 $3 $4")
    : "+" + waDigits;
  $("waFloat").href = waLink;
  $("footerWa").href = waLink;
  $("waDisplay").textContent = waPretty;

  // ---------- categories ----------
  function renderCategories() {
    const cats = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
    $("categories").innerHTML = cats
      .map((c) => `<button class="chip ${c === activeCategory ? "active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
      .join("");
  }
  $("categories").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    renderCategories();
    renderProducts();
  });

  // ---------- products ----------
  function renderProducts() {
    const q = $("search").value.trim().toLowerCase();
    const onlyAvail = $("inStockOnly").checked;
    const list = PRODUCTS.filter((p) =>
      (activeCategory === "All" || p.category === activeCategory) &&
      (!q || (p.name + " " + p.category).toLowerCase().includes(q)) &&
      (!onlyAvail || p.stock > 0)
    );

    $("resultCount").textContent = list.length + (list.length === 1 ? " item" : " items");
    $("emptyMsg").hidden = list.length > 0;

    $("products").innerHTML = list.map((p) => {
      const s = stockState(p);
      const inCart = cart[p.id] || 0;
      const thumb = photoHtml(p);
      const count = productImages(p).length;
      const id = escapeHtml(p.id);
      return `
        <article class="card ${s.cls === "out" ? "soldout" : ""}">
          <button type="button" class="thumb" data-open="${id}" aria-label="View ${escapeHtml(p.name)}${count > 1 ? ` (${count} photos)` : ""}">
            ${thumb}<span class="badge ${s.cls}">${s.label}</span>
            ${count > 1 ? `<span class="ph-count"><svg viewBox="0 0 24 24"><path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>${count}</span>` : ""}
          </button>
          <div class="card-body">
            <div class="card-cat">${escapeHtml(p.category)}</div>
            <button type="button" class="card-name" data-open="${id}">${escapeHtml(p.name)}</button>
            <div class="card-unit">${escapeHtml(p.unit)}</div>
            <div class="card-foot">
              <span class="price">${money(p.price)}</span>
              <button class="add" data-id="${escapeHtml(p.id)}" ${s.cls === "out" || inCart >= p.stock ? "disabled" : ""}>
                ${s.cls === "out" ? "Sold out" : inCart ? "Add more (" + inCart + ")" : "Add to cart"}
              </button>
            </div>
          </div>
        </article>`;
    }).join("");
  }
  $("products").addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) { openProduct(opener.dataset.open); return; }
    const btn = e.target.closest(".add");
    if (!btn || btn.disabled) return;
    changeQty(btn.dataset.id, 1);
    toast("Added " + findProduct(btn.dataset.id).name);
  });

  // ---------- product details + photo gallery ----------
  let pdId = null;
  function openProduct(id) {
    const p = findProduct(id);
    if (!p) return;
    pdId = id;
    const imgs = productImages(p);
    const slides = imgs.length
      ? imgs.map((src, i) => `<div class="pd-slide"><img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)} photo ${i + 1}" onerror="this.remove()"><span class="ph-emoji" aria-hidden="true">${p.emoji || "🧊"}</span></div>`)
      : [`<div class="pd-slide">${photoHtml(p)}</div>`];
    $("pdTrack").innerHTML = slides.join("");
    $("pdTrack").scrollLeft = 0;
    const multi = slides.length > 1;
    $("pdPrev").hidden = $("pdNext").hidden = !multi;
    $("pdDots").innerHTML = multi ? slides.map((_, i) => `<button type="button" aria-label="Photo ${i + 1}" data-go="${i}"></button>`).join("") : "";
    $("pdThumbs").innerHTML = multi
      ? imgs.map((src, i) => `<button type="button" data-go="${i}" aria-label="Show photo ${i + 1}"><img src="${escapeHtml(src)}" alt=""></button>`).join("")
      : "";
    $("pdCat").textContent = p.category;
    $("pdName").textContent = p.name;
    $("pdUnit").textContent = p.unit || "";
    $("pdUnit").hidden = !p.unit;
    $("pdPrice").textContent = money(p.price);
    updateProductModal();
    setSlideMarker(0);
    $("pdModal").hidden = false;
    document.body.classList.add("modal-open");
    $("pdClose").focus({ preventScroll: true });
  }
  function updateProductModal() {
    const p = findProduct(pdId);
    if (!p) return;
    const s = stockState(p);
    const inCart = cart[p.id] || 0;
    $("pdStock").className = "badge " + s.cls;
    $("pdStock").textContent = s.label;
    const btn = $("pdAdd");
    btn.disabled = s.cls === "out" || inCart >= p.stock;
    btn.textContent = s.cls === "out" ? "Sold out" : inCart ? `Add another (${inCart} in cart)` : "Add to cart";
  }
  function closeProduct() {
    $("pdModal").hidden = true;
    document.body.classList.remove("modal-open");
    pdId = null;
  }
  function slideIndex() {
    const t = $("pdTrack");
    return Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
  }
  function goToSlide(i) {
    const t = $("pdTrack");
    const n = t.children.length;
    i = (i + n) % n;
    t.scrollTo({ left: i * t.clientWidth, behavior: "smooth" });
    setSlideMarker(i);
  }
  function setSlideMarker(i) {
    $("pdDots").querySelectorAll("button").forEach((b, j) => b.classList.toggle("on", j === i));
    $("pdThumbs").querySelectorAll("button").forEach((b, j) => b.classList.toggle("on", j === i));
  }
  $("pdTrack").addEventListener("scroll", () => {
    clearTimeout($("pdTrack")._t);
    $("pdTrack")._t = setTimeout(() => setSlideMarker(slideIndex()), 60);
  });
  $("pdPrev").addEventListener("click", () => goToSlide(slideIndex() - 1));
  $("pdNext").addEventListener("click", () => goToSlide(slideIndex() + 1));
  $("pdModal").addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { goToSlide(Number(go.dataset.go)); return; }
    if (e.target.id === "pdModal") closeProduct();
  });
  $("pdClose").addEventListener("click", closeProduct);
  $("pdAdd").addEventListener("click", () => {
    if (!pdId) return;
    changeQty(pdId, 1);
    toast("Added " + findProduct(pdId).name);
    updateProductModal();
  });
  document.addEventListener("keydown", (e) => {
    if ($("pdModal").hidden) return;
    if (e.key === "Escape") closeProduct();
    if (e.key === "ArrowRight") goToSlide(slideIndex() + 1);
    if (e.key === "ArrowLeft") goToSlide(slideIndex() - 1);
  });
  $("search").addEventListener("input", renderProducts);
  $("inStockOnly").addEventListener("change", renderProducts);

  // ---------- cart ----------
  function changeQty(id, delta) {
    const p = findProduct(id);
    if (!p) return;
    const next = Math.min(p.stock, Math.max(0, (cart[id] || 0) + delta));
    if (next === 0) delete cart[id]; else cart[id] = next;
    if (delta > 0 && next === p.stock && (cart[id] || 0) === p.stock) {
      // reached the limit of what's available
    }
    saveCart();
    renderCart();
    renderProducts();
  }

  function cartLines() {
    return Object.entries(cart)
      .map(([id, qty]) => ({ p: findProduct(id), qty }))
      .filter((l) => l.p && l.p.stock > 0)
      .map((l) => ({ ...l, qty: Math.min(l.qty, l.p.stock) }));
  }

  // Delivery is always free.
  function deliveryFee() {
    return 0;
  }

  function renderCart() {
    const lines = cartLines();
    const count = lines.reduce((n, l) => n + l.qty, 0);
    $("cartCount").textContent = count;
    $("cartEmpty").hidden = lines.length > 0;
    $("checkout").hidden = lines.length === 0;

    $("cartList").innerHTML = lines.map(({ p, qty }) => `
      <li class="cart-item">
        <div class="cart-emoji">${photoHtml(p)}</div>
        <div>
          <div class="cart-name">${escapeHtml(p.name)}</div>
          <div class="cart-price">${money(p.price)} × ${qty} = <strong>${money(p.price * qty)}</strong></div>
        </div>
        <div class="qty">
          <button data-id="${escapeHtml(p.id)}" data-d="-1" aria-label="Remove one">−</button>
          <span>${qty}</span>
          <button data-id="${escapeHtml(p.id)}" data-d="1" aria-label="Add one" ${qty >= p.stock ? "disabled" : ""}>+</button>
        </div>
      </li>`).join("");

    const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
    const fee = deliveryFee(subtotal);
    $("subtotal").textContent = money(subtotal);
    $("deliveryFee").textContent = "FREE";
    const isDelivery = new FormData($("checkout")).get("method") === "Delivery";
    $("deliveryRow").hidden = !isDelivery;
    $("freeBanner").hidden = !isDelivery || lines.length === 0;
    $("total").textContent = money(subtotal + fee);
  }

  $("cartList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (btn) changeQty(btn.dataset.id, Number(btn.dataset.d));
  });

  function openCart() {
    $("drawer").classList.add("open");
    $("drawer").setAttribute("aria-hidden", "false");
    $("overlay").hidden = false;
  }
  function closeCart() {
    $("drawer").classList.remove("open");
    $("drawer").setAttribute("aria-hidden", "true");
    $("overlay").hidden = true;
  }
  $("openCart").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("overlay").addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  // ---------- checkout ----------
  $("checkout").addEventListener("change", (e) => {
    if (e.target.name === "method") {
      $("addressField").hidden = e.target.value !== "Delivery";
      renderCart();
    }
  });

  $("checkout").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const method = f.get("method");
    if (method === "Delivery" && !String(f.get("address")).trim()) {
      toast("Please enter your delivery address");
      return;
    }
    const lines = cartLines();
    const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
    const fee = deliveryFee(subtotal);
    const now = new Date();
    const order = {
      no: orderNumber(now),
      date: now.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
      time: now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      lines,
      subtotal,
      fee,
      total: subtotal + fee,
      name: String(f.get("name")).trim(),
      phone: String(f.get("phone")).trim(),
      method,
      address: String(f.get("address") || "").trim(),
      note: String(f.get("note") || "").trim(),
    };

    window.open(`https://wa.me/${waDigits}?text=${encodeURIComponent(receiptText(order))}`, "_blank");

    cart = {};
    saveCart();
    renderCart();
    renderProducts();
    closeCart();
    e.target.reset();
    $("addressField").hidden = false;
    showReceipt(order);
  });

  // ---------- receipt ----------
  function orderNumber(d) {
    const pad = (n) => String(n).padStart(2, "0");
    const rand = Math.floor(Math.random() * 900 + 100);
    return "FM-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + rand;
  }

  // Plain-text receipt for WhatsApp (sent inside a ``` block so it shows in monospace)
  function receiptText(o) {
    const W = 32;
    const line = "-".repeat(W);
    const dbl = "=".repeat(W);
    const center = (s) => {
      s = String(s).slice(0, W);
      const left = Math.floor((W - s.length) / 2);
      return " ".repeat(left) + s;
    };
    const row = (l, r) => {
      l = String(l); r = String(r);
      const space = W - r.length - 1;
      if (l.length > space) l = l.slice(0, space - 1) + "…";
      return l + " ".repeat(W - l.length - r.length) + r;
    };
    const wrap = (label, text) => {
      const out = [];
      let cur = label;
      String(text).split(/\s+/).forEach((w) => {
        if ((cur + " " + w).length > W && cur.trim()) { out.push(cur); cur = "  " + w; }
        else cur = cur ? cur + (cur.endsWith(" ") ? "" : " ") + w : w;
      });
      if (cur) out.push(cur);
      return out;
    };

    const body = [
      center(SHOP.name.toUpperCase()),
      center("ORDER RECEIPT"),
      dbl,
      row("Order:", o.no),
      row("Date:", o.date + " " + o.time),
      line,
      ...o.lines.flatMap((l) => [
        l.p.name.slice(0, W),
        row(`  ${l.qty} x ${money(l.p.price)}`, money(l.p.price * l.qty)),
      ]),
      line,
      row("Subtotal", money(o.subtotal)),
      o.method === "Delivery" ? row("Delivery", "FREE") : row("Pickup", "-"),
      dbl,
      row("TOTAL", money(o.total)),
      dbl,
      ...wrap("Name:", o.name),
      ...wrap("Phone:", o.phone),
      row("Method:", o.method),
      ...(o.method === "Delivery" ? wrap("Address:", o.address) : []),
      ...(o.note ? wrap("Note:", o.note) : []),
      line,
      center("Thank you for shopping!"),
    ];

    return "🧾 *New order — " + SHOP.name + "*\n```\n" + body.join("\n") + "\n```";
  }

  function showReceipt(o) {
    $("rcptShop").textContent = SHOP.name;
    $("rcptContact").textContent = "WhatsApp " + waPretty;
    $("rcptNo").textContent = o.no;
    $("rcptDate").innerHTML = escapeHtml(o.date + ", " + o.time) + "<br>" +
      escapeHtml(o.method) + " · " + o.lines.reduce((n, l) => n + l.qty, 0) + " items";
    $("rcptItems").innerHTML = o.lines.map((l) => `
      <li><span>${l.qty} ${escapeHtml(l.p.name)}</span><span>${money(l.p.price * l.qty)}</span></li>`).join("");
    $("rcptSubtotal").textContent = money(o.subtotal);
    $("rcptDeliveryLabel").textContent = o.method === "Delivery" ? "Free delivery applied" : "Pickup";
    $("rcptDelivery").textContent = o.method === "Delivery" ? money(0) : "—";
    $("rcptTotal").textContent = money(o.total);
    $("rcptCustomer").innerHTML = [
      ["Name", o.name],
      ["Phone", o.phone],
      o.method === "Delivery" ? ["Address", o.address] : null,
      o.note ? ["Note", o.note] : null,
    ].filter(Boolean).map(([k, v]) => `<div><span>${k}</span><span>${escapeHtml(v)}</span></div>`).join("");
    $("receiptModal").hidden = false;
    document.body.classList.add("receipt-open");
  }
  function closeReceipt() {
    $("receiptModal").hidden = true;
    document.body.classList.remove("receipt-open");
  }
  $("rcptClose").addEventListener("click", closeReceipt);
  $("rcptDone").addEventListener("click", closeReceipt);
  $("rcptPrint").addEventListener("click", () => window.print());
  $("receiptModal").addEventListener("click", (e) => { if (e.target.id === "receiptModal") closeReceipt(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("receiptModal").hidden) closeReceipt(); });

  // ---------- start ----------
  // Live stock comes from the admin page (/api/catalog). If it can't be reached,
  // the shop falls back to the list in products.js.
  async function loadLiveCatalog() {
    if (location.protocol === "file:") return;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch("/api/catalog", { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length) {
        PRODUCTS.splice(0, PRODUCTS.length, ...data.products);
      }
    } catch (e) { /* use products.js */ }
  }

  $("products").innerHTML = Array.from({ length: 8 }, () =>
    '<div class="card skeleton" aria-hidden="true"><div class="thumb"></div><div class="card-body"><i></i><i></i><i></i></div></div>'
  ).join("");

  loadLiveCatalog().then(() => {
    renderCategories();
    renderProducts();
    renderCart();
  });
})();
