<script>
/* พัฒนาโดย นายเกียรติอนันต์ สุกทน · Copyright (c) 2026 นายเกียรติอนันต์ สุกทน */
/* ==========================================================
   ProjectOne : js_projects  (รายการโครงการ, ฟอร์ม, รายละเอียด, กิจกรรม, workflow)
   ========================================================== */
(function () {
  'use strict';
  var SP = window.SP, ui = SP.ui, esc = SP.esc, ST = SP.PROJECT_STATUS;

  SP.MENU.splice(1, 0, { key: 'projects', label: 'โครงการ', icon: 'bi-kanban-fill', color: 'blue', roles: null, place: 'rail', mobile: true, desc: 'เสนอ อนุมัติ และติดตามโครงการ' });
  SP.canCreateProject = function () { return SP.can(['admin', 'planner', 'dept_head', 'staff']); };
  SP.addSearch([{ label: 'สร้างโครงการใหม่', desc: 'เปิดแบบฟอร์มเสนอโครงการ', icon: 'bi-plus-square', href: '#/projects/new', roles: ['admin', 'planner', 'dept_head', 'staff'] }]);

  var HIST = { create: ['bi-plus-circle', 'สร้างโครงการ'], edit: ['bi-pencil', 'แก้ไขข้อมูล'], submit: ['bi-send', 'เสนออนุมัติ'], revise: ['bi-arrow-counterclockwise', 'ตีกลับให้แก้ไข'], approve: ['bi-patch-check', 'อนุมัติโครงการ'], start: ['bi-play-circle', 'เริ่มดำเนินการ'], complete: ['bi-flag', 'ปิดโครงการ'], cancel: ['bi-x-circle', 'ยกเลิกโครงการ'] };

  function stPill(s) { var x = ST[s] || { label: s, tone: 'mute' }; return SP.pill(x.label, x.tone, true); }
  function miniBar(pct) {
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<div class="mini-bar"><div class="progress"><div class="progress-bar" style="width:' + pct + '%">\x3c/div>\x3c/div><span class="small num fw-600">' + (Math.round(pct * 10) / 10) + '%\x3c/span>\x3c/div>';
  }
  function fyRange(fy) {
    var f = (SP.lookups.fiscal_years || []).filter(function (x) { return String(x.year) === String(fy); })[0];
    return f ? { start: f.start_date, end: f.end_date } : { start: '', end: '' };
  }
  function lines(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }

  /* =========================================================
     ROUTE
     ========================================================= */
  SP.pages.projects = function (el, param, seq) {
    if (param && param !== 'new') return detailPage(el, param, seq);
    listPage(el, seq);
    if (param === 'new' && SP.canCreateProject()) openProjectForm(null);
  };

  /* =========================================================
     LIST
     ========================================================= */
  function listPage(el) {
    var lk = SP.lookups, all = SP.can(['admin', 'executive', 'planner', 'finance']);
    var opt = function (arr, lbl) { return arr.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(lbl(x)) + '\x3c/option>'; }).join(''); };
    el.innerHTML = '<div class="page-head"><div><h1>โครงการ\x3c/h1><div class="sub">ปีงบประมาณ ' + esc(SP.fy) + '\x3c/div>\x3c/div>' +
      '<div class="actions">' + (SP.canCreateProject() ? '<button class="btn btn-primary" type="button" id="pjNew"><i class="bi bi-plus-lg me-1">\x3c/i>สร้างโครงการ\x3c/button>' : '') + '\x3c/div>\x3c/div>' +
      '<ul class="nav nav-pills mb-3" id="pjTabs">\x3c/ul><div id="pjList">\x3c/div>';

    var tabs = [{ k: '', label: 'ทั้งหมด' }].concat(Object.keys(ST).map(function (k) { return { k: k, label: ST[k].label }; }));
    var curSt = '';
    function renderTabs(counts) {
      SP.$('#pjTabs', el).innerHTML = tabs.map(function (t) {
        var n = counts ? counts[t.k || 'all'] || 0 : '';
        if (t.k && counts && !n && t.k !== curSt) return '';
        return '<li class="nav-item"><button type="button" class="nav-link' + (t.k === curSt ? ' active' : '') + '" data-st="' + t.k + '">' + esc(t.label) + (counts ? ' <span class="opacity-75">' + n + '\x3c/span>' : '') + '\x3c/button>\x3c/li>';
      }).join('');
    }
    renderTabs(null);

    var toolbar = (all ? '<select class="form-select form-select-sm w-auto" data-filter="dept_id"><option value="">ทุกหน่วยงาน\x3c/option>' + opt(lk.departments || [], function (d) { return d.name; }) + '\x3c/select>' : '') +
      '<select class="form-select form-select-sm w-auto" data-filter="strategy_id"><option value="">ทุกยุทธศาสตร์\x3c/option>' + opt(lk.strategies || [], function (d) { return d.code + ' ' + d.name; }) + '\x3c/select>' +
      '<select class="form-select form-select-sm w-auto" data-filter="source_id"><option value="">ทุกแหล่งงบ\x3c/option>' + opt(lk.sources || [], function (d) { return d.name; }) + '\x3c/select>';

    var lv = SP.listView({
      el: SP.$('#pjList', el), api: 'apiListProjects', searchPh: 'ค้นหารหัส ชื่อโครงการ ผู้รับผิดชอบ',
      filters: { fiscal_year: SP.fy }, toolbar: toolbar,
      empty: { icon: 'bi-kanban', title: 'ยังไม่มีโครงการ', desc: SP.canCreateProject() ? 'กด "สร้างโครงการ" เพื่อเริ่มเสนอโครงการแรกของปีงบประมาณนี้' : 'โครงการในขอบเขตของคุณจะแสดงที่นี่' },
      onLoaded: function (d) { renderTabs(d.counts); },
      columns: [
        { label: 'โครงการ', render: function (r) {
          return '<a class="text-reset text-decoration-none" href="#/projects/' + esc(r.id) + '"><div class="cell-2"><div class="t1">' + esc(r.name) + '\x3c/div><div class="t2">' + esc(r.code) + (r.dept_name ? ' · ' + esc(r.dept_name) : '') + '\x3c/div>\x3c/div>\x3c/a>';
        } },
        { label: 'ผู้รับผิดชอบ', cls: 'small', render: function (r) { return esc(r.owner_name); } },
        { label: 'งบประมาณ (บาท)', cls: 'text-end num', render: function (r) {
          return r.budget_approved ? '<div class="fw-600">' + SP.money(r.budget_approved, 0) + '\x3c/div><div class="small-xs text-muted">อนุมัติ\x3c/div>' : '<div>' + SP.money(r.budget_request, 0) + '\x3c/div><div class="small-xs text-muted">ขอ\x3c/div>';
        } },
        { label: 'ความก้าวหน้า', render: function (r) { return miniBar(r.progress); } },
        { label: 'ระยะเวลา', cls: 'small text-nowrap', render: function (r) {
          return esc(SP.fmtDate(r.start_date)) + '<div class="text-muted">ถึง ' + esc(SP.fmtDate(r.end_date)) + '\x3c/div>' + (r.overdue ? SP.pill('ล่าช้า', 'danger') : '');
        } },
        { label: 'สถานะ', render: function (r) { return stPill(r.status); } },
        { label: '', cls: 'text-end', render: function (r) { return '<a class="btn btn-light btn-icon btn-sm" href="#/projects/' + esc(r.id) + '" title="เปิดโครงการ"><i class="bi bi-chevron-right">\x3c/i>\x3c/a>'; } }
      ]
    });

    SP.on(SP.$('#pjTabs', el), 'click', '[data-st]', function (e, b) {
      curSt = b.dataset.st; lv.state.filters.status = curSt; lv.state.page = 1;
      SP.$$('#pjTabs .nav-link', el).forEach(function (x) { x.classList.toggle('active', x === b); });
      lv.reload();
    });
    var nb = SP.$('#pjNew', el);
    if (nb) nb.addEventListener('click', function () { openProjectForm(null); });
  }

  /* =========================================================
     PROJECT FORM (modal xl)
     ========================================================= */
  function kpiRow(k) {
    k = k || {};
    return '<div class="rep-row" data-rep="kpi">' +
      '<input class="form-control rep-name" data-k="name" placeholder="ตัวชี้วัด เช่น ร้อยละผู้เข้าร่วมที่พึงพอใจ" value="' + esc(k.name) + '">' +
      '<input class="form-control" data-k="target" placeholder="ค่าเป้าหมาย" value="' + esc(k.target) + '">' +
      '<input class="form-control" data-k="unit" placeholder="หน่วย" value="' + esc(k.unit) + '">' +
      '<button class="btn btn-ghost-danger btn-icon" type="button" data-rep-del title="ลบ"><i class="bi bi-x-lg">\x3c/i>\x3c/button>\x3c/div>';
  }

  function openProjectForm(rec, onDone) {
    var u = SP.user, lk = SP.lookups, isNew = !rec;
    var r = rec || {};
    var fy = r.fiscal_year || SP.fy, rg = fyRange(fy);
    var locked = u.role === 'dept_head' || u.role === 'staff';
    var deptId = r.dept_id || u.dept_id || '';
    var draft = isNew || r.status === 'draft' || r.status === 'revise';

    var fys = (lk.fiscal_years || []).filter(function (f) { return f.status !== 'closed' || String(f.year) === String(fy); }).map(function (f) { return { value: f.year, label: f.name }; });
    var depts = (lk.departments || []).filter(function (d) { return !locked || d.id === u.dept_id; }).map(function (d) { return { value: d.id, label: d.name, sub: d.code }; });
    var deptName = function (id) { var d = (lk.departments || []).filter(function (x) { return x.id === id; })[0]; return d ? d.short_name || d.name : ''; };
    var users = (lk.users || []).filter(function (x) {
      if (u.role === 'staff') return x.id === (r.owner_id || u.id);
      if (u.role === 'dept_head') return x.dept_id === u.dept_id || x.id === u.id;
      return true;
    }).map(function (x) { return { value: x.id, label: x.name, sub: [x.position, deptName(x.dept_id)].filter(Boolean).join(' · ') }; });
    var strategies = (lk.strategies || []).map(function (s) { return { value: s.id, label: s.code + ' ' + s.name }; });
    var sources = (lk.sources || []).map(function (s) { return { value: s.id, label: s.name, sub: s.type === 'out' ? 'นอกงบประมาณ' : 'ในงบประมาณ' }; });

    var sec = function (t) { return '<div class="col-12"><div class="section-label">' + esc(t) + '\x3c/div>\x3c/div>'; };
    var body = '<div class="row g-3">' +
      (rec && rec.status === 'revise' ? '<div class="col-12"><div class="alert alert-warning mb-0"><i class="bi bi-arrow-counterclockwise">\x3c/i><div>โครงการถูกตีกลับ แก้ไขตามข้อเสนอแนะแล้วกด "เสนออนุมัติ" อีกครั้ง\x3c/div>\x3c/div>\x3c/div>' : '') +
      sec('ข้อมูลหลัก') +
      ui.field('name', 'ชื่อโครงการ', r.name, { required: true, maxlength: 300 }) +
      ui.selectField('fiscal_year', 'ปีงบประมาณ', fys, fy, { required: true, col: 'col-md-3', attrs: draft ? {} : { disabled: true } }) +
      ui.comboField('dept_id', 'หน่วยงานเจ้าของโครงการ', depts, deptId, { required: true, col: 'col-md-5', allowEmpty: false }) +
      ui.comboField('owner_id', 'ผู้รับผิดชอบโครงการ', users, r.owner_id || u.id, { required: true, col: 'col-md-4', allowEmpty: false }) +
      ui.field('co_owners', 'ผู้ร่วมรับผิดชอบ', r.co_owners, { col: 'col-md-6', placeholder: 'ชื่อ หรือหน่วยงานที่ร่วมดำเนินการ' }) +
      ui.field('location', 'สถานที่ดำเนินการ', r.location, { col: 'col-md-6' }) +
      ui.comboField('strategy_id', 'สอดคล้องกับยุทธศาสตร์', strategies, r.strategy_id, { col: 'col-md-6', emptyLabel: 'ไม่ระบุ' }) +
      ui.comboField('source_id', 'แหล่งงบประมาณ', sources, r.source_id, { col: 'col-md-6', emptyLabel: 'ไม่ระบุ' }) +
      ui.field('start_date', 'วันเริ่มโครงการ', r.start_date || rg.start, { type: 'date', required: true, col: 'col-md-4' }) +
      ui.field('end_date', 'วันสิ้นสุดโครงการ', r.end_date || rg.end, { type: 'date', required: true, col: 'col-md-4' }) +
      ui.field('budget_request', 'งบประมาณที่ขอ', r.budget_request != null ? r.budget_request : '', { type: 'number', min: 0, step: '0.01', required: true, col: 'col-md-4', suffix: 'บาท', attrs: draft ? {} : { readonly: true }, help: draft ? '' : 'แก้งบได้เฉพาะก่อนเสนอ' }) +
      sec('รายละเอียดโครงการ') +
      ui.field('rationale', 'หลักการและเหตุผล', r.rationale, { type: 'textarea', rows: 4 }) +
      ui.field('objectives', 'วัตถุประสงค์ (บรรทัดละ 1 ข้อ)', r.objectives, { type: 'textarea', rows: 3 }) +
      ui.field('target_quant', 'เป้าหมายเชิงปริมาณ', r.target_quant, { type: 'textarea', rows: 2, col: 'col-md-6' }) +
      ui.field('target_qual', 'เป้าหมายเชิงคุณภาพ', r.target_qual, { type: 'textarea', rows: 2, col: 'col-md-6' }) +
      ui.field('expected_outcome', 'ผลที่คาดว่าจะได้รับ', r.expected_outcome, { type: 'textarea', rows: 2 }) +
      sec('ตัวชี้วัดความสำเร็จ (KPI)') +
      '<div class="col-12"><div id="kpiRows">' + ((r.kpis && r.kpis.length) ? r.kpis.map(kpiRow).join('') : kpiRow()) + '\x3c/div>' +
      '<button class="btn btn-soft btn-sm" type="button" data-rep-add><i class="bi bi-plus-lg me-1">\x3c/i>เพิ่มตัวชี้วัด\x3c/button>\x3c/div>' +
      ui.field('note', 'หมายเหตุ', r.note, { type: 'textarea', rows: 2 }) +
      '\x3c/div>';

    ui.openForm({
      title: isNew ? 'สร้างโครงการ' : 'แก้ไขโครงการ ' + (r.code || ''), size: 'xl', body: body,
      saveText: isNew ? 'สร้างโครงการ' : 'บันทึก',
      onShown: function (form) {
        var box = SP.$('#kpiRows', form);
        form.querySelector('[data-rep-add]').onclick = function () { box.insertAdjacentHTML('beforeend', kpiRow()); box.lastElementChild.querySelector('input').focus(); };
        box.onclick = function (e) { var b = e.target.closest('[data-rep-del]'); if (b) { b.closest('[data-rep]').remove(); if (!box.children.length) box.insertAdjacentHTML('beforeend', kpiRow()); } };
        var fySel = form.querySelector('[name=fiscal_year]');
        fySel.onchange = function () {
          var g = fyRange(fySel.value);
          if (g.start) { form.querySelector('[name=start_date]').value = g.start; form.querySelector('[name=end_date]').value = g.end; }
        };
        if (isNew) form.querySelector('[name=name]').focus();
      },
      onSave: function (data, form) {
        data.kpis = SP.$$('[data-rep="kpi"]', form).map(function (row) {
          var o = {}; SP.$$('[data-k]', row).forEach(function (i) { o[i.dataset.k] = i.value.trim(); }); return o;
        }).filter(function (k) { return k.name; });
        if (!draft) data.fiscal_year = fy;
        if (data.start_date > data.end_date) throw new Error('วันเริ่มต้องไม่เกินวันสิ้นสุด');
        if (rec) { data.id = rec.id; data.expected_version = rec.version; }
        return SP.api('apiSaveProject', data).then(function (x) {
          SP.toast(x.message);
          if (onDone) onDone(x.data); else SP.go('projects/' + x.data.id);
        });
      }
    });
  }
  SP.openProjectForm = openProjectForm;

  /* =========================================================
     DETAIL
     ========================================================= */
  function detailPage(el, id, seq) {
    return SP.api('apiGetProject', id).then(function (r) {
      if (!SP.alive(seq)) return;
      var p = r.data, pm = p.perm;
      var acts = p.activities, sumW = 0, sumB = 0;
      acts.forEach(function (a) { sumW += a.weight; sumB += a.budget; });
      sumW = Math.round(sumW * 10) / 10;
      var overdue = p.status === 'in_progress' && p.end_date < p.today && p.progress < 100;
      var lastRevise = (p.history || []).filter(function (h) { return h.action === 'revise'; })[0];

      var btn = function (key, cls, icon, label) { return pm[key] ? '<button class="btn ' + cls + '" type="button" data-pj="' + key + '"><i class="bi ' + icon + ' me-1">\x3c/i>' + label + '\x3c/button>' : ''; };
      var actions = btn('edit', 'btn-light', 'bi-pencil', 'แก้ไข') +
        btn('submit', 'btn-primary', 'bi-send', 'เสนออนุมัติ') +
        btn('revise', 'btn-light', 'bi-arrow-counterclockwise', 'ตีกลับ') +
        btn('approve', 'btn-primary', 'bi-patch-check', 'อนุมัติ') +
        btn('start', 'btn-primary', 'bi-play-circle', 'เริ่มดำเนินการ') +
        btn('report', 'btn-primary', 'bi-graph-up-arrow', 'รายงานความก้าวหน้า') +
        btn('disburse', 'btn-light', 'bi-cash-coin', 'ขอเบิก') +
        btn('complete', 'btn-light', 'bi-flag', 'ปิดโครงการ');
      actions += '<div class="dropdown"><button class="btn btn-light" type="button" data-bs-toggle="dropdown"><i class="bi bi-printer me-1">\x3c/i>พิมพ์\x3c/button><ul class="dropdown-menu dropdown-menu-end">' +
        '<li><button class="dropdown-item" type="button" data-print="proposal"><i class="bi bi-file-earmark-text me-2">\x3c/i>แบบเสนอโครงการ\x3c/button>\x3c/li>' +
        (['approved', 'in_progress', 'completed'].indexOf(p.status) >= 0 ? '<li><button class="dropdown-item" type="button" data-print="summary"><i class="bi bi-clipboard-data me-2">\x3c/i>รายงานผลการดำเนินโครงการ\x3c/button>\x3c/li>' : '') + '\x3c/ul>\x3c/div>';
      var more = (pm.cancel ? '<li><button class="dropdown-item text-danger" type="button" data-pj="cancel"><i class="bi bi-x-circle me-2">\x3c/i>ยกเลิกโครงการ\x3c/button>\x3c/li>' : '') +
        (pm.del ? '<li><button class="dropdown-item text-danger" type="button" data-pj="del"><i class="bi bi-trash3 me-2">\x3c/i>ลบโครงการ\x3c/button>\x3c/li>' : '');
      if (more) actions += '<div class="dropdown"><button class="btn btn-light btn-icon" type="button" data-bs-toggle="dropdown" aria-label="เพิ่มเติม"><i class="bi bi-three-dots">\x3c/i>\x3c/button><ul class="dropdown-menu dropdown-menu-end">' + more + '\x3c/ul>\x3c/div>';

      var alert = '';
      if (p.status === 'revise' && lastRevise) alert = '<div class="alert alert-warning"><i class="bi bi-arrow-counterclockwise">\x3c/i><div><b>ตีกลับให้แก้ไข\x3c/b> โดย ' + esc(lastRevise.by_name) + ' เมื่อ ' + esc(SP.fmtDate(lastRevise.at, true)) + '<div>' + esc(lastRevise.note) + '\x3c/div>\x3c/div>\x3c/div>';
      else if (p.status === 'submitted') alert = '<div class="alert alert-info"><i class="bi bi-hourglass-split">\x3c/i><div><b>รอพิจารณาอนุมัติ\x3c/b> เสนอเมื่อ ' + esc(SP.fmtDate(p.submitted_at, true)) + '\x3c/div>\x3c/div>';
      else if (p.status === 'draft' && pm.submit) alert = '<div class="alert alert-light"><i class="bi bi-info-circle">\x3c/i><div>ขั้นตอนก่อนเสนอ: เพิ่มกิจกรรมให้ <b>น้ำหนักรวม 100\x3c/b> และงบกิจกรรมรวมไม่เกินงบที่ขอ แล้วกด "เสนออนุมัติ"\x3c/div>\x3c/div>';
      if (overdue) alert += '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle">\x3c/i><div><b>โครงการล่าช้า\x3c/b> เลยกำหนด ' + esc(SP.fmtDate(p.end_date)) + ' ความก้าวหน้า ' + p.progress + '%\x3c/div>\x3c/div>';

      var info = function (l, v) { return '<div><div class="ig-l">' + esc(l) + '\x3c/div><div class="ig-v">' + (v || '<span class="text-muted fw-normal">-\x3c/span>') + '\x3c/div>\x3c/div>'; };
      var infoCard = '<div class="card"><div class="card-header"><i class="bi bi-info-circle text-primary">\x3c/i>ข้อมูลโครงการ\x3c/div><div class="card-body"><div class="info-grid">' +
        info('หน่วยงาน', esc(p.dept_name)) +
        info('ผู้รับผิดชอบ', esc(p.owner_name) + (p.owner_position ? '<div class="small text-muted fw-normal">' + esc(p.owner_position) + '\x3c/div>' : '')) +
        info('ผู้ร่วมรับผิดชอบ', esc(p.co_owners)) +
        info('สถานที่', esc(p.location)) +
        info('ยุทธศาสตร์', esc(p.strategy_name)) +
        info('แหล่งงบประมาณ', esc(p.source_name)) +
        info('ระยะเวลา', esc(SP.fmtDate(p.start_date)) + ' ถึง ' + esc(SP.fmtDate(p.end_date))) +
        info('ปีงบประมาณ', esc(p.fiscal_year)) +
        '\x3c/div>\x3c/div>\x3c/div>';

      var obj = lines(p.objectives);
      var detailParts = '';
      if (p.rationale) detailParts += '<h6 class="fw-bold">หลักการและเหตุผล\x3c/h6><div class="prose mb-3">' + esc(p.rationale) + '\x3c/div>';
      if (obj.length) detailParts += '<h6 class="fw-bold">วัตถุประสงค์\x3c/h6><ol class="mb-3">' + obj.map(function (o) { return '<li>' + esc(o) + '\x3c/li>'; }).join('') + '\x3c/ol>';
      if (p.target_quant || p.target_qual) detailParts += '<div class="row g-3 mb-3"><div class="col-md-6"><h6 class="fw-bold">เป้าหมายเชิงปริมาณ\x3c/h6><div class="prose">' + (esc(p.target_quant) || '-') + '\x3c/div>\x3c/div><div class="col-md-6"><h6 class="fw-bold">เป้าหมายเชิงคุณภาพ\x3c/h6><div class="prose">' + (esc(p.target_qual) || '-') + '\x3c/div>\x3c/div>\x3c/div>';
      if (p.expected_outcome) detailParts += '<h6 class="fw-bold">ผลที่คาดว่าจะได้รับ\x3c/h6><div class="prose mb-3">' + esc(p.expected_outcome) + '\x3c/div>';
      if (p.kpis && p.kpis.length) detailParts += '<h6 class="fw-bold">ตัวชี้วัดความสำเร็จ\x3c/h6><div class="table-wrap"><table class="table table-sm"><thead><tr><th>ตัวชี้วัด\x3c/th><th class="text-end">ค่าเป้าหมาย\x3c/th><th>หน่วย\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
        p.kpis.map(function (k) { return '<tr><td>' + esc(k.name) + '\x3c/td><td class="text-end fw-600">' + esc(k.target) + '\x3c/td><td>' + esc(k.unit) + '\x3c/td>\x3c/tr>'; }).join('') + '\x3c/tbody>\x3c/table>\x3c/div>';
      if (p.note) detailParts += '<div class="small text-muted mt-3"><b>หมายเหตุ\x3c/b> ' + esc(p.note) + '\x3c/div>';
      var detailCard = '<div class="card mt-3"><div class="card-header"><i class="bi bi-journal-text text-primary">\x3c/i>รายละเอียดโครงการ\x3c/div><div class="card-body">' +
        (detailParts || ui.empty('bi-journal-text', 'ยังไม่ได้กรอกรายละเอียด', 'หลักการ วัตถุประสงค์ เป้าหมาย และตัวชี้วัด', pm.edit ? '<button class="btn btn-soft btn-sm" type="button" data-pj="edit"><i class="bi bi-pencil me-1">\x3c/i>กรอกรายละเอียด\x3c/button>' : '')) + '\x3c/div>\x3c/div>';

      var wTone = Math.abs(sumW - 100) < 0.01 ? 'success' : 'warning';
      var actRows = acts.map(function (a, i) {
        return '<tr data-aid="' + esc(a.id) + '"><td class="text-muted small">' + (i + 1) + '\x3c/td>' +
          '<td><div class="cell-2"><div class="t1">' + esc(a.name) + '\x3c/div>' + (a.output || a.responsible ? '<div class="t2">' + esc([a.output, a.responsible ? 'ผู้รับผิดชอบ ' + a.responsible : ''].filter(Boolean).join(' · ')) + '\x3c/div>' : '') + '\x3c/div>\x3c/td>' +
          '<td class="small text-nowrap">' + esc(SP.fmtDate(a.start_date)) + '<div class="text-muted">ถึง ' + esc(SP.fmtDate(a.end_date)) + '\x3c/div>\x3c/td>' +
          '<td class="text-end num fw-600">' + a.weight + '\x3c/td>' +
          '<td class="text-end num">' + SP.money(a.budget, 0) + (a.spent ? '<div class="small-xs text-muted">เบิก ' + SP.money(a.spent, 0) + '\x3c/div>' : '') + '\x3c/td>' +
          '<td>' + miniBar(a.progress) + '\x3c/td>' +
          '<td class="text-end">' + (pm.activity || pm.report ? '<div class="d-flex gap-1 justify-content-end">' + (pm.report ? '<button class="btn btn-soft btn-sm text-nowrap" type="button" data-act-report title="รายงานความก้าวหน้ากิจกรรมนี้"><i class="bi bi-plus-lg me-1">\x3c/i>รายงาน\x3c/button>' : '') + (pm.activity ? '<button class="btn btn-light btn-icon btn-sm" type="button" data-act-edit title="แก้ไข"><i class="bi bi-pencil">\x3c/i>\x3c/button><button class="btn btn-ghost-danger btn-icon btn-sm" type="button" data-act-del title="ลบ"><i class="bi bi-trash3">\x3c/i>\x3c/button>' : '') + '\x3c/div>' : '') + '\x3c/td>\x3c/tr>';
      }).join('');
      var actCard = '<div class="card mt-3"><div class="card-header"><i class="bi bi-list-task text-primary">\x3c/i>กิจกรรม <span class="ms-1">' + SP.pill('น้ำหนักรวม ' + sumW + '/100', wTone) + '\x3c/span>' +
        (pm.activity ? '<button class="btn btn-soft btn-sm ms-auto" type="button" data-act-add><i class="bi bi-plus-lg me-1">\x3c/i>เพิ่มกิจกรรม\x3c/button>' : '') + '\x3c/div>' +
        (acts.length ? '<div class="table-wrap"><table class="table table-hover"><thead><tr><th>#\x3c/th><th>กิจกรรม\x3c/th><th>ระยะเวลา\x3c/th><th class="text-end">น้ำหนัก\x3c/th><th class="text-end">งบ (บาท)\x3c/th><th>ความก้าวหน้า\x3c/th><th>\x3c/th>\x3c/tr>\x3c/thead><tbody>' + actRows +
          '\x3c/tbody><tfoot><tr class="fw-bold"><td>\x3c/td><td>รวม ' + acts.length + ' กิจกรรม\x3c/td><td>\x3c/td><td class="text-end num">' + sumW + '\x3c/td><td class="text-end num">' + SP.money(sumB, 0) + '\x3c/td><td colspan="2">\x3c/td>\x3c/tr>\x3c/tfoot>\x3c/table>\x3c/div>'
          : '<div class="card-body">' + ui.empty('bi-list-task', 'ยังไม่มีกิจกรรม', 'แบ่งโครงการเป็นกิจกรรม กำหนดน้ำหนักรวม 100 เพื่อใช้คำนวณความก้าวหน้า', pm.activity ? '<button class="btn btn-primary btn-sm" type="button" data-act-add><i class="bi bi-plus-lg me-1">\x3c/i>เพิ่มกิจกรรมแรก\x3c/button>' : '') + '\x3c/div>') +
        '\x3c/div>';

      var cap = p.budget_cap, fin = p.finance;
      var sc = p.scurve, v = sc ? sc.variance : 0;
      var fp = v >= 5 ? ['เร็วกว่าแผน', 'success'] : v >= -10 ? ['ตามแผน', 'blue'] : v >= -25 ? ['ช้ากว่าแผน', 'warning'] : ['ช้ากว่าแผนมาก', 'danger'];
      if (p.status === 'approved') fp = ['ยังไม่เริ่ม', 'mute'];
      var progCard = sc ? '<div class="card mt-3"><div class="card-header"><i class="bi bi-graph-up-arrow text-primary">\x3c/i>ความก้าวหน้าเทียบแผน (S-curve)\x3c/div><div class="card-body">' + ui.scurve(sc) + '\x3c/div>\x3c/div>' : '';
      var repCard = ['approved', 'in_progress', 'completed'].indexOf(p.status) >= 0 ? '<div class="card mt-3"><div class="card-header"><i class="bi bi-chat-square-text text-primary">\x3c/i>รายงานความก้าวหน้า<span class="small text-muted fw-normal ms-1">' + p.report_count + ' ครั้ง\x3c/span>' +
        (pm.report ? '<button class="btn btn-soft btn-sm ms-auto" type="button" data-pj="report"><i class="bi bi-plus-lg me-1">\x3c/i>รายงาน\x3c/button>' : '') + '\x3c/div><div class="card-body py-1">' +
        (p.reports.length ? p.reports.map(function (x) { return ui.reportItem(x, false); }).join('') + (p.report_count > p.reports.length ? '<div class="small text-muted text-center py-2">แสดง ' + p.reports.length + ' รายงานล่าสุด\x3c/div>' : '')
          : ui.empty('bi-chat-square-text', p.status === 'approved' ? 'กด "เริ่มดำเนินการ" เพื่อเริ่มรายงาน' : 'ยังไม่มีรายงาน', 'รายงานผลรายกิจกรรมพร้อมรูปและเอกสาร ระบบคำนวณความก้าวหน้าโครงการให้อัตโนมัติ')) + '\x3c/div>\x3c/div>' : '';
      var budgetCard = '<div class="card"><div class="card-header"><i class="bi bi-wallet2 text-primary">\x3c/i>งบประมาณ\x3c/div><div class="card-body">' +
        '<div class="d-flex justify-content-between mb-2"><span class="text-muted">งบที่ขอ\x3c/span><b class="num">' + SP.money(p.budget_request) + '\x3c/b>\x3c/div>' +
        '<div class="d-flex justify-content-between mb-3"><span class="text-muted">งบอนุมัติ\x3c/span><b class="num ' + (p.budget_approved ? 'text-success' : 'text-muted') + '">' + (p.budget_approved ? SP.money(p.budget_approved) : 'ยังไม่อนุมัติ') + '\x3c/b>\x3c/div>' +
        ui.bar('ลงกิจกรรมแล้ว', SP.money(sumB, 0) + ' / ' + SP.money(cap, 0), SP.pct(sumB, cap), cap - sumB > 0 ? 'คงเหลือที่ยังไม่ลงกิจกรรม ' + SP.money(cap - sumB) + ' บาท' : '') +
        (fin && p.budget_approved ? '<div class="mt-3">' + ui.bar('เบิกจ่ายแล้ว', SP.money(fin.paid, 0) + ' / ' + SP.money(fin.approved, 0), SP.pct(fin.paid, fin.approved), 'ผูกพัน ' + SP.money(fin.committed, 0) + ' · คงเหลือ ' + SP.money(fin.available, 0) + ' บาท') + '\x3c/div>' : '') +
        '\x3c/div>\x3c/div>';
      var showDisb = p.disbursements.length || pm.disburse;
      var disbCard = showDisb ? '<div class="card mt-3"><div class="card-header"><i class="bi bi-cash-coin text-primary">\x3c/i>การเบิกจ่าย<span class="small text-muted fw-normal ms-1">' + p.disbursements.length + ' รายการ\x3c/span>' +
        (pm.disburse ? '<button class="btn btn-soft btn-sm ms-auto" type="button" data-pj="disburse"><i class="bi bi-plus-lg me-1">\x3c/i>ขอเบิก\x3c/button>' : '') + '\x3c/div>' +
        (p.disbursements.length ? '<div class="table-wrap"><table class="table table-hover"><thead><tr><th>เลขที่\x3c/th><th>รายการ\x3c/th><th class="text-end">จำนวน (บาท)\x3c/th><th>ขั้นตอน\x3c/th><th>\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
          p.disbursements.map(function (d) {
            return '<tr data-did="' + esc(d.id) + '"><td class="small text-nowrap"><div class="fw-600">' + esc(d.doc_no) + '\x3c/div><div class="text-muted">' + esc(SP.fmtDate(d.request_date)) + '\x3c/div>\x3c/td>' +
              '<td><div class="cell-2"><div class="t1">' + esc(d.title) + '\x3c/div><div class="t2">' + esc(d.activity_name || d.category) + ' · ' + esc(d.requested_by_name) + '\x3c/div>\x3c/div>\x3c/td>' +
              '<td class="text-end num fw-600">' + SP.money(d.status === 'paid' ? d.paid_amount : d.amount) + '\x3c/td><td>' + ui.disbSteps(d.status) + '\x3c/td>' +
              '<td class="text-end"><button class="btn btn-light btn-icon btn-sm" type="button" data-disb-view title="รายละเอียด"><i class="bi bi-eye">\x3c/i>\x3c/button>\x3c/td>\x3c/tr>';
          }).join('') + '\x3c/tbody>\x3c/table>\x3c/div>'
          : '<div class="card-body">' + ui.empty('bi-cash-coin', 'ยังไม่มีการเบิกจ่าย', 'ขอเบิกตามกิจกรรม ระบบตรวจยอดคงเหลือให้อัตโนมัติ') + '\x3c/div>') + '\x3c/div>' : '';

      var hist = (p.history || []).map(function (h) {
        var x = HIST[h.action] || ['bi-dot', h.action];
        return '<div class="tl-item"><span class="tl-dot">\x3c/span><div class="fw-600 small"><i class="bi ' + x[0] + ' me-1">\x3c/i>' + esc(x[1]) + '\x3c/div>' +
          '<div class="small-xs text-muted">' + esc(h.by_name) + ' · ' + esc(SP.fmtDate(h.at, true)) + '\x3c/div>' + (h.note ? '<div class="small mt-1">' + esc(h.note) + '\x3c/div>' : '') + '\x3c/div>';
      }).join('');
      var histCard = '<div class="card"><div class="card-header"><i class="bi bi-clock-history text-primary">\x3c/i>ประวัติการดำเนินการ\x3c/div><div class="card-body"><div class="timeline">' + (hist || '<div class="text-muted small">ยังไม่มีประวัติ\x3c/div>') + '\x3c/div>\x3c/div>\x3c/div>';

      el.innerHTML = '<div id="pjRoot">' +
        '<a class="small text-muted text-decoration-none d-inline-block mb-2" href="#/projects"><i class="bi bi-arrow-left me-1">\x3c/i>โครงการทั้งหมด\x3c/a>' +
        '<div class="page-head"><div class="min-w-0"><div class="d-flex align-items-center gap-2 flex-wrap mb-1"><span class="pill pill-mute">' + esc(p.code) + '\x3c/span>' + stPill(p.status) + (overdue ? SP.pill('ล่าช้า', 'danger') : '') + '\x3c/div>' +
        '<h1>' + esc(p.name) + '\x3c/h1><div class="sub">' + esc(p.dept_name) + ' · ผู้รับผิดชอบ ' + esc(p.owner_name) + '\x3c/div>\x3c/div>' +
        '<div class="actions">' + actions + '\x3c/div>\x3c/div>' + alert +
        '<div class="row g-3"><div class="col-xl-8">' + infoCard + progCard + actCard + repCard + disbCard + detailCard + '\x3c/div>' +
        '<div class="col-xl-4"><div class="dash-side">' +
        '<div class="card"><div class="card-body text-center">' + ui.ring(p.progress, 140, 'ความก้าวหน้า') + (sc ? '<div class="mt-2">' + SP.pill(fp[0] + ' ' + (sc.variance > 0 ? '+' : '') + sc.variance + '%', fp[1], true) + '\x3c/div><div class="small text-muted mt-1">ตามแผน ณ ' + esc(SP.fmtDate(sc.as_of)) + ' ' + sc.plan + '%\x3c/div>' : '') + '<div class="small text-muted mt-1">' + acts.length + ' กิจกรรม · คำนวณจากน้ำหนักกิจกรรม\x3c/div>\x3c/div>\x3c/div>' +
        budgetCard + histCard + '\x3c/div>\x3c/div>\x3c/div>\x3c/div>';

      var root = SP.$('#pjRoot', el);
      SP.on(root, 'click', '[data-pj]', function (e, b) { doAction(b.dataset.pj, p); });
      SP.on(root, 'click', '[data-act-add]', function () { openActivityForm(p, null); });
      SP.on(root, 'click', '[data-act-report]', function (e, b) { var a = actById(b); if (a) SP.openReportForm(p, a.id, function () { SP.route(); }); });
      ui.bindReportDelete(root, function () { SP.route(); });
      SP.on(root, 'click', '[data-print]', function (e, b) { if (b.dataset.print === 'proposal') SP.print.project(p); else SP.print.projectSummary(p); });
      SP.on(root, 'click', '[data-disb-view]', function (e, b) { SP.openDisbDetail(b.closest('tr').dataset.did, function () { SP.route(); }); });
      SP.on(root, 'click', '[data-act-edit]', function (e, b) { var a = actById(b); if (a) openActivityForm(p, a); });
      SP.on(root, 'click', '[data-act-del]', function (e, b) {
        var a = actById(b); if (!a) return;
        ui.confirm('ลบกิจกรรม "' + a.name + '"', { danger: true, okText: 'ลบกิจกรรม' }).then(function (yes) {
          if (!yes) return;
          return SP.api('apiDeleteActivity', a.id).then(function (x) { SP.toast(x.message); SP.route(); });
        }).catch(function (err) { SP.toast(err.message, 'error'); });
      });
      function actById(b) { var id2 = b.closest('tr').dataset.aid; return acts.filter(function (a) { return a.id === id2; })[0]; }
    });
  }

  /* ---------- workflow actions ---------- */
  function doAction(key, p) {
    var after = function (x) { SP.toast(x.message); SP.route(); };
    var fail = function (err) { SP.toast(err.message, 'error'); };
    var noteForm = function (title, label, required, saveText, fn, extra) {
      ui.openForm({
        title: title, saveText: saveText,
        body: '<div class="row g-3">' + (extra || '') + ui.field('note', label, '', { type: 'textarea', rows: 3, required: required }) + '\x3c/div>',
        onSave: fn
      });
    };
    if (key === 'edit') {
      openProjectForm(p, function () { SP.route(); });
    } else if (key === 'submit') {
      noteForm('เสนอโครงการเพื่อพิจารณา', 'ข้อความถึงผู้พิจารณา (ถ้ามี)', false, 'เสนออนุมัติ', function (d) {
        return SP.api('apiSubmitProject', p.id, d.note).then(after);
      });
    } else if (key === 'revise') {
      noteForm('ตีกลับให้แก้ไข', 'สิ่งที่ต้องแก้ไข', true, 'ตีกลับ', function (d) {
        return SP.api('apiReviseProject', p.id, d.note).then(after);
      });
    } else if (key === 'approve') {
      var sumB = p.activities.reduce(function (s, a) { return s + a.budget; }, 0);
      var al = p.allocation, maxAmt = p.budget_request, allocHtml = '';
      if (al) {
        maxAmt = Math.min(maxAmt, Math.max(0, al.available));
        allocHtml = '<div class="col-12"><div class="alert alert-' + (al.available >= p.budget_request ? 'success' : 'warning') + ' mb-0"><i class="bi bi-diagram-2">\x3c/i><div>งบจัดสรรของ ' + esc(p.dept_name) + ' จาก' + esc(p.source_name) + ' ใช้ได้อีก <b>' + SP.money(al.available) + '\x3c/b> บาท (จัดสรร ' + SP.money(al.amount) + ')\x3c/div>\x3c/div>\x3c/div>';
      } else if (p.require_allocation && p.budget_request > 0) {
        allocHtml = '<div class="col-12"><div class="alert alert-danger mb-0"><i class="bi bi-exclamation-octagon">\x3c/i><div>' + (p.source_name ? 'ยังไม่มีการจัดสรรงบจาก ' + esc(p.source_name) + ' ให้หน่วยงานนี้' : 'โครงการยังไม่ระบุแหล่งงบประมาณ') + ' จึงยังอนุมัติไม่ได้ (จัดสรรที่เมนูงบประมาณ)\x3c/div>\x3c/div>\x3c/div>';
      }
      ui.openForm({
        title: 'อนุมัติโครงการ ' + p.code, saveText: 'อนุมัติ',
        body: '<div class="row g-3"><div class="col-12"><div class="alert alert-light mb-0"><i class="bi bi-wallet2">\x3c/i><div>งบที่ขอ <b>' + SP.money(p.budget_request) + '\x3c/b> บาท · งบกิจกรรมรวม ' + SP.money(sumB) + ' บาท\x3c/div>\x3c/div>\x3c/div>' + allocHtml +
          ui.field('budget_approved', 'งบประมาณที่อนุมัติ', maxAmt, { type: 'number', min: 0, max: maxAmt, step: '0.01', required: true, suffix: 'บาท', help: 'ถ้าอนุมัติน้อยกว่างบกิจกรรม ผู้รับผิดชอบต้องปรับกิจกรรมก่อนเริ่มดำเนินการ' }) +
          ui.field('note', 'ความเห็นผู้อนุมัติ', '', { type: 'textarea', rows: 2 }) + '\x3c/div>',
        onSave: function (d) { return SP.api('apiApproveProject', p.id, { budget_approved: d.budget_approved, note: d.note }).then(after); }
      });
    } else if (key === 'disburse') {
      SP.openDisburseForm(p.id, function () { SP.route(); });
    } else if (key === 'report') {
      SP.openReportForm(p, null, function () { SP.route(); });
    } else if (key === 'start') {
      ui.confirm('เปลี่ยนสถานะโครงการ ' + p.code + ' เป็น "กำลังดำเนินการ" เพื่อเริ่มรายงานความก้าวหน้า', { okText: 'เริ่มดำเนินการ', icon: 'bi-play-circle' }).then(function (y) {
        if (y) return SP.api('apiStartProject', p.id).then(after);
      }).catch(fail);
    } else if (key === 'complete') {
      var full = p.progress >= 100;
      noteForm('ปิดโครงการ ' + p.code, full ? 'สรุปผลการดำเนินงาน (ถ้ามี)' : 'เหตุผลที่ปิดโครงการ (ความก้าวหน้ายังไม่ถึง 100%)', !full, 'ปิดโครงการ', function (d) {
        return SP.api('apiCompleteProject', p.id, d.note).then(after);
      }, full ? '' : '<div class="col-12"><div class="alert alert-warning mb-0"><i class="bi bi-exclamation-triangle">\x3c/i><div>ความก้าวหน้าปัจจุบัน ' + p.progress + '%\x3c/div>\x3c/div>\x3c/div>');
    } else if (key === 'cancel') {
      noteForm('ยกเลิกโครงการ ' + p.code, 'เหตุผลที่ยกเลิก', true, 'ยกเลิกโครงการ', function (d) {
        return SP.api('apiCancelProject', p.id, d.note).then(after);
      });
    } else if (key === 'del') {
      ui.confirm('ลบโครงการ ' + p.code + ' และกิจกรรมทั้งหมด', { danger: true, okText: 'ลบโครงการ' }).then(function (y) {
        if (y) return SP.api('apiDeleteProject', p.id).then(function (x) { SP.toast(x.message); SP.go('projects'); });
      }).catch(fail);
    }
  }

  /* ---------- activity form ---------- */
  function openActivityForm(p, a) {
    var others = p.activities.filter(function (x) { return !a || x.id !== a.id; });
    var wLeft = Math.round((100 - others.reduce(function (s, x) { return s + x.weight; }, 0)) * 10) / 10;
    var bLeft = p.budget_cap - others.reduce(function (s, x) { return s + x.budget; }, 0);
    a = a || {};
    ui.openForm({
      title: a.id ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรม', size: 'lg', saveText: 'บันทึกกิจกรรม',
      body: '<div class="row g-3">' +
        ui.field('seq', 'ลำดับ', a.seq || (others.length + 1), { type: 'number', min: 1, col: 'col-md-2' }) +
        ui.field('name', 'ชื่อกิจกรรม', a.name, { required: true, col: 'col-md-10', maxlength: 300 }) +
        ui.field('output', 'ผลผลิต / ตัวชี้วัดกิจกรรม', a.output, { col: 'col-md-8' }) +
        ui.field('responsible', 'ผู้รับผิดชอบกิจกรรม', a.responsible, { col: 'col-md-4' }) +
        ui.field('start_date', 'วันเริ่ม', a.start_date || p.start_date, { type: 'date', required: true, col: 'col-md-6', attrs: { min: p.start_date, max: p.end_date } }) +
        ui.field('end_date', 'วันสิ้นสุด', a.end_date || p.end_date, { type: 'date', required: true, col: 'col-md-6', attrs: { min: p.start_date, max: p.end_date } }) +
        ui.field('weight', 'น้ำหนัก', a.weight != null ? a.weight : (wLeft > 0 ? wLeft : ''), { type: 'number', min: 0.1, max: Math.max(0.1, wLeft), step: '0.1', required: true, col: 'col-md-6', suffix: '/ 100', help: 'ใส่ได้อีกไม่เกิน ' + wLeft }) +
        ui.field('budget', 'งบประมาณกิจกรรม', a.budget != null ? a.budget : 0, { type: 'number', min: 0, step: '0.01', col: 'col-md-6', suffix: 'บาท', help: 'คงเหลือที่ลงได้ ' + SP.money(Math.max(0, bLeft)) + ' บาท' }) +
        ui.field('note', 'หมายเหตุ', a.note, { type: 'textarea', rows: 2 }) +
        '\x3c/div>',
      onShown: function (form) { form.querySelector('[name=name]').focus(); },
      onSave: function (d) {
        if (a.id) d.id = a.id; else d.project_id = p.id;
        if (d.start_date > d.end_date) throw new Error('วันเริ่มต้องไม่เกินวันสิ้นสุด');
        return SP.api('apiSaveActivity', d).then(function (x) { SP.toast(x.message); SP.route(); });
      }
    });
  }
})();
</script>
