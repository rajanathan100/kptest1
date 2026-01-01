// Kolapasi Canteen • Daily Stock Status (offline-first PWA)
// Data is stored locally on the device (localStorage).

const LS_KEY = "kc_stock_items_v1";
const LS_DATE = "kc_report_date_v1";

const els = {
  reportDate: document.getElementById("reportDate"),
  search: document.getElementById("search"),
  filterStatus: document.getElementById("filterStatus"),
  tbody: document.getElementById("tbody"),
  sumTotal: document.getElementById("sumTotal"),
  sumOk: document.getElementById("sumOk"),
  sumReorder: document.getElementById("sumReorder"),
  sumOos: document.getElementById("sumOos"),
  btnAdd: document.getElementById("btnAdd"),
  btnExport: document.getElementById("btnExport"),
  drawer: document.getElementById("drawer"),
  backdrop: document.getElementById("drawerBackdrop"),
  btnClose: document.getElementById("btnClose"),
  form: document.getElementById("form"),
  drawerTitle: document.getElementById("drawerTitle"),
  btnDelete: document.getElementById("btnDelete"),
  itemId: document.getElementById("itemId"),
  itemName: document.getElementById("itemName"),
  category: document.getElementById("category"),
  unit: document.getElementById("unit"),
  opening: document.getElementById("opening"),
  stockIn: document.getElementById("stockIn"),
  stockOut: document.getElementById("stockOut"),
  reorder: document.getElementById("reorder"),
  remarks: document.getElementById("remarks"),
};

function todayISO(){
  const d = new Date();
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOff).toISOString().slice(0,10);
}

