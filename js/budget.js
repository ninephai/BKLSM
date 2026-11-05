/* พัฒนาโดย นายเกียรติอนันต์ สุกทน · Copyright (c) 2026 นายเกียรติอนันต์ สุกทน */
/* ==========================================================
   ProjectOne : js_budget  (ภาพรวมงบ, การจัดสรร, โอนงบ)
   ========================================================== */
(function () {
  'use strict';
  var SP = window.SP, ui = SP.ui, esc = SP.esc;
  var R_VIEW = ['admin', 'executive', 'planner', 'finance', 'dept_head'];
  var R_ALLOC = ['admin', 'planner'];
  var R_REQ = ['admin', 'planner', 'dept_head'];

  SP.MENU.splice(2, 0, { key: 'budget', label: 'งบประมาณ', icon: 'bi-wallet2', color: 'green', roles: R_VIEW, place: 'rail', desc: 'จัดสรรงบ ยอดคงเหลือ และโอนงบ' });
  SP.rid = function () {
    try { return crypto.randomUUID(); } catch (e) { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12); }
  };

  var TABS = [
    { key: 'overview', label: 'ภาพรวม', icon: 'bi-grid-3x3-gap' },
    { key: 'alloc', label: 'การจัดสรร', icon: 'bi-diagram-2' },
    { key: 'transfer', label: 'โอนงบ', icon: 'bi-arrow-left-right' }
  ];
  SP.addSearch([
    { label: 'งบประมาณ: ภาพรวม', desc: 'ยอดจัดสรร อนุมัติ คงเหลือ ตามหน่วยงานและแหล่งงบ', icon: 'bi-grid-3x3-gap', href: '#/budget/overview', roles: R_VIEW },
    { label: 'งบประมาณ: การจัดสรร', desc: 'จัดสรรงบให้หน่วยงาน', icon: 'bi-diagram-2', href: '#/budget/alloc', roles: R_VIEW },
    { label: 'งบประมาณ: โอนงบ', desc: 'ขอโอนและอนุมัติโอนงบ', icon: 'bi-arrow-left-right', href: '#/budget/transfer', roles: R_VIEW }
  ]);

  var TR_ST = { pending: ['รออนุมัติ', 'warning'], applying: ['กำลังปรับยอด', 'info'], approved: ['อนุมัติแล้ว', 'success'], rejected: ['ไม่อนุมัติ', 'danger'], cancelled: ['ยกเลิก', 'mute'] };
  function trPill(s) { var x = TR_ST[s] || [s, 'mute']; return SP.pill(x[0], x[1], true); }
  function remainTone(rem, amt) { return rem < 0 ? 'text-danger' : (amt && rem / amt < 0.1 ? 'text-warning' : ''); }

  SP.pages.budget = function (el, param, seq) {
    var cur = TABS.filter(function (t) { return t.key === param; })[0] || TABS[0];
    var actions = (SP.can(R_ALLOC) ? '<button class="btn btn-primary" type="button" data-bd="alloc"><i class="bi bi-plus-lg me-1">\x3c/i>จัดสรรงบ\x3c/button>' : '') +
      (SP.can(R_REQ) ? '<button class="btn btn-light" type="button" data-bd="transfer"><i class="bi bi-arrow-left-right me-1">\x3c/i>ขอโอนงบ\x3c/button>' : '');
    el.innerHTML = '<div id="bdRoot"><div class="page-head"><div><h1>งบประมาณ\x3c/h1><div class="sub">ปีงบประมาณ ' + esc(SP.fy) + '\x3c/div>\x3c/div><div class="actions">' + actions + '\x3c/div>\x3c/div>' +
      '<ul class="nav nav-pills mb-3">' + TABS.map(function (t) {
        return '<li class="nav-item"><a class="nav-link' + (t.key === cur.key ? ' active' : '') + '" href="#/budget/' + t.key + '"><i class="bi ' + t.icon + ' me-1">\x3c/i>' + t.label + '\x3c/a>\x3c/li>';
      }).join('') + '\x3c/ul><div id="bdBody">\x3c/div>\x3c/div>';
    var root = SP.$('#bdRoot', el), body = SP.$('#bdBody', el);
    var refresh = function () { SP.route(); };
    SP.on(root, 'click', '[data-bd="alloc"]', function () { openAllocForm(null, null, refresh); });
    SP.on(root, 'click', '[data-bd="transfer"]', function () { openTransferForm(null, refresh); });
    return TAB[cur.key](body, seq, refresh);
  };

  var TAB = {};

  /* ---------- ภาพรวม ---------- */
  TAB.overview = function (body, seq, refresh) {
    body.innerHTML = ui.loading();
    return SP.api('apiBudgetOverview', SP.fy).then(function (r) {
      if (!SP.alive(seq)) return;
      var d = r.data, t = d.totals;
      var stats = '<div class="stat-grid">' +
        ui.stat('bi-wallet2', 'primary', SP.moneyShort(t.amount), 'งบจัดสรรรวม', 'บาท') +
        ui.stat('bi-patch-check', 'success', SP.moneyShort(t.approved), 'อนุมัติให้โครงการ', SP.pct(t.approved, t.amount) + '% ของงบจัดสรร') +
        ui.stat('bi-hourglass-split', 'warning', SP.moneyShort(t.pending), 'โครงการรอพิจารณา', 'ยอดที่ขอ') +
        ui.stat('bi-piggy-bank', 'info', SP.moneyShort(t.remaining), 'คงเหลือจัดสรรได้', SP.pct(t.remaining, t.amount) + '%') +
        '\x3c/div>';

      var alerts = '';
      if (d.pending_transfers) alerts += '<div class="alert alert-warning"><i class="bi bi-arrow-left-right">\x3c/i><div>มีคำขอโอนงบรออนุมัติ <b>' + d.pending_transfers + '\x3c/b> รายการ <a href="#/budget/transfer" class="fw-600">ดูคำขอ\x3c/a>\x3c/div>\x3c/div>';
      if (d.unallocated.length) {
        alerts += '<div class="alert alert-light"><i class="bi bi-info-circle">\x3c/i><div><b>โครงการที่ยังไม่มีงบจัดสรรรองรับ\x3c/b>' + (d.require_allocation ? ' (ต้องจัดสรรก่อนจึงอนุมัติได้)' : '') +
          '<ul class="mb-0 mt-1 ps-3">' + d.unallocated.map(function (x) {
            return '<li>' + esc(x.dept_name) + ' · ' + esc(x.source_name) + ': ' + (x.approved ? 'อนุมัติแล้ว ' + SP.money(x.approved, 0) + ' บาท ' : '') + (x.pending ? 'รอพิจารณา ' + SP.money(x.pending, 0) + ' บาท' : '') + '\x3c/li>';
          }).join('') + '\x3c/ul>\x3c/div>\x3c/div>';
      }

      var matrix;
      if (!d.rows.length) {
        matrix = '<div class="card"><div class="card-body">' + ui.empty('bi-wallet2', 'ยังไม่มีการจัดสรรงบในปีงบประมาณ ' + d.fy, 'จัดสรรงบให้หน่วยงานตามแหล่งงบ เพื่อใช้ตรวจยอดตอนอนุมัติโครงการ',
          SP.can(R_ALLOC) ? '<button class="btn btn-primary btn-sm" type="button" data-bd="alloc"><i class="bi bi-plus-lg me-1">\x3c/i>จัดสรรงบ\x3c/button>' : '') + '\x3c/div>\x3c/div>';
      } else {
        var srcs = d.sources.filter(function (s) { return d.source_totals[s.id]; });
        var cell = function (c, deptId, srcId) {
          if (!c) return '<td class="text-center">' + (SP.can(R_ALLOC) ? '<button class="btn btn-sm btn-light text-muted" type="button" data-cell-new="' + esc(deptId) + '|' + esc(srcId) + '" title="จัดสรร"><i class="bi bi-plus">\x3c/i>\x3c/button>' : '<span class="text-muted">-\x3c/span>') + '\x3c/td>';
          var used = SP.pct(c.approved, c.amount);
          return '<td><button class="cell-btn" type="button" data-cell="' + esc(c.id) + '">' +
            '<div class="num fw-bold ' + remainTone(c.remaining, c.amount) + '">' + SP.money(c.remaining, 0) + '\x3c/div>' +
            '<div class="small-xs text-muted">คงเหลือ จาก ' + SP.money(c.amount, 0) + '\x3c/div>' +
            '<div class="progress mt-1" style="height:5px"><div class="progress-bar" style="width:' + Math.min(100, used) + '%">\x3c/div>\x3c/div>' +
            (c.pending ? '<div class="small-xs text-warning mt-1">รอพิจารณา ' + SP.money(c.pending, 0) + '\x3c/div>' : '') + '\x3c/button>\x3c/td>';
        };
        matrix = '<div class="card"><div class="card-header"><i class="bi bi-grid-3x3-gap text-primary">\x3c/i>งบคงเหลือ ตามหน่วยงาน x แหล่งงบ<span class="ms-auto small text-muted fw-normal">คลิกช่องเพื่อดูรายละเอียด\x3c/span>\x3c/div>' +
          '<div class="table-wrap"><table class="table budget-matrix"><thead><tr><th>หน่วยงาน\x3c/th>' + srcs.map(function (s) { return '<th class="text-end">' + esc(s.name) + '\x3c/th>'; }).join('') + '<th class="text-end">รวม\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
          d.rows.map(function (row) {
            return '<tr><td class="fw-600">' + esc(row.dept_name) + '\x3c/td>' + srcs.map(function (s) { return cell(row.cells[s.id], row.dept_id, s.id); }).join('') +
              '<td class="text-end"><div class="num fw-bold">' + SP.money(row.total.remaining, 0) + '\x3c/div><div class="small-xs text-muted">จาก ' + SP.money(row.total.amount, 0) + '\x3c/div>\x3c/td>\x3c/tr>';
          }).join('') + '\x3c/tbody><tfoot><tr class="fw-bold"><td>รวมทั้งหมด\x3c/td>' + srcs.map(function (s) {
            var x = d.source_totals[s.id];
            return '<td class="text-end"><div class="num">' + SP.money(x.remaining, 0) + '\x3c/div><div class="small-xs text-muted fw-normal">จาก ' + SP.money(x.amount, 0) + '\x3c/div>\x3c/td>';
          }).join('') + '<td class="text-end"><div class="num">' + SP.money(t.remaining, 0) + '\x3c/div><div class="small-xs text-muted fw-normal">จาก ' + SP.money(t.amount, 0) + '\x3c/div>\x3c/td>\x3c/tr>\x3c/tfoot>\x3c/table>\x3c/div>\x3c/div>';
      }

      body.innerHTML = stats + alerts + matrix;
      SP.on(body, 'click', '[data-cell]', function (e, b) { openAllocDetail(b.dataset.cell, refresh); });
      SP.on(body, 'click', '[data-cell-new]', function (e, b) { var x = b.dataset.cellNew.split('|'); openAllocForm(null, { dept_id: x[0], source_id: x[1] }, refresh); });
      SP.on(body, 'click', '[data-bd="alloc"]', function () { openAllocForm(null, null, refresh); });
    });
  };

  /* ---------- การจัดสรร ---------- */
  TAB.alloc = function (body, seq, refresh) {
    var lk = SP.lookups, all = SP.user.role !== 'dept_head';
    var opt = function (arr) { return arr.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + '\x3c/option>'; }).join(''); };
    var canEdit = SP.can(R_ALLOC);
    SP.listView({
      el: body, api: 'apiListAllocations', filters: { fiscal_year: SP.fy }, searchPh: 'ค้นหาหน่วยงาน แหล่งงบ',
      toolbar: (all ? '<select class="form-select form-select-sm w-auto" data-filter="dept_id"><option value="">ทุกหน่วยงาน\x3c/option>' + opt(lk.departments || []) + '\x3c/select>' : '') +
        '<select class="form-select form-select-sm w-auto" data-filter="source_id"><option value="">ทุกแหล่งงบ\x3c/option>' + opt(lk.sources || []) + '\x3c/select>',
      actions: canEdit ? '<button class="btn btn-primary btn-sm" type="button" data-act="add"><i class="bi bi-plus-lg me-1">\x3c/i>จัดสรรงบ\x3c/button>' : '',
      empty: { icon: 'bi-diagram-2', title: 'ยังไม่มีการจัดสรรงบ', desc: canEdit ? 'กด "จัดสรรงบ" เพื่อกำหนดวงเงินให้หน่วยงาน' : '' },
      columns: [
        { label: 'หน่วยงาน', render: function (r) { return '<div class="cell-2"><div class="t1">' + esc(r.dept_name) + '\x3c/div><div class="t2">' + esc(r.source_name) + '\x3c/div>\x3c/div>'; } },
        { label: 'ยอดจัดสรร', cls: 'text-end num fw-600', render: function (r) { return SP.money(r.amount); } },
        { label: 'อนุมัติให้โครงการ', cls: 'text-end num', render: function (r) { return SP.money(r.approved) + '<div class="small-xs text-muted">' + r.projects + ' โครงการ\x3c/div>'; } },
        { label: 'รอพิจารณา', cls: 'text-end num text-muted', render: function (r) { return r.pending ? SP.money(r.pending) : '-'; } },
        { label: 'คงเหลือ', cls: 'text-end num', render: function (r) {
          return '<div class="fw-bold ' + remainTone(r.remaining, r.amount) + '">' + SP.money(r.remaining) + '\x3c/div>' + (r.pending_out ? '<div class="small-xs text-warning">รอโอนออก ' + SP.money(r.pending_out) + '\x3c/div>' : '');
        } },
        { label: 'ใช้ไป', render: function (r) { var p = SP.pct(r.approved, r.amount); return '<div class="mini-bar"><div class="progress"><div class="progress-bar" style="width:' + Math.min(100, p) + '%">\x3c/div>\x3c/div><span class="small num">' + p + '%\x3c/span>\x3c/div>'; } },
        { label: '', cls: 'text-end', render: function () {
          return '<div class="d-flex gap-1 justify-content-end"><button class="btn btn-light btn-icon btn-sm" type="button" data-act="view" title="รายละเอียด"><i class="bi bi-eye">\x3c/i>\x3c/button>' +
            (canEdit ? '<button class="btn btn-light btn-icon btn-sm" type="button" data-act="edit" title="ปรับยอด"><i class="bi bi-pencil">\x3c/i>\x3c/button><button class="btn btn-ghost-danger btn-icon btn-sm" type="button" data-act="del" title="ลบ"><i class="bi bi-trash3">\x3c/i>\x3c/button>' : '') + '\x3c/div>';
        } }
      ],
      onAction: function (act, row, ctrl) {
        var reload = function () { ctrl.reload(); };
        if (act === 'add') openAllocForm(null, null, reload);
        if (act === 'edit') openAllocForm(row, null, reload);
        if (act === 'view') openAllocDetail(row.id, reload);
        if (act === 'del') {
          ui.confirm('ลบการจัดสรร ' + row.dept_name + ' · ' + row.source_name, { danger: true, okText: 'ลบ' }).then(function (y) {
            if (y) return SP.api('apiDeleteAllocation', row.id).then(function (x) { SP.toast(x.message); reload(); });
          }).catch(function (err) { SP.toast(err.message, 'error'); });
        }
      }
    });
  };

  function openAllocForm(row, preset, done) {
    var lk = SP.lookups, isNew = !row;
    preset = preset || {};
    var depts = (lk.departments || []).map(function (d) { return { value: d.id, label: d.name, sub: d.code }; });
    var srcs = (lk.sources || []).map(function (s) { return { value: s.id, label: s.name, sub: s.type === 'out' ? 'นอกงบประมาณ' : 'ในงบประมาณ' }; });
    var rid = SP.rid();
    var floor = row ? row.approved + row.pending_out : 0;
    ui.openForm({
      title: isNew ? 'จัดสรรงบประมาณ ปี ' + SP.fy : 'ปรับยอดจัดสรร', saveText: 'บันทึก',
      body: '<div class="row g-3">' +
        (isNew
          ? ui.comboField('dept_id', 'หน่วยงาน', depts, preset.dept_id, { required: true, allowEmpty: false }) +
            ui.comboField('source_id', 'แหล่งงบประมาณ', srcs, preset.source_id, { required: true, allowEmpty: false })
          : '<div class="col-12"><div class="alert alert-light mb-0"><i class="bi bi-diagram-2">\x3c/i><div><b>' + esc(row.dept_name) + '\x3c/b> · ' + esc(row.source_name) +
            '<div class="small">อนุมัติให้โครงการแล้ว ' + SP.money(row.approved) + ' บาท' + (row.pending_out ? ' · รอโอนออก ' + SP.money(row.pending_out) : '') + '\x3c/div>\x3c/div>\x3c/div>\x3c/div>') +
        ui.field('amount', 'ยอดจัดสรร', row ? row.amount : '', { type: 'number', min: isNew ? 0.01 : floor, step: '0.01', required: true, suffix: 'บาท', help: row ? 'ปรับได้ไม่ต่ำกว่า ' + SP.money(floor) + ' บาท' : '' }) +
        ui.field('note', isNew ? 'หมายเหตุ' : 'เหตุผลที่ปรับยอด', row ? row.note : '', { type: 'textarea', rows: 2 }) +
        '\x3c/div>',
      onSave: function (d) {
        var payload = { amount: d.amount, note: d.note, request_id: rid };
        if (row) { payload.id = row.id; payload.expected_version = row.version; }
        else { payload.fiscal_year = SP.fy; payload.dept_id = d.dept_id; payload.source_id = d.source_id; }
        return SP.api('apiSaveAllocation', payload).then(function (x) { SP.toast(x.message); if (done) done(); });
      }
    });
  }

  var ALLOC_H = { create: 'จัดสรรครั้งแรก', adjust: 'ปรับยอด', transfer_in: 'รับโอน', transfer_out: 'โอนออก' };
  function openAllocDetail(id, done) {
    ui.openForm({ title: 'รายละเอียดการจัดสรร', size: 'lg', hideSave: true, body: ui.loading() });
    SP.api('apiGetAllocation', id).then(function (r) {
      var a = r.data;
      var html = '<div class="d-flex justify-content-between flex-wrap gap-2 mb-3"><div><div class="fw-bold fs-5">' + esc(a.dept_name) + '\x3c/div><div class="text-muted">' + esc(a.source_name) + ' · ปีงบประมาณ ' + esc(a.fiscal_year) + '\x3c/div>\x3c/div>' +
        (SP.can(R_ALLOC) ? '<button class="btn btn-soft btn-sm align-self-start" type="button" id="adEdit"><i class="bi bi-pencil me-1">\x3c/i>ปรับยอด\x3c/button>' : '') + '\x3c/div>' +
        '<div class="row g-2 mb-3">' + [['ยอดจัดสรร', a.amount, ''], ['อนุมัติให้โครงการ', a.approved, 'text-success'], ['รอโอนออก', a.pending_out, 'text-warning'], ['ใช้ได้อีก', a.available, remainTone(a.available, a.amount)]].map(function (x) {
          return '<div class="col-6 col-md-3"><div class="p-2 rounded-3" style="background:#fafbfc"><div class="small text-muted">' + x[0] + '\x3c/div><div class="fw-bold num ' + x[2] + '">' + SP.money(x[1], 0) + '\x3c/div>\x3c/div>\x3c/div>';
        }).join('') + '\x3c/div>' +
        '<h6 class="fw-bold">โครงการที่ใช้งบนี้\x3c/h6>' +
        (a.projects_list.length ? '<div class="table-wrap mb-3"><table class="table table-sm"><thead><tr><th>โครงการ\x3c/th><th>สถานะ\x3c/th><th class="text-end">งบ (บาท)\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
          a.projects_list.map(function (p) {
            var s = SP.PROJECT_STATUS[p.status] || { label: p.status, tone: 'mute' };
            return '<tr><td><a href="#/projects/' + esc(p.id) + '" data-close-modal class="text-reset"><span class="text-muted small">' + esc(p.code) + '\x3c/span> ' + esc(p.name) + '\x3c/a>\x3c/td><td>' + SP.pill(s.label, s.tone) + '\x3c/td><td class="text-end num">' + SP.money(p.status === 'submitted' ? p.budget_request : p.budget_approved, 0) + '\x3c/td>\x3c/tr>';
          }).join('') + '\x3c/tbody>\x3c/table>\x3c/div>' : '<div class="text-muted small mb-3">ยังไม่มีโครงการ\x3c/div>') +
        '<h6 class="fw-bold">ประวัติยอดจัดสรร\x3c/h6><div class="timeline">' + (a.history || []).map(function (h) {
          return '<div class="tl-item"><span class="tl-dot">\x3c/span><div class="small fw-600">' + esc(ALLOC_H[h.action] || h.action) + ' ' + SP.money(h.from, 0) + ' > ' + SP.money(h.to, 0) + '\x3c/div><div class="small-xs text-muted">' + esc(h.by_name) + ' · ' + esc(SP.fmtDate(h.at, true)) + '\x3c/div>' + (h.note ? '<div class="small">' + esc(h.note) + '\x3c/div>' : '') + '\x3c/div>';
        }).join('') + '\x3c/div>';
      SP.$('#spModalBody').innerHTML = html;
      var e = SP.$('#adEdit'); if (e) e.onclick = function () { ui.closeForm(); setTimeout(function () { openAllocForm(a, null, done); }, 350); };
      SP.$$('[data-close-modal]', SP.$('#spModalBody')).forEach(function (x) { x.addEventListener('click', function () { ui.closeForm(); }); });
    }).catch(function (err) { SP.$('#spModalBody').innerHTML = ui.errorBox(err.message); });
  }

  /* ---------- โอนงบ ---------- */
  TAB.transfer = function (body, seq, refresh) {
    var canReq = SP.can(R_REQ);
    SP.listView({
      el: body, api: 'apiListTransfers', filters: { fiscal_year: SP.fy }, searchPh: 'ค้นหาหน่วยงาน เหตุผล',
      toolbar: '<select class="form-select form-select-sm w-auto" data-filter="status"><option value="">ทุกสถานะ\x3c/option>' + Object.keys(TR_ST).filter(function (k) { return k !== 'applying'; }).map(function (k) { return '<option value="' + k + '">' + TR_ST[k][0] + '\x3c/option>'; }).join('') + '\x3c/select>',
      actions: canReq ? '<button class="btn btn-primary btn-sm" type="button" data-act="add"><i class="bi bi-arrow-left-right me-1">\x3c/i>ขอโอนงบ\x3c/button>' : '',
      empty: { icon: 'bi-arrow-left-right', title: 'ยังไม่มีการโอนงบ', desc: 'ใช้เมื่อต้องการย้ายวงเงินระหว่างหน่วยงานหรือแหล่งงบ' },
      columns: [
        { label: 'วันที่ขอ', cls: 'small text-nowrap', render: function (r) { return esc(SP.fmtDate(r.created_at, true)) + '<div class="text-muted">' + esc(r.requested_by_name) + '\x3c/div>'; } },
        { label: 'จาก', render: function (r) { return '<div class="cell-2"><div class="t1">' + esc(r.from_dept) + '\x3c/div><div class="t2">' + esc(r.from_source) + '\x3c/div>\x3c/div>'; } },
        { label: '', cls: 'text-muted', render: function () { return '<i class="bi bi-arrow-right">\x3c/i>'; } },
        { label: 'ไป', render: function (r) { return '<div class="cell-2"><div class="t1">' + esc(r.to_dept) + '\x3c/div><div class="t2">' + esc(r.to_source) + '\x3c/div>\x3c/div>'; } },
        { label: 'จำนวน (บาท)', cls: 'text-end num fw-bold', render: function (r) { return SP.money(r.amount); } },
        { label: 'เหตุผล', cls: 'small', render: function (r) { return esc(r.reason) + (r.decision_note ? '<div class="text-muted">ผล: ' + esc(r.decision_note) + '\x3c/div>' : ''); } },
        { label: 'สถานะ', render: function (r) { return trPill(r.status) + (r.decided_by_name && r.status !== 'pending' ? '<div class="small-xs text-muted mt-1">' + esc(r.decided_by_name) + '\x3c/div>' : ''); } },
        { label: '', cls: 'text-end text-nowrap', render: function (r) {
          return (r.can_decide ? '<button class="btn btn-primary btn-sm me-1" type="button" data-act="approve">อนุมัติ\x3c/button><button class="btn btn-light btn-sm" type="button" data-act="reject">ไม่อนุมัติ\x3c/button>' : '') +
            (r.can_cancel && !r.can_decide ? '<button class="btn btn-ghost-danger btn-sm" type="button" data-act="cancel">ยกเลิก\x3c/button>' : '');
        } }
      ],
      onAction: function (act, row, ctrl) {
        var reload = function () { ctrl.reload(); };
        if (act === 'add') openTransferForm(null, reload);
        if (act === 'approve') {
          var rid = SP.rid();
          ui.openForm({
            title: 'อนุมัติโอนงบ', saveText: 'อนุมัติ',
            body: '<div class="row g-3"><div class="col-12"><div class="alert alert-light mb-0"><i class="bi bi-arrow-left-right">\x3c/i><div>โอน <b>' + SP.money(row.amount) + '\x3c/b> บาท<div class="small">จาก ' + esc(row.from_dept) + ' · ' + esc(row.from_source) + '<br>ไป ' + esc(row.to_dept) + ' · ' + esc(row.to_source) + '\x3c/div><div class="small text-muted mt-1">' + esc(row.reason) + '\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +
              ui.field('note', 'ความเห็น (ถ้ามี)', '', { type: 'textarea', rows: 2 }) + '\x3c/div>',
            onSave: function (d) { return SP.api('apiApproveTransfer', row.id, d.note, rid).then(function (x) { SP.toast(x.message); reload(); }); }
          });
        }
        if (act === 'reject') {
          ui.openForm({
            title: 'ไม่อนุมัติการโอนงบ', saveText: 'ยืนยัน',
            body: '<div class="row g-3">' + ui.field('note', 'เหตุผล', '', { type: 'textarea', rows: 3, required: true }) + '\x3c/div>',
            onSave: function (d) { return SP.api('apiRejectTransfer', row.id, d.note).then(function (x) { SP.toast(x.message); reload(); }); }
          });
        }
        if (act === 'cancel') {
          ui.confirm('ยกเลิกคำขอโอนงบ ' + SP.money(row.amount) + ' บาท', { danger: true, okText: 'ยกเลิกคำขอ' }).then(function (y) {
            if (y) return SP.api('apiCancelTransfer', row.id).then(function (x) { SP.toast(x.message); reload(); });
          }).catch(function (err) { SP.toast(err.message, 'error'); });
        }
      }
    });
  };

  function openTransferForm(_, done) {
    ui.openForm({ title: 'ขอโอนงบประมาณ', hideSave: true, body: ui.loading('กำลังโหลดรายการจัดสรร...') });
    SP.api('apiListAllocations', { size: 200, filters: { fiscal_year: SP.fy } }).then(function (r) {
      var rows = r.data.rows.filter(function (a) { return a.available > 0; });
      if (!rows.length) {
        SP.$('#spModalBody').innerHTML = ui.empty('bi-wallet2', 'ไม่มีงบคงเหลือที่โอนได้', 'ต้องมีการจัดสรรที่ยังมียอดคงเหลือในปีงบประมาณ ' + SP.fy);
        return;
      }
      var lk = SP.lookups, rid = SP.rid();
      var fromOpts = rows.map(function (a) { return { value: a.id, label: a.dept_name + ' · ' + a.source_name, sub: 'โอนได้ ' + SP.money(a.available) + ' บาท' }; });
      var depts = (lk.departments || []).map(function (d) { return { value: d.id, label: d.name, sub: d.code }; });
      var srcs = (lk.sources || []).map(function (s) { return { value: s.id, label: s.name }; });
      ui.openForm({
        title: 'ขอโอนงบประมาณ', saveText: 'ส่งคำขอ',
        body: '<div class="row g-3">' +
          ui.comboField('from_alloc_id', 'โอนจาก', fromOpts, rows.length === 1 ? rows[0].id : '', { required: true, allowEmpty: false }) +
          ui.comboField('to_dept_id', 'ไปยังหน่วยงาน', depts, '', { required: true, col: 'col-md-6', allowEmpty: false }) +
          ui.comboField('to_source_id', 'แหล่งงบปลายทาง', srcs, '', { required: true, col: 'col-md-6', allowEmpty: false, help: 'ปกติเป็นแหล่งงบเดียวกับต้นทาง' }) +
          ui.field('amount', 'จำนวนเงินที่โอน', '', { type: 'number', min: 0.01, step: '0.01', required: true, suffix: 'บาท', help: 'ระบบตรวจยอดคงเหลืออีกครั้งตอนอนุมัติ' }) +
          ui.field('reason', 'เหตุผลการโอน', '', { type: 'textarea', rows: 3, required: true }) +
          '<div class="col-12"><div class="small text-muted"><i class="bi bi-info-circle me-1">\x3c/i>ยอดที่ขอโอนจะถูกกันไว้จากต้นทางระหว่างรออนุมัติ\x3c/div>\x3c/div>\x3c/div>',
        onShown: function (form) {
          var from = form.querySelector('[name=from_alloc_id]'), toS = form.querySelector('[name=to_source_id]');
          var sync = function () {
            var a = rows.filter(function (x) { return x.id === from.value; })[0];
            if (a && !toS.value) {
              toS.value = a.source_id;
              toS.parentNode.querySelector('.combo-input').value = a.source_name;
            }
          };
          from.addEventListener('change', sync); sync();
        },
        onSave: function (d) {
          d.request_id = rid;
          return SP.api('apiRequestTransfer', d).then(function (x) { SP.toast(x.message); if (done) done(); });
        }
      });
    }).catch(function (err) { SP.$('#spModalBody').innerHTML = ui.errorBox(err.message); });
  }
})();

