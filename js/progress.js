/* พัฒนาโดย นายเกียรติอนันต์ สุกทน · Copyright (c) 2026 นายเกียรติอนันต์ สุกทน */
/* ==========================================================
   ProjectOne : js_progress  (ติดตามความก้าวหน้า, ฟอร์มรายงาน, ไฟล์แนบ, S-curve)
   ========================================================== */
(function () {
  'use strict';
  var SP = window.SP, ui = SP.ui, esc = SP.esc;

  SP.MENU.splice(2, 0, { key: 'progress', label: 'ความก้าวหน้า', icon: 'bi-graph-up-arrow', color: 'purple', roles: null, place: 'rail', desc: 'รายงานและติดตามความก้าวหน้าเทียบแผน' });
  SP.addSearch([{ label: 'รายงานความก้าวหน้า', desc: 'โครงการที่กำลังดำเนินการ เทียบแผน', icon: 'bi-graph-up-arrow', href: '#/progress', roles: null }]);

  var FLAG = { ahead: ['เร็วกว่าแผน', 'success'], on_track: ['ตามแผน', 'blue'], behind: ['ช้ากว่าแผน', 'warning'], critical: ['ช้ากว่าแผนมาก', 'danger'], not_started: ['ยังไม่เริ่ม', 'mute'] };
  var MIME_EXT = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic' };

  function dayNum(s) { return Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000); }
  function monthLbl(s) { return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { timeZone: 'Asia/Bangkok', month: 'short', year: '2-digit' }).format(new Date(s + 'T00:00:00+07:00')); }
  function daysAgo(n) { return n <= 0 ? 'วันนี้' : n + ' วันก่อน'; }
  function fileIcon(m) { return /pdf/.test(m) ? 'bi-file-earmark-pdf' : /word/.test(m) ? 'bi-file-earmark-word' : /sheet|excel/.test(m) ? 'bi-file-earmark-excel' : /presentation/.test(m) ? 'bi-file-earmark-slides' : /image/.test(m) ? 'bi-file-earmark-image' : 'bi-file-earmark'; }

  /** สีเส้นแผน: น้ำเงิน ยกเว้นธีมเป็นโทนน้ำเงินใช้ส้มเข้มแทน */
  function planColor() {
    var h = String(SP.settings.primary_color || '#F26522').replace('#', '');
    var r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, hue = 0;
    if (d) { hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hue = (hue * 60 + 360) % 360; }
    return d && hue >= 170 && hue <= 280 ? '#c2410c' : '#3b6fd6';
  }

  /* =========================================================
     S-CURVE (SVG + crosshair tooltip + ตาราง)
     ========================================================= */
  ui.scurve = function (sc) {
    if (!sc || !sc.points || sc.points.length < 2) return ui.empty('bi-graph-up', 'ยังไม่มีข้อมูลแผน', 'เพิ่มกิจกรรมพร้อมช่วงเวลาเพื่อสร้างเส้นแผน');
    var W = 640, H = 250, L = 40, R = 52, T = 14, B = 30;
    var pts = sc.points, x0 = dayNum(pts[0].date), x1 = dayNum(pts[pts.length - 1].date) || x0 + 1;
    var X = function (s) { return L + (dayNum(s) - x0) / Math.max(1, x1 - x0) * (W - L - R); };
    var Y = function (v) { return T + (1 - v / 100) * (H - T - B); };
    var pc = planColor();
    var g = '';
    [0, 25, 50, 75, 100].forEach(function (v) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#eef0f3" stroke-width="1"/>' +
        '<text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="11" fill="#9ca3af">' + v + '%\x3c/text>';
    });
    var step = Math.max(1, Math.ceil(pts.length / 6)), seen = {};
    pts.forEach(function (p, i) {
      if (i % step && i !== pts.length - 1) return;
      var lb = monthLbl(p.date); if (seen[lb]) return; seen[lb] = 1;
      g += '<text x="' + X(p.date) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#9ca3af">' + esc(lb) + '\x3c/text>';
    });
    var path = function (key) {
      return pts.filter(function (p) { return p[key] != null; }).map(function (p, i) { return (i ? 'L' : 'M') + X(p.date).toFixed(1) + ' ' + Y(p[key]).toFixed(1); }).join(' ');
    };
    var act = pts.filter(function (p) { return p.actual != null; });
    var lastPlan = pts[pts.length - 1], lastAct = act[act.length - 1];
    if (sc.today >= pts[0].date && sc.today <= pts[pts.length - 1].date) {
      g += '<line x1="' + X(sc.today) + '" x2="' + X(sc.today) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#9ca3af" stroke-dasharray="3 3"/>' +
        '<text x="' + (X(sc.today) + 4) + '" y="' + (T + 10) + '" text-anchor="start" font-size="10" fill="#6b7280">วันนี้\x3c/text>';
    }
    g += '<path d="' + path('plan') + '" fill="none" stroke="' + pc + '" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round"/>';
    if (act.length) {
      g += '<path d="' + path('actual') + '" fill="none" stroke="var(--sb-primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      g += '<circle cx="' + X(lastAct.date) + '" cy="' + Y(lastAct.actual) + '" r="5" fill="var(--sb-primary)" stroke="#fff" stroke-width="2"/>';
      g += '<text x="' + (X(lastAct.date) + 8) + '" y="' + (Y(lastAct.actual) + 4) + '" font-size="11" font-weight="700" fill="#1f2937">' + lastAct.actual + '%\x3c/text>';
    }
    g += '<text x="' + (X(lastPlan.date) + 6) + '" y="' + (Y(lastPlan.plan) + 4) + '" font-size="11" fill="#6b7280">แผน\x3c/text>';
    g += '<line class="sc-cross" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="#1f2937" stroke-opacity=".25" style="display:none"/>';
    g += '<rect class="sc-hit" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent"/>';

    var legend = '<div class="sc-legend"><span><span class="sc-key" style="border-top-color:var(--sb-primary)">\x3c/span>ผลจริง\x3c/span><span><span class="sc-key dashed" style="border-top-color:' + pc + '">\x3c/span>ตามแผน\x3c/span>\x3c/div>';
    var table = '<details class="mt-2 small"><summary class="text-muted">ดูเป็นตาราง\x3c/summary><div class="table-wrap mt-2"><table class="table table-sm"><thead><tr><th>วันที่\x3c/th><th class="text-end">ตามแผน\x3c/th><th class="text-end">ผลจริง\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
      pts.map(function (p) { return '<tr><td>' + esc(SP.fmtDate(p.date)) + '\x3c/td><td class="text-end num">' + p.plan + '%\x3c/td><td class="text-end num">' + (p.actual == null ? '-' : p.actual + '%') + '\x3c/td>\x3c/tr>'; }).join('') + '\x3c/tbody>\x3c/table>\x3c/div>\x3c/details>';
    var id = 'sc' + (++ui._seq);
    setTimeout(function () { bindScurve(id, sc, X, Y, pc); }, 0);
    return legend + '<div class="sc-wrap" id="' + id + '"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="กราฟ S-curve ความก้าวหน้าตามแผนและผลจริง">' + g + '\x3c/svg><div class="sc-tip">\x3c/div>\x3c/div>' + table;
  };

  function bindScurve(id, sc, X, Y) {
    var wrap = document.getElementById(id); if (!wrap) return;
    var svg = wrap.querySelector('svg'), hit = wrap.querySelector('.sc-hit'), cross = wrap.querySelector('.sc-cross'), tip = wrap.querySelector('.sc-tip');
    var xs = sc.points.map(function (p) { return X(p.date); });
    var show = function (clientX) {
      var r = svg.getBoundingClientRect(), vx = (clientX - r.left) / r.width * 640;
      var i = 0, best = 1e9;
      xs.forEach(function (x, k) { var d = Math.abs(x - vx); if (d < best) { best = d; i = k; } });
      var p = sc.points[i];
      cross.setAttribute('x1', xs[i]); cross.setAttribute('x2', xs[i]); cross.style.display = '';
      tip.textContent = '';
      var h = document.createElement('div'); h.className = 'fw-600 mb-1'; h.textContent = SP.fmtDate(p.date); tip.appendChild(h);
      [['ผลจริง', p.actual, 'var(--sb-primary)', false], ['ตามแผน', p.plan, planColor(), true]].forEach(function (x) {
        if (x[1] == null) return;
        var row = document.createElement('div'); row.className = 'd-flex align-items-center gap-2';
        var k = document.createElement('span'); k.className = 'sc-key' + (x[3] ? ' dashed' : ''); k.style.borderTopColor = x[2];
        var v = document.createElement('b'); v.textContent = x[1] + '%';
        var l = document.createElement('span'); l.className = 'text-muted'; l.textContent = x[0];
        row.appendChild(k); row.appendChild(v); row.appendChild(l); tip.appendChild(row);
      });
      if (p.actual != null) {
        var dv = Math.round((p.actual - p.plan) * 10) / 10, z = document.createElement('div');
        z.className = 'small-xs mt-1 ' + (dv < -10 ? 'text-danger' : 'text-muted'); z.textContent = 'ส่วนต่าง ' + (dv > 0 ? '+' : '') + dv + '%';
        tip.appendChild(z);
      }
      tip.style.display = 'block';
      var left = xs[i] / 640 * r.width;
      tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(4, left + 12)) + 'px';
      tip.style.top = '8px';
    };
    var hide = function () { cross.style.display = 'none'; tip.style.display = 'none'; };
    hit.addEventListener('pointermove', function (e) { show(e.clientX); });
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('pointerdown', function (e) { show(e.clientX); });
  }

  /* =========================================================
     REPORT ITEM (ใช้ทั้งหน้าโครงการและฟีด)
     ========================================================= */
  ui.reportItem = function (r, showProject) {
    var imgs = r.attachments.filter(function (a) { return a.thumb; }), files = r.attachments.filter(function (a) { return !a.thumb; });
    var delta = r.progress - r.prev_progress;
    return '<div class="rp-item" data-rid="' + esc(r.id) + '"><div class="d-flex gap-2 align-items-start"><span class="avatar avatar-sm">' + SP.initials(r.by_name) + '\x3c/span><div class="flex-fill min-w-0">' +
      (showProject ? '<a class="small fw-600 text-reset text-decoration-none d-block text-truncate" href="#/projects/' + esc(r.project_id) + '"><span class="text-muted">' + esc(r.project_code) + '\x3c/span> ' + esc(r.project_name) + '\x3c/a>' : '') +
      '<div class="small"><b>' + esc(r.by_name) + '\x3c/b> รายงาน <b>' + esc(r.activity_name) + '\x3c/b> ' + SP.pill(r.progress + '%' + (delta ? ' (' + (delta > 0 ? '+' : '') + Math.round(delta * 10) / 10 + ')' : ''), r.progress >= 100 ? 'success' : 'primary') + '\x3c/div>' +
      '<div class="small-xs text-muted">ผล ณ ' + esc(SP.fmtDate(r.report_date)) + ' · บันทึก ' + esc(SP.fmtDate(r.created_at, true)) + (r.project_progress ? ' · โครงการ ' + r.project_progress + '%' : '') + '\x3c/div>' +
      '<div class="prose small mt-1">' + esc(r.result) + '\x3c/div>' +
      (r.problem ? '<div class="small mt-1"><span class="fw-600 text-danger">ปัญหา/อุปสรรค\x3c/span> <span class="prose">' + esc(r.problem) + '\x3c/span>\x3c/div>' : '') +
      (r.solution ? '<div class="small mt-1"><span class="fw-600 text-success">แนวทางแก้ไข\x3c/span> <span class="prose">' + esc(r.solution) + '\x3c/span>\x3c/div>' : '') +
      (r.attachments.length ? '<div class="att-grid">' + imgs.map(function (a) {
        return '<a href="' + esc(a.url) + '" target="_blank" rel="noopener" title="' + esc(a.name) + '"><img class="att-thumb" src="' + esc(a.thumb) + '" alt="' + esc(a.name) + '" loading="lazy">\x3c/a>';
      }).join('') + files.map(function (a) {
        return '<a class="att-chip" href="' + esc(a.url) + '" target="_blank" rel="noopener"><i class="bi ' + fileIcon(a.mime) + '">\x3c/i><span class="text-truncate">' + esc(a.name) + '\x3c/span>\x3c/a>';
      }).join('') + '\x3c/div>' : '') +
      '\x3c/div>' + (r.can_delete ? '<button class="btn btn-ghost-danger btn-icon btn-sm" type="button" data-rp-del title="ลบรายงาน"><i class="bi bi-trash3">\x3c/i>\x3c/button>' : '') + '\x3c/div>\x3c/div>';
  };

  /** ผูกปุ่มลบรายงานใน container */
  ui.bindReportDelete = function (root, done) {
    SP.on(root, 'click', '[data-rp-del]', function (e, b) {
      var id = b.closest('[data-rid]').dataset.rid;
      ui.confirm('ลบรายงานนี้ ความก้าวหน้ากิจกรรมจะคำนวณใหม่จากรายงานก่อนหน้า', { danger: true, okText: 'ลบรายงาน' }).then(function (y) {
        if (y) return SP.api('apiDeleteReport', id).then(function (x) { SP.toast(x.message); if (done) done(); });
      }).catch(function (err) { SP.toast(err.message, 'error'); });
    });
  };

  /* =========================================================
     REPORT FORM
     ========================================================= */
  function readB64(file) {
    return new Promise(function (res, rej) {
      var rd = new FileReader();
      rd.onload = function () { res(String(rd.result).split(',')[1]); };
      rd.onerror = function () { rej(new Error('อ่านไฟล์ไม่สำเร็จ')); };
      rd.readAsDataURL(file);
    });
  }
  /** ย่อรูปก่อนอัปโหลด (ด้านยาวสุด 1600px, JPEG 82%) */
  function prepareFile(file) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var mime = file.type || MIME_EXT[ext] || '';
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) return readB64(file).then(function (b) { return { name: file.name, mime: mime, data: b }; });
    return new Promise(function (res) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res({ name: file.name.replace(/\.[^.]+$/, '') + '.jpg', mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.82).split(',')[1] });
      };
      img.onerror = function () { URL.revokeObjectURL(url); readB64(file).then(function (b) { res({ name: file.name, mime: mime, data: b }); }); };
      img.src = url;
    });
  }

  /** ตัวอัปโหลดไฟล์แนบใช้ซ้ำ: คืน {ids, busy, count, discardAll, keep} ; ปิด modal โดยไม่ keep = ลบไฟล์ที่อัปโหลดแล้ว */
  ui.attachUploader = function (list, input, getPid) {
    var files = [], uploading = 0, kept = false;
    var render = function () {
      list.innerHTML = files.map(function (f, i) {
        return '<div class="upl-item" data-i="' + i + '">' + (f.thumb ? '<img src="' + esc(f.thumb) + '" alt="">' : '<i class="bi ' + (f.state === 'up' ? 'bi-arrow-repeat spin' : fileIcon(f.mime)) + '">\x3c/i>') +
          '<span class="text-truncate flex-fill">' + esc(f.name) + '\x3c/span>' +
          (f.state === 'up' ? '<span class="small-xs text-muted">กำลังอัปโหลด\x3c/span>' : f.state === 'err' ? '<span class="small-xs text-danger">' + esc(f.err) + '\x3c/span>' : '') +
          (f.state !== 'up' ? '<button class="btn btn-ghost-danger btn-icon btn-sm" type="button" data-up-del><i class="bi bi-x-lg">\x3c/i>\x3c/button>' : '') + '\x3c/div>';
      }).join('');
    };
    var discard = function (f) { if (f && f.id) SP.api('apiDiscardAttachment', f.id).catch(function () { /* ignore */ }); };
    list.onclick = function (e) {
      var b = e.target.closest('[data-up-del]'); if (!b) return;
      var i = Number(b.closest('[data-i]').dataset.i), f = files[i];
      files.splice(i, 1); render(); discard(f);
    };
    input.onchange = function () {
      var picked = Array.prototype.slice.call(this.files); this.value = '';
      var pid = getPid();
      if (!pid) { SP.toast('เลือกโครงการก่อนแนบไฟล์', 'warning'); return; }
      picked.slice(0, Math.max(0, 10 - files.length)).forEach(function (file) {
        var f = { name: file.name, mime: file.type, state: 'up' }; files.push(f); uploading++; render();
        prepareFile(file).then(function (x) {
          if (x.data.length * 0.75 > 8 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 8 MB');
          return SP.api('apiUploadAttachment', pid, x);
        }).then(function (r) { f.id = r.data.id; f.name = r.data.name; f.mime = r.data.mime; f.thumb = r.data.thumb; f.state = 'ok'; })
          .catch(function (err) { f.state = 'err'; f.err = err.message; })
          .then(function () { uploading--; render(); });
      });
    };
    var modalEl = document.getElementById('spModal');
    modalEl.addEventListener('hidden.bs.modal', function h() {
      modalEl.removeEventListener('hidden.bs.modal', h);
      if (!kept) files.forEach(discard);
    });
    return {
      ids: function () { return files.filter(function (f) { return f.id; }).map(function (f) { return f.id; }); },
      busy: function () { return uploading > 0; },
      count: function () { return files.length; },
      discardAll: function () { files.forEach(discard); files = []; render(); },
      keep: function () { kept = true; }
    };
  };

  /** p = โครงการจาก apiGetProject (ต้องมี id, start_date, activities) */
  SP.openReportForm = function (p, actId, done) {
    var rid = SP.rid(), files = [], uploading = 0, saved = false;
    var opts = p.activities.map(function (a) { return { value: a.id, label: a.name, sub: 'ปัจจุบัน ' + a.progress + '% · น้ำหนัก ' + a.weight }; });
    var first = p.activities.filter(function (a) { return a.id === actId; })[0] || p.activities.filter(function (a) { return a.progress < 100; })[0] || p.activities[0];
    if (!first) { SP.toast('โครงการนี้ยังไม่มีกิจกรรม', 'warning'); return; }
    var today = SP.today();
    ui.openForm({
      title: 'รายงานความก้าวหน้า ' + (p.code || ''), size: 'lg', saveText: 'บันทึกรายงาน',
      body: '<div class="row g-3">' +
        ui.comboField('activity_id', 'กิจกรรม', opts, first.id, { required: true, allowEmpty: false, col: 'col-md-8' }) +
        ui.field('report_date', 'ผล ณ วันที่', today, { type: 'date', required: true, col: 'col-md-4', attrs: { max: today, min: p.start_date } }) +
        '<div class="col-12"><label class="form-label req" for="rpRange">ความก้าวหน้าสะสมของกิจกรรม\x3c/label>' +
        '<div class="d-flex align-items-center gap-3"><input type="range" class="form-range flex-fill" id="rpRange" min="0" max="100" step="5" value="' + first.progress + '">' +
        '<div class="input-group" style="max-width:130px"><input type="number" class="form-control" name="progress" id="rpNum" min="0" max="100" step="0.1" required value="' + first.progress + '"><span class="input-group-text">%\x3c/span>\x3c/div>\x3c/div>' +
        '<div class="form-text" id="rpPrev">ครั้งก่อน ' + first.progress + '%\x3c/div>\x3c/div>' +
        ui.field('result', 'ผลการดำเนินงาน', '', { type: 'textarea', rows: 3, required: true, placeholder: 'สิ่งที่ทำไปแล้ว ผลลัพธ์ จำนวนผู้เข้าร่วม ฯลฯ' }) +
        ui.field('problem', 'ปัญหา / อุปสรรค', '', { type: 'textarea', rows: 2, col: 'col-md-6' }) +
        ui.field('solution', 'แนวทางแก้ไข', '', { type: 'textarea', rows: 2, col: 'col-md-6' }) +
        '<div class="col-12"><label class="form-label">รูปภาพ / เอกสารประกอบ\x3c/label><div id="rpFiles" class="upl-list">\x3c/div>' +
        '<label class="btn btn-soft btn-sm mb-0"><i class="bi bi-paperclip me-1">\x3c/i>แนบไฟล์<input type="file" id="rpFile" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.pptx">\x3c/label>' +
        '<span class="small-xs text-muted ms-2">รูปถูกย่ออัตโนมัติ · ไฟล์ละไม่เกิน 8 MB · สูงสุด 10 ไฟล์\x3c/span>\x3c/div>' +
        '\x3c/div>',
      onShown: function (form) {
        var range = SP.$('#rpRange', form), num = SP.$('#rpNum', form), list = SP.$('#rpFiles', form);
        range.oninput = function () { num.value = range.value; };
        num.oninput = function () { range.value = num.value; };
        form.querySelector('[name=activity_id]').addEventListener('change', function () {
          var a = p.activities.filter(function (x) { return x.id === this.value; }, this)[0];
          if (a) { num.value = range.value = a.progress; SP.$('#rpPrev', form).textContent = 'ครั้งก่อน ' + a.progress + '%'; }
        });
        var render = function () {
          list.innerHTML = files.map(function (f, i) {
            return '<div class="upl-item" data-i="' + i + '">' + (f.thumb ? '<img src="' + esc(f.thumb) + '" alt="">' : '<i class="bi ' + (f.state === 'up' ? 'bi-arrow-repeat spin' : fileIcon(f.mime)) + '">\x3c/i>') +
              '<span class="text-truncate flex-fill">' + esc(f.name) + '\x3c/span>' +
              (f.state === 'up' ? '<span class="small-xs text-muted">กำลังอัปโหลด\x3c/span>' : f.state === 'err' ? '<span class="small-xs text-danger">' + esc(f.err) + '\x3c/span>' : '') +
              (f.state !== 'up' ? '<button class="btn btn-ghost-danger btn-icon btn-sm" type="button" data-up-del><i class="bi bi-x-lg">\x3c/i>\x3c/button>' : '') + '\x3c/div>';
          }).join('');
        };
        list.onclick = function (e) {
          var b = e.target.closest('[data-up-del]'); if (!b) return;
          var i = Number(b.closest('[data-i]').dataset.i), f = files[i];
          files.splice(i, 1); render();
          if (f && f.id) SP.api('apiDiscardAttachment', f.id).catch(function () { /* ignore */ });
        };
        SP.$('#rpFile', form).onchange = function () {
          var picked = Array.prototype.slice.call(this.files); this.value = '';
          picked.slice(0, Math.max(0, 10 - files.length)).forEach(function (file) {
            var f = { name: file.name, mime: file.type, state: 'up' }; files.push(f); uploading++; render();
            prepareFile(file).then(function (x) {
              if (x.data.length * 0.75 > 8 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 8 MB');
              return SP.api('apiUploadAttachment', p.id, x);
            }).then(function (r) {
              f.id = r.data.id; f.name = r.data.name; f.mime = r.data.mime; f.thumb = r.data.thumb; f.state = 'ok';
            }).catch(function (err) { f.state = 'err'; f.err = err.message; })
              .then(function () { uploading--; render(); });
          });
        };
        var modalEl = document.getElementById('spModal');
        modalEl.addEventListener('hidden.bs.modal', function h() {
          modalEl.removeEventListener('hidden.bs.modal', h);
          if (!saved) files.forEach(function (f) { if (f.id) SP.api('apiDiscardAttachment', f.id).catch(function () { /* ignore */ }); });
        });
      },
      onSave: function (d) {
        if (uploading) throw new Error('รอให้อัปโหลดไฟล์เสร็จก่อน');
        d.attachments = files.filter(function (f) { return f.id; }).map(function (f) { return f.id; });
        d.request_id = rid;
        return SP.api('apiSaveReport', d).then(function (x) { saved = true; SP.toast(x.message); if (done) done(); });
      }
    });
  };

  /** เปิดฟอร์มจากหน้าอื่นโดยโหลดโครงการก่อน */
  SP.openReportFor = function (projectId, done) {
    ui.openForm({ title: 'รายงานความก้าวหน้า', hideSave: true, body: ui.loading() });
    SP.api('apiGetProject', projectId).then(function (r) { SP.openReportForm(r.data, null, done); })
      .catch(function (err) { SP.$('#spModalBody').innerHTML = ui.errorBox(err.message); });
  };

  /* =========================================================
     PAGE : ความก้าวหน้า
     ========================================================= */
  SP.pages.progress = function (el) {
    el.innerHTML = '<div id="pgRoot"><div class="page-head"><div><h1>ความก้าวหน้า\x3c/h1><div class="sub">ปีงบประมาณ ' + esc(SP.fy) + ' · โครงการที่อนุมัติแล้วและกำลังดำเนินการ\x3c/div>\x3c/div>\x3c/div>' +
      '<div class="stat-grid" id="pgStats">' + ['', '', '', ''].map(function () { return '<div class="card stat"><div class="text-muted small">...\x3c/div>\x3c/div>'; }).join('') + '\x3c/div>' +
      '<ul class="nav nav-pills mb-3" id="pgTabs">' + [['', 'ทั้งหมด'], ['behind', 'ช้ากว่าแผน'], ['overdue', 'เลยกำหนด'], ['stale', 'ไม่ได้รายงานนาน']].map(function (t, i) {
        return '<li class="nav-item"><button type="button" class="nav-link' + (i ? '' : ' active') + '" data-flag="' + t[0] + '">' + t[1] + '\x3c/button>\x3c/li>';
      }).join('') + '\x3c/ul><div id="pgList">\x3c/div>' +
      '<div class="card mt-3"><div class="card-header"><i class="bi bi-activity text-primary">\x3c/i>รายงานล่าสุด\x3c/div><div class="card-body py-1" id="pgFeed">' + ui.loading() + '\x3c/div>\x3c/div>\x3c/div>';
    var root = SP.$('#pgRoot', el);

    var lv = SP.listView({
      el: SP.$('#pgList', el), api: 'apiListProgress', filters: { fiscal_year: SP.fy }, searchPh: 'ค้นหาโครงการ หน่วยงาน ผู้รับผิดชอบ',
      empty: { icon: 'bi-graph-up-arrow', title: 'ยังไม่มีโครงการที่ต้องติดตาม', desc: 'โครงการที่อนุมัติแล้วและกำลังดำเนินการจะแสดงที่นี่' },
      onLoaded: function (d) {
        var s = d.summary;
        SP.$('#pgStats', el).innerHTML =
          ui.stat('bi-play-circle', 'primary', s.in_progress, 'กำลังดำเนินการ', 'จาก ' + s.total + ' โครงการ') +
          ui.stat('bi-graph-up-arrow', 'success', s.avg + '%', 'ความก้าวหน้าเฉลี่ย', '') +
          ui.stat('bi-hourglass-bottom', 'warning', s.behind, 'ช้ากว่าแผน', 'ต่ำกว่าแผนเกิน 10%') +
          ui.stat('bi-bell', 'danger', s.stale, 'ไม่ได้รายงานนาน', 'เกิน ' + d.remind_days + ' วัน');
      },
      columns: [
        { label: 'โครงการ', render: function (r) {
          return '<a class="text-reset text-decoration-none" href="#/projects/' + esc(r.id) + '"><div class="cell-2"><div class="t1">' + esc(r.name) + '\x3c/div><div class="t2">' + esc(r.code) + ' · ' + esc(r.dept_name) + ' · ' + esc(r.owner_name) + '\x3c/div>\x3c/div>\x3c/a>';
        } },
        { label: 'ผลจริง', render: function (r) { return '<div class="mini-bar"><div class="progress"><div class="progress-bar" style="width:' + Math.min(100, r.progress) + '%">\x3c/div>\x3c/div><span class="small num fw-600">' + r.progress + '%\x3c/span>\x3c/div>'; } },
        { label: 'ตามแผน', cls: 'text-end num small', render: function (r) { return r.plan + '%'; } },
        { label: 'เทียบแผน', render: function (r) {
          var f = FLAG[r.flag] || ['', 'mute'];
          return SP.pill(f[0], f[1], true) + (r.flag !== 'not_started' ? '<div class="small-xs text-muted mt-1 num">' + (r.variance > 0 ? '+' : '') + r.variance + '%\x3c/div>' : '') + (r.overdue ? '<div class="mt-1">' + SP.pill('เลยกำหนด', 'danger') + '\x3c/div>' : '');
        } },
        { label: 'รายงานล่าสุด', cls: 'small', render: function (r) {
          if (r.status !== 'in_progress') return '<span class="text-muted">-\x3c/span>';
          return (r.last_report ? esc(SP.fmtDate(r.last_report)) + '<div class="small-xs ' + (r.stale ? 'text-danger fw-600' : 'text-muted') + '">' + daysAgo(r.days_since) + '\x3c/div>' : '<span class="' + (r.stale ? 'text-danger fw-600' : 'text-muted') + '">ยังไม่เคยรายงาน\x3c/span>');
        } },
        { label: '', cls: 'text-end text-nowrap', render: function (r) {
          return r.can_report ? '<button class="btn btn-soft btn-sm" type="button" data-act="report"><i class="bi bi-plus-lg me-1">\x3c/i>รายงาน\x3c/button>' : '<a class="btn btn-light btn-icon btn-sm" href="#/projects/' + esc(r.id) + '"><i class="bi bi-chevron-right">\x3c/i>\x3c/a>';
        } }
      ],
      onAction: function (act, row, ctrl) {
        if (act === 'report') SP.openReportFor(row.id, function () { ctrl.reload(); loadFeed(true); });
      }
    });
    SP.on(SP.$('#pgTabs', el), 'click', '[data-flag]', function (e, b) {
      SP.$$('#pgTabs .nav-link', el).forEach(function (x) { x.classList.toggle('active', x === b); });
      lv.state.filters.flag = b.dataset.flag; lv.state.page = 1; lv.reload();
    });

    var feed = SP.$('#pgFeed', el), page = 0;
    function loadFeed(reset) {
      if (reset) { page = 0; feed.innerHTML = ui.loading(); }
      page++;
      SP.api('apiListReports', { page: page, size: 10, filters: { fiscal_year: SP.fy } }).then(function (r) {
        var d = r.data;
        var more = feed.querySelector('[data-more]'); if (more) more.remove();
        if (page === 1) feed.innerHTML = '';
        if (!d.total) { feed.innerHTML = ui.empty('bi-activity', 'ยังไม่มีรายงานความก้าวหน้า', 'เมื่อผู้รับผิดชอบรายงานผล รายการจะแสดงที่นี่'); return; }
        feed.insertAdjacentHTML('beforeend', d.rows.map(function (x) { return ui.reportItem(x, true); }).join(''));
        if (d.page * d.size < d.total) feed.insertAdjacentHTML('beforeend', '<div class="text-center py-2" data-more><button class="btn btn-light btn-sm" type="button">โหลดเพิ่ม\x3c/button>\x3c/div>');
      }).catch(function (err) { feed.innerHTML = ui.errorBox(err.message); });
    }
    SP.on(feed, 'click', '[data-more] button', function () { loadFeed(false); });
    ui.bindReportDelete(feed, function () { lv.reload(); loadFeed(true); });
    loadFeed(true);
  };
})();
