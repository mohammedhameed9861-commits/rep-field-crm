const $ = (s) => document.querySelector(s);
const fmt = (n) => `${Number.isInteger(n) ? n : n.toFixed(2)} ${CONFIG.currency}`;
const cart = {}; // itemId -> qty
const byId = {};
CONFIG.restaurants.forEach((r) => r.categories.forEach((c) => c.items.forEach((i) => (byId[i.id] = { ...i, rest: r }))));
let current = CONFIG.restaurants[0].id;

$("#siteName").textContent = CONFIG.siteName;

function renderTabs() {
  $("#tabs").innerHTML = "";
  CONFIG.restaurants.forEach((r) => {
    const b = document.createElement("button");
    b.textContent = r.name;
    b.className = r.id === current ? "on" : "";
    b.onclick = () => { current = r.id; renderTabs(); renderMenu(); };
    $("#tabs").appendChild(b);
  });
}

function renderMenu() {
  const r = CONFIG.restaurants.find((x) => x.id === current);
  $("#tagline").textContent = r.tagline || "";
  const m = $("#menu");
  m.innerHTML = "";
  r.categories.forEach((c) => {
    const h = document.createElement("h3");
    h.textContent = c.name;
    m.appendChild(h);
    c.items.forEach((i) => {
      const q = cart[i.id] || 0;
      const d = document.createElement("div");
      d.className = "item";
      const info = document.createElement("div");
      const nm = document.createElement("div"); nm.className = "name"; nm.textContent = i.name;
      const ds = document.createElement("div"); ds.className = "desc"; ds.textContent = i.desc || "";
      const pr = document.createElement("div"); pr.className = "price"; pr.textContent = fmt(i.price);
      info.append(nm, ds, pr);
      const qty = document.createElement("div"); qty.className = "qty";
      if (q) {
        const minus = btn("−", () => change(i.id, -1));
        const n = document.createElement("b"); n.textContent = q;
        qty.append(minus, n);
      }
      const plus = btn("+", () => change(i.id, 1)); plus.classList.add("add");
      qty.append(plus);
      d.append(info, qty);
      m.appendChild(d);
    });
  });
}
function btn(t, fn) { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.onclick = fn; return b; }

function change(id, d) {
  cart[id] = (cart[id] || 0) + d;
  if (cart[id] <= 0) delete cart[id];
  update();
}

const total = () => Object.entries(cart).reduce((s, [id, q]) => s + byId[id].price * q, 0);
const count = () => Object.values(cart).reduce((a, b) => a + b, 0);

function update() {
  renderMenu();
  const n = count();
  $("#cartBar").hidden = n === 0;
  $("#cartCount").textContent = n;
  $("#cartTotalBar").textContent = fmt(total());
  if (!$("#sheet").hidden) renderCart();
  if (n === 0) $("#sheet").hidden = true;
}

function renderCart() {
  const box = $("#cartItems");
  box.innerHTML = "";
  let last = null;
  Object.entries(cart).sort((a, b) => byId[a[0]].rest.id.localeCompare(byId[b[0]].rest.id)).forEach(([id, q]) => {
    const it = byId[id];
    if (it.rest.id !== last) {
      last = it.rest.id;
      const g = document.createElement("div"); g.className = "grp"; g.textContent = it.rest.name; box.appendChild(g);
    }
    const row = document.createElement("div"); row.className = "row";
    const t = document.createElement("span"); t.textContent = `${it.name} — ${fmt(it.price * q)}`;
    const qty = document.createElement("div"); qty.className = "qty";
    const n = document.createElement("b"); n.textContent = q;
    qty.append(btn("−", () => change(id, -1)), n, btn("+", () => change(id, 1)));
    row.append(t, qty);
    box.appendChild(row);
  });
  $("#cartTotal").textContent = fmt(total());
}

function waNumber(local, cc) {
  return cc + String(local).replace(/\D/g, "").replace(/^0+/, "");
}

function buildMessage(f) {
  const groups = {};
  Object.entries(cart).forEach(([id, q]) => { const it = byId[id]; (groups[it.rest.name] ||= []).push(`• ${it.name} × ${q} = ${fmt(it.price * q)}`); });
  const lines = ["*طلب جديد*", ""];
  Object.entries(groups).forEach(([r, ls]) => { lines.push(`*${r}*`, ...ls, ""); });
  lines.push(`*المجموع:* ${fmt(total())}`, "", `*الاسم:* ${f.name}`, `*الهاتف:* ${f.phone}`, `*العنوان:* ${f.address}`);
  if (f.notes) lines.push(`*ملاحظات:* ${f.notes}`);
  return lines.join("\n");
}

$("#cartBar").onclick = () => { renderCart(); $("#sheet").hidden = false; };
$("#closeSheet").onclick = () => ($("#sheet").hidden = true);
$("#sheet").onclick = (e) => { if (e.target.id === "sheet") $("#sheet").hidden = true; };

$("#orderForm").onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const err = $("#err");
  if (!f.name.trim() || !f.phone.trim() || !f.address.trim()) {
    err.textContent = "الرجاء تعبئة الاسم والهاتف والعنوان";
    err.hidden = false; return;
  }
  err.hidden = true;
  const url = `https://wa.me/${waNumber(CONFIG.whatsappLocal, CONFIG.countryCode)}?text=${encodeURIComponent(buildMessage(f))}`;
  window.open(url, "_blank", "noopener");
};

renderTabs();
update();
