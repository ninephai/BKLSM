/* พัฒนาโดย นายเกียรติอนันต์ สุกทน · Copyright (c) 2026 นายเกียรติอนันต์ สุกทน */
/* ==========================================================
   ProjectOne : js_core  (window.SP)
   srun / api / toast / esc / format / theme / ui / router / shell
   ========================================================== */
(function () {
  'use strict';

  var SP = window.SP = {
    token: null, user: null, settings: {}, lookups: {}, roles: [],
    fy: '', pageKey: '', param: '', pages: {}, _seq: 0
  };

  /* ---------- error visibility ---------- */
  window.onerror = function (msg, src, line, col, err) {
    try { SP.toast('เกิดข้อผิดพลาดในหน้าเว็บ: ' + msg, 'error'); } catch (e) { /* ignore */ }
    console.error(err || msg, src, line, col);
    return false;
  };
  window.addEventListener('unhandledrejection', function (e) {
    var m = (e.reason && e.reason.message) || String(e.reason || 'ไม่ทราบสาเหตุ');
    try { SP.toast(m, 'error'); } catch (x) { /* ignore */ }
  });

  /* ---------- DOM helpers ---------- */
  SP.$ = function (sel, root) { return (root || document).querySelector(sel); };
  SP.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  SP.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  SP.on = function (root, ev, sel, fn) {
    root.addEventListener(ev, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) fn.call(t, e, t);
    });
  };
  SP.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 300); }; };

  SP.store = {
    get: function (k) { try { return localStorage.getItem('p1_' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('p1_' + k, v); } catch (e) { /* ignore */ } },
    del: function (k) { try { localStorage.removeItem('p1_' + k); } catch (e) { /* ignore */ } }
  };

  /* ---------- server calls ---------- */
  SP.srun = function (fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (resolve, reject) {
      var r = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      if (typeof r[fn] !== 'function') { reject(new Error('ไม่พบฟังก์ชันฝั่งเซิร์ฟเวอร์: ' + fn)); return; }
      r[fn].apply(r, args);
    });
  };

  /** เรียก api* พร้อม token, คืน response ที่ status=success; ไม่สำเร็จ = throw */
  SP.api = function (fn) {
    var args = [fn, SP.token].concat(Array.prototype.slice.call(arguments, 1));
    return SP.srun.apply(null, args).then(function (r) {
      if (!r) throw new Error('ไม่มีข้อมูลตอบกลับจากเซิร์ฟเวอร์');
      if (r.status !== 'success') {
        if (r.code === 'INTEGRITY') SP.poBlock(r.message);
        if (r.code === 'AUTH') SP.forceLogin(r.message);
        var err = new Error(r.message || 'ทำรายการไม่สำเร็จ'); err.code = r.code; throw err;
      }
      return r;
    }, function (e) {
      throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ' + ((e && e.message) || e));
    });
  };

  /* ---------- toast ---------- */
  SP.toast = function (msg, type) {
    type = type || 'success';
    var icon = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type] || 'bi-info-circle-fill';
    var box = document.getElementById('toastBox');
    var el = document.createElement('div');
    el.className = 'sp-toast ' + type;
    el.innerHTML = '<i class="bi ' + icon + '">\x3c/i><div>' + SP.esc(msg) + '\x3c/div>';
    box.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, type === 'error' ? 6000 : 3200);
  };

  /* ---------- format ---------- */
  var TZ = 'Asia/Bangkok';
  function toDate(v) {
    if (!v) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return new Date(v + 'T00:00:00+07:00');
    var d = new Date(v); return isNaN(d) ? null : d;
  }
  /** วันที่ไทย พ.ศ. ผ่าน Intl (timezone Asia/Bangkok) จุดเดียว */
  SP.fmtDate = function (v, withTime) {
    var d = toDate(v); if (!d) return '';
    var o = { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', o).format(d);
  };
  SP.today = function () { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); };
  SP.money = function (n, dec) {
    var x = Number(n) || 0; dec = dec == null ? 2 : dec;
    return x.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  SP.moneyShort = function (n) {
    var x = Number(n) || 0, a = Math.abs(x);
    if (a >= 1e6) return (x / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ล้าน';
    if (a >= 1e4) return (x / 1e3).toLocaleString('th-TH', { maximumFractionDigits: 1 }) + ' พัน';
    return x.toLocaleString('th-TH', { maximumFractionDigits: 0 });
  };
  SP.pct = function (a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; };
  SP.initials = function (name) {
    var s = String(name || '?').replace(/^(นาย|นางสาว|นาง|น\.ส\.|ดร\.|ผศ\.|รศ\.|ศ\.)\s*/, '').trim();
    return SP.esc(s.charAt(0) || '?');
  };
  SP.pill = function (text, tone, dot) {
    return '<span class="pill pill-' + (tone || 'mute') + (dot ? ' pill-dot' : '') + '">' + SP.esc(text) + '\x3c/span>';
  };

  /* ---------- theme (สีเดียว > ชุดสี) ---------- */
  SP.THEME_PRESETS = ['#F26522', '#E11D48', '#DB2777', '#9333EA', '#4F46E5', '#2563EB', '#0284C7', '#0D9488', '#16A34A', '#65A30D', '#CA8A04', '#475569'];
  function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function rgbToHex(r) { return '#' + r.map(function (x) { x = Math.max(0, Math.min(255, Math.round(x))); return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
  function mix(rgb, to, t) { return rgb.map(function (c, i) { return c + (to[i] - c) * t; }); }
  SP.theme = function (hex) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex || '')) hex = '#F26522';
    var c = hexToRgb(hex), W = [255, 255, 255], K = [0, 0, 0];
    var css = ':root{' +
      '--sb-primary:' + hex + ';' +
      '--sb-primary-600:' + rgbToHex(mix(c, K, 0.1)) + ';' +
      '--sb-primary-700:' + rgbToHex(mix(c, K, 0.27)) + ';' +
      '--sb-primary-50:' + rgbToHex(mix(c, W, 0.93)) + ';' +
      '--sb-primary-100:' + rgbToHex(mix(c, W, 0.86)) + ';' +
      '--sb-primary-200:' + rgbToHex(mix(c, W, 0.71)) + ';' +
      '--sb-primary-rgb:' + c.join(',') + ';' +
      '--sb-grad-from:' + rgbToHex(mix(c, W, 0.28)) + ';' +
      '--sb-grad-to:' + rgbToHex(mix(c, K, 0.04)) + ';}';
    document.getElementById('theme-vars').textContent = css;
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', hex);
  };

  /* ---------- UI helpers (modal เดียวใช้ร่วม) ---------- */
  var ui = SP.ui = { _combo: {}, _seq: 0 };
  var modalEl, modal, saveHandler = null;

  ui.loading = function (text) {
    return '<div class="text-center text-muted py-5"><div class="spinner-border spinner-border-sm me-2" style="color:var(--sb-primary)">\x3c/div>' + SP.esc(text || 'กำลังโหลด...') + '\x3c/div>';
  };
  ui.empty = function (icon, title, desc, action) {
    return '<div class="empty"><div class="e-ico"><i class="bi ' + (icon || 'bi-inbox') + '">\x3c/i>\x3c/div><div class="e-t">' + SP.esc(title) + '\x3c/div>' +
      (desc ? '<div class="e-d">' + SP.esc(desc) + '\x3c/div>' : '') + (action ? '<div class="mt-3">' + action + '\x3c/div>' : '') + '\x3c/div>';
  };
  ui.errorBox = function (msg) {
    return '<div class="alert alert-danger"><i class="bi bi-exclamation-octagon">\x3c/i><div><b>โหลดข้อมูลไม่สำเร็จ\x3c/b><div>' + SP.esc(msg) + '\x3c/div>' +
      '<button class="btn btn-sm btn-light mt-2" type="button" data-sp-retry>ลองใหม่\x3c/button>\x3c/div>\x3c/div>';
  };

  function attrs(o) {
    var s = '';
    Object.keys(o || {}).forEach(function (k) { if (o[k] === false || o[k] == null) return; s += ' ' + k + (o[k] === true ? '' : '="' + SP.esc(o[k]) + '"'); });
    return s;
  }
  function wrap(label, inner, o) {
    var id = o._id;
    return '<div class="' + (o.col || 'col-12') + '">' +
      (label ? '<label class="form-label' + (o.required ? ' req' : '') + '" for="' + id + '">' + SP.esc(label) + '\x3c/label>' : '') +
      inner + (o.help ? '<div class="form-text">' + SP.esc(o.help) + '\x3c/div>' : '') +
      '<div class="invalid-feedback">' + SP.esc(o.invalid || 'กรุณากรอกข้อมูลให้ถูกต้อง') + '\x3c/div>\x3c/div>';
  }

  /** field(name,label,value,{type,required,placeholder,help,col,rows,min,max,step,maxlength,readonly,attrs}) */
  ui.field = function (name, label, value, o) {
    o = o || {}; o._id = 'f_' + name + '_' + (++ui._seq);
    var type = o.type || 'text', inner;
    var a = attrs(Object.assign({ id: o._id, name: name, placeholder: o.placeholder, required: !!o.required, readonly: !!o.readonly, min: o.min, max: o.max, step: o.step, maxlength: o.maxlength, pattern: o.pattern }, o.attrs || {}));
    if (type === 'textarea') inner = '<textarea class="form-control"' + a + ' rows="' + (o.rows || 3) + '">' + SP.esc(value) + '\x3c/textarea>';
    else inner = '<input type="' + type + '" class="form-control"' + a + ' value="' + SP.esc(value == null ? '' : value) + '">';
    if (o.prefix || o.suffix) inner = '<div class="input-group">' + (o.prefix ? '<span class="input-group-text">' + o.prefix + '\x3c/span>' : '') + inner + (o.suffix ? '<span class="input-group-text">' + o.suffix + '\x3c/span>' : '') + '\x3c/div>';
    return wrap(label, inner, o);
  };

  /** options: [{value,label}] หรือ ['a','b'] */
  ui.selectField = function (name, label, options, value, o) {
    o = o || {}; o._id = 'f_' + name + '_' + (++ui._seq);
    var opts = (o.placeholder != null ? '<option value="">' + SP.esc(o.placeholder) + '\x3c/option>' : '') +
      (options || []).map(function (x) {
        if (typeof x !== 'object') x = { value: x, label: x };
        return '<option value="' + SP.esc(x.value) + '"' + (String(x.value) === String(value == null ? '' : value) ? ' selected' : '') + '>' + SP.esc(x.label) + '\x3c/option>';
      }).join('');
    return wrap(label, '<select class="form-select"' + attrs(Object.assign({ id: o._id, name: name, required: !!o.required }, o.attrs || {})) + '>' + opts + '\x3c/select>', o);
  };

  ui.checkField = function (name, label, checked, o) {
    o = o || {}; var id = 'f_' + name + '_' + (++ui._seq);
    return '<div class="' + (o.col || 'col-12') + '"><div class="form-check form-switch">' +
      '<input class="form-check-input" type="checkbox" role="switch" data-bool="1" id="' + id + '" name="' + name + '"' + (checked ? ' checked' : '') + '>' +
      '<label class="form-check-label" for="' + id + '">' + SP.esc(label) + '\x3c/label>\x3c/div>' + (o.help ? '<div class="form-text">' + SP.esc(o.help) + '\x3c/div>' : '') + '\x3c/div>';
  };

  /** dropdown ค้นหาได้ โชว์รายการทันทีเมื่อโฟกัส  options [{value,label,sub}] */
  ui.comboField = function (name, label, options, value, o) {
    o = o || {}; o._id = 'f_' + name + '_' + (++ui._seq);
    var key = 'cb' + ui._seq; ui._combo[key] = { options: options || [], allowEmpty: o.allowEmpty !== false, emptyLabel: o.emptyLabel || '' };
    var cur = (options || []).filter(function (x) { return String(x.value) === String(value); })[0];
    var inner = '<div class="combo" data-combo="' + key + '"' + (o.required ? ' data-required="1"' : '') + '>' +
      '<input type="hidden" name="' + name + '" value="' + SP.esc(cur ? cur.value : '') + '">' +
      '<input type="text" class="form-control combo-input" id="' + o._id + '" autocomplete="off" placeholder="' + SP.esc(o.placeholder || 'คลิกเพื่อเลือก หรือพิมพ์ค้นหา') + '" value="' + SP.esc(cur ? cur.label : '') + '">' +
      '<i class="bi bi-chevron-down c-caret">\x3c/i><div class="combo-list">\x3c/div>\x3c/div>';
    return wrap(label, inner, o);
  };

  function comboRender(box, filter) {
    var cfg = ui._combo[box.dataset.combo]; if (!cfg) return;
    var list = box.querySelector('.combo-list'), hid = box.querySelector('input[type=hidden]');
    var q = String(filter || '').trim().toLowerCase();
    var items = cfg.options.filter(function (x) { return !q || (x.label + ' ' + (x.sub || '') + ' ' + (x.search || '')).toLowerCase().indexOf(q) >= 0; });
    var html = '';
    if (cfg.allowEmpty && cfg.emptyLabel && !q) html += '<div class="c-opt" data-v="">' + SP.esc(cfg.emptyLabel) + '\x3c/div>';
    html += items.slice(0, 200).map(function (x) {
      return '<div class="c-opt' + (String(x.value) === hid.value ? ' sel' : '') + '" data-v="' + SP.esc(x.value) + '">' + SP.esc(x.label) + (x.sub ? '<small>' + SP.esc(x.sub) + '\x3c/small>' : '') + '\x3c/div>';
    }).join('');
    list.innerHTML = html || '<div class="c-empty">ไม่พบรายการที่ค้นหา\x3c/div>';
  }
  function comboPick(box, v) {
    var cfg = ui._combo[box.dataset.combo];
    var hid = box.querySelector('input[type=hidden]'), inp = box.querySelector('.combo-input');
    var it = cfg.options.filter(function (x) { return String(x.value) === String(v); })[0];
    hid.value = it ? it.value : ''; inp.value = it ? it.label : '';
    inp.classList.remove('is-invalid');
    box.classList.remove('open');
    hid.dispatchEvent(new Event('change', { bubbles: true }));
  }
  document.addEventListener('focusin', function (e) {
    var inp = e.target.closest && e.target.closest('.combo-input'); if (!inp) return;
    var box = inp.closest('.combo'); comboRender(box, ''); box.classList.add('open'); inp.select();
  });
  document.addEventListener('input', function (e) {
    var inp = e.target.closest && e.target.closest('.combo-input'); if (!inp) return;
    var box = inp.closest('.combo'); comboRender(box, inp.value); box.classList.add('open');
  });
  document.addEventListener('mousedown', function (e) {
    var opt = e.target.closest && e.target.closest('.combo .c-opt');
    if (opt) { e.preventDefault(); comboPick(opt.closest('.combo'), opt.dataset.v); return; }
    SP.$$('.combo.open').forEach(function (b) { if (!b.contains(e.target)) comboClose(b); });
  });
  document.addEventListener('keydown', function (e) {
    var inp = e.target.closest && e.target.closest('.combo-input'); if (!inp) return;
    var box = inp.closest('.combo'), opts = SP.$$('.c-opt', box), i = opts.findIndex(function (o) { return o.classList.contains('hl'); });
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); box.classList.add('open');
      if (i >= 0) opts[i].classList.remove('hl');
      i = e.key === 'ArrowDown' ? Math.min(opts.length - 1, i + 1) : Math.max(0, i - 1);
      if (opts[i]) { opts[i].classList.add('hl'); opts[i].scrollIntoView({ block: 'nearest' }); }
    } else if (e.key === 'Enter' && box.classList.contains('open')) {
      e.preventDefault(); var pick = opts[i >= 0 ? i : 0]; if (pick) comboPick(box, pick.dataset.v);
    } else if (e.key === 'Escape') { comboClose(box); }
  });
  document.addEventListener('focusout', function (e) {
    var inp = e.target.closest && e.target.closest('.combo-input'); if (!inp) return;
    setTimeout(function () { var b = inp.closest('.combo'); if (b && !b.contains(document.activeElement)) comboClose(b); }, 120);
  });
  function comboClose(box) {
    box.classList.remove('open');
    var cfg = ui._combo[box.dataset.combo], hid = box.querySelector('input[type=hidden]'), inp = box.querySelector('.combo-input');
    if (!cfg) return;
    if (!inp.value.trim() && cfg.allowEmpty) { hid.value = ''; return; }
    var it = cfg.options.filter(function (x) { return String(x.value) === hid.value; })[0];
    inp.value = it ? it.label : '';
  }

  /** อ่านค่าฟอร์มเป็น object */
  ui.val = function (form) {
    var o = {};
    SP.$$('input[name],select[name],textarea[name]', form).forEach(function (el) {
      if (el.dataset.bool) o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type !== 'file') o[el.name] = el.value;
    });
    return o;
  };

  ui.busy = function (btn, on, text) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1">\x3c/span>' + SP.esc(text || 'กำลังบันทึก...'); }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  };

  function validate(form) {
    var okv = form.checkValidity();
    SP.$$('.combo[data-required]', form).forEach(function (b) {
      var hid = b.querySelector('input[type=hidden]'), inp = b.querySelector('.combo-input');
      if (!hid.value) { okv = false; inp.classList.add('is-invalid'); } else inp.classList.remove('is-invalid');
    });
    form.classList.add('was-validated');
    if (!okv) {
      var bad = form.querySelector(':invalid:not(fieldset), .is-invalid');
      if (bad) bad.focus();
      SP.toast('กรุณากรอกข้อมูลที่จำเป็นให้ครบ', 'warning');
    }
    return okv;
  }

  /**
   * openForm({title, body, size:'lg'|'xl'|'sm', saveText, hideSave, onSave(data, form) => Promise|any, onShown(form)})
   * onSave คืน false = ไม่ปิด modal
   */
  ui.openForm = function (opt) {
    modalEl = modalEl || document.getElementById('spModal');
    modal = modal || bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
    var dlg = modalEl.querySelector('.modal-dialog');
    dlg.className = 'modal-dialog modal-dialog-centered modal-dialog-scrollable' + (opt.size ? ' modal-' + opt.size : '');
    SP.$('#spModalTitle').textContent = opt.title || '';
    SP.$('#spModalBody').innerHTML = opt.body || '';
    var save = SP.$('#spModalSave');
    save.textContent = opt.saveText || 'บันทึก';
    save.classList.toggle('d-none', !!opt.hideSave);
    save.disabled = false;
    var form = SP.$('#spModalForm');
    form.classList.remove('was-validated');
    saveHandler = opt.onSave || null;
    var runShown = function () { try { opt.onShown(form); } catch (e) { SP.toast(e.message, 'error'); } };
    if (opt.onShown) {
      if (modalEl.classList.contains('show')) setTimeout(runShown, 0);
      else modalEl.addEventListener('shown.bs.modal', function h() { modalEl.removeEventListener('shown.bs.modal', h); runShown(); });
    }
    modal.show();
    return form;
  };
  ui.closeForm = function () { if (modal) modal.hide(); };

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('spModalForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!saveHandler || !validate(form)) return;
      var btn = SP.$('#spModalSave');
      ui.busy(btn, true);
      Promise.resolve().then(function () { return saveHandler(ui.val(form), form); })
        .then(function (res) { ui.busy(btn, false); if (res !== false) ui.closeForm(); })
        .catch(function (err) { ui.busy(btn, false); SP.toast(err.message || String(err), 'error'); });
    });
  });

  /** confirm(msg,{title,okText,danger}) => Promise<boolean> */
  ui.confirm = function (msg, o) {
    o = o || {};
    var el = document.getElementById('spConfirm');
    if (!el) {
      el = document.createElement('div');
      el.className = 'modal fade'; el.id = 'spConfirm'; el.tabIndex = -1;
      el.innerHTML = '<div class="modal-dialog modal-dialog-centered modal-sm"><div class="modal-content"><div class="modal-body text-center p-4">' +
        '<div class="e-ico mb-3 mx-auto" style="width:56px;height:56px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">\x3c/div>' +
        '<h5 class="fw-bold mb-1 cf-title">\x3c/h5><div class="text-muted cf-msg">\x3c/div>' +
        '<div class="d-flex gap-2 mt-4"><button class="btn btn-light flex-fill" data-cf="0" type="button">ยกเลิก\x3c/button><button class="btn flex-fill cf-ok" data-cf="1" type="button">\x3c/button>\x3c/div>' +
        '\x3c/div>\x3c/div>\x3c/div>';
      document.body.appendChild(el);
    }
    var ico = el.querySelector('.e-ico');
    ico.className = 'e-ico mb-3 mx-auto ' + (o.danger ? 'tint-danger' : 'tint-primary');
    ico.innerHTML = '<i class="bi ' + (o.icon || (o.danger ? 'bi-trash3' : 'bi-question-lg')) + '">\x3c/i>';
    el.querySelector('.cf-title').textContent = o.title || 'ยืนยันการทำรายการ';
    el.querySelector('.cf-msg').textContent = msg || '';
    var ok = el.querySelector('.cf-ok');
    ok.className = 'btn flex-fill cf-ok ' + (o.danger ? 'btn-danger' : 'btn-primary');
    ok.textContent = o.okText || 'ยืนยัน';
    var m = bootstrap.Modal.getOrCreateInstance(el);
    return new Promise(function (resolve) {
      var answered = false;
      var click = function (e) { var b = e.target.closest('[data-cf]'); if (!b) return; answered = true; resolve(b.dataset.cf === '1'); m.hide(); };
      el.addEventListener('click', click);
      el.addEventListener('hidden.bs.modal', function h() { el.removeEventListener('hidden.bs.modal', h); el.removeEventListener('click', click); if (!answered) resolve(false); });
      m.show();
    });
  };

  /** วงแหวนความก้าวหน้า */
  ui.ring = function (pct, size, label) {
    size = size || 120; pct = Math.max(0, Math.min(100, Number(pct) || 0));
    var sw = Math.round(size * 0.1), r = (size - sw) / 2, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '"><defs><linearGradient id="rg' + size + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--sb-grad-from)"/><stop offset="1" stop-color="var(--sb-grad-to)"/>\x3c/linearGradient>\x3c/defs>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#eef0f3" stroke-width="' + sw + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#rg' + size + ')" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '"/>\x3c/svg>' +
      '<div class="r-val"><b>' + (Math.round(pct * 10) / 10) + '%\x3c/b><small>' + SP.esc(label || '') + '\x3c/small>\x3c/div>\x3c/div>';
  };

  ui.bar = function (label, right, pct, sub) {
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<div class="bar-row"><div class="b-top"><span class="fw-600 text-truncate">' + SP.esc(label) + '\x3c/span><span class="text-muted num">' + right + '\x3c/span>\x3c/div>' +
      '<div class="progress"><div class="progress-bar" style="width:' + pct + '%">\x3c/div>\x3c/div>' + (sub ? '<div class="small-xs text-muted mt-1">' + sub + '\x3c/div>' : '') + '\x3c/div>';
  };

  ui.stat = function (icon, tint, val, label, sub) {
    return '<div class="card stat"><div class="s-ico tint-' + tint + '"><i class="bi ' + icon + '">\x3c/i>\x3c/div><div class="min-w-0">' +
      '<div class="s-val num">' + val + '\x3c/div><div class="s-lbl">' + SP.esc(label) + '\x3c/div>' + (sub ? '<div class="s-sub">' + sub + '\x3c/div>' : '') + '\x3c/div>\x3c/div>';
  };

  /** ภาพประกอบ hero (SVG ในไฟล์) */
  ui.heroArt = function () {
    return '<svg class="hero-art" viewBox="0 0 210 150" aria-hidden="true">' +
      '<ellipse cx="110" cy="142" rx="90" ry="8" fill="rgba(0,0,0,.18)"/>' +
      '<rect x="40" y="86" width="26" height="54" rx="7" fill="rgba(255,255,255,.28)"/>' +
      '<rect x="74" y="62" width="26" height="78" rx="7" fill="rgba(255,255,255,.4)"/>' +
      '<rect x="108" y="38" width="26" height="102" rx="7" fill="url(#hg)"/>' +
      '<defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sb-grad-from)"/><stop offset="1" stop-color="var(--sb-grad-to)"/>\x3c/linearGradient>\x3c/defs>' +
      '<circle cx="168" cy="96" r="24" fill="#fbbf24"/><circle cx="168" cy="96" r="17" fill="#f59e0b"/>' +
      '<text x="168" y="103" text-anchor="middle" font-size="20" font-weight="700" fill="#fff7ed">฿\x3c/text>' +
      '<circle cx="152" cy="40" r="15" fill="#fff"/><path d="M145 40l5 5 9-10" stroke="#16a34a" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '\x3c/svg>';
  };

  /** pagination html */
  ui.pager = function (page, size, total) {
    var pages = Math.max(1, Math.ceil(total / size));
    var a = total ? (page - 1) * size + 1 : 0, b = Math.min(total, page * size);
    var info = '<div>แสดง ' + a + '-' + b + ' จาก ' + total.toLocaleString('th-TH') + ' รายการ\x3c/div>';
    if (pages <= 1) return info;
    var from = Math.max(1, page - 2), to = Math.min(pages, from + 4); from = Math.max(1, to - 4);
    var li = function (p, txt, dis, act) { return '<li class="page-item' + (dis ? ' disabled' : '') + (act ? ' active' : '') + '"><button type="button" class="page-link" data-page="' + p + '">' + txt + '\x3c/button>\x3c/li>'; };
    var h = li(page - 1, '<i class="bi bi-chevron-left">\x3c/i>', page <= 1);
    for (var p = from; p <= to; p++) h += li(p, p, false, p === page);
    h += li(page + 1, '<i class="bi bi-chevron-right">\x3c/i>', page >= pages);
    return info + '<ul class="pagination pagination-sm mb-0">' + h + '\x3c/ul>';
  };

  /**
   * ตารางรายการแบบแบ่งหน้า (เรียก api ที่รับ {page,size,q,filters,sort,dir})
   * opt: {el, api, columns:[{key,label,render(row),cls,th}], actions(html ปุ่มขวา), toolbar(html ตัวกรอง data-filter),
   *       searchPh, empty:{icon,title,desc}, onAction(act,row,ctrl), size, filters, rowKey}
   */
  SP.listView = function (opt) {
    var st = { page: 1, size: opt.size || 25, q: '', filters: Object.assign({}, opt.filters || {}), sort: opt.sort || '', dir: opt.dir || '' };
    var el = opt.el, rows = [], seq = 0;
    el.innerHTML = '<div class="card">' +
      '<div class="toolbar"><div class="search"><i class="bi bi-search">\x3c/i><input type="search" class="form-control form-control-sm lv-q" placeholder="' + SP.esc(opt.searchPh || 'ค้นหา') + '">\x3c/div>' +
      (opt.toolbar || '') + '<div class="ms-auto d-flex gap-2 flex-wrap">' + (opt.actions || '') + '\x3c/div>\x3c/div>' +
      '<div class="table-wrap"><table class="table table-hover"><thead><tr>' +
      opt.columns.map(function (c) { return '<th class="' + (c.th || c.cls || '') + '">' + SP.esc(c.label) + '\x3c/th>'; }).join('') +
      '\x3c/tr>\x3c/thead><tbody class="lv-body">\x3c/tbody>\x3c/table>\x3c/div><div class="list-foot lv-foot">\x3c/div>\x3c/div>';
    var body = SP.$('.lv-body', el), foot = SP.$('.lv-foot', el);
    var ctrl = { state: st, reload: load, rows: function () { return rows; } };

    function load() {
      var my = ++seq;
      body.innerHTML = '<tr><td colspan="' + opt.columns.length + '">' + ui.loading() + '\x3c/td>\x3c/tr>';
      return SP.api(opt.api, { page: st.page, size: st.size, q: st.q, filters: st.filters, sort: st.sort, dir: st.dir }).then(function (r) {
        if (my !== seq) return;
        var d = r.data; rows = d.rows; st.page = d.page;
        if (!rows.length) {
          var e = opt.empty || {};
          body.innerHTML = '<tr><td colspan="' + opt.columns.length + '">' + ui.empty(e.icon || 'bi-inbox', st.q ? 'ไม่พบรายการที่ค้นหา' : (e.title || 'ยังไม่มีข้อมูล'), st.q ? 'ลองเปลี่ยนคำค้นหรือตัวกรอง' : (e.desc || '')) + '\x3c/td>\x3c/tr>';
        } else {
          body.innerHTML = rows.map(function (row, i) {
            return '<tr data-i="' + i + '">' + opt.columns.map(function (c) {
              var v = c.render ? c.render(row) : SP.esc(row[c.key]);
              return '<td class="' + (c.cls || '') + '">' + (v == null ? '' : v) + '\x3c/td>';
            }).join('') + '\x3c/tr>';
          }).join('');
        }
        body.parentNode.classList.toggle('is-empty', !rows.length);
        foot.innerHTML = ui.pager(d.page, d.size, d.total);
        if (opt.onLoaded) opt.onLoaded(d, ctrl);
      }).catch(function (err) {
        if (my !== seq) return;
        body.innerHTML = '<tr><td colspan="' + opt.columns.length + '">' + ui.errorBox(err.message) + '\x3c/td>\x3c/tr>';
      });
    }

    SP.$('.lv-q', el).addEventListener('input', SP.debounce(function (e) { st.q = e.target.value; st.page = 1; load(); }, 350));
    SP.on(el, 'change', '[data-filter]', function (e, t) { st.filters[t.dataset.filter] = t.value; st.page = 1; load(); });
    SP.on(foot, 'click', '[data-page]', function (e, t) { var p = Number(t.dataset.page); if (p >= 1) { st.page = p; load(); } });
    SP.on(body, 'click', '[data-sp-retry]', function () { load(); });
    SP.on(el, 'click', '[data-act]', function (e, t) {
      var tr = t.closest('tr[data-i]'); var row = tr ? rows[Number(tr.dataset.i)] : null;
      if (opt.onAction) opt.onAction(t.dataset.act, row, ctrl, t);
    });
    load();
    return ctrl;
  };

  /* ---------- menu (array-driven) ---------- */
  // key, label, icon, color(app-ico), roles(null=ทุกคน), place: rail|bottom|hidden
  SP.MENU = [
    { key: 'dashboard', label: 'หน้าแรก', icon: 'bi-grid-1x2-fill', color: '', roles: null, place: 'rail', desc: 'ภาพรวมงบประมาณและโครงการ' },
    { key: 'settings', label: 'ตั้งค่า', icon: 'bi-gear-fill', color: 'slate', roles: ['admin', 'planner'], place: 'bottom', desc: 'องค์กร ปีงบ หน่วยงาน ผู้ใช้' },
    { key: 'account', label: 'บัญชีของฉัน', icon: 'bi-person-circle', color: 'blue', roles: null, place: 'hidden', desc: 'ข้อมูลส่วนตัวและรหัสผ่าน' }
  ];
  SP.can = function (roles) { return !roles || !roles.length || (SP.user && roles.indexOf(SP.user.role) >= 0); };
  SP.menus = function () { return SP.MENU.filter(function (m) { return SP.can(m.roles); }); };
  SP.menuDef = function (key) { return SP.MENU.filter(function (m) { return m.key === key; })[0]; };

  /** รายการค้นหา: เมนู + แท็บย่อยที่ลงทะเบียน */
  SP.searchItems = [];
  SP.addSearch = function (items) { SP.searchItems = SP.searchItems.concat(items); };

  function renderShell() {
    var s = SP.settings, u = SP.user;
    var logo = s.logo_url ? '<img src="' + SP.esc(s.logo_url) + '" alt="">' : '<i class="bi bi-kanban">\x3c/i>';
    SP.$('#railLogo').innerHTML = logo;
    SP.$('#topOrg').textContent = s.org_name || 'ProjectOne';
    SP.$('#topAvatar').innerHTML = SP.initials(u.name);
    SP.$('#topName').textContent = u.name;
    SP.$('#topRole').textContent = u.role_label + (u.dept_name ? ' · ' + u.dept_name : '');
    updateFyLabel();

    var ms = SP.menus();
    var item = function (m) {
      return '<a class="rail-item" href="#/' + m.key + '" data-nav="' + m.key + '" title="' + SP.esc(m.desc || m.label) + '">' +
        '<span class="ri-ico"><i class="bi ' + m.icon + '">\x3c/i>\x3c/span><span class="ri-lbl">' + SP.esc(m.label) + '\x3c/span>' +
        '<span class="rail-badge d-none" data-badge="' + m.key + '">\x3c/span>\x3c/a>';
    };
    SP.$('#railItems').innerHTML = ms.filter(function (m) { return m.place === 'rail'; }).map(item).join('');
    SP.$('#railBottom').innerHTML = ms.filter(function (m) { return m.place === 'bottom'; }).map(item).join('') +
      '<a class="rail-avatar" href="#/account" data-nav="account" title="บัญชีของฉัน">' + SP.initials(u.name) + '\x3c/a>';

    // bottom nav มือถือ: หน้าแรก | เมนู 1 | เมนูทั้งหมด | เมนู 2 | บัญชี
    var cands = ms.filter(function (m) { return m.key !== 'dashboard' && m.key !== 'account' && m.place !== 'hidden'; })
      .sort(function (a, b) { return (b.mobile ? 1 : 0) - (a.mobile ? 1 : 0); });
    var bn = function (m) { return '<a class="bn-item" href="#/' + m.key + '" data-nav="' + m.key + '"><i class="bi ' + m.icon + '">\x3c/i>' + SP.esc(m.label) + '<span class="rail-badge d-none" data-badge="' + m.key + '">\x3c/span>\x3c/a>'; };
    SP.$('#bottomNav').innerHTML = bn(SP.menuDef('dashboard')) + (cands[0] ? bn(cands[0]) : '') +
      '<button class="bn-item bn-center" type="button" data-bs-toggle="offcanvas" data-bs-target="#menuSheet"><span class="bn-fab"><i class="bi bi-grid-3x3-gap-fill">\x3c/i>\x3c/span>เมนู\x3c/button>' +
      (cands[1] ? bn(cands[1]) : '') + bn(SP.menuDef('account'));

    SP.$('#menuSheetGrid').innerHTML = ms.map(function (m) {
      return '<a class="app-tile" href="#/' + m.key + '" data-sheet-close="1"><span class="app-ico ' + (m.color || '') + '"><i class="bi ' + m.icon + '">\x3c/i>\x3c/span>' + SP.esc(m.label) + '\x3c/a>';
    }).join('');
  }

  function updateFyLabel() {
    var s = SP.settings;
    SP.$('#topOrgSub').textContent = (s.org_sub ? s.org_sub + ' · ' : '') + 'ปีงบประมาณ ' + SP.fy;
    SP.$('#btnFy').title = 'เปลี่ยนปีงบประมาณ (' + SP.fy + ')';
  }

  function activeNav() {
    SP.$$('[data-nav]').forEach(function (a) { a.classList.toggle('active', a.dataset.nav === SP.pageKey); });
  }

  SP.applySettings = function (s) {
    SP.settings = Object.assign({}, SP.settings, s || {});
    SP.theme(SP.settings.primary_color);
    var logo = SP.settings.logo_url ? '<img src="' + SP.esc(SP.settings.logo_url) + '" alt="">' : '<i class="bi bi-kanban">\x3c/i>';
    SP.$('#loginLogo').innerHTML = logo;
    SP.$('#loginOrg').textContent = SP.settings.org_name || 'ProjectOne';
    SP.$('#loginOrgSub').textContent = SP.settings.org_sub || '';
    if (SP.user) renderShell();
  };

  /* ---------- router (ไม่ใช้ location.hash) ---------- */
  SP.go = function (path) {
    path = String(path || '').replace(/^#?\/?/, '');
    var parts = path.split('/');
    SP.pageKey = parts.shift() || 'dashboard';
    SP.param = parts.join('/');
    return SP.render();
  };
  SP.route = function () { SP.refreshBadges(true); return SP.render(true); };

  /* ---------- badge งานที่รอดำเนินการ ---------- */
  var badgeAt = 0;
  SP.badges = {};
  SP.refreshBadges = function (force) {
    if (!SP.user || !SP.token) return;
    if (!force && Date.now() - badgeAt < 30000) return;
    badgeAt = Date.now();
    SP.api('apiBadges').then(function (r) {
      SP.badges = r.data;
      var bc = SP.$('#bellCount'), un = Number(r.data.notifications || 0);
      if (bc) { bc.textContent = un > 99 ? '99+' : String(un); bc.classList.toggle('d-none', !un); }
      SP.$$('[data-badge]').forEach(function (b) {
        var n = Number(r.data[b.dataset.badge] || 0);
        b.textContent = n > 99 ? '99+' : String(n); b.classList.toggle('d-none', !n);
      });
    }).catch(function () { /* ไม่กระทบหน้าหลัก */ });
  };
  SP.alive = function (seq) { return seq === SP._seq; };

  SP.render = function (keepScroll) {
    var key = SP.pageKey, def = SP.menuDef(key);
    if (!SP.pages[key] || (def && !SP.can(def.roles))) { key = SP.pageKey = 'dashboard'; SP.param = ''; }
    if (SP.user && SP.user.must_change && key !== 'account') { key = SP.pageKey = 'account'; SP.param = 'password'; }
    activeNav();
    SP.refreshBadges();
    if (!keepScroll) window.scrollTo(0, 0);
    var el = SP.$('#page'), seq = ++SP._seq;
    if (!keepScroll) el.innerHTML = ui.loading();
    return Promise.resolve().then(function () { return SP.pages[key](el, SP.param, seq); }).catch(function (err) {
      if (!SP.alive(seq)) return;
      el.innerHTML = ui.errorBox(err.message || String(err));
      var b = el.querySelector('[data-sp-retry]'); if (b) b.addEventListener('click', function () { SP.route(); });
    });
  };

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.sheetClose) { var sh = bootstrap.Offcanvas.getInstance(SP.$('#menuSheet')); if (sh) sh.hide(); }
    SP.go(a.getAttribute('href'));
  });

  /* ---------- กระดิ่งแจ้งเตือน ---------- */
  SP.ago = function (iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'เมื่อสักครู่';
    if (s < 3600) return Math.floor(s / 60) + ' นาทีที่แล้ว';
    if (s < 86400) return Math.floor(s / 3600) + ' ชั่วโมงที่แล้ว';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' วันที่แล้ว';
    return SP.fmtDate(iso);
  };
  function bellIcon(link) {
    return /^disburse/.test(link) ? 'bi-cash-coin' : /^budget/.test(link) ? 'bi-arrow-left-right' : /^projects/.test(link) ? 'bi-kanban' : 'bi-bell';
  }
  function bellLoad() {
    var list = SP.$('#bellList');
    list.innerHTML = ui.loading();
    SP.api('apiListNotifications', { page: 1, size: 30 }).then(function (r) {
      var rows = r.data.rows;
      list.innerHTML = rows.length ? rows.map(function (n) {
        return '<button type="button" class="bell-item' + (n.read ? '' : ' unread') + '" data-nid="' + SP.esc(n.id) + '" data-link="' + SP.esc(n.link) + '">' +
          '<span class="bell-ico"><i class="bi ' + bellIcon(n.link) + '">\x3c/i>\x3c/span><span class="bell-txt"><span class="b1">' + SP.esc(n.title) + '\x3c/span>' +
          (n.body ? '<span class="b2">' + SP.esc(n.body) + '\x3c/span>' : '') + '<span class="b3">' + SP.esc(SP.ago(n.created_at)) + '\x3c/span>\x3c/span>\x3c/button>';
      }).join('') : ui.empty('bi-bell', 'ไม่มีแจ้งเตือน', 'เมื่อมีงานที่เกี่ยวกับคุณ จะแจ้งที่นี่');
    }).catch(function (err) { list.innerHTML = ui.errorBox(err.message); });
  }

  /* ---------- fiscal year switch ---------- */
  SP.setFy = function (fy) { SP.fy = String(fy); SP.store.set('fy', SP.fy); updateFyLabel(); };
  function pickFy() {
    var fys = (SP.lookups.fiscal_years || []).map(function (f) { return { value: f.year, label: f.name + (String(f.year) === String(SP.settings.current_fy) ? ' (ปีปัจจุบัน)' : '') + (f.status === 'closed' ? ' · ปิดแล้ว' : '') }; });
    ui.openForm({
      title: 'เลือกปีงบประมาณที่ต้องการดู', size: 'sm', saveText: 'ใช้ปีนี้',
      body: '<div class="row g-3">' + ui.selectField('fy', 'ปีงบประมาณ', fys, SP.fy, { required: true }) + '\x3c/div>',
      onSave: function (d) { SP.setFy(d.fy); SP.route(); }
    });
  }

  /* ---------- search Ctrl K ---------- */
  var skHl = 0;
  function searchRender() {
    var q = SP.$('#searchInput').value.trim().toLowerCase();
    var items = SP.menus().map(function (m) { return { label: m.label, desc: m.desc, icon: m.icon, href: '#/' + m.key }; })
      .concat(SP.searchItems.filter(function (x) { return SP.can(x.roles); }));
    items = items.filter(function (x) { return !q || (x.label + ' ' + (x.desc || '')).toLowerCase().indexOf(q) >= 0; });
    skHl = 0;
    SP.$('#searchList').innerHTML = items.length ? items.map(function (x, i) {
      return '<a class="sk-item' + (i === 0 ? ' hl' : '') + '" href="' + x.href + '" data-sk="1"><span class="sk-ico"><i class="bi ' + x.icon + '">\x3c/i>\x3c/span><span><span class="fw-600 d-block">' + SP.esc(x.label) + '\x3c/span><span class="small text-muted">' + SP.esc(x.desc || '') + '\x3c/span>\x3c/span>\x3c/a>';
    }).join('') : ui.empty('bi-search', 'ไม่พบเมนูที่ค้นหา', '');
  }
  function openSearch() {
    var m = bootstrap.Modal.getOrCreateInstance(SP.$('#searchModal'));
    SP.$('#searchInput').value = ''; searchRender(); m.show();
  }

  /* ---------- เครดิตผู้พัฒนา + ป้องกันการลบ/ซ่อน (ห้ามลบ: server ตรวจว่าโค้ดส่วนนี้ยังอยู่) ---------- */
  SP.credit = null;
  var poRoots = {}, poStrikes = 0, poIsBlocked = false, poStarted = false, poOverlay = null;
  var PO_SLOTS = [['poCreditLogin', 'loginView', '.login-card'], ['poCreditApp', 'appView', '.sb-main']];
  var PO_FORCE = [['display', 'block'], ['visibility', 'visible'], ['opacity', '1'], ['position', 'static'], ['transform', 'none'], ['height', 'auto'],
    ['min-height', '44px'], ['max-height', 'none'], ['overflow', 'visible'], ['clip-path', 'none'], ['filter', 'none'], ['font-size', '16px'], ['width', 'auto']];

  function poMount(id, parentSel) {
    var host = document.getElementById(id), x = poRoots[id];
    if (x && x.host === host && host && host.isConnected) return x;
    if (!host || (x && x.host !== host)) {
      if (host) host.remove();
      host = document.createElement(id === 'poCreditApp' ? 'footer' : 'div'); host.id = id;
      var parent = document.querySelector(parentSel); if (!parent) return null;
      parent.appendChild(host);
    }
    var root;
    try { root = host.attachShadow({ mode: 'closed' }); }
    catch (e) { var nh = host.cloneNode(false); host.replaceWith(nh); host = nh; root = host.attachShadow({ mode: 'closed' }); }
    root.innerHTML = '<style>:host{all:initial;display:block!important}div{font:12.5px/1.7 Sarabun,system-ui,sans-serif;color:#6b7280;text-align:center;padding:16px 10px 20px}b{color:#374151;font-weight:600}\x3c/style><div><b>\x3c/b><span>\x3c/span>\x3c/div>';
    root.querySelector('b').textContent = SP.credit.text;
    root.querySelector('span').textContent = ' · ' + SP.credit.notice + ' · ' + SP.credit.app;
    PO_FORCE.forEach(function (p) { host.style.setProperty(p[0], p[1], 'important'); });
    host.setAttribute('aria-label', SP.credit.text);
    poRoots[id] = { host: host, root: root };
    return poRoots[id];
  }
  function poOk(x) {
    if (!x || !x.host.isConnected) return false;
    var t = x.root.textContent;
    if (t.indexOf(SP.credit.text) < 0 || t.indexOf(SP.credit.notice) < 0) return false;
    var cs = getComputedStyle(x.host);
    if (cs.display === 'none' || cs.visibility !== 'visible' || Number(cs.opacity) < 0.6) return false;
    var r = x.host.getBoundingClientRect();
    if (r.width < 120 || r.height < 30) return false;
    for (var el = x.host.parentElement; el && el !== document.body; el = el.parentElement) {
      var ps = getComputedStyle(el);
      if (Number(ps.opacity) < 0.6 || ps.visibility === 'hidden') return false;
    }
    return true;
  }
  window.__poGuard = function () {
    if (!SP.credit) return;
    if (poIsBlocked) { if (!poOverlay || !poOverlay.isConnected) SP.poBlock(); return; }
    if (window.matchMedia && matchMedia('print').matches) return;
    PO_SLOTS.forEach(function (s) {
      var view = document.getElementById(s[1]);
      if (!view || view.classList.contains('d-none')) { if (!poRoots[s[0]]) poMount(s[0], s[2]); return; }
      var x = poRoots[s[0]];
      if (!poOk(x)) {
        poStrikes++;
        if (x && x.host.isConnected) x.host.remove();
        delete poRoots[s[0]];
        poMount(s[0], s[2]);
        try { SP.srun('pubTamper', s[0] + ' #' + poStrikes); } catch (e) { /* ignore */ }
      }
    });
    if (poStrikes >= 3) SP.poBlock();
  };
  SP.poState = function () { return { strikes: poStrikes, blocked: poIsBlocked }; };
  SP.poBlock = function (msg) {
    poIsBlocked = true;
    if (poOverlay && poOverlay.isConnected) return;
    var c = SP.credit || { text: 'พัฒนาโดย Naiyachon Ponthong', notice: 'สงวนลิขสิทธิ์ ห้ามจำหน่าย', app: 'ProjectOne' };
    poOverlay = document.createElement('div');
    poOverlay.style.cssText = 'position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;visibility:visible!important;opacity:1!important';
    var root = poOverlay.attachShadow({ mode: 'closed' });
    root.innerHTML = '<style>.w{position:fixed;inset:0;background:rgba(17,24,39,.86);display:flex;align-items:center;justify-content:center;font-family:Sarabun,system-ui,sans-serif}.b{background:#fff;border-radius:20px;padding:28px 26px;max-width:440px;margin:16px;text-align:center}h2{margin:0 0 8px;font-size:20px}p{color:#4b5563;margin:6px 0}.c{color:#6b7280;font-size:13px;margin-top:14px}\x3c/style>' +
      '<div class="w"><div class="b"><h2>\x3c/h2><p class="m">\x3c/p><p class="c">\x3c/p>\x3c/div>\x3c/div>';
    root.querySelector('h2').textContent = 'ระบบหยุดทำงาน';
    root.querySelector('.m').textContent = msg || 'ตรวจพบการลบหรือซ่อนข้อมูลผู้พัฒนา กรุณาโหลดหน้าใหม่ หรือติดต่อผู้ดูแลระบบ';
    root.querySelector('.c').textContent = c.app + ' · ' + c.text + ' · ' + c.notice;
    document.documentElement.appendChild(poOverlay);
  };
  SP.setCredit = function (c) {
    if (!c || !c.text) return;
    SP.credit = c;
    PO_SLOTS.forEach(function (s) { poMount(s[0], s[2]); });
    if (poStarted) return;
    poStarted = true;
    try { console.log('%c' + c.app + ' %c ' + c.text + ' · ' + c.notice, 'background:#F26522;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700', 'color:#374151'); } catch (e) { /* ignore */ }
    var t = null;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(window.__poGuard, 250); })
      .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    setInterval(window.__poGuard, 2500);
    setTimeout(window.__poGuard, 800);
  };

  /* ---------- auth / boot ---------- */
  function show(id) {
    ['bootView', 'loginView', 'appView'].forEach(function (v) { SP.$('#' + v).classList.toggle('d-none', v !== id); });
  }

  SP.forceLogin = function (msg) {
    SP.token = null; SP.user = null; SP.store.del('token');
    show('loginView');
    if (msg) SP.toast(msg, 'warning');
  };

  function showApp(me) {
    SP.user = me.user; SP.lookups = me.lookups || {}; SP.roles = me.roles || [];
    SP.settings = Object.assign({}, SP.settings, me.settings || {});
    if (me.credit) SP.setCredit(me.credit);
    var fy = SP.store.get('fy');
    var valid = (SP.lookups.fiscal_years || []).some(function (f) { return String(f.year) === String(fy); });
    SP.fy = valid ? fy : String(SP.settings.current_fy || '');
    SP.applySettings({});
    renderShell();
    show('appView');
    var start = window.__START__ || '';
    window.__START__ = '';
    if (SP.user.must_change) { SP.go('account/password'); SP.toast('กรุณาเปลี่ยนรหัสผ่านก่อนเริ่มใช้งาน', 'warning'); }
    else SP.go(start || 'dashboard');
  }

  SP.loadMe = function () {
    return SP.api('apiMe').then(function (r) { showApp(r.data); });
  };

  SP.logout = function () {
    var t = SP.token;
    SP.forceLogin();
    if (t) SP.srun('apiLogout', t).catch(function () { /* ignore */ });
  };

  function boot() {
    SP.srun('pubBoot').then(function (r) {
      if (r && r.code === 'INTEGRITY') { show('loginView'); SP.poBlock(r.message); return; }
      if (r && r.status === 'success') { SP.applySettings(r.data.settings); SP.setCredit(r.data.credit); }
      SP.token = SP.store.get('token');
      if (!SP.token) { show('loginView'); return; }
      return SP.loadMe().catch(function (e) { if (SP.token) { SP.forceLogin(); SP.toast(e.message, 'error'); } });
    }).catch(function (e) {
      show('loginView');
      SP.toast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ' + ((e && e.message) || e), 'error');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    SP.theme('#F26522');

    SP.$('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = SP.$('#lgBtn'), u = SP.$('#lgUser').value.trim(), p = SP.$('#lgPass').value;
      if (!u || !p) { SP.toast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'warning'); return; }
      ui.busy(btn, true, 'กำลังตรวจสอบ...');
      SP.srun('apiLogin', u, p).then(function (r) {
        if (r && r.code === 'INTEGRITY') SP.poBlock(r.message);
        if (!r || r.status !== 'success') throw new Error((r && r.message) || 'เข้าสู่ระบบไม่สำเร็จ');
        SP.token = r.data.token; SP.store.set('token', SP.token);
        SP.$('#lgPass').value = '';
        return SP.loadMe();
      }).catch(function (err) { SP.toast(err.message || String(err), 'error'); })
        .then(function () { ui.busy(btn, false); });
    });
    SP.$('#lgEye').addEventListener('click', function () {
      var p = SP.$('#lgPass'); p.type = p.type === 'password' ? 'text' : 'password';
      this.innerHTML = '<i class="bi ' + (p.type === 'password' ? 'bi-eye' : 'bi-eye-slash') + '">\x3c/i>';
    });
    SP.$('#btnLogout').addEventListener('click', function () { SP.logout(); });
    SP.$('#btnSearch').addEventListener('click', openSearch);
    SP.$('#btnFy').addEventListener('click', pickFy);
    SP.$('#btnBell').addEventListener('show.bs.dropdown', bellLoad);
    SP.$('#bellAll').addEventListener('click', function () {
      SP.api('apiMarkNotificationsRead', 'all').then(function () { SP.refreshBadges(true); bellLoad(); }).catch(function (err) { SP.toast(err.message, 'error'); });
    });
    SP.on(SP.$('#bellList'), 'click', '.bell-item', function (e, b) {
      var link = b.dataset.link;
      if (b.classList.contains('unread')) SP.api('apiMarkNotificationsRead', [b.dataset.nid]).then(function () { SP.refreshBadges(true); }).catch(function () { /* ignore */ });
      var dd = bootstrap.Dropdown.getInstance(SP.$('#btnBell')); if (dd) dd.hide();
      if (link) SP.go(link);
    });
    SP.$('#searchInput').addEventListener('input', searchRender);
    SP.$('#searchInput').addEventListener('keydown', function (e) {
      var items = SP.$$('#searchList .sk-item'); if (!items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); items[skHl].classList.remove('hl');
        skHl = e.key === 'ArrowDown' ? Math.min(items.length - 1, skHl + 1) : Math.max(0, skHl - 1);
        items[skHl].classList.add('hl'); items[skHl].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); items[skHl].click(); }
    });
    SP.$('#searchModal').addEventListener('shown.bs.modal', function () { SP.$('#searchInput').focus(); });
    SP.on(SP.$('#searchList'), 'click', '[data-sk]', function () { bootstrap.Modal.getOrCreateInstance(SP.$('#searchModal')).hide(); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && SP.user) { e.preventDefault(); openSearch(); }
    });

    boot();
  });
})();
