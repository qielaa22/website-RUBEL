(function () {
  "use strict";

  const D = window.RUBEL_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- Penyimpanan (aman bila localStorage diblokir) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("rubel." + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("rubel." + key, JSON.stringify(value)); } catch (e) { /* abaikan */ }
    }
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- Progres belajar ---------- */
  const STOPS = [
    { id: "tujuan", label: "Tujuan" },
    { id: "materi", label: "Materi" },
    { id: "video", label: "Video" },
    { id: "lembar", label: "Lembar kerja" },
    { id: "kuis", label: "Kuis" },
    { id: "refleksi", label: "Refleksi" }
  ];
  const progress = store.get("progress", {});

  function markDone(id) {
    if (progress[id]) return;
    progress[id] = true;
    store.set("progress", progress);
    renderProgress();
    const stop = STOPS.find((s) => s.id === id);
    if (stop) toast("Hore! Langkah “" + stop.label + "” selesai 🎉");
  }

  function renderProgress() {
    const done = STOPS.filter((s) => progress[s.id]).length;
    $("#journeyPath").innerHTML = STOPS.map((s, i) =>
      `<li class="${progress[s.id] ? "done" : ""}">
        <a href="#${s.id}"><span class="stop">${progress[s.id] ? "✓" : i + 1}</span><span class="stop-label">${s.label}</span></a>
      </li>`).join("");

    const msgs = [
      "Kamu belum memulai. Ayo, langkah pertama itu yang paling penting!",
      "Awal yang bagus! Satu langkah sudah selesai.",
      "Kamu sudah menyelesaikan 2 dari 6 langkah. Terus, ya!",
      "Sudah setengah jalan. Hebat!",
      "4 dari 6 langkah selesai. Sedikit lagi!",
      "Tinggal satu langkah lagi. Kamu pasti bisa!",
      "Semua langkah selesai. Terima kasih sudah belajar dengan sungguh-sungguh! 🌟"
    ];
    $("#journeyText").textContent = msgs[done];
    $("#ringNum").textContent = done + "/6";
    const c = 2 * Math.PI * 17;
    const fg = $("#ringFg");
    fg.style.strokeDasharray = c;
    fg.style.strokeDashoffset = c * (1 - done / 6);

    STOPS.forEach((s) => {
      const t = $(`[data-tick="${s.id}"]`);
      if (t) t.classList.toggle("on", !!progress[s.id]);
    });

    const next = STOPS.find((s) => !progress[s.id]);
    const cont = $("#continueBtn");
    if (done === 0 || !next) cont.hidden = true;
    else { cont.hidden = false; cont.href = "#" + next.id; cont.textContent = "Lanjut: " + next.label; }

    $("#parentProgress").innerHTML = STOPS.map((s) =>
      `<li class="${progress[s.id] ? "done" : ""}"><span class="pp-dot">${progress[s.id] ? "✓" : ""}</span>${s.label}<em>${progress[s.id] ? "sudah" : "belum"}</em></li>`
    ).join("");
  }

  /* ---------- Navigasi halaman ---------- */
  const pages = $$(".page").map((p) => p.id);
  const menuBtn = $("#menuBtn");
  const backdrop = $("#navBackdrop");

  function setMenu(open) {
    document.body.classList.toggle("nav-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    backdrop.hidden = !open;
  }
  menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("nav-open")));
  backdrop.addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  function route() {
    const id = (location.hash || "#beranda").slice(1);
    const target = pages.includes(id) ? id : "beranda";
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === target));
    $$("[data-nav]").forEach((a) => {
      if (a.dataset.nav === target) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    setMenu(false);
    window.scrollTo(0, 0);
    if (target !== "beranda") $("#main").focus({ preventScroll: true });
    store.set("lastPage", target);
  }
  window.addEventListener("hashchange", route);

  /* ---------- Ukuran tulisan ---------- */
  const sizeBtn = $("#textSize");
  function applySize(big) {
    document.documentElement.classList.toggle("big-text", big);
    sizeBtn.setAttribute("aria-pressed", String(big));
  }
  applySize(store.get("bigText", false));
  sizeBtn.addEventListener("click", () => {
    const big = !document.documentElement.classList.contains("big-text");
    applySize(big);
    store.set("bigText", big);
    toast(big ? "Tulisan diperbesar" : "Tulisan kembali normal");
  });

  /* ---------- Simpan otomatis semua isian ---------- */
  function flashSaved(el) {
    const scope = el.closest(".page");
    const s = scope && $("[data-save-state]", scope);
    if (!s) return;
    s.classList.add("pulse");
    s.textContent = "Tersimpan ✓";
    clearTimeout(s._t);
    s._t = setTimeout(() => { s.classList.remove("pulse"); s.textContent = "Tersimpan otomatis"; }, 1400);
  }
  function bindAutosave(root = document) {
    $$("[data-save]", root).forEach((el) => {
      const key = "f." + el.dataset.save;
      el.value = store.get(key, "");
      el.addEventListener("input", () => { store.set(key, el.value); flashSaved(el); });
    });
  }

  /* ---------- Beranda: nama & pesan guru ---------- */
  function renderName() {
    const n = store.get("name", "");
    $("#helloName").textContent = n || "teman";
    $("#nameInput").value = n;
  }
  $("#nameForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $("#nameInput").value.trim();
    store.set("name", n);
    renderName();
    toast(n ? "Senang berkenalan denganmu, " + n + "!" : "Nama dihapus");
  });

  function renderTeacherMsg() {
    const msg = store.get("teacherMsg", "") || D.defaultTeacherMsg;
    $("#teacherMsgView").textContent = msg;
    $("#teacherMsg").value = msg;
  }

  /* ---------- Tujuan ---------- */
  function renderGoals() {
    const checked = store.get("goals", []);
    $("#goalList").innerHTML = D.goals.map((g, i) => `
      <li class="goal">
        <span class="goal-num">${i + 1}</span>
        <p>${esc(g)}</p>
        <label class="goal-check">
          <input type="checkbox" data-goal="${i}" ${checked.includes(i) ? "checked" : ""}>
          <span class="box" aria-hidden="true"></span>
          <span>Aku sudah bisa</span>
        </label>
      </li>`).join("");
    $$("[data-goal]").forEach((cb) => cb.addEventListener("change", () => {
      const list = $$("[data-goal]").filter((c) => c.checked).map((c) => +c.dataset.goal);
      store.set("goals", list);
      if (cb.checked) toast("Keren! Satu tujuan tercapai.");
    }));
  }

  /* ---------- Materi ---------- */
  const SCENES = {
    1: { parts: "all", pos: [250, 205] },
    2: { parts: ["sun", "sea", "evap"], pos: [172, 188] },
    3: { parts: ["evap", "cloud", "wind", "cloud2"], pos: [282, 80] },
    4: { parts: ["cloud2", "rain", "mountain", "ground"], pos: [478, 138] },
    5: { parts: ["mountain", "river", "soak", "ground", "sea"], pos: [396, 272] }
  };
  let chunkIdx = Math.min(store.get("chunkIdx", 0), D.materi.length - 1);
  const seen = new Set(store.get("chunksSeen", []));

  function setScene(n, caption) {
    const sc = SCENES[n];
    $$(".cycle .part").forEach((g) => {
      g.classList.toggle("dim", sc.parts !== "all" && !sc.parts.includes(g.dataset.p));
    });
    $("#tetes").style.transform = `translate(${sc.pos[0]}px, ${sc.pos[1]}px)`;
    $("#cycleCaption").textContent = caption;
  }

  function chunkHTML(c, i, forPrint) {
    return `
      <p class="eyebrow">Bagian ${i + 1} dari ${D.materi.length}</p>
      <h2>${c.title}</h2>
      ${c.body.map((p) => `<p>${p}</p>`).join("")}
      ${c.word ? `<p class="word"><span class="hand">Kata penting</span><b>${c.word[0]}</b> = ${c.word[1]}</p>` : ""}
      ${c.care ? `<p class="care"><span aria-hidden="true">🌿</span> ${c.care}</p>` : ""}
      <div class="think">
        <p class="hand">Coba pikirkan sebentar…</p>
        <p>${c.think}</p>
        ${forPrint ? "" : `<textarea rows="2" data-save="think.${i}" aria-label="Jawabanmu untuk pertanyaan: ${esc(c.think)}" placeholder="Tulis jawabanmu (boleh singkat)"></textarea>`}
      </div>`;
  }

  function renderChunk() {
    const c = D.materi[chunkIdx];
    const box = $("#chunkBox");
    box.classList.remove("in");
    void box.offsetWidth;
    box.innerHTML = chunkHTML(c, chunkIdx, false);
    box.classList.add("in");
    bindAutosave(box);
    setScene(c.scene, c.caption);

    $("#stepDots").innerHTML = D.materi.map((m, i) => `
      <button role="tab" type="button" data-step="${i}" aria-selected="${i === chunkIdx}" class="${seen.has(i) ? "seen" : ""}" title="${esc(m.title)}">
        <span>${i + 1}</span><em>${esc(m.title)}</em>
      </button>`).join("");
    $$("#stepDots button").forEach((b) => b.addEventListener("click", () => { chunkIdx = +b.dataset.step; saveChunk(); renderChunk(); }));

    $("#prevChunk").disabled = chunkIdx === 0;
    const last = chunkIdx === D.materi.length - 1;
    $("#nextChunk").innerHTML = last ? "Aku paham semuanya ✓" : 'Aku paham, lanjut <span aria-hidden="true">→</span>';
  }
  function saveChunk() { store.set("chunkIdx", chunkIdx); }

  $("#prevChunk").addEventListener("click", () => { if (chunkIdx > 0) { chunkIdx--; saveChunk(); renderChunk(); scrollToMateri(); } });
  $("#nextChunk").addEventListener("click", () => {
    seen.add(chunkIdx);
    store.set("chunksSeen", [...seen]);
    if (chunkIdx < D.materi.length - 1) {
      chunkIdx++; saveChunk(); renderChunk(); scrollToMateri();
    } else {
      renderChunk();
      if (seen.size === D.materi.length) markDone("materi");
      else toast("Masih ada bagian yang belum kamu baca. Cek titik yang belum berwarna, ya.");
    }
  });
  function scrollToMateri() {
    // Di layar kecil, gulir ke gambar agar anak melihat Tetes berpindah
    if (window.innerWidth < 1100) $(".cycle-fig").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("#printMateri").addEventListener("click", () => {
    $("#printMateriAll").innerHTML = D.materi.map((c, i) => `<article class="print-chunk">${chunkHTML(c, i, true)}</article>`).join("") +
      `<p><b>Ringkasan:</b> menguap → mengembun → hujan → meresap &amp; mengalir → kembali lagi.</p>`;
    document.body.classList.add("printing-materi");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-materi"), 500);
  });

  /* ---------- Video ---------- */
  function ytId(url) {
    const m = String(url || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function renderVideos() {
    const urls = store.get("videoUrls", []);
    const watched = store.get("watched", []);
    $("#videoList").innerHTML = D.videos.map((v, i) => {
      const id = ytId(urls[i]);
      const player = id
        ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(v.title)}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
        : `<div class="video-empty">
             <svg viewBox="0 0 80 60" aria-hidden="true"><rect x="4" y="6" width="72" height="48" rx="10"/><path d="M33 20l16 10-16 10z"/></svg>
             <p>Video belum dipasang.</p>
             <p class="small">Guru bisa menempelkan tautan YouTube di halaman Ruang Guru.</p>
           </div>`;
      const isW = watched.includes(i);
      return `
        <article class="card video-card ${isW ? "watched" : ""}">
          <div class="player">${player}</div>
          <div class="video-info">
            <p class="eyebrow">Video ${i + 1} · ${v.minutes} menit</p>
            <h3>${esc(v.title)}</h3>
            <p class="look"><span class="hand">Yang dicari:</span> ${esc(v.look)}</p>
            <label class="field-label" for="vnote${i}">Catatanku</label>
            <textarea id="vnote${i}" rows="2" data-save="vnote.${i}" placeholder="Tulis hal penting yang kamu dengar atau lihat"></textarea>
            <button type="button" class="btn ${isW ? "btn-soft" : "btn-ghost"} btn-sm" data-watch="${i}">${isW ? "Sudah kutonton ✓" : "Tandai sudah ditonton"}</button>
          </div>
        </article>`;
    }).join("");
    bindAutosave($("#videoList"));
    $$("[data-watch]").forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.watch;
      let w = store.get("watched", []);
      w = w.includes(i) ? w.filter((x) => x !== i) : w.concat(i);
      store.set("watched", w);
      renderVideos();
      if (w.length === D.videos.length) markDone("video");
    }));
  }

  /* ---------- Lembar kerja ---------- */
  function renderLkDone() {
    $("#lkDoneMsg").textContent = progress.lembar ? "Sudah selesai. Kerja bagus!" : "";
  }
  $("#lkDone").addEventListener("click", () => {
    const filled = $$("#lembar [data-save]").filter((el) => el.value.trim()).length;
    if (filled < 3) { toast("Isi dulu beberapa jawaban, ya. Minimal 3 kotak."); return; }
    markDone("lembar");
    renderLkDone();
  });

  /* ---------- Kuis ---------- */
  let qi = 0, qAnswers = [];
  function renderQuiz() {
    const box = $("#quizBox");
    const total = D.quiz.length;
    if (qi >= total) return renderQuizResult();

    const q = D.quiz[qi];
    box.innerHTML = `
      <div class="quiz-top">
        <p class="eyebrow">Soal ${qi + 1} dari ${total}</p>
        <div class="quiz-bar" aria-hidden="true"><span style="width:${(qi / total) * 100}%"></span></div>
      </div>
      <h2 class="quiz-q">${esc(q.q)}</h2>
      <div class="options" role="group" aria-label="Pilihan jawaban">
        ${q.options.map((o, i) => `<button type="button" class="option" data-opt="${i}"><span class="opt-letter">${"ABCD"[i]}</span><span>${esc(o)}</span></button>`).join("")}
      </div>
      <div class="feedback" id="feedback" hidden></div>`;

    $$(".option", box).forEach((b) => b.addEventListener("click", () => choose(+b.dataset.opt)));
  }

  function choose(i) {
    const q = D.quiz[qi];
    const right = i === q.answer;
    qAnswers[qi] = i;
    $$(".option").forEach((b) => {
      const k = +b.dataset.opt;
      b.disabled = true;
      if (k === q.answer) b.classList.add("correct");
      else if (k === i) b.classList.add("wrong");
    });
    const fb = $("#feedback");
    fb.hidden = false;
    fb.className = "feedback " + (right ? "ok" : "no");
    const cheers = ["Tepat sekali!", "Betul! Hebat.", "Benar! Kamu teliti.", "Mantap, benar!"];
    fb.innerHTML = `
      <p class="fb-title">${right ? cheers[qi % cheers.length] : "Belum tepat, tidak apa-apa."}</p>
      ${right ? "" : `<p>Jawaban yang benar: <b>${esc(q.options[q.answer])}</b></p>`}
      <p>${esc(q.explain)}</p>
      <button type="button" class="btn btn-primary btn-sm" id="nextQ">${qi === D.quiz.length - 1 ? "Lihat hasilku" : "Soal berikutnya →"}</button>`;
    $("#nextQ").addEventListener("click", () => { qi++; renderQuiz(); });
    $("#nextQ").focus({ preventScroll: true });
  }

  function renderQuizResult() {
    const total = D.quiz.length;
    const wrong = D.quiz.map((q, i) => (qAnswers[i] === q.answer ? null : i)).filter((x) => x !== null);
    const score = total - wrong.length;
    const attempts = store.get("attempts", []);
    attempts.push({ score, total, wrong, at: Date.now() });
    store.set("attempts", attempts);
    markDone("kuis");
    renderRekap();

    const pct = score / total;
    const msg = pct === 1 ? "Sempurna! Kamu benar-benar paham siklus air."
      : pct >= 0.75 ? "Bagus sekali! Tinggal sedikit lagi yang perlu diulang."
      : pct >= 0.5 ? "Lumayan! Coba baca lagi bagian yang masih keliru, lalu ulangi kuisnya."
      : "Tidak apa-apa. Belajar memang butuh waktu. Yuk, baca materinya lagi pelan-pelan.";

    $("#quizBox").innerHTML = `
      <div class="result">
        <div class="score-badge"><b>${score}</b><span>dari ${total}</span></div>
        <div>
          <h2>${msg}</h2>
          ${wrong.length ? `<p class="muted">Soal yang perlu kamu ulang:</p>
          <ul class="bullets">${wrong.map((i) => `<li>${esc(D.quiz[i].q)}</li>`).join("")}</ul>` : ""}
          <div class="row wrap">
            <button type="button" class="btn btn-primary" id="retryQuiz">Coba lagi</button>
            <a class="btn btn-ghost" href="#materi">Baca materi lagi</a>
          </div>
        </div>
      </div>`;
    $("#retryQuiz").addEventListener("click", () => { qi = 0; qAnswers = []; renderQuiz(); });
  }

  /* ---------- Refleksi ---------- */
  const faces = {
    senang: '<path d="M14 25q10 9 20 0"/><circle cx="17" cy="18" r="1.8"/><circle cx="31" cy="18" r="1.8"/>',
    biasa: '<path d="M15 28h18"/><circle cx="17" cy="18" r="1.8"/><circle cx="31" cy="18" r="1.8"/>',
    bingung: '<path d="M15 29q4-4 8 0t8 0"/><path d="M14 15l5 2M34 14l-5 3"/><circle cx="17" cy="20" r="1.8"/><circle cx="31" cy="20" r="1.8"/>',
    lelah: '<path d="M16 30q8-6 16 0"/><path d="M13 19q4 3 8 0M27 19q4 3 8 0"/>'
  };
  let mood = null;
  function renderMoods() {
    $("#moodRow").innerHTML = D.moods.map((m) => `
      <label class="mood mood-${m.id}">
        <input type="radio" name="mood" value="${m.id}">
        <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="face"/>${faces[m.id]}</svg>
        <span>${m.label}</span>
      </label>`).join("");
    $$('input[name="mood"]').forEach((r) => r.addEventListener("change", () => { mood = r.value; }));
  }

  function renderJournal() {
    const list = store.get("journal", []);
    const box = $("#journalBox");
    if (!list.length) { box.innerHTML = ""; return; }
    const moodLabel = (id) => (D.moods.find((m) => m.id === id) || {}).label || "";
    box.innerHTML = `<h2>Catatan refleksiku</h2>` + list.slice().reverse().map((j) => `
      <article class="journal-entry">
        <p class="hand j-date">${new Date(j.at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · ${esc(moodLabel(j.mood))}</p>
        ${j.a ? `<p><b>Aku belajar:</b> ${esc(j.a)}</p>` : ""}
        ${j.b ? `<p><b>Masih bingung:</b> ${esc(j.b)}</p>` : ""}
        ${j.c ? `<p><b>Pertanyaanku:</b> ${esc(j.c)}</p>` : ""}
        <p class="small muted">Keyakinan: ${"●".repeat(j.conf)}${"○".repeat(5 - j.conf)}</p>
      </article>`).join("");
  }

  $("#reflectForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const a = $("#rf1").value.trim(), b = $("#rf2").value.trim(), c = $("#rf3").value.trim();
    if (!mood) { toast("Pilih dulu perasaanmu, ya."); return; }
    if (!a) { toast("Tulis sedikit tentang apa yang kamu pelajari hari ini."); $("#rf1").focus(); return; }
    const list = store.get("journal", []);
    list.push({ at: Date.now(), mood, a, b, c, conf: +$("#rfConf").value });
    store.set("journal", list);
    ["rf1", "rf2", "rf3"].forEach((id) => { $("#" + id).value = ""; store.set("f.rf.draft" + id.slice(2), ""); });
    $$('input[name="mood"]').forEach((r) => (r.checked = false));
    mood = null;
    renderJournal();
    markDone("refleksi");
    toast("Refleksimu tersimpan. Terima kasih sudah jujur! 💛");
  });

  /* ---------- Ruang Guru: tab ---------- */
  const tabs = $$('[role="tab"].tab');
  function selectTab(t) {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      $("#" + x.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(n); n.focus();
    });
  });

  /* ---------- Ruang Guru: rekap ---------- */
  // Contoh data satu kelas (28 siswa) — hanya untuk memperlihatkan bentuk rekap.
  const DEMO = { students: 28, avg: 6.1, wrongCounts: [4, 3, 9, 17, 5, 8, 14, 6], moods: { senang: 12, biasa: 8, bingung: 6, lelah: 2 } };

  function renderRekap() {
    const demo = $("#demoToggle").checked;
    const total = D.quiz.length;
    let n, avg, wrongCounts, moods;

    if (demo) {
      ({ wrongCounts, moods } = DEMO); n = DEMO.students; avg = DEMO.avg;
      $("#rekapSource").innerHTML = "<b>Contoh data</b>, bukan data asli. Di kelas sungguhan, rekap datang dari Google Sheets.";
    } else {
      const att = store.get("attempts", []);
      n = att.length;
      avg = n ? att.reduce((s, a) => s + a.score, 0) / n : 0;
      wrongCounts = D.quiz.map((_, i) => att.filter((a) => a.wrong.includes(i)).length);
      moods = {};
      store.get("journal", []).forEach((j) => { moods[j.mood] = (moods[j.mood] || 0) + 1; });
      $("#rekapSource").textContent = "Data dari perangkat ini saja. Di kelas sungguhan, rekap datang dari Google Sheets.";
    }

    if (!n) {
      $("#rekapBox").innerHTML = `<p class="empty">Belum ada yang mengerjakan kuis di perangkat ini. Nyalakan <b>“Tampilkan contoh satu kelas”</b> untuk melihat bentuk rekapnya.</p>`;
      return;
    }

    const max = Math.max(...wrongCounts, 1);
    const worst = wrongCounts.indexOf(Math.max(...wrongCounts));
    const label = demo ? "siswa" : "percobaan";
    const moodTotal = Object.values(moods).reduce((a, b) => a + b, 0);

    $("#rekapBox").innerHTML = `
      <div class="stats">
        <div class="stat"><b>${n}</b><span>${demo ? "siswa mengerjakan" : "kali dikerjakan"}</span></div>
        <div class="stat"><b>${avg.toFixed(1).replace(".", ",")}</b><span>rata-rata benar (dari ${total})</span></div>
        <div class="stat"><b>Soal ${worst + 1}</b><span>paling banyak keliru</span></div>
      </div>
      ${Math.max(...wrongCounts) ? `<p class="callout"><span class="hand">Saran untuk kelas berikutnya:</span> bahas lagi <b>“${esc(D.quiz[worst].q)}”</b>. ${wrongCounts[worst]} ${label} masih keliru di soal ini.</p>` : `<p class="callout"><span class="hand">Hebat!</span> Belum ada soal yang keliru.</p>`}
      <h3 class="small-head">Jumlah jawaban keliru per soal</h3>
      <ul class="bars">
        ${wrongCounts.map((w, i) => `
          <li class="${i === worst && w ? "hot" : ""}">
            <span class="bar-label" title="${esc(D.quiz[i].q)}">Soal ${i + 1}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${(w / max) * 100}%"></span></span>
            <span class="bar-val">${w}</span>
          </li>`).join("")}
      </ul>
      ${moodTotal ? `<h3 class="small-head">Perasaan siswa setelah belajar</h3>
      <ul class="mood-sum">${D.moods.map((m) => `<li><b>${moods[m.id] || 0}</b> ${m.label.toLowerCase()}</li>`).join("")}</ul>` : ""}`;
  }
  $("#demoToggle").addEventListener("change", renderRekap);

  /* ---------- Ruang Guru: bagikan & QR ---------- */
  function renderQR() {
    const url = $("#shareUrl").value.trim();
    const box = $("#qrBox");
    box.innerHTML = "";
    const note = $("#qrNote");
    if (!url) { note.textContent = "Isi alamat situs untuk membuat kode QR."; return; }
    if (typeof QRCode === "undefined") { note.textContent = "Kode QR butuh koneksi internet untuk dibuat."; return; }
    new QRCode(box, { text: url, width: 150, height: 150, colorDark: "#2B2A26", colorLight: "#FFFDF8", correctLevel: QRCode.CorrectLevel.M });
    note.textContent = url.startsWith("file:") ? "Ini alamat di komputer Anda. Ganti dengan alamat situs setelah diterbitkan." : "Pindai dengan kamera HP untuk membuka RUBEL.";
  }
  function initShare() {
    const saved = store.get("shareUrl", "");
    $("#shareUrl").value = saved || location.href.split("#")[0];
    let t;
    $("#shareUrl").addEventListener("input", () => {
      store.set("shareUrl", $("#shareUrl").value.trim());
      clearTimeout(t); t = setTimeout(renderQR, 350);
    });
    $("#copyUrl").addEventListener("click", async () => {
      const v = $("#shareUrl").value.trim();
      try { await navigator.clipboard.writeText(v); toast("Tautan disalin. Tinggal tempel di grup kelas."); }
      catch (e) { $("#shareUrl").select(); toast("Tekan Ctrl+C untuk menyalin."); }
    });
    if (typeof QRCode === "undefined") window.addEventListener("load", renderQR); else renderQR();
  }

  /* ---------- Ruang Guru: pengaturan ---------- */
  function renderSettings() {
    const urls = store.get("videoUrls", []);
    $("#videoUrls").innerHTML = D.videos.map((v, i) => `
      <label class="small muted" for="vurl${i}">Video ${i + 1}: ${esc(v.title)}</label>
      <input type="url" id="vurl${i}" data-vurl="${i}" value="${esc(urls[i] || "")}" placeholder="https://youtu.be/...">`).join("");
  }
  $("#settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#teacherMsg").value.trim();
    store.set("teacherMsg", msg);
    const urls = $$("[data-vurl]").map((el) => el.value.trim());
    const bad = urls.filter((u) => u && !ytId(u)).length;
    store.set("videoUrls", urls);
    renderTeacherMsg();
    renderVideos();
    toast(bad ? "Tersimpan, tapi ada tautan yang bukan tautan YouTube." : "Perubahan tersimpan.");
  });

  /* ---------- Mulai ---------- */
  renderName();
  renderTeacherMsg();
  renderGoals();
  renderChunk();
  renderVideos();
  renderLkDone();
  renderQuiz();
  renderMoods();
  renderJournal();
  renderSettings();
  renderRekap();
  renderProgress();
  bindAutosave($("#lembar"));
  bindAutosave($("#kuis .pemantik"));
  bindAutosave($("#reflectForm"));
  initShare();

  // "Tujuan" dianggap selesai setelah dibaca beberapa detik
  let goalTimer;
  window.addEventListener("hashchange", () => {
    clearTimeout(goalTimer);
    if (location.hash === "#tujuan") goalTimer = setTimeout(() => markDone("tujuan"), 6000);
  });

  route();
  if (location.hash === "#tujuan") goalTimer = setTimeout(() => markDone("tujuan"), 6000);
})();