function safeNum(x){
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function calcClosing(it){
  return safeNum(it.opening) + safeNum(it.in) - safeNum(it.out);
}

function calcStatus(it){
  const closing = calcClosing(it);
  const rl = safeNum(it.reorderLevel);
  if (closing <= 0) return "Out of Stock";
  if (rl > 0 && closing <= rl) return "Reorder";
  return "OK";
}

function loadItems(){
  try{
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  }catch{
    return [];
  }
}

function saveItems(items){
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function loadDate(){
  return localStorage.getItem(LS_DATE) || todayISO();
}
function saveDate(val){
  localStorage.setItem(LS_DATE, val);
}

function pillClass(status){
  if (status === "OK") return "pill ok";
  if (status === "Reorder") return "pill reorder";
  return "pill oos";
}

function formatNum(n){
  // Keep simple for phones
  if (!Number.isFinite(n)) return "";
  const s = String(Math.round(n * 100) / 100);
  return s;
}

function render(){
  const items = loadItems().map(it => {
    const closing = calcClosing(it);
    const status = calcStatus(it);
    return {...it, closing, status};
  });

  const q = (els.search.value || "").trim().toLowerCase();
  const f = els.filterStatus.value;

  const filtered = items.filter(it => {
    const matchesQ = !q || [
      it.name, it.category, it.unit, it.status, it.remarks
    ].join(" ").toLowerCase().includes(q);

    const matchesF = (f === "ALL") || (it.status === f);
    return matchesQ && matchesF;
  });

  els.tbody.innerHTML = "";
  for (const it of filtered){
    const tr = document.createElement("tr");

    const statusHtml = `<span class="${pillClass(it.status)}">${it.status}</span>`;

    tr.innerHTML = `
      <td><b>${escapeHtml(it.name)}</b></td>
      <td>${escapeHtml(it.category || "")}</td>
      <td class="num">${formatNum(safeNum(it.opening))}</td>
      <td class="num">${formatNum(safeNum(it.in))}</td>
      <td class="num">${formatNum(safeNum(it.out))}</td>
      <td class="num"><b>${formatNum(it.closing)}</b></td>
      <td>${escapeHtml(it.unit || "")}</td>
      <td class="num">${formatNum(safeNum(it.reorderLevel))}</td>
      <td>${statusHtml}</td>
      <td class="small">${escapeHtml(it.remarks || "")}</td>
      <td class="num"><button class="iconBtn" data-edit="${it.id}">Edit</button></td>
    `;
    els.tbody.appendChild(tr);
  }

  // Summary
  const total = items.length;
  const ok = items.filter(x => x.status === "OK").length;
  const reorder = items.filter(x => x.status === "Reorder").length;
  const oos = items.filter(x => x.status === "Out of Stock").length;

  els.sumTotal.textContent = total;
  els.sumOk.textContent = ok;
  els.sumReorder.textContent = reorder;
  els.sumOos.textContent = oos;

  // Bind edit buttons
  document.querySelectorAll("button[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => openDrawer(btn.dataset.edit));
  });
}

function openDrawer(id=null){
  const items = loadItems();
  const isEdit = !!id;
  els.drawerTitle.textContent = isEdit ? "Edit Item" : "Add Item";
  els.btnDelete.style.display = isEdit ? "inline-block" : "none";

  if (isEdit){
    const it = items.find(x => x.id === id);
    if (!it) return;
    els.itemId.value = it.id;
    els.itemName.value = it.name || "";
    els.category.value = it.category || "Other";
    els.unit.value = it.unit || "Nos";
    els.opening.value = safeNum(it.opening);
    els.stockIn.value = safeNum(it.in);
    els.stockOut.value = safeNum(it.out);
    els.reorder.value = safeNum(it.reorderLevel);
    els.remarks.value = it.remarks || "";
  } else {
    els.itemId.value = "";
    els.itemName.value = "";
    els.category.value = "Other";
    els.unit.value = "Nos";
    els.opening.value = 0;
    els.stockIn.value = 0;
    els.stockOut.value = 0;
    els.reorder.value = 0;
    els.remarks.value = "";
  }

  els.backdrop.classList.remove("hidden");
  els.drawer.classList.remove("hidden");
  els.drawer.setAttribute("aria-hidden","false");
  els.itemName.focus();
}

function closeDrawer(){
  els.backdrop.classList.add("hidden");
  els.drawer.classList.add("hidden");
  els.drawer.setAttribute("aria-hidden","true");
}

function upsertItem(formData){
  const items = loadItems();
  const id = els.itemId.value || crypto.randomUUID();

  const it = {
    id,
    name: String(formData.get("name") || "").trim(),
    category: String(formData.get("category") || "Other"),
    unit: String(formData.get("unit") || "Nos"),
    opening: safeNum(formData.get("opening")),
    in: safeNum(formData.get("in")),
    out: safeNum(formData.get("out")),
    reorderLevel: safeNum(formData.get("reorder")),
    remarks: String(formData.get("remarks") || "").trim(),
    updatedAt: new Date().toISOString(),
  };

  const idx = items.findIndex(x => x.id === id);
  if (idx >= 0) items[idx] = it;
  else items.push(it);

  saveItems(items);
}

function deleteItem(id){
  const items = loadItems().filter(x => x.id !== id);
  saveItems(items);
}

function exportCSV(){
  const reportDate = els.reportDate.value || todayISO();
  const items = loadItems().map(it => {
    const closing = calcClosing(it);
    const status = calcStatus(it);
    return {...it, closing, status};
  });

  const header = ["Date","Item Name","Category","Opening Stock","Stock In","Stock Out","Closing Stock","Unit","Reorder Level","Status","Remarks"];
  const lines = [header.join(",")];

  for (const it of items){
    const row = [
      reportDate,
      csv(it.name),
      csv(it.category),
      safeNum(it.opening),
      safeNum(it.in),
      safeNum(it.out),
      formatNum(calcClosing(it)),
      csv(it.unit),
      safeNum(it.reorderLevel),
      csv(calcStatus(it)),
      csv(it.remarks || ""),
    ];
    lines.push(row.join(","));
  }

  const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Kolapasi_Daily_Stock_${reportDate}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csv(v){
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replaceAll('"','""') + '"';
  return s;
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// Events
els.btnAdd.addEventListener("click", () => openDrawer());
els.btnClose.addEventListener("click", closeDrawer);
els.backdrop.addEventListener("click", closeDrawer);
els.btnExport.addEventListener("click", exportCSV);

els.search.addEventListener("input", render);
els.filterStatus.addEventListener("change", render);

els.reportDate.addEventListener("change", () => saveDate(els.reportDate.value));

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.set("name", els.itemName.value);
  fd.set("category", els.category.value);
  fd.set("unit", els.unit.value);
  fd.set("opening", els.opening.value);
  fd.set("in", els.stockIn.value);
  fd.set("out", els.stockOut.value);
  fd.set("reorder", els.reorder.value);
  fd.set("remarks", els.remarks.value);

  if (!String(fd.get("name")||"").trim()){
    alert("Item Name is required.");
    return;
  }
  upsertItem(fd);
  closeDrawer();
  render();
});

els.btnDelete.addEventListener("click", () => {
  const id = els.itemId.value;
  if (!id) return;
  if (confirm("Delete this item?")){
    deleteItem(id);
    closeDrawer();
    render();
  }
});

// Initialize date
els.reportDate.value = loadDate();

// Register service worker
if ("serviceWorker" in navigator){
  window.addEventListener("load", async () => {
    try{
      await navigator.serviceWorker.register("service-worker.js");
    }catch(e){
      console.warn("SW registration failed", e);
    }
  });
}

// First render
render();
