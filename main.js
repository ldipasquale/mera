const PRICE = 4900;
const MIN = 4;
const FLAVORS = ["pollo", "higado", "cogote", "taurina"];

const cards = [...document.querySelectorAll(".card")];
const catalog = Object.fromEntries(
  cards.map((card) => [
    card.dataset.id,
    {
      id: card.dataset.id,
      name: card.dataset.name,
      price: Number(card.dataset.price),
      stock: Number(card.dataset.stock),
      short: card.querySelector("h3").textContent,
    },
  ])
);

const money = (value) =>
  `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}`;

const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

let cart = storage.get("mera-cart", {});
let sold = storage.get("mera-sold", {});
let packSize = 8;
const packQty = { pollo: 2, higado: 2, cogote: 2, taurina: 2 };

const els = {
  count: document.getElementById("cart-count"),
  lines: document.getElementById("cart-lines"),
  empty: document.getElementById("cart-empty"),
  foot: document.getElementById("cart-foot"),
  total: document.getElementById("cart-total"),
  minNote: document.getElementById("min-note"),
  checkout: document.getElementById("checkout"),
  checkoutBtn: document.getElementById("checkout-btn"),
  formError: document.getElementById("form-error"),
  drawer: document.getElementById("drawer"),
  backdrop: document.getElementById("backdrop"),
  cartView: document.getElementById("cart-view"),
  thanks: document.getElementById("thanks"),
  orderId: document.getElementById("order-id"),
  orderSummary: document.getElementById("order-summary"),
  toast: document.getElementById("toast"),
  progress: document.getElementById("pack-progress"),
  packTotal: document.getElementById("pack-total"),
  packShip: document.getElementById("pack-ship"),
  packLines: document.getElementById("pack-lines"),
  addPack: document.getElementById("add-pack"),
  modal: document.getElementById("modal"),
  nav: document.getElementById("nav"),
  menuToggle: document.getElementById("menu-toggle"),
};

function remain(id) {
  return Math.max(0, catalog[id].stock - (sold[id] || 0) - (cart[id] || 0));
}

function inDrop(id) {
  return Math.max(0, catalog[id].stock - (sold[id] || 0));
}

function cartCount() {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

function cartTotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => sum + qty * catalog[id].price, 0);
}

function packSum() {
  return FLAVORS.reduce((sum, id) => sum + packQty[id], 0);
}

let toastTimer;
function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2600);
}

function saveCart() {
  storage.set("mera-cart", cart);
}

function renderStock() {
  cards.forEach((card) => {
    const id = card.dataset.id;
    const leftNow = remain(id);
    const label = card.querySelector("[data-stock-label]");
    const button = card.querySelector("[data-add]");
    label.classList.remove("low", "out");
    if (leftNow <= 0) {
      label.textContent = "Agotado";
      label.classList.add("out");
      button.disabled = true;
      button.textContent = "Agotado";
    } else if (leftNow <= 20) {
      label.textContent = `Quedan ${leftNow}`;
      label.classList.add("low");
      button.disabled = false;
      button.textContent = "Sumar";
    } else {
      label.textContent = "En tanda";
      button.disabled = false;
      button.textContent = "Sumar";
    }
  });
}