/* ==========================================================
   เบิกจ่าย (ขอเบิก > หัวหน้าตรวจ > การเงินตรวจ > จ่าย)
   ========================================================== */
(function () {
  'use strict';
  var SP = window.SP, ui = SP.ui, esc = SP.esc;
  var R_REQ = ['admin', 'planner', 'dept_head', 'staff'];
  var CATS = ['ค่าตอบแทน', 'ค่าใช้สอย', 'ค่าวัสดุ', 'ค่าครุภัณฑ์', 'ค่าสาธารณูปโภค', 'อื่น ๆ'];
  var DST = { pending: ['รอหัวหน้าตรวจ', 'warning'], checked: ['รอการเงินตรวจ', 'info'], approved: ['รอจ่ายเงิน', 'blue'], paid: ['จ่ายแล้ว', 'success'], rejected: ['ไม่อนุมัติ', 'danger'], cancelled: ['ยกเลิก', 'mute'] };
  var DHIST = { request: 'ยื่นขอเบิก', check: 'หัวหน้าหน่วยงานตรวจผ่าน', approve: 'การเงินตรวจสอบผ่าน', pay: 'จ่ายเงินแล้ว', reject: 'ไม่อนุมัติ', cancel: 'ยกเลิกคำขอ' };

  SP.MENU.splice(3, 0, { key: 'disburse', label: 'เบิกจ่าย', icon: 'bi-cash-coin', color: 'teal', roles: null, place: 'rail', mobile: true, desc: 'ขอเบิก ตรวจ อนุมัติ และบันทึกจ่ายเงิน' });
  SP.addSearch([
    { label: 'ขอเบิกเงิน', desc: 'ยื่นคำขอเบิกจากโครงการที่กำลังดำเนินการ', icon: 'bi-cash-coin', href: '#/disburse/new', roles: R_REQ },
    { label: 'เบิกจ่าย: รอฉันดำเนินการ', desc: 'คำขอเบิกที่รอตรวจ/อนุมัติ/จ่าย', icon: 'bi-inbox', href: '#/disburse', roles: null }
  ]);

  function dPill(s) { var x = DST[s] || [s, 'mute']; return SP.pill(x[0], x[1], true); }
  ui.disbSteps = function (st) {
    if (st === 'rejected' || st === 'cancelled') return dPill(st);
    var idx = ['pending', 'checked', 'approved', 'paid'].indexOf(st), labels = ['ยื่น', 'หัวหน้า', 'การเงิน', 'จ่าย'];
    return '<div class="steps" title="' + esc((DST[st] || [st])[0]) + '">' + labels.map(function (l, i) {
      var c = i <= idx || st === 'paid' ? 'done' : (i === idx + 1 ? 'cur' : '');
      return (i ? '<span class="st-line ' + (i <= idx || st === 'paid' ? 'done' : '') + '">\x3c/span>' : '') + '<span class="st-dot ' + c + '"><span>' + l + '\x3c/span>\x3c/span>';
    }).join('') + '\x3c/div><div class="small-xs text-muted mt-1">' + esc((DST[st] || [st])[0]) + '\x3c/div>';
  };
  function actButtons(r) {
    var p = r.perm || {}, h = '';
    if (p.check) h += '<button class="btn btn-primary btn-sm" type="button" data-act="check">ตรวจผ่าน\x3c/button>';
    if (p.approve) h += '<button class="btn btn-primary btn-sm" type="button" data-act="approve">ตรวจสอบผ่าน\x3c/button>';
    if (p.pay) h += '<button class="btn btn-primary btn-sm" type="button" data-act="pay"><i class="bi bi-cash me-1">\x3c/i>บันทึกจ่าย\x3c/button>';
    if (p.reject) h += '<button class="btn btn-light btn-sm" type="button" data-act="reject">ไม่อนุมัติ\x3c/button>';
    if (p.cancel && !p.check) h += '<button class="btn btn-ghost-danger btn-sm" type="button" data-act="cancel">ยกเลิก\x3c/button>';
    return h;
  }

  /** ทำรายการตามขั้นตอน */
  SP.disbAction = function (act, r, done) {
    var after = function (x) { SP.toast(x.message); SP.refreshBadges(true); if (done) done(); };
    var head = '<div class="col-12"><div class="alert alert-light mb-0"><i class="bi bi-receipt">\x3c/i><div><b>' + esc(r.doc_no) + '\x3c/b> ' + esc(r.title) +
      '<div class="small">' + esc(r.project_code) + ' ' + esc(r.project_name) + ' · ' + esc(r.requested_by_name) + '\x3c/div><div class="fw-bold mt-1">' + SP.money(r.amount) + ' บาท\x3c/div>\x3c/div>\x3c/div>\x3c/div>';
    var noteForm = function (title, label, req, btn, fn) {
      ui.openForm({ title: title, saveText: btn, body: '<div class="row g-3">' + head + ui.field('note', label, '', { type: 'textarea', rows: 2, required: req }) + '\x3c/div>', onSave: fn });
    };
    if (act === 'view') return SP.openDisbDetail(r.id, done);
    if (act === 'check') noteForm('ตรวจคำขอเบิก', 'ความเห็นหัวหน้าหน่วยงาน (ถ้ามี)', false, 'ตรวจผ่าน', function (d) { return SP.api('apiCheckDisbursement', r.id, d.note).then(after); });
    if (act === 'approve') noteForm('การเงินตรวจสอบเอกสาร', 'บันทึกการตรวจสอบ (ถ้ามี)', false, 'ตรวจสอบผ่าน', function (d) { return SP.api('apiApproveDisbursement', r.id, d.note).then(after); });
    if (act === 'reject') noteForm('ไม่อนุมัติคำขอเบิก', 'เหตุผล', true, 'ไม่อนุมัติ', function (d) { return SP.api('apiRejectDisbursement', r.id, d.note).then(after); });
    if (act === 'cancel') noteForm('ยกเลิกคำขอเบิก', 'เหตุผล (ถ้ามี)', false, 'ยกเลิกคำขอ', function (d) { return SP.api('apiCancelDisbursement', r.id, d.note).then(after); });
    if (act === 'pay') {
      var rid = SP.rid();
      ui.openForm({
        title: 'บันทึกการจ่ายเงิน', saveText: 'บันทึกจ่าย',
        body: '<div class="row g-3">' + head +
          ui.field('paid_date', 'วันที่จ่าย', SP.today(), { type: 'date', required: true, col: 'col-md-6', attrs: { max: SP.today() } }) +
          ui.field('voucher_no', 'เลขที่ใบสำคัญจ่าย / เช็ค', '', { col: 'col-md-6' }) +
          ui.field('paid_amount', 'จำนวนเงินที่จ่ายจริง', r.amount, { type: 'number', min: 0.01, max: r.amount, step: '0.01', required: true, suffix: 'บาท', help: 'จ่ายน้อยกว่าที่ขอ ส่วนต่างคืนเข้างบโครงการอัตโนมัติ' }) +
          ui.field('note', 'หมายเหตุ', '', { type: 'textarea', rows: 2 }) + '\x3c/div>',
        onSave: function (d) { d.request_id = rid; return SP.api('apiPayDisbursement', r.id, d).then(after); }
      });
    }
  };

  /* ---------- รายละเอียด ---------- */
  SP.openDisbDetail = function (id, done) {
    ui.openForm({ title: 'รายละเอียดคำขอเบิก', size: 'lg', hideSave: true, body: ui.loading() });
    SP.api('apiGetDisbursement', id).then(function (res) {
      var r = res.data, f = r.finance;
      var info = function (l, v) { return '<div><div class="ig-l">' + esc(l) + '\x3c/div><div class="ig-v">' + (v || '<span class="text-muted fw-normal">-\x3c/span>') + '\x3c/div>\x3c/div>'; };
      var html = '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3"><div><div class="text-muted small">' + esc(r.doc_no) + '\x3c/div><div class="fw-bold fs-5">' + esc(r.title) + '\x3c/div>\x3c/div>' +
        '<div class="text-end"><div class="fw-bold fs-4 num">' + SP.money(r.status === 'paid' ? r.paid_amount : r.amount) + '\x3c/div><div class="small text-muted">บาท\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="d-flex justify-content-between align-items-start gap-2 mb-3"><div class="flex-fill">' + ui.disbSteps(r.status) + '\x3c/div><button class="btn btn-light btn-sm" type="button" id="ddPrint"><i class="bi bi-printer me-1">\x3c/i>พิมพ์ใบขอเบิก\x3c/button>\x3c/div>' +
        '<div class="info-grid mb-3">' +
        info('โครงการ', '<a href="#/projects/' + esc(r.project_id) + '" data-close-modal>' + esc(r.project_code) + ' ' + esc(r.project_name) + '\x3c/a>') +
        info('กิจกรรม', esc(r.activity_name)) + info('ประเภทค่าใช้จ่าย', esc(r.category)) + info('ผู้รับเงิน', esc(r.payee)) +
        info('ผู้ขอเบิก', esc(r.requested_by_name) + ' · ' + esc(r.dept_name)) + info('วันที่ขอ / ต้องการใช้', esc(SP.fmtDate(r.request_date)) + (r.needed_date ? ' / ' + esc(SP.fmtDate(r.needed_date)) : '')) +
        (r.status === 'paid' ? info('จ่ายเมื่อ', esc(SP.fmtDate(r.paid_date)) + (r.voucher_no ? ' · เลขที่ ' + esc(r.voucher_no) : '')) + info('ยอดขอ / จ่ายจริง', SP.money(r.amount) + ' / ' + SP.money(r.paid_amount)) : '') +
        '\x3c/div>' + (r.note ? '<div class="small mb-3"><b>หมายเหตุ\x3c/b> ' + esc(r.note) + '\x3c/div>' : '') +
        (r.attachments.length ? '<h6 class="fw-bold">เอกสารประกอบ\x3c/h6><div class="att-grid mb-3">' + r.attachments.map(function (a) {
          return a.thumb ? '<a href="' + esc(a.url) + '" target="_blank" rel="noopener"><img class="att-thumb" src="' + esc(a.thumb) + '" alt="' + esc(a.name) + '">\x3c/a>' : '<a class="att-chip" href="' + esc(a.url) + '" target="_blank" rel="noopener"><i class="bi bi-file-earmark">\x3c/i><span class="text-truncate">' + esc(a.name) + '\x3c/span>\x3c/a>';
        }).join('') + '\x3c/div>' : '') +
        '<h6 class="fw-bold">งบโครงการ\x3c/h6>' + ui.bar('เบิกจ่ายแล้ว', SP.money(f.paid, 0) + ' / ' + SP.money(f.approved, 0), SP.pct(f.paid, f.approved), 'ผูกพัน ' + SP.money(f.committed, 0) + ' · คงเหลือ ' + SP.money(f.available, 0) + ' บาท') +
        '<h6 class="fw-bold mt-3">ประวัติ\x3c/h6><div class="timeline">' + r.history.map(function (h) {
          return '<div class="tl-item"><span class="tl-dot">\x3c/span><div class="small fw-600">' + esc(DHIST[h.action] || h.action) + '\x3c/div><div class="small-xs text-muted">' + esc(h.by_name) + ' · ' + esc(SP.fmtDate(h.at, true)) + '\x3c/div>' + (h.note ? '<div class="small">' + esc(h.note) + '\x3c/div>' : '') + '\x3c/div>';
        }).join('') + '\x3c/div>' +
        (actButtons(r) ? '<div class="d-flex gap-2 flex-wrap justify-content-end mt-3 pt-3 border-top" id="ddActs">' + actButtons(r) + '\x3c/div>' : '');
      var body = SP.$('#spModalBody');
      body.innerHTML = html;
      SP.$$('[data-close-modal]', body).forEach(function (x) { x.addEventListener('click', function () { ui.closeForm(); }); });
      SP.$('#ddPrint', body).onclick = function () { SP.print.disb(r); };
      var acts = SP.$('#ddActs', body);
      if (acts) acts.onclick = function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        ui.closeForm(); setTimeout(function () { SP.disbAction(b.dataset.act, r, done); }, 350);
      };
    }).catch(function (err) { SP.$('#spModalBody').innerHTML = ui.errorBox(err.message); });
  };

  /* ---------- ฟอร์มขอเบิก ---------- */
  SP.openDisburseForm = function (projectId, done) {
    ui.openForm({ title: 'ขอเบิกเงิน', hideSave: true, body: ui.loading('กำลังโหลดโครงการ...') });
    SP.api('apiDisbursableProjects').then(function (res) {
      var projs = res.data;
      if (!projs.length) {
        SP.$('#spModalBody').innerHTML = ui.empty('bi-cash-coin', 'ไม่มีโครงการที่ขอเบิกได้', 'ขอเบิกได้เฉพาะโครงการที่ "กำลังดำเนินการ" และคุณเป็นผู้รับผิดชอบหรือหัวหน้าหน่วยงาน');
        return;
      }
      var rid = SP.rid(), up = null;
      var pick = projs.filter(function (p) { return p.id === projectId; })[0] || (projs.length === 1 ? projs[0] : null);
      var popts = projs.map(function (p) { return { value: p.id, label: p.code + ' ' + p.name, sub: 'เบิกได้อีก ' + SP.money(p.available) + ' บาท' }; });
      ui.openForm({
        title: 'ขอเบิกเงิน', size: 'lg', saveText: 'ยื่นขอเบิก',
        body: '<div class="row g-3">' +
          ui.comboField('project_id', 'โครงการ', popts, pick ? pick.id : '', { required: true, allowEmpty: false }) +
          '<div class="col-12" id="dfAvail">\x3c/div>' +
          '<div class="col-md-6"><label class="form-label" for="dfAct">กิจกรรม\x3c/label><select class="form-select" name="activity_id" id="dfAct">\x3c/select>\x3c/div>' +
          ui.selectField('category', 'ประเภทค่าใช้จ่าย', CATS, 'ค่าใช้สอย', { col: 'col-md-6' }) +
          ui.field('title', 'รายการที่ขอเบิก', '', { required: true, maxlength: 300, placeholder: 'เช่น ค่าอาหารว่างผู้เข้าอบรม 50 คน' }) +
          ui.field('amount', 'จำนวนเงิน', '', { type: 'number', min: 0.01, step: '0.01', required: true, col: 'col-md-6', suffix: 'บาท' }) +
          ui.field('payee', 'ผู้รับเงิน / ร้านค้า', '', { col: 'col-md-6' }) +
          ui.field('needed_date', 'วันที่ต้องการใช้เงิน', '', { type: 'date', col: 'col-md-6', attrs: { min: SP.today() } }) +
          ui.field('note', 'หมายเหตุ', '', { type: 'textarea', rows: 2 }) +
          '<div class="col-12"><label class="form-label">เอกสารประกอบ (ใบเสนอราคา ใบเสร็จ ฯลฯ)\x3c/label><div class="upl-list" id="dfFiles">\x3c/div>' +
          '<label class="btn btn-soft btn-sm mb-0"><i class="bi bi-paperclip me-1">\x3c/i>แนบไฟล์<input type="file" id="dfFile" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">\x3c/label>\x3c/div>' +
          '\x3c/div>',
        onShown: function (form) {
          var pSel = form.querySelector('[name=project_id]'), aSel = SP.$('#dfAct', form), amt = form.querySelector('[name=amount]');
          var cur = function () { return projs.filter(function (p) { return p.id === pSel.value; })[0]; };
          var sync = function () {
            var p = cur();
            aSel.innerHTML = '<option value="">ไม่ระบุกิจกรรม\x3c/option>' + (p ? p.activities.map(function (a) {
              return '<option value="' + esc(a.id) + '"' + (a.available <= 0 ? ' disabled' : '') + '>' + esc(a.name) + ' (เหลือ ' + SP.money(a.available, 0) + ')\x3c/option>';
            }).join('') : '');
            SP.$('#dfAvail', form).innerHTML = p ? '<div class="alert alert-light mb-0 py-2"><i class="bi bi-wallet2">\x3c/i><div>งบอนุมัติ ' + SP.money(p.approved) + ' · <b>เบิกได้อีก ' + SP.money(p.available) + ' บาท\x3c/b>\x3c/div>\x3c/div>' : '';
            setMax();
          };
          var setMax = function () {
            var p = cur(); if (!p) return;
            var a = p.activities.filter(function (x) { return x.id === aSel.value; })[0];
            amt.max = Math.max(0.01, a ? Math.min(a.available, p.available) : p.available);
          };
          var lastPid = pSel.value;
          pSel.addEventListener('change', function () {
            if (up && up.count() && pSel.value !== lastPid) { up.discardAll(); SP.toast('เปลี่ยนโครงการแล้ว ไฟล์แนบเดิมถูกนำออก', 'info'); }
            lastPid = pSel.value; sync();
          });
          aSel.addEventListener('change', setMax);
          sync();
          up = ui.attachUploader(SP.$('#dfFiles', form), SP.$('#dfFile', form), function () { return pSel.value; });
        },
        onSave: function (d) {
          if (up && up.busy()) throw new Error('รอให้อัปโหลดไฟล์เสร็จก่อน');
          d.attachments = up ? up.ids() : [];
          d.request_id = rid;
          return SP.api('apiRequestDisbursement', d).then(function (x) { if (up) up.keep(); SP.toast(x.message); SP.refreshBadges(true); if (done) done(); });
        }
      });
    }).catch(function (err) { SP.$('#spModalBody').innerHTML = ui.errorBox(err.message); });
  };

  /* ---------- หน้าเบิกจ่าย ---------- */
  SP.pages.disburse = function (el, param) {
    var approver = SP.can(['admin', 'finance', 'dept_head', 'executive']);
    var queue = approver ? 'todo' : '';
    el.innerHTML = '<div id="dbRoot"><div class="page-head"><div><h1>เบิกจ่าย\x3c/h1><div class="sub">ปีงบประมาณ ' + esc(SP.fy) + '\x3c/div>\x3c/div><div class="actions">' +
      (SP.can(R_REQ) ? '<button class="btn btn-primary" type="button" data-db="new"><i class="bi bi-plus-lg me-1">\x3c/i>ขอเบิก\x3c/button>' : '') + '\x3c/div>\x3c/div>' +
      '<div class="stat-grid" id="dbStats">\x3c/div>' +
      '<ul class="nav nav-pills mb-3" id="dbTabs">' + [['todo', 'รอฉันดำเนินการ'], ['mine', 'คำขอของฉัน'], ['', 'ทั้งหมด']].filter(function (t) { return approver || t[0] !== 'todo'; }).map(function (t) {
        return '<li class="nav-item"><button type="button" class="nav-link' + (t[0] === queue ? ' active' : '') + '" data-q="' + t[0] + '">' + t[1] + '\x3c/button>\x3c/li>';
      }).join('') + '\x3c/ul><div id="dbList">\x3c/div>\x3c/div>';
    var root = SP.$('#dbRoot', el);
    var lv = SP.listView({
      el: SP.$('#dbList', el), api: 'apiListDisbursements', filters: { fiscal_year: SP.fy, queue: queue }, searchPh: 'ค้นหาเลขที่ รายการ โครงการ ผู้รับเงิน',
      toolbar: '<select class="form-select form-select-sm w-auto" data-filter="status"><option value="">ทุกสถานะ\x3c/option>' + Object.keys(DST).map(function (k) { return '<option value="' + k + '">' + DST[k][0] + '\x3c/option>'; }).join('') + '\x3c/select>',
      empty: { icon: 'bi-cash-coin', title: 'ไม่มีรายการ', desc: 'คำขอเบิกที่เกี่ยวข้องกับคุณจะแสดงที่นี่' },
      onLoaded: function (d) {
        var s = d.summary;
        SP.$('#dbStats', el).innerHTML =
          ui.stat('bi-inbox', 'primary', s.todo, 'รอฉันดำเนินการ', '') +
          ui.stat('bi-hourglass-split', 'warning', SP.moneyShort(s.committed), 'ยอดผูกพัน (ค้างในระบบ)', s.pending + ' รายการ') +
          ui.stat('bi-cash-stack', 'success', SP.moneyShort(s.paid), 'จ่ายแล้ว', 'บาท') +
          ui.stat('bi-receipt', 'info', s.count, 'คำขอทั้งหมด', 'ปีงบ ' + esc(SP.fy));
      },
      columns: [
        { label: 'เลขที่', cls: 'small text-nowrap', render: function (r) { return '<div class="fw-600">' + esc(r.doc_no) + '\x3c/div><div class="text-muted">' + esc(SP.fmtDate(r.request_date)) + '\x3c/div>'; } },
        { label: 'รายการ', render: function (r) {
          return '<div class="cell-2"><div class="t1">' + esc(r.title) + '\x3c/div><div class="t2"><a class="text-reset" href="#/projects/' + esc(r.project_id) + '">' + esc(r.project_code) + '\x3c/a> ' + esc(r.project_name) + (r.activity_name ? ' · ' + esc(r.activity_name) : '') + '\x3c/div>\x3c/div>';
        } },
        { label: 'ผู้ขอ', cls: 'small', render: function (r) { return esc(r.requested_by_name) + '<div class="text-muted">' + esc(r.dept_name) + '\x3c/div>'; } },
        { label: 'จำนวน (บาท)', cls: 'text-end num', render: function (r) { return '<div class="fw-bold">' + SP.money(r.status === 'paid' ? r.paid_amount : r.amount) + '\x3c/div>' + (r.status === 'paid' && r.paid_amount !== r.amount ? '<div class="small-xs text-muted">ขอ ' + SP.money(r.amount) + '\x3c/div>' : ''); } },
        { label: 'ขั้นตอน', render: function (r) { return ui.disbSteps(r.status); } },
        { label: '', cls: 'text-end', render: function (r) { return '<div class="d-flex gap-1 justify-content-end flex-wrap">' + actButtons(r) + '<button class="btn btn-light btn-icon btn-sm" type="button" data-act="view" title="รายละเอียด"><i class="bi bi-eye">\x3c/i>\x3c/button>\x3c/div>'; } }
      ],
      onAction: function (act, row, ctrl) { SP.disbAction(act, row, function () { ctrl.reload(); }); }
    });
    SP.on(SP.$('#dbTabs', el), 'click', '[data-q]', function (e, b) {
      SP.$$('#dbTabs .nav-link', el).forEach(function (x) { x.classList.toggle('active', x === b); });
      lv.state.filters.queue = b.dataset.q; lv.state.page = 1; lv.reload();
    });
    SP.on(root, 'click', '[data-db="new"]', function () { SP.openDisburseForm(null, function () { lv.reload(); }); });
    if (param === 'new' && SP.can(R_REQ)) SP.openDisburseForm(null, function () { lv.reload(); });
    if (/^view\//.test(param || '')) SP.openDisbDetail(param.slice(5), function () { lv.reload(); });
  };
})();
