/* พัฒนาโดย นายเกียรติอนันต์ สุกทน · Copyright (c) 2026 นายเกียรติอนันต์ สุกทน */
/* ==========================================================
   ProjectOne : js_pages  (dashboard, settings, account)
   ========================================================== */
(function () {
  'use strict';
  var SP = window.SP, ui = SP.ui, esc = SP.esc;

  var STATUS = {
    draft: { label: 'ร่าง', tone: 'mute' },
    submitted: { label: 'เสนออนุมัติ', tone: 'info' },
    revise: { label: 'ตีกลับแก้ไข', tone: 'warning' },
    approved: { label: 'อนุมัติแล้ว', tone: 'blue' },
    in_progress: { label: 'กำลังดำเนินการ', tone: 'primary' },
    completed: { label: 'เสร็จสิ้น', tone: 'success' },
    cancelled: { label: 'ยกเลิก', tone: 'danger' }
  };
  SP.PROJECT_STATUS = STATUS;
  var MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  /* =========================================================
     DASHBOARD
     ========================================================= */
  SP.pages.dashboard = function (el, param, seq) {
    return SP.api('apiDashboard', SP.fy).then(function (r) {
      if (!SP.alive(seq)) return;
      var d = r.data, t = d.totals, u = SP.user;
      var base = t.allocated || t.approved;
      var scopeTxt = { all: 'ภาพรวมทุกหน่วยงาน', dept: 'ภาพรวม' + (u.dept_name ? ' ' + u.dept_name : 'หน่วยงานของคุณ'), own: 'โครงการที่คุณรับผิดชอบ' }[d.scope];

      var hero = '<section class="section-hero">' +
        '<div class="eyebrow">ปีงบประมาณ ' + esc(d.fy) + '\x3c/div>' +
        '<h2>สวัสดี คุณ' + esc(u.name) + '\x3c/h2>' +
        '<p>' + esc(scopeTxt) + ' ความก้าวหน้าเฉลี่ย ' + t.avg_progress + '% จาก ' + t.projects + ' โครงการ\x3c/p>' +
        '<div class="d-flex gap-2 flex-wrap">' +
        '<button class="btn btn-sm btn-hero" type="button" data-dash="fy"><i class="bi bi-calendar3 me-1">\x3c/i>เปลี่ยนปีงบ\x3c/button>' +
        (SP.can(['admin', 'planner']) ? '<a class="btn btn-sm btn-hero" href="#/settings"><i class="bi bi-gear me-1">\x3c/i>ตั้งค่าระบบ\x3c/a>' : '') +
        '\x3c/div>' + ui.heroArt() + '\x3c/section>';

      var stats = '<div class="stat-grid m-float">' +
        ui.stat('bi-wallet2', 'primary', SP.moneyShort(base), t.allocated ? 'งบประมาณจัดสรร' : 'งบประมาณอนุมัติ', 'บาท') +
        ui.stat('bi-cash-coin', 'success', SP.moneyShort(t.paid), 'เบิกจ่ายแล้ว', SP.pct(t.paid, base) + '% ของงบ') +
        ui.stat('bi-hourglass-split', 'warning', SP.moneyShort(t.committed), 'รอเบิก / ผูกพัน', SP.pct(t.committed, base) + '% ของงบ') +
        ui.stat('bi-piggy-bank', 'info', SP.moneyShort(t.remaining), 'คงเหลือ', SP.pct(t.remaining, base) + '% ของงบ') +
        '\x3c/div>';

      // ซ้าย
      var tiles = SP.menus().filter(function (m) { return m.key !== 'dashboard'; }).map(function (m) {
        return '<a class="app-tile" href="#/' + m.key + '"><span class="app-ico ' + (m.color || '') + '"><i class="bi ' + m.icon + '">\x3c/i>\x3c/span>' + esc(m.label) + '\x3c/a>';
      }).join('');
      var left = '<div class="dash-side">' +
        '<div class="card"><div class="card-body text-center">' +
        '<div class="fw-bold mb-3">ความก้าวหน้าเฉลี่ย\x3c/div>' + ui.ring(t.avg_progress, 140, 'ถ่วงน้ำหนักงบ') +
        '<div class="row g-0 mt-3 text-center">' +
        '<div class="col"><div class="fw-bold fs-5 num">' + t.projects + '\x3c/div><div class="small-xs text-muted">โครงการ\x3c/div>\x3c/div>' +
        '<div class="col"><div class="fw-bold fs-5 num text-success">' + t.completed + '\x3c/div><div class="small-xs text-muted">เสร็จสิ้น\x3c/div>\x3c/div>' +
        '<div class="col"><div class="fw-bold fs-5 num text-danger">' + t.overdue + '\x3c/div><div class="small-xs text-muted">ล่าช้า\x3c/div>\x3c/div>' +
        '\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="card"><div class="card-header"><i class="bi bi-lightning-charge text-warning">\x3c/i>เมนูลัด\x3c/div><div class="card-body"><div class="tile-grid">' + tiles + '\x3c/div>\x3c/div>\x3c/div>' +
        '\x3c/div>';

      // กลาง
      var total = Object.keys(d.by_status).reduce(function (s, k) { return s + d.by_status[k]; }, 0);
      var statusHtml = total ? Object.keys(STATUS).filter(function (k) { return d.by_status[k]; }).map(function (k) {
        return ui.bar(STATUS[k].label, d.by_status[k] + ' โครงการ', SP.pct(d.by_status[k], total));
      }).join('') : ui.empty('bi-kanban', 'ยังไม่มีโครงการในปีงบประมาณ ' + d.fy, 'เมื่อมีการเสนอโครงการ สถานะทั้งหมดจะแสดงที่นี่', SP.canCreateProject && SP.canCreateProject() ? '<a class="btn btn-primary btn-sm" href="#/projects/new"><i class="bi bi-plus-lg me-1">\x3c/i>สร้างโครงการ\x3c/a>' : '');

      var recentHtml = d.recent.length ? d.recent.map(function (x) {
        return '<a class="list-row text-reset text-decoration-none" href="#/projects/' + esc(x.project_id) + '"><span class="avatar avatar-sm">' + SP.initials(x.by) + '\x3c/span><div class="l-main"><div class="l-t1">' + esc(x.project_name) + '\x3c/div>' +
          '<div class="l-t2">' + esc(x.by) + (x.activity_name ? ' · ' + esc(x.activity_name) : '') + ' ' + x.progress + '% · ' + esc(SP.fmtDate(x.at, true)) + '\x3c/div>' + (x.note ? '<div class="small text-muted text-truncate">' + esc(x.note) + '\x3c/div>' : '') + '\x3c/div>\x3c/a>';
      }).join('') : ui.empty('bi-activity', 'ยังไม่มีรายงานความก้าวหน้า', 'รายงานล่าสุดจากผู้รับผิดชอบโครงการจะแสดงที่นี่');

      var deptHtml = d.by_dept.length ? d.by_dept.map(function (x) {
        return ui.bar(x.name, x.progress + '%', x.progress, x.projects + ' โครงการ · งบ ' + SP.money(x.budget, 0) + ' บาท');
      }).join('') : ui.empty('bi-diagram-3', 'ยังไม่มีข้อมูลรายหน่วยงาน', '');

      var center = '<div class="dash-feed">' +
        '<div class="card"><div class="card-header"><i class="bi bi-kanban text-primary">\x3c/i>สถานะโครงการ<span class="ms-auto small text-muted fw-normal">' + total + ' โครงการ\x3c/span>\x3c/div><div class="card-body">' + statusHtml + '\x3c/div>\x3c/div>' +
        '<div class="card"><div class="card-header"><i class="bi bi-activity text-primary">\x3c/i>ความเคลื่อนไหวล่าสุด\x3c/div><div class="card-body py-2">' + recentHtml + '\x3c/div>\x3c/div>' +
        (d.scope !== 'own' ? '<div class="card"><div class="card-header"><i class="bi bi-diagram-3 text-primary">\x3c/i>ความก้าวหน้าตามหน่วยงาน\x3c/div><div class="card-body">' + deptHtml + '\x3c/div>\x3c/div>' : '') +
        '\x3c/div>';

      // ขวา
      var right = '<div class="dash-side">';
      if (d.checklist) {
        var done = d.checklist.filter(function (c) { return c.done; }).length;
        if (done < d.checklist.length) {
          right += '<div class="card"><div class="card-header"><i class="bi bi-list-check text-primary">\x3c/i>เริ่มต้นใช้งาน<span class="ms-auto small text-muted fw-normal">' + done + '/' + d.checklist.length + '\x3c/span>\x3c/div><div class="card-body py-2">' +
            '<div class="progress mb-2" style="height:6px"><div class="progress-bar" style="width:' + SP.pct(done, d.checklist.length) + '%">\x3c/div>\x3c/div>' +
            d.checklist.map(function (c) {
              return '<a class="check-row' + (c.done ? ' done' : '') + '" href="#/settings/' + c.tab + '"><span class="c-ico"><i class="bi bi-check-lg">\x3c/i>\x3c/span><span class="c-lbl">' + esc(c.label) + '\x3c/span><i class="bi bi-chevron-right ms-auto small text-muted">\x3c/i>\x3c/a>';
            }).join('') + '\x3c/div>\x3c/div>';
        }
      }
      right += '<div class="card"><div class="card-header"><i class="bi bi-bank text-primary">\x3c/i>งบตามแหล่งงบประมาณ\x3c/div><div class="card-body">' +
        (d.by_source.length ? d.by_source.map(function (s) {
          return ui.bar(s.name, SP.pct(s.paid, s.allocated) + '%', SP.pct(s.paid, s.allocated), 'จ่ายแล้ว ' + SP.money(s.paid, 0) + ' / ' + SP.money(s.allocated, 0) + ' บาท');
        }).join('') : ui.empty('bi-bank', 'ยังไม่มีการจัดสรรงบ', 'ยอดจัดสรรและเบิกจ่ายแยกตามแหล่งงบจะแสดงที่นี่')) +
        '\x3c/div>\x3c/div>';
      right += '<div class="card"><div class="card-header"><i class="bi bi-exclamation-triangle text-danger">\x3c/i>โครงการล่าช้า\x3c/div><div class="card-body py-2">' +
        (d.overdue.length ? d.overdue.map(function (p) {
          return '<a class="list-row text-reset text-decoration-none" href="#/projects/' + esc(p.id) + '"><div class="l-main"><div class="l-t1">' + esc(p.name) + '\x3c/div><div class="l-t2">ครบกำหนด ' + esc(SP.fmtDate(p.end_date)) + '\x3c/div>\x3c/div>' + SP.pill(p.progress + '%', 'danger') + '\x3c/a>';
        }).join('') : ui.empty('bi-emoji-smile', 'ไม่มีโครงการล่าช้า', 'ทุกโครงการยังอยู่ในกำหนดเวลา')) +
        '\x3c/div>\x3c/div>';
      right += '\x3c/div>';

      el.innerHTML = '<div id="dashRoot">' + hero + stats + '<div class="dash-grid">' + left + center + right + '\x3c/div>\x3c/div>';
      SP.on(SP.$('#dashRoot', el), 'click', '[data-dash="fy"]', function () { SP.$('#btnFy').click(); });
    });
  };

  /* =========================================================
     SETTINGS (เมนูเดียว แท็บภายใน)
     ========================================================= */
  var TABS = [
    { key: 'org', label: 'องค์กร', icon: 'bi-building', roles: ['admin'], desc: 'ชื่อ โลโก้ สีธีม ปีงบปัจจุบัน' },
    { key: 'fiscal', label: 'ปีงบประมาณ', icon: 'bi-calendar3', roles: ['admin', 'planner'], desc: 'เพิ่ม/ปิดปีงบประมาณ' },
    { key: 'dept', label: 'หน่วยงาน', icon: 'bi-diagram-3', roles: ['admin', 'planner'], desc: 'ฝ่าย กอง กลุ่มงาน' },
    { key: 'strategy', label: 'ยุทธศาสตร์', icon: 'bi-bullseye', roles: ['admin', 'planner'], desc: 'ยุทธศาสตร์และตัวชี้วัด' },
    { key: 'source', label: 'แหล่งงบประมาณ', icon: 'bi-bank', roles: ['admin', 'planner'], desc: 'งบแผ่นดิน เงินรายได้ ฯลฯ' },
    { key: 'users', label: 'ผู้ใช้งาน', icon: 'bi-people', roles: ['admin'], desc: 'บัญชีผู้ใช้และสิทธิ์' },
    { key: 'notify', label: 'การแจ้งเตือน', icon: 'bi-bell', roles: ['admin'], desc: 'Telegram และ LINE' },
    { key: 'tools', label: 'เครื่องมือระบบ', icon: 'bi-tools', roles: ['admin'], desc: 'สำรองข้อมูล ซ่อมชีต ประวัติการใช้งาน' }
  ];
  SP.addSearch(TABS.map(function (t) { return { label: 'ตั้งค่า: ' + t.label, desc: t.desc, icon: t.icon, href: '#/settings/' + t.key, roles: t.roles }; }));

  SP.pages.settings = function (el, param, seq) {
    var tabs = TABS.filter(function (t) { return SP.can(t.roles); });
    var cur = tabs.filter(function (t) { return t.key === param; })[0] || tabs[0];
    el.innerHTML = '<div class="page-head"><div><h1>ตั้งค่า\x3c/h1><div class="sub">' + esc(cur.desc) + '\x3c/div>\x3c/div>\x3c/div>' +
      '<ul class="nav nav-pills mb-3">' + tabs.map(function (t) {
        return '<li class="nav-item"><a class="nav-link' + (t.key === cur.key ? ' active' : '') + '" href="#/settings/' + t.key + '"><i class="bi ' + t.icon + ' me-1">\x3c/i>' + esc(t.label) + '\x3c/a>\x3c/li>';
      }).join('') + '\x3c/ul><div id="setBody">\x3c/div>';
    var body = SP.$('#setBody', el);
    return SET[cur.key](body, seq);
  };

  var SET = {};

  /* ---------- องค์กร ---------- */
  SET.org = function (body, seq) {
    body.innerHTML = ui.loading();
    return SP.api('apiGetSettings').then(function (r) {
      if (!SP.alive(seq)) return;
      var s = r.data;
      var fys = (SP.lookups.fiscal_years || []).map(function (f) { return { value: f.year, label: f.name }; });
      var months = MONTHS.map(function (m, i) { return { value: i + 1, label: m }; });
      body.innerHTML = '<form id="orgForm" novalidate><div class="row g-3">' +
        '<div class="col-lg-8"><div class="card"><div class="card-header">ข้อมูลองค์กร\x3c/div><div class="card-body"><div class="row g-3">' +
        ui.field('org_name', 'ชื่อองค์กร', s.org_name, { required: true, maxlength: 200 }) +
        ui.field('org_sub', 'บรรทัดรอง (ใต้ชื่อองค์กร)', s.org_sub, { maxlength: 200, placeholder: 'เช่น สำนักงานเขตพื้นที่ / กองแผนงาน' }) +
        ui.field('org_address', 'ที่อยู่', s.org_address, { type: 'textarea', rows: 2, col: 'col-md-8' }) +
        ui.field('org_phone', 'โทรศัพท์', s.org_phone, { col: 'col-md-4' }) +
        '\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="card mt-3"><div class="card-header">ปีงบประมาณและการทำงาน\x3c/div><div class="card-body"><div class="row g-3">' +
        ui.selectField('current_fy', 'ปีงบประมาณปัจจุบัน', fys, s.current_fy, { col: 'col-md-4', required: true, help: 'ค่าเริ่มต้นที่ผู้ใช้ทุกคนเห็น' }) +
        ui.selectField('fy_start_month', 'เดือนเริ่มปีงบประมาณ', months, s.fy_start_month, { col: 'col-md-4', help: 'ราชการไทยเริ่ม ตุลาคม' }) +
        ui.field('project_prefix', 'อักษรนำรหัสโครงการ', s.project_prefix, { col: 'col-md-4', maxlength: 10, help: 'เช่น PJ จะได้ PJ70-001' }) +
        ui.checkField('require_allocation', 'อนุมัติโครงการได้เฉพาะเมื่อมีงบจัดสรรเพียงพอ', s.require_allocation !== false, { col: 'col-12', help: 'ตรวจยอดคงเหลือของหน่วยงาน x แหล่งงบ ก่อนอนุมัติทุกครั้ง (แนะนำให้เปิด)' }) +
        ui.field('report_remind_days', 'เตือนเมื่อไม่ได้รายงานเกิน', s.report_remind_days || 30, { type: 'number', min: 7, max: 180, col: 'col-md-4', suffix: 'วัน' }) +
        ui.field('session_hours', 'อายุการเข้าสู่ระบบ', s.session_hours, { type: 'number', min: 1, max: 72, col: 'col-md-4', suffix: 'ชั่วโมง' }) +
        '<div class="col-md-8"><label class="form-label">โฟลเดอร์ Google Drive (เก็บโลโก้ ไฟล์แนบ สำรองข้อมูล)\x3c/label><div class="input-group">' +
        '<input class="form-control" name="folder_id" value="' + esc(s.folder_id) + '" placeholder="วางลิงก์หรือ ID โฟลเดอร์ หรือกดสร้างอัตโนมัติ">' +
        '<button class="btn btn-light" type="button" data-org="folder"><i class="bi bi-folder-plus me-1">\x3c/i>สร้าง/ตรวจ\x3c/button>' +
        (s.folder_url ? '<a class="btn btn-light" href="' + esc(s.folder_url) + '" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right">\x3c/i>\x3c/a>' : '') +
        '\x3c/div>\x3c/div>' +
        '\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +

        '<div class="col-lg-4"><div class="card"><div class="card-header">โลโก้\x3c/div><div class="card-body">' +
        '<div class="d-flex gap-3 align-items-center"><div class="logo-box" id="logoBox">' + (s.logo_url ? '<img src="' + esc(s.logo_url) + '" alt="">' : '<i class="bi bi-image">\x3c/i>') + '\x3c/div>' +
        '<div class="d-flex flex-column gap-2"><label class="btn btn-soft btn-sm mb-0"><i class="bi bi-upload me-1">\x3c/i>อัปโหลดรูป<input type="file" accept="image/*" hidden id="logoFile">\x3c/label>' +
        '<button class="btn btn-ghost-danger btn-sm' + (s.logo_url ? '' : ' d-none') + '" type="button" data-org="rmlogo" id="btnRmLogo"><i class="bi bi-trash3 me-1">\x3c/i>ลบโลโก้\x3c/button>' +
        '<div class="small-xs text-muted">PNG/JPG ไม่เกิน 2 MB เก็บใน Drive\x3c/div>\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +

        '<div class="card mt-3"><div class="card-header">สีธีม\x3c/div><div class="card-body">' +
        '<div class="swatches mb-3" id="swatches">' + SP.THEME_PRESETS.map(function (c) {
          return '<button type="button" class="swatch' + (c.toLowerCase() === String(s.primary_color).toLowerCase() ? ' active' : '') + '" style="background:' + c + '" data-color="' + c + '" title="' + c + '">\x3c/button>';
        }).join('') + '\x3c/div>' +
        '<div class="input-group"><input type="color" class="form-control form-control-color" id="colorPick" value="' + esc(s.primary_color) + '" style="max-width:56px">' +
        '<input class="form-control" name="primary_color" id="colorHex" value="' + esc(s.primary_color) + '" pattern="#[0-9a-fA-F]{6}" required>\x3c/div>' +
        '<div class="small-xs text-muted mt-2">ระบบคำนวณเฉดสีทั้งชุดจากสีเดียว\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +

        '<div class="col-12"><div class="d-flex justify-content-end"><button class="btn btn-primary" type="submit" id="orgSave"><i class="bi bi-check2 me-1">\x3c/i>บันทึกการตั้งค่า\x3c/button>\x3c/div>\x3c/div>' +
        '\x3c/div>\x3c/form>';

      var form = SP.$('#orgForm', body);
      var setColor = function (c) {
        SP.$('#colorHex', body).value = c; SP.$('#colorPick', body).value = c; SP.theme(c);
        SP.$$('.swatch', body).forEach(function (b) { b.classList.toggle('active', b.dataset.color.toLowerCase() === c.toLowerCase()); });
      };
      SP.on(body, 'click', '.swatch', function (e, b) { setColor(b.dataset.color); });
      SP.$('#colorPick', body).addEventListener('input', function () { setColor(this.value); });
      SP.$('#colorHex', body).addEventListener('change', function () { if (/^#[0-9a-fA-F]{6}$/.test(this.value)) setColor(this.value); });

      SP.on(body, 'click', '[data-org="folder"]', function (e, b) {
        ui.busy(b, true, 'กำลังตรวจ...');
        SP.api('apiCreateFolder').then(function (x) { SP.toast(x.message); SP.route(); }).catch(function (err) { SP.toast(err.message, 'error'); }).then(function () { ui.busy(b, false); });
      });
      SP.on(body, 'click', '[data-org="rmlogo"]', function () {
        ui.confirm('ลบโลโก้ปัจจุบันออก', { danger: true, okText: 'ลบโลโก้' }).then(function (yes) {
          if (!yes) return;
          return SP.api('apiRemoveLogo').then(function (x) {
            SP.toast(x.message); SP.applySettings({ logo_url: '' });
            SP.$('#logoBox', body).innerHTML = '<i class="bi bi-image">\x3c/i>'; SP.$('#btnRmLogo', body).classList.add('d-none');
          });
        }).catch(function (err) { SP.toast(err.message, 'error'); });
      });
      SP.$('#logoFile', body).addEventListener('change', function () {
        var f = this.files[0]; this.value = '';
        if (!f) return;
        if (f.size > 2 * 1024 * 1024) { SP.toast('ไฟล์ใหญ่เกิน 2 MB', 'warning'); return; }
        var rd = new FileReader();
        SP.$('#logoBox', body).innerHTML = '<div class="spinner-border spinner-border-sm" style="color:var(--sb-primary)">\x3c/div>';
        rd.onload = function () {
          var b64 = String(rd.result).split(',')[1];
          SP.api('apiUploadLogo', { name: f.name, mime: f.type, data: b64 }).then(function (x) {
            SP.toast(x.message); SP.applySettings({ logo_url: x.data.logo_url });
            SP.$('#logoBox', body).innerHTML = '<img src="' + esc(x.data.logo_url) + '" alt="">'; SP.$('#btnRmLogo', body).classList.remove('d-none');
          }).catch(function (err) {
            SP.toast(err.message, 'error');
            SP.$('#logoBox', body).innerHTML = SP.settings.logo_url ? '<img src="' + esc(SP.settings.logo_url) + '" alt="">' : '<i class="bi bi-image">\x3c/i>';
          });
        };
        rd.onerror = function () { SP.toast('อ่านไฟล์ไม่สำเร็จ', 'error'); };
        rd.readAsDataURL(f);
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        form.classList.add('was-validated');
        if (!form.checkValidity()) { SP.toast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning'); return; }
        var btn = SP.$('#orgSave', body), data = ui.val(form);
        ui.busy(btn, true);
        SP.api('apiSaveSettings', data).then(function (x) {
          SP.toast(x.message); SP.applySettings(x.data);
          if (!(SP.lookups.fiscal_years || []).some(function (f) { return String(f.year) === String(SP.fy); })) SP.setFy(x.data.current_fy);
        }).catch(function (err) { SP.toast(err.message, 'error'); }).then(function () { ui.busy(btn, false); });
      });
    });
  };

  /* ---------- master data (ใช้ร่วม 4 แท็บ) ---------- */
  function statusPill(s) { return s === 'inactive' ? SP.pill('ปิดใช้งาน', 'mute', true) : SP.pill('ใช้งาน', 'success', true); }
  function rowActions() {
    return '<div class="d-flex gap-1 justify-content-end">' +
      '<button class="btn btn-light btn-icon btn-sm" type="button" data-act="edit" title="แก้ไข"><i class="bi bi-pencil">\x3c/i>\x3c/button>' +
      '<button class="btn btn-ghost-danger btn-icon btn-sm" type="button" data-act="del" title="ลบ"><i class="bi bi-trash3">\x3c/i>\x3c/button>\x3c/div>';
  }
  var statusOpts = [{ value: 'active', label: 'ใช้งาน' }, { value: 'inactive', label: 'ปิดใช้งาน' }];

  /** cfg: {title, api:{list,save,del}, columns, form(row) => html, onShown(form,row), empty} */
  function masterTab(body, cfg) {
    var lv = SP.listView({
      el: body, api: cfg.api.list, columns: cfg.columns.concat([{ label: '', cls: 'text-end', render: rowActions }]),
      searchPh: 'ค้นหา' + cfg.title,
      toolbar: cfg.toolbar || '',
      actions: '<button class="btn btn-primary btn-sm" type="button" data-act="add"><i class="bi bi-plus-lg me-1">\x3c/i>เพิ่ม' + esc(cfg.title) + '\x3c/button>',
      empty: cfg.empty,
      onAction: function (act, row, ctrl) {
        if (act === 'add' || act === 'edit') openEdit(act === 'edit' ? row : null, ctrl);
        if (act === 'del') {
          ui.confirm('ลบ' + cfg.title + ' "' + (row.name || row.year) + '" ถ้ามีข้อมูลอ้างถึงจะลบไม่ได้', { danger: true, okText: 'ลบ' }).then(function (yes) {
            if (!yes) return;
            return SP.api(cfg.api.del, row.id).then(function (x) { SP.toast(x.message); if (x.data && x.data.lookups) SP.lookups = x.data.lookups; ctrl.reload(); });
          }).catch(function (err) { SP.toast(err.message, 'error'); });
        }
      }
    });
    function openEdit(row, ctrl) {
      ui.openForm({
        title: (row ? 'แก้ไข' : 'เพิ่ม') + cfg.title, size: cfg.size || '',
        body: '<div class="row g-3">' + cfg.form(row || {}) + '\x3c/div>',
        onShown: function (form) { if (cfg.onShown) cfg.onShown(form, row || {}); var f = form.querySelector('input:not([type=hidden]):not([readonly]),select,textarea'); if (f) f.focus(); },
        onSave: function (data) {
          if (row) data.id = row.id;
          return SP.api(cfg.api.save, data).then(function (x) { SP.toast(x.message); if (x.data && x.data.lookups) SP.lookups = x.data.lookups; ctrl.reload(); });
        }
      });
    }
    return lv;
  }

  SET.fiscal = function (body) {
    masterTab(body, {
      title: 'ปีงบประมาณ', api: { list: 'apiListFiscalYears', save: 'apiSaveFiscalYear', del: 'apiDeleteFiscalYear' },
      empty: { icon: 'bi-calendar3', title: 'ยังไม่มีปีงบประมาณ', desc: 'เพิ่มปีงบประมาณก่อนเริ่มบันทึกโครงการ' },
      columns: [
        { label: 'ปีงบประมาณ', render: function (r) { return '<div class="cell-2"><div class="t1">' + esc(r.name) + '\x3c/div><div class="t2">พ.ศ. ' + esc(r.year) + '\x3c/div>\x3c/div>'; } },
        { label: 'ช่วงเวลา', render: function (r) { return esc(SP.fmtDate(r.start_date)) + ' ถึง ' + esc(SP.fmtDate(r.end_date)); } },
        { label: 'สถานะ', render: function (r) { return (r.status === 'closed' ? SP.pill('ปิดปีแล้ว', 'mute', true) : SP.pill('เปิดใช้งาน', 'success', true)) + (String(r.year) === String(SP.settings.current_fy) ? ' ' + SP.pill('ปีปัจจุบัน', 'primary') : ''); } },
        { label: 'หมายเหตุ', cls: 'text-muted small', render: function (r) { return esc(r.note); } }
      ],
      form: function (r) {
        return ui.field('year', 'ปีงบประมาณ (พ.ศ.)', r.year, { required: true, col: 'col-md-4', pattern: '25[0-9]{2}', placeholder: '2570', maxlength: 4, invalid: 'ใส่ พ.ศ. 4 หลัก' }) +
          ui.field('name', 'ชื่อที่แสดง', r.name, { col: 'col-md-8', placeholder: 'ปีงบประมาณ 2570' }) +
          ui.field('start_date', 'วันเริ่มต้น', r.start_date, { type: 'date', col: 'col-md-6', help: 'เว้นว่างได้ ระบบคำนวณจากเดือนเริ่มปีงบ' }) +
          ui.field('end_date', 'วันสิ้นสุด', r.end_date, { type: 'date', col: 'col-md-6' }) +
          ui.selectField('status', 'สถานะ', [{ value: 'open', label: 'เปิดใช้งาน' }, { value: 'closed', label: 'ปิดปีงบประมาณ' }], r.status || 'open', { col: 'col-md-6', help: 'ปิดปีแล้วจะบันทึกโครงการใหม่ไม่ได้' }) +
          ui.field('note', 'หมายเหตุ', r.note, { type: 'textarea', rows: 2 });
      },
      onShown: function (form) {
        var y = form.querySelector('[name=year]');
        y.addEventListener('input', function () {
          if (!/^25\d\d$/.test(y.value)) return;
          var sm = Number(SP.settings.fy_start_month || 10), ce = Number(y.value) - 543, sy = sm > 1 ? ce - 1 : ce;
          var pad = function (n) { return (n < 10 ? '0' : '') + n; };
          var end = new Date(Date.UTC(sy + 1, sm - 1, 0));
          form.querySelector('[name=start_date]').value = sy + '-' + pad(sm) + '-01';
          form.querySelector('[name=end_date]').value = end.toISOString().slice(0, 10);
          var nm = form.querySelector('[name=name]'); if (!nm.value || /^ปีงบประมาณ \d*$/.test(nm.value)) nm.value = 'ปีงบประมาณ ' + y.value;
        });
      }
    });
  };

  SET.dept = function (body) {
    masterTab(body, {
      title: 'หน่วยงาน', api: { list: 'apiListDepartments', save: 'apiSaveDepartment', del: 'apiDeleteDepartment' },
      empty: { icon: 'bi-diagram-3', title: 'ยังไม่มีหน่วยงาน', desc: 'เพิ่มฝ่าย กอง หรือกลุ่มงาน ที่เป็นเจ้าของโครงการ' },
      toolbar: '<select class="form-select form-select-sm w-auto" data-filter="status"><option value="">ทุกสถานะ\x3c/option><option value="active">ใช้งาน\x3c/option><option value="inactive">ปิดใช้งาน\x3c/option>\x3c/select>',
      columns: [
        { label: 'รหัส', cls: 'fw-600', render: function (r) { return esc(r.code); } },
        { label: 'ชื่อหน่วยงาน', render: function (r) { return '<div class="cell-2"><div class="t1">' + esc(r.name) + '\x3c/div><div class="t2">' + esc(r.short_name) + '\x3c/div>\x3c/div>'; } },
        { label: 'หัวหน้าหน่วยงาน', render: function (r) { return esc(r.head_name) + (r.phone ? '<div class="small text-muted">' + esc(r.phone) + '\x3c/div>' : ''); } },
        { label: 'สถานะ', render: function (r) { return statusPill(r.status); } }
      ],
      form: function (r) {
        return ui.field('code', 'รหัส', r.code, { required: true, col: 'col-md-4', maxlength: 30, placeholder: 'D01' }) +
          ui.field('name', 'ชื่อหน่วยงาน', r.name, { required: true, col: 'col-md-8' }) +
          ui.field('short_name', 'ชื่อย่อ', r.short_name, { col: 'col-md-4' }) +
          ui.field('head_name', 'หัวหน้าหน่วยงาน', r.head_name, { col: 'col-md-8' }) +
          ui.field('phone', 'โทรศัพท์', r.phone, { col: 'col-md-4' }) +
          ui.field('sort', 'ลำดับ', r.sort || 0, { type: 'number', col: 'col-md-4' }) +
          ui.selectField('status', 'สถานะ', statusOpts, r.status || 'active', { col: 'col-md-4' }) +
          ui.field('note', 'หมายเหตุ', r.note, { type: 'textarea', rows: 2 });
      }
    });
  };

  SET.strategy = function (body) {
    masterTab(body, {
      title: 'ยุทธศาสตร์', size: 'lg', api: { list: 'apiListStrategies', save: 'apiSaveStrategy', del: 'apiDeleteStrategy' },
      empty: { icon: 'bi-bullseye', title: 'ยังไม่มียุทธศาสตร์', desc: 'ใช้เชื่อมโครงการกับแผนยุทธศาสตร์ขององค์กร' },
      columns: [
        { label: 'รหัส', cls: 'fw-600', render: function (r) { return esc(r.code); } },
        { label: 'ยุทธศาสตร์', render: function (r) { return '<div class="cell-2"><div class="t1">' + esc(r.name) + '\x3c/div><div class="t2">' + esc(r.goal) + '\x3c/div>\x3c/div>'; } },
        { label: 'ตัวชี้วัด', cls: 'small', render: function (r) { return esc(r.kpi).replace(/\n/g, '<br>'); } },
        { label: 'สถานะ', render: function (r) { return statusPill(r.status); } }
      ],
      form: function (r) {
        return ui.field('code', 'รหัส', r.code, { required: true, col: 'col-md-3', maxlength: 30, placeholder: 'S1' }) +
          ui.field('name', 'ชื่อยุทธศาสตร์', r.name, { required: true, col: 'col-md-9' }) +
          ui.field('goal', 'เป้าประสงค์', r.goal, { type: 'textarea', rows: 2 }) +
          ui.field('kpi', 'ตัวชี้วัด (บรรทัดละ 1 ตัว)', r.kpi, { type: 'textarea', rows: 3 }) +
          ui.field('sort', 'ลำดับ', r.sort || 0, { type: 'number', col: 'col-md-4' }) +
          ui.selectField('status', 'สถานะ', statusOpts, r.status || 'active', { col: 'col-md-4' }) +
          ui.field('note', 'หมายเหตุ', r.note, { type: 'textarea', rows: 2 });
      }
    });
  };

  SET.source = function (body) {
    var types = [{ value: 'in', label: 'เงินในงบประมาณ' }, { value: 'out', label: 'เงินนอกงบประมาณ' }];
    masterTab(body, {
      title: 'แหล่งงบประมาณ', api: { list: 'apiListBudgetSources', save: 'apiSaveBudgetSource', del: 'apiDeleteBudgetSource' },
      empty: { icon: 'bi-bank', title: 'ยังไม่มีแหล่งงบประมาณ', desc: '' },
      columns: [
        { label: 'รหัส', cls: 'fw-600', render: function (r) { return esc(r.code); } },
        { label: 'ชื่อแหล่งงบประมาณ', render: function (r) { return '<span class="fw-600">' + esc(r.name) + '\x3c/span>' + (r.note ? '<div class="small text-muted">' + esc(r.note) + '\x3c/div>' : ''); } },
        { label: 'ประเภท', render: function (r) { return r.type === 'out' ? SP.pill('นอกงบประมาณ', 'purple') : SP.pill('ในงบประมาณ', 'blue'); } },
        { label: 'สถานะ', render: function (r) { return statusPill(r.status); } }
      ],
      form: function (r) {
        return ui.field('code', 'รหัส', r.code, { required: true, col: 'col-md-4', maxlength: 30, placeholder: 'B01' }) +
          ui.field('name', 'ชื่อแหล่งงบประมาณ', r.name, { required: true, col: 'col-md-8' }) +
          ui.selectField('type', 'ประเภท', types, r.type || 'in', { col: 'col-md-6' }) +
          ui.field('sort', 'ลำดับ', r.sort || 0, { type: 'number', col: 'col-md-3' }) +
          ui.selectField('status', 'สถานะ', statusOpts, r.status || 'active', { col: 'col-md-3' }) +
          ui.field('note', 'หมายเหตุ', r.note, { type: 'textarea', rows: 2 });
      }
    });
  };

  /* ---------- ผู้ใช้งาน ---------- */
  var ROLE_TONE = { admin: 'danger', executive: 'purple', planner: 'blue', finance: 'success', dept_head: 'warning', staff: 'mute' };
  SET.users = function (body) {
    var deptOpts = (SP.lookups.departments || []).map(function (d) { return { value: d.id, label: d.name, sub: d.code + (d.short_name ? ' · ' + d.short_name : '') }; });
    var roleOpt = SP.roles.map(function (r) { return '<option value="' + r.value + '">' + esc(r.label) + '\x3c/option>'; }).join('');
    var deptOpt = (SP.lookups.departments || []).map(function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.name) + '\x3c/option>'; }).join('');

    var lv = SP.listView({
      el: body, api: 'apiListUsers', searchPh: 'ค้นหาชื่อ ชื่อผู้ใช้ อีเมล',
      toolbar: '<select class="form-select form-select-sm w-auto" data-filter="role"><option value="">ทุกบทบาท\x3c/option>' + roleOpt + '\x3c/select>' +
        '<select class="form-select form-select-sm w-auto" data-filter="dept_id"><option value="">ทุกหน่วยงาน\x3c/option>' + deptOpt + '\x3c/select>' +
        '<select class="form-select form-select-sm w-auto" data-filter="status"><option value="">ทุกสถานะ\x3c/option><option value="active">ใช้งาน\x3c/option><option value="inactive">ระงับ\x3c/option>\x3c/select>',
      actions: '<button class="btn btn-primary btn-sm" type="button" data-act="add"><i class="bi bi-person-plus me-1">\x3c/i>เพิ่มผู้ใช้\x3c/button>',
      empty: { icon: 'bi-people', title: 'ยังไม่มีผู้ใช้', desc: '' },
      columns: [
        { label: 'ผู้ใช้', render: function (r) { return '<div class="d-flex align-items-center gap-2"><span class="avatar avatar-sm">' + SP.initials(r.name) + '\x3c/span><div class="cell-2"><div class="t1">' + esc(r.name) + '\x3c/div><div class="t2">@' + esc(r.username) + '\x3c/div>\x3c/div>\x3c/div>'; } },
        { label: 'ตำแหน่ง / หน่วยงาน', render: function (r) { return '<div class="cell-2"><div class="t1 fw-normal">' + esc(r.position || '-') + '\x3c/div><div class="t2">' + esc(r.dept_name || 'ไม่สังกัดหน่วยงาน') + '\x3c/div>\x3c/div>'; } },
        { label: 'บทบาท', render: function (r) { return SP.pill(r.role_label, ROLE_TONE[r.role]); } },
        { label: 'สถานะ', render: function (r) { return r.status === 'active' ? SP.pill('ใช้งาน', 'success', true) : SP.pill('ระงับ', 'mute', true); } },
        { label: 'เข้าใช้ล่าสุด', cls: 'small text-muted', render: function (r) { return r.last_login ? esc(SP.fmtDate(r.last_login, true)) : '-'; } },
        { label: '', cls: 'text-end', render: function (r) {
          return '<div class="d-flex gap-1 justify-content-end">' +
            '<button class="btn btn-light btn-icon btn-sm" type="button" data-act="edit" title="แก้ไข"><i class="bi bi-pencil">\x3c/i>\x3c/button>' +
            '<button class="btn btn-light btn-icon btn-sm" type="button" data-act="reset" title="รีเซ็ตรหัสผ่าน"><i class="bi bi-key">\x3c/i>\x3c/button>' +
            (r.id !== SP.user.id ? '<button class="btn btn-ghost-danger btn-icon btn-sm" type="button" data-act="del" title="ลบ"><i class="bi bi-trash3">\x3c/i>\x3c/button>' : '') + '\x3c/div>';
        } }
      ],
      onAction: function (act, row, ctrl) {
        if (act === 'add' || act === 'edit') {
          var r = row || {};
          ui.openForm({
            title: row ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้', size: 'lg',
            body: '<div class="row g-3">' +
              ui.field('username', 'ชื่อผู้ใช้ (ใช้ล็อกอิน)', r.username, { required: true, col: 'col-md-6', pattern: '[a-zA-Z0-9._\\-]{3,60}', invalid: 'a-z 0-9 . _ - อย่างน้อย 3 ตัว', attrs: { autocapitalize: 'none' } }) +
              (row ? '' : ui.field('password', 'รหัสผ่านเริ่มต้น', '', { type: 'text', required: true, col: 'col-md-6', minlength: 8, attrs: { minlength: 8 }, help: 'อย่างน้อย 8 ตัว ผู้ใช้ต้องเปลี่ยนเมื่อเข้าครั้งแรก' })) +
              ui.field('name', 'ชื่อ-สกุล', r.name, { required: true, col: row ? 'col-md-6' : 'col-md-6' }) +
              ui.field('position', 'ตำแหน่ง', r.position, { col: 'col-md-6' }) +
              ui.selectField('role', 'บทบาท', SP.roles, r.role || 'staff', { required: true, col: 'col-md-6' }) +
              ui.comboField('dept_id', 'หน่วยงาน', deptOpts, r.dept_id, { col: 'col-md-6', emptyLabel: 'ไม่สังกัดหน่วยงาน', help: 'จำเป็นสำหรับหัวหน้าหน่วยงานและผู้รับผิดชอบโครงการ' }) +
              ui.field('email', 'อีเมล', r.email, { type: 'email', col: 'col-md-6' }) +
              ui.field('phone', 'โทรศัพท์', r.phone, { col: 'col-md-6' }) +
              ui.selectField('status', 'สถานะ', [{ value: 'active', label: 'ใช้งาน' }, { value: 'inactive', label: 'ระงับการใช้งาน' }], r.status || 'active', { col: 'col-md-6' }) +
              '<div class="col-12"><div class="alert alert-light mb-0 small"><i class="bi bi-info-circle">\x3c/i><div><b>สิทธิ์ตามบทบาท\x3c/b> ผู้บริหาร: เห็นทุกหน่วยงาน อนุมัติโครงการ · งานแผน: ข้อมูลพื้นฐาน จัดสรรงบ · การเงิน: เบิกจ่าย · หัวหน้าหน่วยงาน: โครงการในหน่วยงาน · ผู้รับผิดชอบ: โครงการของตัวเอง\x3c/div>\x3c/div>\x3c/div>' +
              '\x3c/div>',
            onSave: function (data) {
              if (row) data.id = row.id;
              return SP.api('apiSaveUser', data).then(function (x) { SP.toast(x.message); ctrl.reload(); });
            }
          });
        }
        if (act === 'reset') {
          ui.openForm({
            title: 'รีเซ็ตรหัสผ่าน: ' + row.name, size: 'sm', saveText: 'รีเซ็ต',
            body: '<div class="row g-3">' + ui.field('pw', 'รหัสผ่านใหม่', randomPw(), { required: true, attrs: { minlength: 8 }, help: 'คัดลอกส่งให้ผู้ใช้ ผู้ใช้ต้องเปลี่ยนเมื่อเข้าสู่ระบบ' }) + '\x3c/div>',
            onSave: function (d) { return SP.api('apiResetPassword', row.id, d.pw).then(function (x) { SP.toast(x.message); }); }
          });
        }
        if (act === 'del') {
          ui.confirm('ลบผู้ใช้ ' + row.name + ' (@' + row.username + ')', { danger: true, okText: 'ลบผู้ใช้' }).then(function (yes) {
            if (!yes) return;
            return SP.api('apiDeleteUser', row.id).then(function (x) { SP.toast(x.message); ctrl.reload(); });
          }).catch(function (err) { SP.toast(err.message, 'error'); });
        }
      }
    });
    return lv;
  };
  function randomPw() {
    var c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    var a = new Uint32Array(10); (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < 10; i++) s += c[a[i] % c.length];
    return s;
  }

  /* ---------- การแจ้งเตือน ---------- */
  SET.notify = function (body, seq) {
    body.innerHTML = ui.loading();
    return SP.api('apiGetSettings').then(function (r) {
      if (!SP.alive(seq)) return;
      var n = r.data.notify || {};
      body.innerHTML = '<form id="ntForm" novalidate><div class="row g-3">' +
        '<div class="col-lg-6"><div class="card h-100"><div class="card-header"><i class="bi bi-telegram" style="color:#229ED9">\x3c/i>Telegram\x3c/div><div class="card-body"><div class="row g-3">' +
        ui.field('telegram_token', 'Bot Token', n.telegram_token, { placeholder: '123456:ABC...', help: 'สร้างบอทจาก @BotFather แล้วเพิ่มบอทเข้ากลุ่ม' }) +
        ui.field('telegram_chat_id', 'Chat ID', n.telegram_chat_id, { placeholder: '-100xxxxxxxxxx' }) +
        '<div class="col-12"><button class="btn btn-soft btn-sm" type="button" data-test="telegram"><i class="bi bi-send me-1">\x3c/i>ส่งข้อความทดสอบ\x3c/button>\x3c/div>' +
        '\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="col-lg-6"><div class="card h-100"><div class="card-header"><i class="bi bi-line" style="color:#06C755">\x3c/i>LINE Messaging API\x3c/div><div class="card-body"><div class="row g-3">' +
        ui.field('line_token', 'Channel access token', n.line_token, { help: 'จาก LINE Developers Console (LINE Notify ปิดบริการแล้ว)' }) +
        ui.field('line_to', 'ส่งถึง (User ID / Group ID)', n.line_to, { placeholder: 'Uxxxxxxxx หรือ Cxxxxxxxx' }) +
        '<div class="col-12"><button class="btn btn-soft btn-sm" type="button" data-test="line"><i class="bi bi-send me-1">\x3c/i>ส่งข้อความทดสอบ\x3c/button>\x3c/div>' +
        '\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="col-12"><div class="card"><div class="card-header">แจ้งเตือนเมื่อ\x3c/div><div class="card-body"><div class="row g-3">' +
        ui.checkField('on_submit', 'มีการเสนอโครงการ / ตีกลับ', n.on_submit, { col: 'col-md-6' }) +
        ui.checkField('on_approve', 'โครงการได้รับอนุมัติ', n.on_approve, { col: 'col-md-6' }) +
        ui.checkField('on_disburse', 'มีการขอเบิก / จ่ายเงิน', n.on_disburse, { col: 'col-md-6' }) +
        ui.checkField('on_overdue', 'สรุปโครงการล่าช้า (รายวัน)', n.on_overdue, { col: 'col-md-6' }) +
        '\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="col-12 d-flex justify-content-end"><button class="btn btn-primary" type="submit" id="ntSave"><i class="bi bi-check2 me-1">\x3c/i>บันทึก\x3c/button>\x3c/div>' +
        '\x3c/div>\x3c/form>';
      var form = SP.$('#ntForm', body);
      var save = function () { return SP.api('apiSaveSettings', { notify: ui.val(form) }); };
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var b = SP.$('#ntSave', body); ui.busy(b, true);
        save().then(function (x) { SP.toast(x.message); }).catch(function (err) { SP.toast(err.message, 'error'); }).then(function () { ui.busy(b, false); });
      });
      SP.on(body, 'click', '[data-test]', function (e, b) {
        ui.busy(b, true, 'กำลังส่ง...');
        save().then(function () { return SP.api('apiTestNotify', b.dataset.test); })
          .then(function (x) { SP.toast(x.message); }).catch(function (err) { SP.toast(err.message, 'error'); }).then(function () { ui.busy(b, false); });
      });
    });
  };

  /* ---------- เครื่องมือระบบ ---------- */
  var SHEET_TH = { Settings: 'ตั้งค่า', Users: 'ผู้ใช้', FiscalYears: 'ปีงบประมาณ', Departments: 'หน่วยงาน', Strategies: 'ยุทธศาสตร์', BudgetSources: 'แหล่งงบ', Allocations: 'การจัดสรรงบ', Projects: 'โครงการ', Activities: 'กิจกรรม', ProgressReports: 'รายงานความก้าวหน้า', Disbursements: 'การเบิกจ่าย', Transfers: 'โอนงบ', Notifications: 'แจ้งเตือน', Logs: 'ประวัติการใช้งาน', Errors: 'ข้อผิดพลาด' };
  SET.tools = function (body, seq) {
    body.innerHTML = ui.loading();
    return SP.api('apiSystemInfo').then(function (r) {
      if (!SP.alive(seq)) return;
      var s = r.data;
      var pctCells = SP.pct(s.cells, 10000000);
      body.innerHTML = '<div class="row g-3">' +
        '<div class="col-lg-4"><div class="card h-100"><div class="card-header"><i class="bi bi-hdd-stack text-primary">\x3c/i>สถานะระบบ\x3c/div><div class="card-body">' +
        '<div class="d-flex justify-content-between small mb-1"><span>เวอร์ชัน\x3c/span><b>' + esc(s.version) + '\x3c/b>\x3c/div>' +
        ui.bar('เซลล์ที่ใช้ในสเปรดชีต', s.cells.toLocaleString('th-TH'), pctCells, pctCells + '% ของเพดาน 10 ล้านเซลล์') +
        '<div class="small mt-3 mb-1 fw-600">งานอัตโนมัติ\x3c/div>' +
        (s.triggers.length ? s.triggers.map(function (t) { return SP.pill(t === 'cronWeeklyBackup' ? 'สำรองข้อมูลรายสัปดาห์' : t === 'cronDaily' ? 'ล้างข้อมูลรายวัน' : t, 'success', true); }).join(' ') : SP.pill('ยังไม่ได้ติดตั้ง', 'warning', true)) +
        '<div class="d-grid gap-2 mt-3">' +
        '<button class="btn btn-soft btn-sm" type="button" data-tool="trig"><i class="bi bi-clock-history me-1">\x3c/i>ติดตั้งงานอัตโนมัติใหม่\x3c/button>' +
        '<button class="btn btn-soft btn-sm" type="button" data-tool="backup"><i class="bi bi-cloud-arrow-up me-1">\x3c/i>สำรองข้อมูลตอนนี้\x3c/button>' +
        '<button class="btn btn-light btn-sm" type="button" data-tool="repair"><i class="bi bi-wrench-adjustable me-1">\x3c/i>ตรวจและซ่อมโครงสร้างชีต\x3c/button>' +
        '<a class="btn btn-light btn-sm" href="' + esc(s.sheet_url) + '" target="_blank" rel="noopener"><i class="bi bi-table me-1">\x3c/i>เปิด Google Sheets\x3c/a>' +
        '\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="col-lg-8"><div class="card h-100"><div class="card-header"><i class="bi bi-database text-primary">\x3c/i>จำนวนข้อมูล\x3c/div><div class="card-body"><div class="row g-2">' +
        Object.keys(s.counts).map(function (k) {
          return '<div class="col-6 col-md-4"><div class="p-2 rounded-3" style="background:#fafbfc"><div class="small text-muted">' + esc(SHEET_TH[k] || k) + '\x3c/div><div class="fw-bold num">' + s.counts[k].toLocaleString('th-TH') + '\x3c/div>\x3c/div>\x3c/div>';
        }).join('') + '\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="col-12"><div class="card"><div class="card-body d-flex align-items-center gap-3 flex-wrap"><span class="app-ico" style="width:48px;height:48px;border-radius:15px;font-size:1.2rem"><i class="bi bi-kanban">\x3c/i>\x3c/span><div class="flex-fill"><div class="fw-bold">' + esc((s.credit || {}).app || 'ProjectOne') + ' เวอร์ชัน ' + esc(s.version) + '\x3c/div><div class="small text-muted">' + esc((s.credit || {}).text || '') + ' · ' + esc((s.credit || {}).notice || '') + '\x3c/div>\x3c/div>\x3c/div>\x3c/div>\x3c/div>' +
        '<div class="col-12"><div class="d-flex align-items-center gap-2 mb-2 mt-2"><h6 class="fw-bold mb-0">ประวัติการใช้งาน\x3c/h6>\x3c/div><div id="logBox">\x3c/div>\x3c/div>' +
        '\x3c/div>';

      SP.on(body, 'click', '[data-tool]', function (e, b) {
        var t = b.dataset.tool;
        var run = function () {
          ui.busy(b, true, 'กำลังทำงาน...');
          var fn = { trig: 'apiInstallTriggers', backup: 'apiBackupNow', repair: 'apiRepairSheets' }[t];
          return SP.api(fn).then(function (x) {
            SP.toast(x.message);
            if (t === 'backup' && x.data && x.data.url) window.open(x.data.url, '_blank');
            if (t !== 'backup') SP.route();
          }).catch(function (err) { SP.toast(err.message, 'error'); }).then(function () { ui.busy(b, false); });
        };
        if (t === 'repair') ui.confirm('ระบบจะตรวจหัวคอลัมน์และสร้างคอลัมน์ค้นหาใหม่จากข้อมูล JSON ทุกแถว', { okText: 'เริ่มตรวจ', icon: 'bi-wrench-adjustable' }).then(function (y) { if (y) run(); });
        else run();
      });

      SP.listView({
        el: SP.$('#logBox', body), api: 'apiListLogs', searchPh: 'ค้นหาผู้ใช้ การกระทำ รายละเอียด', size: 20,
        toolbar: '<select class="form-select form-select-sm w-auto" data-filter="kind"><option value="">ประวัติการบันทึก\x3c/option><option value="errors">ข้อผิดพลาดของระบบ\x3c/option>\x3c/select>',
        empty: { icon: 'bi-journal-text', title: 'ยังไม่มีประวัติ' },
        columns: [
          { label: 'เวลา', cls: 'small text-nowrap', render: function (r) { return esc(SP.fmtDate(r.ts, true)); } },
          { label: 'ผู้ใช้ / ฟังก์ชัน', cls: 'small', render: function (r) { return esc(r.user || r.fn); } },
          { label: 'การกระทำ', cls: 'small', render: function (r) { return r.action ? SP.pill(r.action, 'mute') : SP.pill('error', 'danger'); } },
          { label: 'รายละเอียด', cls: 'small', render: function (r) { return esc(r.summary || r.message) + (r.sheet ? ' <span class="text-muted">(' + esc(r.sheet) + ')\x3c/span>' : ''); } }
        ]
      });
    });
  };

  /* =========================================================
     ACCOUNT
     ========================================================= */
  SP.pages.account = function (el, param) {
    var u = SP.user;
    el.innerHTML = '<div class="page-head"><div><h1>บัญชีของฉัน\x3c/h1><div class="sub">ข้อมูลส่วนตัวและความปลอดภัย\x3c/div>\x3c/div>\x3c/div>' +
      (u.must_change ? '<div class="alert alert-warning"><i class="bi bi-shield-exclamation">\x3c/i><div><b>กรุณาเปลี่ยนรหัสผ่าน\x3c/b> รหัสผ่านนี้ตั้งโดยผู้ดูแลระบบ เปลี่ยนเป็นรหัสของคุณเองก่อนใช้งาน\x3c/div>\x3c/div>' : '') +
      '<div class="row g-3">' +
      '<div class="col-lg-4"><div class="card"><div class="card-body text-center py-4">' +
      '<span class="avatar avatar-xl mb-3">' + SP.initials(u.name) + '\x3c/span>' +
      '<div class="fw-bold fs-5">' + esc(u.name) + '\x3c/div><div class="text-muted">@' + esc(u.username) + '\x3c/div>' +
      '<div class="mt-2">' + SP.pill(u.role_label, ROLE_TONE[u.role]) + '\x3c/div>' +
      (u.dept_name ? '<div class="small text-muted mt-2"><i class="bi bi-diagram-3 me-1">\x3c/i>' + esc(u.dept_name) + '\x3c/div>' : '') +
      '<button class="btn btn-light btn-sm mt-3" type="button" id="accOut"><i class="bi bi-box-arrow-right me-1">\x3c/i>ออกจากระบบ\x3c/button>' +
      '\x3c/div>\x3c/div>\x3c/div>' +
      '<div class="col-lg-8">' +
      '<form class="card" id="profForm" novalidate><div class="card-header"><i class="bi bi-person text-primary">\x3c/i>ข้อมูลส่วนตัว\x3c/div><div class="card-body"><div class="row g-3">' +
      ui.field('name', 'ชื่อ-สกุล', u.name, { required: true, col: 'col-md-6' }) +
      ui.field('position', 'ตำแหน่ง', u.position, { col: 'col-md-6' }) +
      ui.field('email', 'อีเมล', u.email, { type: 'email', col: 'col-md-6' }) +
      ui.field('phone', 'โทรศัพท์', u.phone, { col: 'col-md-6' }) +
      '<div class="col-12 text-end"><button class="btn btn-primary" type="submit"><i class="bi bi-check2 me-1">\x3c/i>บันทึก\x3c/button>\x3c/div>' +
      '\x3c/div>\x3c/div>\x3c/form>' +
      '<form class="card mt-3" id="pwForm" novalidate><div class="card-header"><i class="bi bi-key text-primary">\x3c/i>เปลี่ยนรหัสผ่าน\x3c/div><div class="card-body"><div class="row g-3">' +
      ui.field('old', 'รหัสผ่านเดิม', '', { type: 'password', required: true, col: 'col-md-4', attrs: { autocomplete: 'current-password' } }) +
      ui.field('pw1', 'รหัสผ่านใหม่', '', { type: 'password', required: true, col: 'col-md-4', attrs: { minlength: 8, autocomplete: 'new-password' }, invalid: 'อย่างน้อย 8 ตัวอักษร' }) +
      ui.field('pw2', 'ยืนยันรหัสผ่านใหม่', '', { type: 'password', required: true, col: 'col-md-4', attrs: { minlength: 8, autocomplete: 'new-password' } }) +
      '<div class="col-12 text-end"><button class="btn btn-primary" type="submit"><i class="bi bi-shield-lock me-1">\x3c/i>เปลี่ยนรหัสผ่าน\x3c/button>\x3c/div>' +
      '\x3c/div>\x3c/div>\x3c/form>\x3c/div>\x3c/div>';

    SP.$('#accOut', el).addEventListener('click', function () { SP.logout(); });

    var prof = SP.$('#profForm', el);
    prof.addEventListener('submit', function (e) {
      e.preventDefault(); prof.classList.add('was-validated');
      if (!prof.checkValidity()) return;
      var b = prof.querySelector('[type=submit]'); ui.busy(b, true);
      SP.api('apiSaveProfile', ui.val(prof)).then(function (x) {
        SP.toast(x.message); SP.user = Object.assign(SP.user, x.data); SP.applySettings({});
      }).catch(function (err) { SP.toast(err.message, 'error'); }).then(function () { ui.busy(b, false); });
    });

    var pw = SP.$('#pwForm', el);
    pw.addEventListener('submit', function (e) {
      e.preventDefault(); pw.classList.add('was-validated');
      if (!pw.checkValidity()) return;
      var d = ui.val(pw);
      if (d.pw1 !== d.pw2) { SP.toast('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', 'warning'); return; }
      var b = pw.querySelector('[type=submit]'); ui.busy(b, true);
      SP.api('apiChangePassword', d.old, d.pw1).then(function (x) {
        SP.toast(x.message); pw.reset(); pw.classList.remove('was-validated');
        if (SP.user.must_change) { SP.user.must_change = false; SP.go('dashboard'); }
      }).catch(function (err) { SP.toast(err.message, 'error'); }).then(function () { ui.busy(b, false); });
    });

    if (param === 'password') setTimeout(function () { pw.scrollIntoView({ behavior: 'smooth', block: 'center' }); pw.querySelector('[name=old]').focus(); }, 150);
  };
})();