function renderCart() {
  const count = cartCount();
  els.count.textContent = String(count);
  els.lines.innerHTML = "";
  const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
  els.empty.hidden = entries.length > 0;
  els.foot.hidden = entries.length === 0;

  entries.forEach(([id, qty]) => {
    const item = catalog[id];
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${item.short}</strong>
        <p>${item.name}</p>
      </div>
      <span class="line-price">${money(item.price * qty)}</span>
      <span class="qty">
        <button type="button" data-cart="-1" data-id="${id}" aria-label="Menos ${item.short}">−</button>
        <span>${qty}</span>
        <button type="button" data-cart="1" data-id="${id}" aria-label="Más ${item.short}" ${remain(id) <= 0 ? "disabled" : ""}>+</button>
      </span>
      <button class="remove" type="button" data-remove="${id}">Quitar</button>
    `;
    els.lines.appendChild(li);
  });

  els.total.textContent = money(cartTotal());
  const ready = count >= MIN;
  els.minNote.textContent = ready
    ? count >= 8
      ? "Envío gratis en CABA y GBA."
      : "Envío a coordinar. Desde 8 snacks, es gratis en CABA y GBA."
    : `Te faltan ${MIN - count} para el mínimo de ${MIN}.`;
  els.checkoutBtn.disabled = !ready;
  renderStock();
  renderPack();
}

function renderPack() {
  const sum = packSum();
  FLAVORS.forEach((id) => {
    document.querySelector(`[data-qty="${id}"]`).textContent = String(packQty[id]);
    const minus = document.querySelector(`[data-step="-1"][data-flavor="${id}"]`);
    const plus = document.querySelector(`[data-step="1"][data-flavor="${id}"]`);
    minus.disabled = packQty[id] <= 0;
    plus.disabled = sum >= packSize || packQty[id] >= remain(id);
  });
  els.progress.textContent =
    sum === packSize ? `${sum} de ${packSize}` : `Repartí ${packSize}. Van ${sum}.`;
  const active = FLAVORS.filter((id) => packQty[id] > 0);
  els.packLines.innerHTML = active
    .map(
      (id) =>
        `<li><span>${packQty[id]} ${catalog[id].short}</span><span>${money(packQty[id] * PRICE)}</span></li>`
    )
    .join("");
  els.packTotal.textContent = money(sum * PRICE);
  els.packShip.textContent =
    packSize >= 8 ? "Envío gratis en CABA y GBA" : "Envío a coordinar en CABA y GBA";
  const fits = FLAVORS.every((id) => packQty[id] <= remain(id));
  els.addPack.disabled = sum !== packSize || !fits;
  els.addPack.textContent = sum === packSize ? "Sumar este pack" : "Completá el pack";
}

function setPackSize(size) {
  packSize = size;
  const even = Math.floor(size / FLAVORS.length);
  let rest = size - even * FLAVORS.length;
  FLAVORS.forEach((id) => {
    packQty[id] = even + (rest > 0 ? 1 : 0);
    if (rest > 0) rest -= 1;
    packQty[id] = Math.min(packQty[id], remain(id));
  });
  let guard = 0;
  while (packSum() < size && guard < 40) {
    const id = FLAVORS.find((flavor) => packQty[flavor] < remain(flavor));
    if (!id) break;
    packQty[id] += 1;
    guard += 1;
  }
  document.querySelectorAll("[data-size]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.size === String(size) ? "true" : "false");
  });
  renderPack();
}

function addToCart(id, qty) {
  const room = remain(id);
  if (room <= 0) {
    toast(`${catalog[id].short} se agotó en esta tanda.`);
    return false;
  }
  const take = Math.min(qty, room);
  cart[id] = (cart[id] || 0) + take;
  if (take < qty) toast(`Solo quedaban ${take} de ${catalog[id].short}.`);
  return true;
}

function closeMenu() {
  els.nav.classList.remove("open");
  els.menuToggle.setAttribute("aria-expanded", "false");
  els.menuToggle.textContent = "Menú";
}

let hideDrawerTimer;

function openDrawer() {
  clearTimeout(hideDrawerTimer);
  closeMenu();
  els.drawer.hidden = false;
  els.backdrop.hidden = false;
  requestAnimationFrame(() => els.drawer.classList.add("open"));
  document.body.classList.add("locked");
  els.drawer.focus();
}

function closeDrawer() {
  els.drawer.classList.remove("open");
  if (els.modal.hidden) {
    els.backdrop.hidden = true;
    document.body.classList.remove("locked");
  }
  hideDrawerTimer = setTimeout(() => {
    if (!els.drawer.classList.contains("open")) els.drawer.hidden = true;
  }, 240);
}

function openModal(mode) {
  closeMenu();
  const title = document.getElementById("modal-title");
  const copy = document.getElementById("modal-copy");
  const kicker = document.getElementById("modal-kicker");
  const local = document.getElementById("local-field");
  const done = document.getElementById("lead-done");
  const form = document.getElementById("lead-form");
  done.hidden = true;
  form.hidden = false;
  form.reset();
  document.getElementById("lead-error").hidden = true;
  els.modal.dataset.mode = mode;
  if (mode === "trade") {
    kicker.textContent = "Comercios";
    title.textContent = "Packs para tu local.";
    copy.textContent = "Dejanos el nombre del punto de venta y un WhatsApp. Armamos la caja con los sabores de la tanda.";
    local.hidden = false;
    local.querySelector("input").required = true;
    document.getElementById("lead-submit").textContent = "Pedir propuesta";
  } else {
    kicker.textContent = "Alimento diario";
    title.textContent = "Te avisamos.";
    copy.textContent = "Cuando abran los sobres de 1 kg y 3 kg, te escribimos a este WhatsApp. Nada más.";
    local.hidden = true;
    local.querySelector("input").required = false;
    document.getElementById("lead-submit").textContent = "Dejar el aviso";
  }
  els.modal.hidden = false;
  els.backdrop.hidden = false;
  document.body.classList.add("locked");
  els.modal.querySelector("input").focus();
}

function closeModal() {
  els.modal.hidden = true;
  if (els.drawer.hidden) {
    els.backdrop.hidden = true;
    document.body.classList.remove("locked");
  }
}

document.getElementById("cards").addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button || button.disabled) return;
  if (addToCart(button.dataset.add, 1)) {
    saveCart();
    renderCart();
    els.count.classList.add("bump");
    setTimeout(() => els.count.classList.remove("bump"), 180);
    toast("Sumado a la tanda.");
  }
});

document.querySelector(".sizes").addEventListener("click", (event) => {
  const button = event.target.closest("[data-size]");
  if (!button) return;
  setPackSize(Number(button.dataset.size));
});

document.querySelector(".flavors").addEventListener("click", (event) => {
  const button = event.target.closest("[data-step]");
  if (!button || button.disabled) return;
  const id = button.dataset.flavor;
  const next = packQty[id] + Number(button.dataset.step);
  if (next < 0 || next > remain(id)) return;
  if (Number(button.dataset.step) > 0 && packSum() >= packSize) return;
  packQty[id] = next;
  renderPack();
});

els.addPack.addEventListener("click", () => {
  if (els.addPack.disabled) return;
  const snapshot = { ...cart };
  for (const id of FLAVORS) {
    if (!packQty[id]) continue;
    const room = remain(id);
    if (packQty[id] > room) {
      cart = snapshot;
      toast(`No alcanza el cupo de ${catalog[id].short}.`);
      renderCart();
      return;
    }
    cart[id] = (cart[id] || 0) + packQty[id];
  }
  saveCart();
  renderCart();
  toast("Pack sumado.");
  openDrawer();
});

document.getElementById("share-pack").addEventListener("click", async () => {
  const parts = FLAVORS.filter((id) => packQty[id]).map((id) => `${packQty[id]} ${catalog[id].short}`);
  const text = `Mi pack Mera, tanda 01: ${parts.join(", ")}. ${money(packSum() * PRICE)}.`;
  try {
    await navigator.clipboard.writeText(text);
    toast("Combo copiado.");
  } catch {
    toast(text);
  }
});

els.lines.addEventListener("click", (event) => {
  const step = event.target.closest("[data-cart]");
  const remove = event.target.closest("[data-remove]");
  if (step && !step.disabled) {
    const id = step.dataset.id;
    const next = (cart[id] || 0) + Number(step.dataset.cart);
    if (next <= 0) delete cart[id];
    else if (next <= inDrop(id)) cart[id] = next;
    else toast(`No hay más ${catalog[id].short} en la tanda.`);
  }
  if (remove) delete cart[remove.dataset.remove];
  saveCart();
  renderCart();
});

document.getElementById("open-cart").addEventListener("click", () => {
  els.cartView.hidden = false;
  els.thanks.hidden = true;
  openDrawer();
});

document.getElementById("close-cart").addEventListener("click", closeDrawer);
els.backdrop.addEventListener("click", () => {
  closeDrawer();
  closeModal();
});

els.checkout.addEventListener("submit", (event) => {
  event.preventDefault();
  els.formError.hidden = true;
  if (cartCount() < MIN) {
    els.formError.hidden = false;
    els.formError.textContent = `El mínimo es de ${MIN} snacks.`;
    return;
  }
  const data = Object.fromEntries(new FormData(els.checkout));
  const digits = String(data.whatsapp).replace(/\D/g, "");
  if (digits.length < 8) {
    els.formError.hidden = false;
    els.formError.textContent = "Dejá un WhatsApp para coordinar la entrega.";
    return;
  }
  for (const [id, qty] of Object.entries(cart)) {
    if (qty > inDrop(id)) {
      els.formError.hidden = false;
      els.formError.textContent = `${catalog[id].short} ya no tiene ese cupo.`;
      renderCart();
      return;
    }
  }
  const id = `M${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const lines = Object.entries(cart).map(([flavor, qty]) => `${qty} × ${catalog[flavor].name}`);
  const summary = [
    `Mera · pedido ${id}`,
    `Tanda 01 · entrega 13 y 14 de noviembre`,
    ...lines,
    `Total ${money(cartTotal())}`,
    `${data.nombre} · ${data.zona}`,
    `WhatsApp ${data.whatsapp}`,
    data.recomendado ? `Recomendado por ${data.recomendado}` : "",
    data.nota ? `Nota: ${data.nota}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  Object.entries(cart).forEach(([flavor, qty]) => {
    sold[flavor] = (sold[flavor] || 0) + qty;
  });
  storage.set("mera-sold", sold);
  const orders = storage.get("mera-orders", []);
  orders.push({ id, summary, at: new Date().toISOString() });
  storage.set("mera-orders", orders);
  cart = {};
  saveCart();
  renderCart();
  els.orderId.textContent = id;
  els.orderSummary.textContent = summary;
  els.cartView.hidden = true;
  els.thanks.hidden = false;
  els.checkout.reset();
});

document.getElementById("copy-order").addEventListener("click", async () => {
  const text = els.orderSummary.textContent;
  try {
    await navigator.clipboard.writeText(text);
    toast("Resumen copiado.");
  } catch {
    toast("No se pudo copiar. Seleccioná el texto.");
  }
});

document.getElementById("another-order").addEventListener("click", () => {
  els.thanks.hidden = true;
  els.cartView.hidden = false;
  closeDrawer();
  document.getElementById("menu").scrollIntoView();
});

document.getElementById("open-notify").addEventListener("click", () => openModal("notify"));
document.getElementById("open-trade").addEventListener("click", () => openModal("trade"));
document.getElementById("close-modal").addEventListener("click", closeModal);

document.getElementById("lead-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const error = document.getElementById("lead-error");
  error.hidden = true;
  const data = Object.fromEntries(new FormData(event.target));
  if (String(data.whatsapp).replace(/\D/g, "").length < 8) {
    error.hidden = false;
    error.textContent = "Dejá un WhatsApp válido.";
    return;
  }
  const key = els.modal.dataset.mode === "trade" ? "mera-trade" : "mera-notify";
  const list = storage.get(key, []);
  list.push({ ...data, at: new Date().toISOString() });
  storage.set(key, list);
  event.target.hidden = true;
  document.getElementById("lead-done").hidden = false;
});

  els.menuToggle.addEventListener("click", () => {
  const open = !els.nav.classList.contains("open");
  if (open) {
    closeDrawer();
    closeModal();
    els.nav.classList.add("open");
    document.body.classList.add("locked");
    els.menuToggle.textContent = "Cerrar";
  } else {
    closeMenu();
    document.body.classList.remove("locked");
  }
  els.menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
});

els.nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    closeMenu();
    document.body.classList.remove("locked");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!els.modal.hidden) closeModal();
  else if (!els.drawer.hidden) closeDrawer();
  else if (els.nav.classList.contains("open")) els.menuToggle.click();
});

const header = document.querySelector(".header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
document.addEventListener("scroll", onScroll, { passive: true });
onScroll();

renderCart();
setPackSize(8);