/* ==========================================================
   รายงาน + งานพิมพ์ A4 + ส่งออก CSV
   ========================================================== */
(function () {
  'use strict';
  var SP = window.SP, ui = SP.ui, esc = SP.esc;

  SP.MENU.splice(1, 0, { key: 'reports', label: 'รายงาน', icon: 'bi-file-earmark-bar-graph', color: '', roles: null, place: 'rail', desc: 'สรุปงบ เบิกจ่าย ความก้าวหน้า พิมพ์และส่งออก' });
  var TABS = [
    { key: 'dept', label: 'ตามหน่วยงาน', icon: 'bi-diagram-3' },
    { key: 'source', label: 'ตามแหล่งงบ', icon: 'bi-bank' },
    { key: 'strategy', label: 'ตามยุทธศาสตร์', icon: 'bi-bullseye' },
    { key: 'quarter', label: 'รายไตรมาส', icon: 'bi-calendar3-range' },
    { key: 'register', label: 'ทะเบียนโครงการ', icon: 'bi-list-columns' },
    { key: 'disb', label: 'ทะเบียนเบิกจ่าย', icon: 'bi-receipt' }
  ];
  SP.addSearch(TABS.map(function (t) { return { label: 'รายงาน: ' + t.label, desc: 'พิมพ์ A4 และส่งออก CSV', icon: t.icon, href: '#/reports/' + t.key, roles: null }; }));
  var DSTL = { pending: 'รอหัวหน้าตรวจ', checked: 'รอการเงินตรวจ', approved: 'รอจ่ายเงิน', paid: 'จ่ายแล้ว', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' };

  /* ---------- จำนวนเงินเป็นตัวอักษร ---------- */
  SP.bahtText = function (n) {
    n = Math.round((Number(n) || 0) * 100) / 100;
    if (n < 0) return 'ลบ' + SP.bahtText(-n);
    var D = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'], P = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
    var six = function (s) {
      var out = '', len = s.length;
      for (var i = 0; i < len; i++) {
        var d = +s[i], p = len - i - 1;
        if (!d) continue;
        if (p === 0 && d === 1 && len > 1) out += 'เอ็ด';
        else if (p === 1 && d === 2) out += 'ยี่';
        else if (p === 1 && d === 1) out += '';
        else out += D[d];
        out += P[p];
      }
      return out;
    };
    var read = function (num) {
      var s = String(num); if (s === '0') return 'ศูนย์';
      var parts = []; while (s.length > 6) { parts.unshift(s.slice(-6)); s = s.slice(0, -6); } parts.unshift(s);
      return parts.map(function (p, i) { return six(String(+p)) + (i < parts.length - 1 ? 'ล้าน' : ''); }).join('');
    };
    var baht = Math.floor(n), satang = Math.round((n - baht) * 100);
    return (baht ? read(baht) + 'บาท' : (satang ? '' : 'ศูนย์บาท')) + (satang ? read(satang) + 'สตางค์' : 'ถ้วน');
  };

  /* ---------- ดาวน์โหลด / พิมพ์ ---------- */
  SP.download = function (name, text, mime) {
    var blob = new Blob(['﻿' + text], { type: mime || 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.target = '_self'; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };

  SP.print = {};
  /** opt: {title, subtitle, html, landscape, noHead} */
  SP.print.open = function (opt) {
    var s = SP.settings, area = SP.$('#printArea');
    var head = '<div class="pr-head">' + (s.logo_url ? '<img class="pr-logo" src="' + esc(s.logo_url) + '" alt="">' : '') +
      '<div class="pr-orgbox"><div class="pr-org">' + esc(s.org_name || '') + '\x3c/div><div class="pr-sub">' + esc(s.org_sub || '') + '\x3c/div>\x3c/div>' +
      '<div class="pr-meta">พิมพ์เมื่อ ' + esc(SP.fmtDate(new Date().toISOString(), true)) + '<br>โดย ' + esc(SP.user.name) + '\x3c/div>\x3c/div>' +
      '<h1 class="pr-title">' + esc(opt.title) + '\x3c/h1>' + (opt.subtitle ? '<div class="pr-subtitle">' + esc(opt.subtitle) + '\x3c/div>' : '');
    var cr = SP.credit || {};
    area.innerHTML = '<div class="pr-doc">' + (opt.noHead ? '' : head) + opt.html + '<div class="pr-credit">' + esc((cr.app || 'ProjectOne') + ' · ' + (cr.text || 'พัฒนาโดย Naiyachon Ponthong') + ' · ' + (cr.notice || 'สงวนลิขสิทธิ์ ห้ามจำหน่าย')) + '\x3c/div>\x3c/div>';
    SP.$('#printPage').textContent = '@page{size:A4 ' + (opt.landscape ? 'landscape' : 'portrait') + ';margin:12mm 12mm 14mm}';
    var imgs = SP.$$('img', area), left = imgs.length, done = false;
    var go = function () { if (done) return; done = true; setTimeout(function () { window.print(); }, 80); };
    if (!left) return go();
    imgs.forEach(function (im) { if (im.complete) { if (!--left) go(); } else { im.onload = im.onerror = function () { if (!--left) go(); }; } });
    setTimeout(go, 2500);
  };
  var sign = function (arr) {
    return '<div class="pr-signs">' + arr.map(function (x) {
      return '<div class="pr-sign"><div class="pr-line">ลงชื่อ ......................................................\x3c/div><div>( ' + (x.name ? esc(x.name) : '......................................................') + ' )\x3c/div><div>' + esc(x.role) + '\x3c/div><div class="pr-date">วันที่ ........ / ........ / ........\x3c/div>\x3c/div>';
    }).join('') + '\x3c/div>';
  };
  var sec = function (no, title, body) { return '<div class="pr-sec"><div class="pr-h"><b>' + no + '. ' + esc(title) + '\x3c/b>\x3c/div><div class="pr-body">' + body + '\x3c/div>\x3c/div>'; };
  var lines = function (t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); };
  var prose = function (t) { return t ? '<div class="prose">' + esc(t) + '\x3c/div>' : '<span class="pr-muted">-\x3c/span>'; };

  /** แบบเสนอโครงการ (ข้อมูลจาก apiGetProject) */
  SP.print.project = function (p) {
    var acts = p.activities || [], sumW = 0, sumB = 0;
    acts.forEach(function (a) { sumW += a.weight; sumB += a.budget; });
    var obj = lines(p.objectives);
    var html =
      sec(1, 'ชื่อโครงการ', esc(p.name) + ' <span class="pr-muted">(รหัส ' + esc(p.code) + ')\x3c/span>') +
      sec(2, 'หน่วยงานที่รับผิดชอบ', esc(p.dept_name)) +
      sec(3, 'ผู้รับผิดชอบโครงการ', esc(p.owner_name) + (p.owner_position ? ' ตำแหน่ง ' + esc(p.owner_position) : '') + (p.co_owners ? '<br>ผู้ร่วมรับผิดชอบ ' + esc(p.co_owners) : '')) +
      sec(4, 'ความสอดคล้องกับยุทธศาสตร์', esc(p.strategy_name) || '<span class="pr-muted">-\x3c/span>') +
      sec(5, 'หลักการและเหตุผล', prose(p.rationale)) +
      sec(6, 'วัตถุประสงค์', obj.length ? '<ol>' + obj.map(function (o) { return '<li>' + esc(o) + '\x3c/li>'; }).join('') + '\x3c/ol>' : '<span class="pr-muted">-\x3c/span>') +
      sec(7, 'เป้าหมาย', '<div><b>7.1 เชิงปริมาณ\x3c/b>\x3c/div>' + prose(p.target_quant) + '<div class="mt-1"><b>7.2 เชิงคุณภาพ\x3c/b>\x3c/div>' + prose(p.target_qual)) +
      sec(8, 'ระยะเวลาและสถานที่ดำเนินการ', esc(SP.fmtDate(p.start_date)) + ' ถึง ' + esc(SP.fmtDate(p.end_date)) + (p.location ? '<br>สถานที่ ' + esc(p.location) : '')) +
      sec(9, 'กิจกรรมและงบประมาณ', '<table class="pr-table"><thead><tr><th style="width:6%">ที่\x3c/th><th>กิจกรรม\x3c/th><th style="width:24%">ระยะเวลา\x3c/th><th style="width:9%">น้ำหนัก\x3c/th><th style="width:16%">งบประมาณ (บาท)\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
        (acts.length ? acts.map(function (a, i) {
          return '<tr><td class="c">' + (i + 1) + '\x3c/td><td>' + esc(a.name) + (a.output ? '<div class="pr-muted">ผลผลิต: ' + esc(a.output) + '\x3c/div>' : '') + (a.responsible ? '<div class="pr-muted">ผู้รับผิดชอบ: ' + esc(a.responsible) + '\x3c/div>' : '') + '\x3c/td><td>' + esc(SP.fmtDate(a.start_date)) + ' ถึง ' + esc(SP.fmtDate(a.end_date)) + '\x3c/td><td class="r">' + a.weight + '\x3c/td><td class="r">' + SP.money(a.budget) + '\x3c/td>\x3c/tr>';
        }).join('') : '<tr><td colspan="5" class="c pr-muted">-\x3c/td>\x3c/tr>') +
        '\x3c/tbody><tfoot><tr><td colspan="3" class="r"><b>รวม\x3c/b>\x3c/td><td class="r"><b>' + Math.round(sumW * 10) / 10 + '\x3c/b>\x3c/td><td class="r"><b>' + SP.money(sumB) + '\x3c/b>\x3c/td>\x3c/tr>\x3c/tfoot>\x3c/table>') +
      sec(10, 'งบประมาณ', 'แหล่งงบประมาณ ' + (esc(p.source_name) || '-') + '<br>งบประมาณที่ขอ ' + SP.money(p.budget_request) + ' บาท (' + SP.bahtText(p.budget_request) + ')' +
        (p.budget_approved ? '<br>งบประมาณที่อนุมัติ ' + SP.money(p.budget_approved) + ' บาท (' + SP.bahtText(p.budget_approved) + ')' : '')) +
      sec(11, 'ตัวชี้วัดความสำเร็จ', p.kpis && p.kpis.length ? '<table class="pr-table"><thead><tr><th>ตัวชี้วัด\x3c/th><th style="width:18%">ค่าเป้าหมาย\x3c/th><th style="width:16%">หน่วย\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
        p.kpis.map(function (k) { return '<tr><td>' + esc(k.name) + '\x3c/td><td class="c">' + esc(k.target) + '\x3c/td><td class="c">' + esc(k.unit) + '\x3c/td>\x3c/tr>'; }).join('') + '\x3c/tbody>\x3c/table>' : '<span class="pr-muted">-\x3c/span>') +
      sec(12, 'ผลที่คาดว่าจะได้รับ', prose(p.expected_outcome)) +
      sign([{ name: p.owner_name, role: 'ผู้เสนอโครงการ' }, { name: '', role: 'หัวหน้า' + (p.dept_name || 'หน่วยงาน') }, { name: '', role: 'ผู้อนุมัติโครงการ' }]);
    SP.print.open({ title: 'แบบเสนอโครงการ', subtitle: 'ประจำปีงบประมาณ ' + p.fiscal_year, html: html });
  };

  /** รายงานผลการดำเนินโครงการ */
  SP.print.projectSummary = function (p) {
    var f = p.finance || { approved: 0, paid: 0, committed: 0, available: 0 }, sc = p.scurve;
    var st = (SP.PROJECT_STATUS[p.status] || { label: p.status }).label;
    var html = '<table class="pr-kv"><tbody>' +
      [['โครงการ', esc(p.code) + ' ' + esc(p.name)], ['หน่วยงาน', esc(p.dept_name)], ['ผู้รับผิดชอบ', esc(p.owner_name)], ['ระยะเวลา', esc(SP.fmtDate(p.start_date)) + ' ถึง ' + esc(SP.fmtDate(p.end_date))],
        ['สถานะ', esc(st)], ['ความก้าวหน้า', p.progress + '%' + (sc ? ' (ตามแผน ' + sc.plan + '%, ส่วนต่าง ' + (sc.variance > 0 ? '+' : '') + sc.variance + '%)' : '')]]
        .map(function (r) { return '<tr><th>' + r[0] + '\x3c/th><td>' + r[1] + '\x3c/td>\x3c/tr>'; }).join('') + '\x3c/tbody>\x3c/table>' +
      '<div class="pr-h"><b>1. ผลการดำเนินงานรายกิจกรรม\x3c/b>\x3c/div><table class="pr-table"><thead><tr><th style="width:6%">ที่\x3c/th><th>กิจกรรม\x3c/th><th style="width:10%">น้ำหนัก\x3c/th><th style="width:14%">ความก้าวหน้า\x3c/th><th style="width:16%">งบ (บาท)\x3c/th><th style="width:16%">เบิกแล้ว/ผูกพัน\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
      (p.activities || []).map(function (a, i) { return '<tr><td class="c">' + (i + 1) + '\x3c/td><td>' + esc(a.name) + '\x3c/td><td class="r">' + a.weight + '\x3c/td><td class="r">' + a.progress + '%\x3c/td><td class="r">' + SP.money(a.budget) + '\x3c/td><td class="r">' + SP.money(a.spent || 0) + '\x3c/td>\x3c/tr>'; }).join('') +
      '\x3c/tbody>\x3c/table>' +
      '<div class="pr-h"><b>2. การใช้จ่ายงบประมาณ\x3c/b>\x3c/div><table class="pr-kv"><tbody>' +
      [['งบประมาณที่อนุมัติ', SP.money(f.approved)], ['เบิกจ่ายแล้ว', SP.money(f.paid) + ' (' + SP.pct(f.paid, f.approved) + '%)'], ['รอเบิก / ผูกพัน', SP.money(f.committed)], ['คงเหลือ', SP.money(f.available)]]
        .map(function (r) { return '<tr><th>' + r[0] + '\x3c/th><td>' + r[1] + ' บาท\x3c/td>\x3c/tr>'; }).join('') + '\x3c/tbody>\x3c/table>' +
      ((p.disbursements || []).length ? '<table class="pr-table"><thead><tr><th>เลขที่\x3c/th><th>รายการ\x3c/th><th>สถานะ\x3c/th><th style="width:16%">จำนวน (บาท)\x3c/th>\x3c/tr>\x3c/thead><tbody>' +
        p.disbursements.map(function (d) { return '<tr><td>' + esc(d.doc_no) + '\x3c/td><td>' + esc(d.title) + '\x3c/td><td>' + esc(DSTL[d.status] || d.status) + '\x3c/td><td class="r">' + SP.money(d.status === 'paid' ? d.paid_amount : d.amount) + '\x3c/td>\x3c/tr>'; }).join('') + '\x3c/tbody>\x3c/table>' : '') +
      '<div class="pr-h"><b>3. สรุปรายงานความก้าวหน้า\x3c/b>\x3c/div>' +
      ((p.reports || []).length ? (p.reports || []).slice(0, 12).map(function (r) {
        return '<div class="pr-rep"><b>' + esc(SP.fmtDate(r.report_date)) + '\x3c/b> · ' + esc(r.activity_name) + ' ' + r.progress + '% <span class="pr-muted">(' + esc(r.by_name) + ')\x3c/span><div class="prose">' + esc(r.result) + '\x3c/div>' +
          (r.problem ? '<div><u>ปัญหา/อุปสรรค\x3c/u> ' + esc(r.problem) + '\x3c/div>' : '') + (r.solution ? '<div><u>แนวทางแก้ไข\x3c/u> ' + esc(r.solution) + '\x3c/div>' : '') + '\x3c/div>';
      }).join('') : '<div class="pr-muted">ยังไม่มีรายงาน\x3c/div>') +
      sign([{ name: p.owner_name, role: 'ผู้รายงาน' }, { name: '', role: 'หัวหน้า' + (p.dept_name || 'หน่วยงาน') }]);
    SP.print.open({ title: 'รายงานผลการดำเนินโครงการ', subtitle: 'ปีงบประมาณ ' + p.fiscal_year + ' ข้อมูล ณ ' + SP.fmtDate(SP.today()), html: html });
  };

  /** บันทึกขอเบิกเงิน (ข้อมูลจาก apiGetDisbursement) */
  SP.print.disb = function (r) {
    var f = r.finance || {}, after = f.available || 0;
    var html = '<div class="pr-memo"><div class="pr-row2"><div><b>ที่\x3c/b> ' + esc(r.doc_no) + '\x3c/div><div><b>วันที่\x3c/b> ' + esc(SP.fmtDate(r.request_date)) + '\x3c/div>\x3c/div>' +
      '<div><b>เรื่อง\x3c/b> ขออนุมัติเบิกเงิน ' + esc(r.title) + '\x3c/div><div><b>เรียน\x3c/b> ผู้บริหาร\x3c/div>' +
      '<p class="pr-indent">ด้วย ' + esc(r.dept_name) + ' มีความประสงค์ขอเบิกเงินเพื่อ ' + esc(r.title) + ' ตามโครงการ ' + esc(r.project_code) + ' ' + esc(r.project_name) +
      (r.activity_name ? ' กิจกรรม ' + esc(r.activity_name) : '') + ' เป็นเงิน <b>' + SP.money(r.amount) + '\x3c/b> บาท (' + SP.bahtText(r.amount) + ') รายละเอียดดังนี้\x3c/p>' +
      '<table class="pr-kv"><tbody>' + [['ประเภทค่าใช้จ่าย', esc(r.category)], ['ผู้รับเงิน', esc(r.payee) || '-'], ['วันที่ต้องการใช้เงิน', r.needed_date ? esc(SP.fmtDate(r.needed_date)) : '-'],
        ['งบประมาณโครงการ (อนุมัติ)', SP.money(f.approved) + ' บาท'], ['เบิกจ่ายแล้ว / ผูกพัน (รวมรายการนี้)', SP.money(f.paid) + ' / ' + SP.money(f.committed) + ' บาท'], ['คงเหลือ', SP.money(after) + ' บาท']]
        .map(function (x) { return '<tr><th>' + x[0] + '\x3c/th><td>' + x[1] + '\x3c/td>\x3c/tr>'; }).join('') + '\x3c/tbody>\x3c/table>' +
      (r.note ? '<div><b>หมายเหตุ\x3c/b> ' + esc(r.note) + '\x3c/div>' : '') +
      (r.attachments && r.attachments.length ? '<div><b>เอกสารแนบ\x3c/b> ' + r.attachments.map(function (a) { return esc(a.name); }).join(', ') + '\x3c/div>' : '') +
      '<p class="pr-indent">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ\x3c/p>\x3c/div>' +
      sign([{ name: r.requested_by_name, role: 'ผู้ขอเบิก' }, { name: '', role: 'หัวหน้า' + (r.dept_name || 'หน่วยงาน') }, { name: '', role: 'เจ้าหน้าที่การเงิน' }]) +
      '<div class="pr-box"><b>ส่วนการจ่ายเงิน\x3c/b>' + (r.status === 'paid'
        ? '<div>จ่ายแล้วเมื่อ ' + esc(SP.fmtDate(r.paid_date)) + ' จำนวน ' + SP.money(r.paid_amount) + ' บาท (' + SP.bahtText(r.paid_amount) + ')' + (r.voucher_no ? ' เลขที่ใบสำคัญ ' + esc(r.voucher_no) : '') + '\x3c/div>'
        : '<div>จ่ายเมื่อ ........................ จำนวน ........................ บาท เลขที่ใบสำคัญ ........................\x3c/div>') +
      '<div class="pr-line mt-3">ลงชื่อ ...................................................... ผู้จ่ายเงิน\x3c/div>\x3c/div>';
    SP.print.open({ title: 'บันทึกข้อความขอเบิกเงิน', html: html });
  };

  /* ---------- ตารางรายงาน (spec เดียว ใช้แสดง พิมพ์ ส่งออก) ---------- */
  var R = SP.report = {};
  R.fmt = function (v, f) {
    if (f === 'money') return SP.money(v);
    if (f === 'money0') return SP.money(v, 0);
    if (f === 'pct') return (Number(v) || 0) + '%';
    if (f === 'int') return (Number(v) || 0).toLocaleString('th-TH');
    if (f === 'date') return v ? SP.fmtDate(v) : '';
    if (f === 'pstatus') return (SP.PROJECT_STATUS[v] || { label: v }).label;
    if (f === 'dstatus') return DSTL[v] || v;
    return v == null ? '' : String(v);
  };
  var num = function (f) { return /money|pct|int/.test(f || ''); };
  /** spec: {title, cols:[{key,label,fmt,w,link}], rows, total} */
  R.table = function (spec, forPrint) {
    var th = spec.cols.map(function (c) { return '<th class="' + (num(c.fmt) ? 'text-end r' : '') + '"' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.label) + '\x3c/th>'; }).join('');
    var td = function (row, c, isTot) {
      var v = row[c.key], t = esc(R.fmt(v, c.fmt));
      if (!forPrint && c.link && !isTot && c.link(row)) t = '<a href="' + c.link(row) + '" class="text-reset">' + t + '\x3c/a>';
      if (!forPrint && c.bar && !isTot) t = '<div class="mini-bar"><div class="progress"><div class="progress-bar" style="width:' + Math.min(100, Number(v) || 0) + '%">\x3c/div>\x3c/div><span class="small num">' + t + '\x3c/span>\x3c/div>';
      return '<td class="' + (num(c.fmt) ? 'text-end r num' : '') + (c.small ? ' small' : '') + '">' + t + '\x3c/td>';
    };
    var body = spec.rows.length ? spec.rows.map(function (r) { return '<tr>' + spec.cols.map(function (c) { return td(r, c); }).join('') + '\x3c/tr>'; }).join('')
      : '<tr><td colspan="' + spec.cols.length + '" class="text-center text-muted c">ไม่มีข้อมูล\x3c/td>\x3c/tr>';
    var foot = spec.total ? '<tfoot><tr class="fw-bold">' + spec.cols.map(function (c) { return td(spec.total, c, true); }).join('') + '\x3c/tr>\x3c/tfoot>' : '';
    return (forPrint && spec.title ? '<div class="pr-h"><b>' + esc(spec.title) + '\x3c/b>\x3c/div>' : '') +
      '<table class="' + (forPrint ? 'pr-table' : 'table table-hover report-table') + (spec.rows.length ? '' : ' is-empty') + '"><thead><tr>' + th + '\x3c/tr>\x3c/thead><tbody>' + body + '\x3c/tbody>' + foot + '\x3c/table>';
  };
  R.csv = function (specs, filename) {
    var q = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var out = [];
    specs.forEach(function (spec, i) {
      if (i) out.push('');
      if (spec.title) out.push(q(spec.title));
      out.push(spec.cols.map(function (c) { return q(c.label); }).join(','));
      spec.rows.concat(spec.total ? [spec.total] : []).forEach(function (r) {
        out.push(spec.cols.map(function (c) { var v = r[c.key]; return q(num(c.fmt) ? (Number(v) || 0) : R.fmt(v, c.fmt)); }).join(','));
      });
    });
    SP.download(filename, out.join('\r\n'));
  };

  /* ---------- หน้ารายงาน ---------- */
  var BUILD = {};
  var groupCols = function (first, hasAlloc) {
    return [{ key: 'name', label: first }, { key: 'projects', label: 'โครงการ', fmt: 'int', w: '7%' }]
      .concat(hasAlloc ? [{ key: 'allocated', label: 'งบจัดสรร', fmt: 'money0' }] : [])
      .concat([{ key: 'approved', label: 'อนุมัติให้โครงการ', fmt: 'money0' }])
      .concat(hasAlloc ? [{ key: 'remaining', label: 'คงเหลือจัดสรร', fmt: 'money0' }] : [])
      .concat([{ key: 'paid', label: 'เบิกจ่ายแล้ว', fmt: 'money0' }, { key: 'committed', label: 'ผูกพัน', fmt: 'money0' },
        { key: 'rate', label: 'อัตราเบิกจ่าย', fmt: 'pct', bar: true }, { key: 'progress', label: 'ความก้าวหน้าเฉลี่ย', fmt: 'pct' }]);
  };
  BUILD.dept = function (fy) {
    return SP.api('apiReportByDept', fy).then(function (r) {
      return { specs: [{ title: 'สรุปงบประมาณและการเบิกจ่ายตามหน่วยงาน', cols: groupCols('หน่วยงาน', r.data.has_alloc), rows: r.data.rows, total: r.data.total }], landscape: r.data.has_alloc };
    });
  };
  BUILD.source = function (fy) {
    return SP.api('apiReportBySource', fy).then(function (r) {
      return { specs: [{ title: 'สรุปงบประมาณและการเบิกจ่ายตามแหล่งงบประมาณ', cols: groupCols('แหล่งงบประมาณ', r.data.has_alloc), rows: r.data.rows, total: r.data.total }], landscape: r.data.has_alloc };
    });
  };
  BUILD.strategy = function (fy) {
    return SP.api('apiReportByStrategy', fy).then(function (r) {
      return { specs: [{ title: 'สรุปโครงการตามยุทธศาสตร์', cols: [{ key: 'name', label: 'ยุทธศาสตร์' }, { key: 'projects', label: 'โครงการ', fmt: 'int' }, { key: 'completed', label: 'เสร็จสิ้น', fmt: 'int' },
        { key: 'approved', label: 'งบอนุมัติ', fmt: 'money0' }, { key: 'paid', label: 'เบิกจ่ายแล้ว', fmt: 'money0' }, { key: 'rate', label: 'อัตราเบิกจ่าย', fmt: 'pct', bar: true }, { key: 'progress', label: 'ความก้าวหน้าเฉลี่ย', fmt: 'pct' }], rows: r.data.rows, total: r.data.total }] };
    });
  };
  BUILD.quarter = function (fy) {
    return SP.api('apiReportQuarterly', fy).then(function (r) {
      var d = r.data;
      d.quarters.forEach(function (q) { q.name = q.label + ' (' + q.range + ')'; });
      var qt = { name: 'รวมทั้งปี', count: 0, paid: 0, cumulative: '', pct: d.quarters[3].pct };
      d.quarters.forEach(function (q) { qt.count += q.count; qt.paid += q.paid; });
      qt.cumulative = qt.paid;
      return {
        intro: '<div class="small text-muted mb-2">งบอนุมัติให้โครงการรวม ' + SP.money(d.approved, 0) + ' บาท · ผูกพันคงค้าง ' + SP.money(d.committed, 0) + ' บาท\x3c/div>' + quarterChart(d.quarters),
        specs: [
          { title: 'ผลการเบิกจ่ายรายไตรมาส (ตามวันที่จ่าย)', cols: [{ key: 'name', label: 'ไตรมาส' }, { key: 'count', label: 'รายการ', fmt: 'int' }, { key: 'paid', label: 'เบิกจ่าย', fmt: 'money0' }, { key: 'cumulative', label: 'สะสม', fmt: 'money0' }, { key: 'pct', label: 'สะสม % ของงบอนุมัติ', fmt: 'pct', bar: true }], rows: d.quarters, total: qt },
          { title: 'การเบิกจ่ายรายไตรมาส แยกตามหน่วยงาน', cols: [{ key: 'name', label: 'หน่วยงาน' }, { key: 'q1', label: 'ไตรมาส 1', fmt: 'money0' }, { key: 'q2', label: 'ไตรมาส 2', fmt: 'money0' }, { key: 'q3', label: 'ไตรมาส 3', fmt: 'money0' }, { key: 'q4', label: 'ไตรมาส 4', fmt: 'money0' }, { key: 'total', label: 'รวม', fmt: 'money0' }], rows: d.depts, total: d.total }
        ]
      };
    });
  };
  BUILD.register = function (fy, f) {
    return SP.api('apiReportRegister', fy, f).then(function (r) {
      var rows = r.data.rows, tot = { code: '', name: 'รวม ' + rows.length + ' โครงการ', approved: 0, paid: 0, remaining: 0 };
      rows.forEach(function (x) { tot.approved += x.approved; tot.paid += x.paid; tot.remaining += x.remaining; });
      return { truncated: r.data.truncated, landscape: true, specs: [{ title: 'ทะเบียนโครงการ', rows: rows, total: tot, cols: [
        { key: 'code', label: 'รหัส', w: '8%' }, { key: 'name', label: 'ชื่อโครงการ', link: function (x) { return '#/projects/' + x.id; } }, { key: 'dept', label: 'หน่วยงาน', small: true }, { key: 'owner', label: 'ผู้รับผิดชอบ', small: true },
        { key: 'status', label: 'สถานะ', fmt: 'pstatus', small: true }, { key: 'approved', label: 'งบอนุมัติ', fmt: 'money0' }, { key: 'paid', label: 'เบิกจ่าย', fmt: 'money0' },
        { key: 'remaining', label: 'คงเหลือ', fmt: 'money0' }, { key: 'progress', label: 'ก้าวหน้า', fmt: 'pct' }, { key: 'end_date', label: 'สิ้นสุด', fmt: 'date', small: true }] }] };
    });
  };
  BUILD.disb = function (fy, f) {
    return SP.api('apiReportDisbursements', fy, f).then(function (r) {
      var rows = r.data.rows, tot = { doc_no: '', title: 'รวม ' + rows.length + ' รายการ', amount: 0, paid_amount: 0 };
      rows.forEach(function (x) { if (x.status !== 'rejected' && x.status !== 'cancelled') tot.amount += x.amount; tot.paid_amount += x.paid_amount; });
      return { truncated: r.data.truncated, landscape: true, specs: [{ title: 'ทะเบียนคุมการเบิกจ่าย', rows: rows, total: tot, cols: [
        { key: 'doc_no', label: 'เลขที่', w: '9%' }, { key: 'request_date', label: 'วันที่ขอ', fmt: 'date', small: true }, { key: 'project', label: 'โครงการ', small: true }, { key: 'title', label: 'รายการ' },
        { key: 'dept', label: 'หน่วยงาน', small: true }, { key: 'amount', label: 'ขอเบิก', fmt: 'money' }, { key: 'status', label: 'สถานะ', fmt: 'dstatus', small: true },
        { key: 'paid_amount', label: 'จ่ายจริง', fmt: 'money' }, { key: 'paid_date', label: 'วันที่จ่าย', fmt: 'date', small: true }, { key: 'voucher_no', label: 'ใบสำคัญ', small: true }] }] };
    });
  };

  function quarterChart(qs) {
    var max = Math.max.apply(null, qs.map(function (q) { return q.paid; }).concat([1]));
    var W = 520, H = 190, L = 12, B = 34, T = 22, bw = 70, gap = (W - L * 2 - bw * 4) / 3;
    var g = '<line x1="' + L + '" x2="' + (W - L) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="#e5e7eb"/>';
    qs.forEach(function (q, i) {
      var h = Math.max(q.paid ? 4 : 0, (H - B - T) * q.paid / max), x = L + i * (bw + gap), y = H - B - h;
      g += (q.paid ? '<g><title>' + esc(q.label + ' ' + SP.money(q.paid) + ' บาท') + '\x3c/title><path d="M' + x + ' ' + (H - B) + 'V' + (y + 4) + 'Q' + x + ' ' + y + ' ' + (x + 4) + ' ' + y + 'H' + (x + bw - 4) + 'Q' + (x + bw) + ' ' + y + ' ' + (x + bw) + ' ' + (y + 4) + 'V' + (H - B) + 'Z" fill="var(--sb-primary)"/>\x3c/g>' : '') +
        '<text x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#1f2937">' + esc(SP.moneyShort(q.paid)) + '\x3c/text>' +
        '<text x="' + (x + bw / 2) + '" y="' + (H - B + 18) + '" text-anchor="middle" font-size="12" fill="#6b7280">' + esc(q.label) + '\x3c/text>';
    });
    return '<div class="card mb-3"><div class="card-header"><i class="bi bi-bar-chart text-primary">\x3c/i>ยอดเบิกจ่ายรายไตรมาส (บาท)\x3c/div><div class="card-body"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:620px" role="img" aria-label="กราฟยอดเบิกจ่ายรายไตรมาส">' + g + '\x3c/svg>\x3c/div>\x3c/div>';
  }

  SP.pages.reports = function (el, param, seq) {
    var cur = TABS.filter(function (t) { return t.key === param; })[0] || TABS[0];
    var lk = SP.lookups, all = SP.can(['admin', 'executive', 'planner', 'finance']);
    var filt = '';
    if (cur.key === 'register') filt = '<select class="form-select form-select-sm w-auto" data-rf="status"><option value="">ทุกสถานะ\x3c/option>' + Object.keys(SP.PROJECT_STATUS).map(function (k) { return '<option value="' + k + '">' + SP.PROJECT_STATUS[k].label + '\x3c/option>'; }).join('') + '\x3c/select>' +
      (all ? '<select class="form-select form-select-sm w-auto" data-rf="dept_id"><option value="">ทุกหน่วยงาน\x3c/option>' + (lk.departments || []).map(function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.name) + '\x3c/option>'; }).join('') + '\x3c/select>' : '');
    if (cur.key === 'disb') filt = '<select class="form-select form-select-sm w-auto" data-rf="status"><option value="">ทุกสถานะ\x3c/option>' + Object.keys(DSTL).map(function (k) { return '<option value="' + k + '">' + DSTL[k] + '\x3c/option>'; }).join('') + '\x3c/select>';
    el.innerHTML = '<div id="rpRoot"><div class="page-head"><div><h1>รายงาน\x3c/h1><div class="sub">ปีงบประมาณ ' + esc(SP.fy) + '\x3c/div>\x3c/div>' +
      '<div class="actions"><button class="btn btn-light" type="button" data-rp="csv" disabled><i class="bi bi-filetype-csv me-1">\x3c/i>ส่งออก CSV\x3c/button><button class="btn btn-primary" type="button" data-rp="print" disabled><i class="bi bi-printer me-1">\x3c/i>พิมพ์ A4\x3c/button>\x3c/div>\x3c/div>' +
      '<ul class="nav nav-pills mb-3">' + TABS.map(function (t) { return '<li class="nav-item"><a class="nav-link' + (t.key === cur.key ? ' active' : '') + '" href="#/reports/' + t.key + '"><i class="bi ' + t.icon + ' me-1">\x3c/i>' + t.label + '\x3c/a>\x3c/li>'; }).join('') + '\x3c/ul>' +
      (filt ? '<div class="d-flex gap-2 flex-wrap mb-3">' + filt + '\x3c/div>' : '') + '<div id="rpBody">' + ui.loading() + '\x3c/div>\x3c/div>';
    var root = SP.$('#rpRoot', el), body = SP.$('#rpBody', el), data = null, f = {};
    var load = function () {
      body.style.opacity = data ? '.5' : '';
      return BUILD[cur.key](SP.fy, f).then(function (d) {
        if (!SP.alive(seq)) return;
        data = d; body.style.opacity = '';
        body.innerHTML = (d.truncated ? '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle">\x3c/i><div>ข้อมูลเกิน 2,000 แถว แสดงเฉพาะ 2,000 แถวแรก ใช้ตัวกรองเพื่อแบ่งรายงาน\x3c/div>\x3c/div>' : '') + (d.intro || '') +
          d.specs.map(function (s) { return '<div class="card mb-3"><div class="card-header">' + esc(s.title) + '\x3c/div><div class="table-wrap">' + R.table(s) + '\x3c/div>\x3c/div>'; }).join('');
        SP.$$('[data-rp]', root).forEach(function (b) { b.disabled = false; });
      }).catch(function (err) { body.style.opacity = ''; body.innerHTML = ui.errorBox(err.message); });
    };
    SP.on(root, 'change', '[data-rf]', function (e, s) { f[s.dataset.rf] = s.value; load(); });
    SP.on(root, 'click', '[data-rp]', function (e, b) {
      if (!data) return;
      if (b.dataset.rp === 'csv') R.csv(data.specs, 'ProjectOne_' + cur.key + '_' + SP.fy + '.csv');
      else SP.print.open({ title: cur.label === 'ทะเบียนโครงการ' || cur.label === 'ทะเบียนเบิกจ่าย' ? data.specs[0].title : 'รายงาน' + cur.label, subtitle: 'ปีงบประมาณ ' + SP.fy, landscape: !!data.landscape, html: data.specs.map(function (s) { return R.table(s, true); }).join('') });
    });
    return load();
  };
})();
