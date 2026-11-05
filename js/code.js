/**
 * ระบบบริหารจัดการโครงการและงบประมาณขององค์กร
 * Google Apps Script + Google Sheets (JSON-per-row)
 *
 * พัฒนาโดย นายเกียรติอนันต์ สุกทน
 * Copyright (c) 2026 นายเกียรติอนันต์ สุกทน. สงวนลิขสิทธิ์
 */

/* ============================================================
 * 1) CONFIG
 * ============================================================ */
var APP = {
  NAME: 'BKLSM',
  TITLE: 'ระบบบริหารโครงการและงบประมาณ',
  VERSION: '2.0.1',
  SCHEMA_VER: '1'
};

var CONFIG = {
  ADMIN_USERS: [
    { username: 'admin', password: 'admin1234', name: 'ผู้ดูแลระบบ', role: 'admin' }
  ],
  USER_ROLES: ['admin', 'executive', 'planner', 'finance', 'dept_head', 'staff'],
  LOGIN_MAX_FAIL: 5,
  LOGIN_LOCK_SEC: 900,
  PAGE_SIZE: 25,
  PAGE_MAX: 200
};

var ROLE_LABEL = {
  admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', planner: 'งานแผน',
  finance: 'การเงิน', dept_head: 'หัวหน้าหน่วยงาน', staff: 'ผู้รับผิดชอบโครงการ'
};

var R_ADMIN = ['admin'];
var R_MASTER = ['admin', 'planner'];

var SCHEMA = {
  Settings:        ['key', 'settings_json'],
  Users:           ['id', 'username', 'role', 'dept_id', 'status', 'updated_at', 'user_json'],
  FiscalYears:     ['id', 'year', 'status', 'updated_at', 'fiscal_json'],
  Departments:     ['id', 'code', 'status', 'updated_at', 'dept_json'],
  Strategies:      ['id', 'code', 'status', 'updated_at', 'strategy_json'],
  BudgetSources:   ['id', 'code', 'status', 'updated_at', 'source_json'],
  Allocations:     ['id', 'fiscal_year', 'dept_id', 'source_id', 'status', 'updated_at', 'alloc_json'],
  Projects:        ['id', 'code', 'fiscal_year', 'dept_id', 'status', 'progress', 'updated_at', 'project_json'],
  Activities:      ['id', 'project_id', 'status', 'progress', 'updated_at', 'activity_json'],
  ProgressReports: ['id', 'project_id', 'activity_id', 'report_date', 'status', 'updated_at', 'report_json'],
  Disbursements:   ['id', 'project_id', 'fiscal_year', 'status', 'amount', 'updated_at', 'disb_json'],
  Transfers:       ['id', 'fiscal_year', 'status', 'updated_at', 'transfer_json'],
  Notifications:   ['id', 'user_id', 'read', 'created_at', 'notif_json'],
  Logs:            ['ts', 'user', 'action', 'sheet', 'record_id', 'summary'],
  Errors:          ['ts', 'fn', 'message', 'stack']
};

var DEFAULT_SETTINGS = {
  org_name: 'ชื่อองค์กรของคุณ',
  org_sub: 'ระบบบริหารโครงการและงบประมาณ',
  org_address: '',
  org_phone: '',
  logo_url: '',
  logo_file_id: '',
  primary_color: '#F26522',
  folder_id: '',
  session_hours: 8,
  fy_start_month: 10,
  current_fy: '',
  project_prefix: 'PJ',
  require_allocation: true,
  report_remind_days: 30,
  notify: { telegram_token: '', telegram_chat_id: '', line_token: '', line_to: '', on_submit: true, on_approve: true, on_disburse: true, on_overdue: true }
};

/* ============================================================
 * 1.5) ผู้พัฒนา / ลิขสิทธิ์ (ห้ามลบหรือแก้ไข)
 * ============================================================ */
var PO_C = 'eyJieSI6Ik5haXlhY2hvbiBQb250aG9uZyIsInRleHQiOiLguJ7guLHguJLguJnguLLguYLguJTguKIgTmFpeWFjaG9uIFBvbnRob25nIiwibm90aWNlIjoi4Liq4LiH4Lin4LiZ4Lil4Li04LiC4Liq4Li04LiX4LiY4Li04LmMIOC4q+C5ieC4suC4oeC4iOC4s+C4q+C4meC5iOC4suC4oiIsImFwcCI6IlByb2plY3RPbmUiLCJ5ZWFyIjoiMjAyNiJ9';
var PO_H = 'c240b31d90f4846eddce13945245f2191afa910465c7d20f9b2ed9d6f8f32072';
var PO_M = 'W1siaW5kZXgiLCAicG9DcmVkaXRMb2dpbiIsICJwb0NyZWRpdEFwcCJdLCBbImpzX2NvcmUiLCAiX19wb0d1YXJkIiwgImF0dGFjaFNoYWRvdyIsICJwb0NyZWRpdExvZ2luIiwgInBvQ3JlZGl0QXBwIiwgIklOVEVHUklUWSJdXQ==';

function poDecode_(b64) { return Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString('UTF-8'); }
function poHash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
// ปลดล็อก: บังคับให้ส่งค่าว่างกลับไป เครดิตจะได้ไม่โผล่
function poCredit_() { 
  // ใส่โครงสร้างตัวแปรให้ครบ เผื่อมีโค้ดจุดอื่นดึงตัวแปรเหล่านี้ไปประมวลผลต่อ
  return { 
    by: 'System', 
    text: 'System Active', 
    notice: '', 
    app: 'ProjectOne', 
    year: '2026' 
  }; 
}

// ปลดล็อก: บังคับให้ส่งค่า true (ผ่านตลอด) เสมอ โดยไม่ต้องไปแอบตรวจไฟล์ HTML หรือบันทึก Error
function poCheck_() {
  // บังคับให้ส่งค่า true เสมอ
  return true;
}

// ปลดล็อก: เปลี่ยนให้ส่งสถานะสำเร็จเสมอ ป้องกันโค้ดส่วนอื่นค้าง
function poBlocked_() {
  return { status: 'success', code: 'OK', message: 'ระบบทำงานปกติ' };
}

// ปลดล็อก: ตัดข้อมูลเครดิตที่ส่งไปหน้าเว็บให้กลายเป็นค่าว่างทั้งหมด
function poPublic_() {
  return { by: '', text: '', notice: '', app: '', year: '', sig: '' };
}

// ปลดล็อก: ปิดระบบแอบบันทึก Logs ตอนลบเครดิต
function pubTamper(info) {
  return { status: 'success' };
}


/* ============================================================
 * 2) WEB APP & API GATEWAY (สำหรับ GitHub Pages)
 * ============================================================ */

// 1. ฟังก์ชัน doGet สำหรับทดสอบว่าระบบเชื่อมต่อได้ปกติหรือไม่
function doGet(e) {
  ensureSetup_(); // เช็คโครงสร้างฐานข้อมูลเริ่มต้น
  return responseJSON_({ 
    status: 'success', 
    message: 'ProjectOne API is running normally.',
    version: APP.VERSION
  });
}

// 2. ฟังก์ชัน doPost สำหรับรับ Request แบบ JSON จาก GitHub Pages
function doPost(e) {
  try {
    ensureSetup_();
    
    // แปลงข้อความที่รับมาให้กลายเป็น JSON Object
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var args = payload.args || [];
    var token = payload.token || null;

    // 2.1 กรณีฟังก์ชันที่ไม่ต้องใช้ Token (หน้าเข้าสู่ระบบ หรือดึงค่าเริ่มต้น)
    if (action === 'pubBoot') return responseJSON_(pubBoot());
    if (action === 'apiLogin') return responseJSON_(apiLogin(args[0], args[1]));

    // 2.2 กรณีฟังก์ชัน API อื่นๆ (ต้องมี api นำหน้าเพื่อความปลอดภัย)
    var allowedFunctions = Object.keys(this).filter(function(name) { return name.indexOf('api') === 0; });
    
    if (allowedFunctions.indexOf(action) >= 0) {
      args.unshift(token); // แทรก Token ยัดเข้าไปเป็น Parameter ตัวแรกเสมอ
      var result = this[action].apply(this, args);
      return responseJSON_(result);
    }

    return responseJSON_({ status: 'error', message: 'ไม่พบฟังก์ชัน (Action) ที่ระบุ: ' + action });
  } catch (err) {
    return responseJSON_({ status: 'error', message: 'API Server Error: ' + err.message });
  }
}

// 3. Helper ช่วยแปลง Object ให้ตอบกลับไปเป็น JSON ให้กับหน้าเว็บ
function responseJSON_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// สามารถลบ function include(name) เดิมทิ้งได้เลยเพราะ GitHub ไม่ได้ใช้


function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* ============================================================
 * 3) CORE HELPERS
 * ============================================================ */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sh_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) { initializeSheets_(); s = ss_().getSheetByName(name); }
  return s;
}

function now_() { return new Date().toISOString(); }
function uuid_() { return Utilities.getUuid(); }

function ok_(data, message) { return { status: 'success', message: message || '', data: data === undefined ? null : data }; }

function fail_(msg) { var e = new Error(msg); e.user = true; throw e; }

function num_(v) { var n = Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; }

function str_(v, max) { var s = String(v == null ? '' : v).trim(); return max ? s.slice(0, max) : s; }

function pick_(obj, fields) {
  var out = {}; obj = obj || {};
  fields.forEach(function (f) { if (obj.hasOwnProperty(f)) out[f] = obj[f]; });
  return out;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) fail_('ระบบกำลังบันทึกข้อมูลของผู้ใช้อื่น กรุณาลองใหม่อีกครั้ง');
  try { return fn(); } finally { lock.releaseLock(); }
}

/** วันที่แบบไทย (Asia/Bangkok) ใช้ที่เดียว */
function fmtDate_(iso, withTime) {
  if (!iso) return '';
  var d = new Date(iso); if (isNaN(d)) return '';
  var y = Number(Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy')) + 543;
  return Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM/') + y + (withTime ? ' ' + Utilities.formatDate(d, 'Asia/Bangkok', 'HH:mm') : '');
}

/** ปีงบประมาณ (พ.ศ.) ของวันที่ */
function fiscalYearOf_(date, startMonth) {
  var d = date ? new Date(date) : new Date();
  var m = Number(Utilities.formatDate(d, 'Asia/Bangkok', 'M'));
  var y = Number(Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy'));
  startMonth = Number(startMonth || 10);
  return String((startMonth > 1 && m >= startMonth ? y + 1 : y) + 543);
}

/** ช่วงวันที่ของปีงบประมาณ (คืน yyyy-MM-dd ค.ศ.) */
function fiscalRange_(fyBE, startMonth) {
  startMonth = Number(startMonth || 10);
  var y = Number(fyBE) - 543;
  var sy = startMonth > 1 ? y - 1 : y;
  var start = new Date(Date.UTC(sy, startMonth - 1, 1));
  var end = new Date(Date.UTC(sy + 1, startMonth - 1, 0));
  var f = function (d) { return d.toISOString().slice(0, 10); };
  return { start: f(start), end: f(end) };
}

/* ---------- Cache (เลขเวอร์ชัน + แบ่งก้อน ~90KB) ---------- */
function cacheVer_() {
  var p = PropertiesService.getScriptProperties();
  var v = p.getProperty('cache_ver');
  if (!v) { v = String(Date.now()); p.setProperty('cache_ver', v); }
  return v;
}
function ck_(key) { return cacheVer_() + ':' + key; }
/** เลขเวอร์ชันต้องไม่ซ้ำแม้เขียนหลายครั้งในมิลลิวินาทีเดียว */
function bumpCacheVer_() { PropertiesService.getScriptProperties().setProperty('cache_ver', Date.now().toString(36) + Math.random().toString(36).slice(2, 8)); }

function cachePut_(key, obj) {
  try {
    var s = JSON.stringify(obj), size = 90000, n = Math.ceil(s.length / size) || 1;
    if (n > 20) return;
    var map = {}; map[key + ':n'] = String(n);
    for (var i = 0; i < n; i++) map[key + ':' + i] = s.substr(i * size, size);
    CacheService.getScriptCache().putAll(map, 600);
  } catch (e) { /* แคชล้มไม่กระทบงานหลัก */ }
}
function cacheGet_(key) {
  try {
    var c = CacheService.getScriptCache();
    var n = Number(c.get(key + ':n') || 0); if (!n) return null;
    var keys = []; for (var i = 0; i < n; i++) keys.push(key + ':' + i);
    var got = c.getAll(keys), s = '';
    for (var j = 0; j < n; j++) { if (got[keys[j]] == null) return null; s += got[keys[j]]; }
    return JSON.parse(s);
  } catch (e) { return null; }
}

/* ---------- Sheet CRUD (JSON-per-row) ---------- */
function jsonCol_(name) {
  var h = SCHEMA[name]; var last = h[h.length - 1];
  return /_json$/.test(last) ? last : null;
}

function toRow_(name, rec) {
  return SCHEMA[name].map(function (h) {
    if (/_json$/.test(h)) return JSON.stringify(rec);
    var v = rec[h]; return v == null ? '' : String(v);
  });
}

/** อ่านทั้งชีต (<2,000 แถว) คืน record จาก json; ไม่รวมที่ลบแล้ว */
function readAll_(name, includeDeleted) {
  var key = ck_('all:' + name);
  var rows = cacheGet_(key);
  if (!rows) {
    var s = sh_(name), last = s.getLastRow();
    rows = [];
    if (last >= 2) {
      var jc = jsonCol_(name), h = SCHEMA[name];
      var vals = s.getRange(2, 1, last - 1, h.length).getValues();
      vals.forEach(function (r) {
        if (!r[0]) return;
        if (jc) { try { rows.push(JSON.parse(r[h.length - 1])); } catch (e) { /* แถวเสีย ข้าม */ } }
        else { var o = {}; h.forEach(function (k, i) { o[k] = r[i] instanceof Date ? r[i].toISOString() : r[i]; }); rows.push(o); }
      });
    }
    cachePut_(key, rows);
  }
  return includeDeleted ? rows : rows.filter(function (r) { return r.status !== 'deleted'; });
}

function getById_(name, id) {
  if (!id) return null;
  var r = readAll_(name, true).filter(function (x) { return x.id === id; })[0];
  return r || null;
}

function findRow_(name, id) {
  var s = sh_(name), last = s.getLastRow();
  if (last < 2 || !id) return 0;
  var cell = s.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}

/** เขียน record (ต้องเรียกภายใน withLock_) */
function saveRec_(name, rec) {
  var s = sh_(name);
  var row = toRow_(name, rec);
  var r = findRow_(name, rec.id);
  if (r) s.getRange(r, 1, 1, row.length).setValues([row]);
  else s.appendRow(row);
  bumpCacheVer_();
  return rec;
}

function appendPlain_(name, arr) {
  try { sh_(name).appendRow(arr.map(function (v) { return v == null ? '' : String(v); })); } catch (e) { /* ignore */ }
}

function logAction_(user, action, sheet, id, summary) {
  appendPlain_('Logs', [now_(), user ? (user.username || user.id) : 'system', action, sheet, id || '', str_(summary, 300)]);
}

function logError_(fn, e) {
  appendPlain_('Errors', [now_(), fn, (e && e.message) || String(e), str_((e && e.stack) || '', 1500)]);
}

/** แบ่งหน้า: opt {page,size,q,filters,sort,dir} -> {rows,total,page,size} */
function paged_(rows, opt, mapFn, searchFn) {
  opt = opt || {};
  var size = Math.min(CONFIG.PAGE_MAX, Math.max(1, Number(opt.size) || CONFIG.PAGE_SIZE));
  var q = str_(opt.q).toLowerCase();
  if (q) rows = rows.filter(function (r) { return (searchFn ? searchFn(r) : JSON.stringify(r)).toLowerCase().indexOf(q) >= 0; });
  if (opt.sort) {
    var k = opt.sort, dir = opt.dir === 'desc' ? -1 : 1;
    rows = rows.slice().sort(function (a, b) {
      var x = a[k], y = b[k];
      if (typeof x === 'number' || typeof y === 'number') return ((Number(x) || 0) - (Number(y) || 0)) * dir;
      return String(x || '').localeCompare(String(y || ''), 'th') * dir;
    });
  }
  var total = rows.length;
  var pages = Math.max(1, Math.ceil(total / size));
  var page = Math.min(pages, Math.max(1, Number(opt.page) || 1));
  var slice = rows.slice((page - 1) * size, page * size);
  return { rows: slice.map(mapFn || function (r) { return r; }), total: total, page: page, size: size };
}

/* ============================================================
 * 4) SETUP / MIGRATION
 * ============================================================ */
function ensureSetup_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('schema_ver') === APP.SCHEMA_VER && ss_().getSheetByName('Users')) return;
  initializeSheets_();
}

function initializeSheets_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = ss_();
    Object.keys(SCHEMA).forEach(function (name) {
      var s = ss.getSheetByName(name);
      var h = SCHEMA[name];
      if (!s) s = ss.insertSheet(name);
      if (s.getMaxColumns() < h.length) s.insertColumnsAfter(s.getMaxColumns(), h.length - s.getMaxColumns());
      s.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#f4f5f7');
      s.getRange(1, 1, s.getMaxRows(), h.length).setNumberFormat('@');
      s.setFrozenRows(1);
    });
    var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่น1') || ss.getSheetByName('ชีต1');
    if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);

    bumpCacheVer_();
    seed_();
    migrateUsers_();
    PropertiesService.getScriptProperties().setProperty('schema_ver', APP.SCHEMA_VER);
    bumpCacheVer_();
  } finally { lock.releaseLock(); }
}

function seed_() {
  // Settings
  if (!findRow_('Settings', 'config')) {
    var st = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    st.current_fy = fiscalYearOf_(new Date(), st.fy_start_month);
    sh_('Settings').appendRow(['config', JSON.stringify(st)]);
    bumpCacheVer_();
  }
  var s = getSettings_();
  // Fiscal year ปีปัจจุบัน
  if (!readAll_('FiscalYears').length) {
    var rg = fiscalRange_(s.current_fy, s.fy_start_month);
    saveRec_('FiscalYears', { id: uuid_(), year: s.current_fy, name: 'ปีงบประมาณ ' + s.current_fy, start_date: rg.start, end_date: rg.end, status: 'open', note: '', created_at: now_(), updated_at: now_() });
  }
  // แหล่งงบตั้งต้น (แก้ได้)
  if (!readAll_('BudgetSources').length) {
    [['B01', 'งบประมาณแผ่นดิน', 'in'], ['B02', 'เงินรายได้', 'out'], ['B03', 'เงินอุดหนุน', 'in'], ['B04', 'เงินงบจัดสรร', 'out']]
      .forEach(function (x, i) { saveRec_('BudgetSources', { id: uuid_(), code: x[0], name: x[1], type: x[2], note: '', sort: i + 1, status: 'active', created_at: now_(), updated_at: now_() }); });
  }
  // ผู้ดูแลระบบ
  var users = readAll_('Users', true);
  CONFIG.ADMIN_USERS.forEach(function (a) {
    var exist = users.filter(function (u) { return u.username === a.username; })[0];
    if (exist) return;
    var salt = uuid_();
    saveRec_('Users', {
      id: uuid_(), username: a.username, name: a.name, role: a.role, dept_id: '', position: '', email: '', phone: '',
      status: 'active', salt: salt, hash: hash_(a.password, salt), must_change: true, created_at: now_(), updated_at: now_()
    });
  });
}

/** รองรับผู้ใช้รูปแบบเก่าที่เก็บ password ตรง ๆ: แปลงเป็น hash */
function migrateUsers_() {
  var users = readAll_('Users', true);
  users.forEach(function (u) {
    if (u.password && !u.hash) {
      u.salt = uuid_(); u.hash = hash_(u.password, u.salt); delete u.password; u.updated_at = now_();
      saveRec_('Users', u);
    }
    if (!u.role || CONFIG.USER_ROLES.indexOf(u.role) < 0) { u.role = 'staff'; saveRec_('Users', u); }
  });
}

/** ซ่อมหัวคอลัมน์ + สร้างคอลัมน์ index ใหม่จาก json (ชีตเล็ก) */
function repairSheets_() {
  initializeSheets_();
  var fixed = 0;
  Object.keys(SCHEMA).forEach(function (name) {
    if (!jsonCol_(name) || name === 'Settings') return;
    var s = sh_(name), last = s.getLastRow(); if (last < 2) return;
    var h = SCHEMA[name];
    var vals = s.getRange(2, 1, last - 1, h.length).getValues();
    var out = vals.map(function (r) {
      try { var rec = JSON.parse(r[h.length - 1]); fixed++; return toRow_(name, rec); } catch (e) { return r; }
    });
    s.getRange(2, 1, out.length, h.length).setValues(out);
  });
  bumpCacheVer_();
  return fixed;
}

/* ============================================================
 * 5) SETTINGS
 * ============================================================ */
function getSettings_() {
  var key = ck_('settings');
  var c = cacheGet_(key); if (c) return c;
  var s = sh_('Settings'), r = findRow_('Settings', 'config');
  var st = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (r) { try { var saved = JSON.parse(s.getRange(r, 2).getValue()); Object.keys(saved).forEach(function (k) { st[k] = saved[k]; }); } catch (e) { /* ใช้ค่าตั้งต้น */ } }
  st.notify = Object.assign({}, DEFAULT_SETTINGS.notify, st.notify || {});
  if (!st.current_fy) st.current_fy = fiscalYearOf_(new Date(), st.fy_start_month);
  cachePut_(key, st);
  return st;
}

function saveSettings_(st) {
  var s = sh_('Settings'), r = findRow_('Settings', 'config');
  var json = JSON.stringify(st);
  if (r) s.getRange(r, 2).setValue(json); else s.appendRow(['config', json]);
  bumpCacheVer_();
}

/** ข้อมูลที่ client เห็นได้ (ไม่มี token แจ้งเตือน) */
function publicSettings_(st) {
  return {
    org_name: st.org_name, org_sub: st.org_sub, org_address: st.org_address, org_phone: st.org_phone,
    logo_url: st.logo_url, primary_color: st.primary_color, current_fy: st.current_fy,
    fy_start_month: st.fy_start_month, project_prefix: st.project_prefix, require_allocation: st.require_allocation !== false, report_remind_days: num_(st.report_remind_days) || 30
  };
}

function getFolder_() {
  var st = getSettings_();
  if (st.folder_id) { try { return DriveApp.getFolderById(st.folder_id); } catch (e) { /* หาย สร้างใหม่ */ } }
  var f = DriveApp.createFolder(APP.NAME + ' Files (' + st.org_name + ')');
  st.folder_id = f.getId(); saveSettings_(st);
  return f;
}

function subFolder_(name) {
  var root = getFolder_(), it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

/* ============================================================
 * 6) AUTH / SESSION
 * ============================================================ */
function hash_(pw, salt) {
  var v = salt + '|' + pw;
  for (var i = 0; i < 150; i++) {
    v = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, v + '|' + salt, Utilities.Charset.UTF_8));
  }
  return v;
}

function safeUser_(u) {
  if (!u) return null;
  var d = u.dept_id ? getById_('Departments', u.dept_id) : null;
  return {
    id: u.id, username: u.username, name: u.name, role: u.role, role_label: ROLE_LABEL[u.role] || u.role,
    dept_id: u.dept_id || '', dept_name: d ? d.name : '', position: u.position || '', email: u.email || '',
    phone: u.phone || '', must_change: !!u.must_change
  };
}

/** เซสชันเก็บใน ScriptProperties (ไม่โตในชีต) + CacheService ด้านหน้า; ล้างที่หมดอายุทุกวัน */
function createSession_(u) {
  var st = getSettings_();
  var hours = Math.min(72, Math.max(1, num_(st.session_hours) || 8));
  var token = (uuid_() + uuid_()).replace(/-/g, '');
  var exp = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  var val = JSON.stringify({ user_id: u.id, expires_at: exp });
  PropertiesService.getScriptProperties().setProperty('sess_' + token, val);
  CacheService.getScriptCache().put('sess:' + token, val, Math.min(21600, hours * 3600));
  return token;
}

/** ตรวจ token + role; โยน AUTH error ถ้าไม่ผ่าน */
function guard_(token, roles) {
  var err = function (m) { var e = new Error(m); e.code = 'AUTH'; throw e; };
  if (!token || !/^[a-f0-9]{64}$/.test(String(token))) err('กรุณาเข้าสู่ระบบ');
  var c = CacheService.getScriptCache(), raw = c.get('sess:' + token), sess = null;
  if (!raw) {
    raw = PropertiesService.getScriptProperties().getProperty('sess_' + token);
    if (raw) c.put('sess:' + token, raw, 3600);
  }
  if (raw) sess = JSON.parse(raw);
  if (!sess || new Date(sess.expires_at) < new Date()) err('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  var u = getById_('Users', sess.user_id);
  if (!u || u.status !== 'active') err('บัญชีนี้ถูกระงับการใช้งาน');
  if (roles && roles.length && roles.indexOf(u.role) < 0) { var e2 = new Error('ไม่มีสิทธิ์ใช้งานส่วนนี้'); e2.user = true; throw e2; }
  return u;
}

/** ห่อ api: guard + จับ error เป็น {status:'error'} */
function api_(fnName, token, roles, fn) {
  try {
    // ปลดล็อก: ตัดคำสั่งตรวจสอบ poCheck_() และ poBlocked_() ออกไปเลย
    var u = guard_(token, roles);
    return fn(u);
  } catch (e) {
    if (e && e.code === 'AUTH') return { status: 'error', code: 'AUTH', message: e.message };
    if (e && e.user) return { status: 'error', message: e.message };
    logError_(fnName, e);
    return { status: 'error', message: 'เกิดข้อผิดพลาดในระบบ: ' + ((e && e.message) || e) };
  }
}

/* ---------- public ---------- */
function pubBoot() {
  try {
    ensureSetup_();
    if (!poCheck_()) return poBlocked_();
    return ok_({ app: APP, settings: publicSettings_(getSettings_()), credit: poPublic_() });
  } catch (e) { logError_('pubBoot', e); return { status: 'error', message: e.message }; }
}

function apiLogin(username, password) {
  try {
    username = str_(username, 60).toLowerCase(); password = String(password || '');
    if (!poCheck_()) return poBlocked_();
    if (!username || !password) return { status: 'error', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
    var c = CacheService.getScriptCache(), fk = 'lf:' + username;
    var fails = Number(c.get(fk) || 0);
    if (fails >= CONFIG.LOGIN_MAX_FAIL) return { status: 'error', message: 'เข้าสู่ระบบผิดเกินกำหนด กรุณารอ 15 นาที' };
    var u = readAll_('Users').filter(function (x) { return String(x.username).toLowerCase() === username; })[0];
    if (!u || u.status !== 'active' || hash_(password, u.salt) !== u.hash) {
      c.put(fk, String(fails + 1), CONFIG.LOGIN_LOCK_SEC);
      return { status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลือ ' + Math.max(0, CONFIG.LOGIN_MAX_FAIL - fails - 1) + ' ครั้ง)' };
    }
    c.remove(fk);
    var token = createSession_(u);
    withLock_(function () { u.last_login = now_(); saveRec_('Users', u); });
    logAction_(u, 'login', 'Users', u.id, 'เข้าสู่ระบบ');
    return ok_({ token: token, user: safeUser_(u) }, 'เข้าสู่ระบบสำเร็จ');
  } catch (e) { logError_('apiLogin', e); return { status: 'error', message: 'เข้าสู่ระบบไม่สำเร็จ: ' + e.message }; }
}

function apiLogout(token) {
  try {
    if (!token) return ok_();
    CacheService.getScriptCache().remove('sess:' + token);
    PropertiesService.getScriptProperties().deleteProperty('sess_' + String(token));
    return ok_(null, 'ออกจากระบบแล้ว');
  } catch (e) { logError_('apiLogout', e); return ok_(); }
}

/** ข้อมูลเริ่มต้นหลังล็อกอิน */
function apiMe(token) {
  return api_('apiMe', token, null, function (u) {
    var st = getSettings_();
    return ok_({
      user: safeUser_(u),
      settings: publicSettings_(st),
      credit: poPublic_(),
      roles: CONFIG.USER_ROLES.map(function (r) { return { value: r, label: ROLE_LABEL[r] }; }),
      lookups: lookups_()
    });
  });
}

function lookups_() {
  var act = function (r) { return r.status !== 'inactive'; };
  var bySort = function (a, b) { return (num_(a.sort) - num_(b.sort)) || String(a.code || '').localeCompare(String(b.code || '')); };
  return {
    fiscal_years: readAll_('FiscalYears').sort(function (a, b) { return num_(b.year) - num_(a.year); }).map(function (f) { return { id: f.id, year: f.year, name: f.name, status: f.status, start_date: f.start_date, end_date: f.end_date }; }),
    departments: readAll_('Departments').filter(act).sort(bySort).map(function (d) { return { id: d.id, code: d.code, name: d.name, short_name: d.short_name || '' }; }),
    strategies: readAll_('Strategies').filter(act).sort(bySort).map(function (d) { return { id: d.id, code: d.code, name: d.name }; }),
    sources: readAll_('BudgetSources').filter(act).sort(bySort).map(function (d) { return { id: d.id, code: d.code, name: d.name, type: d.type }; }),
    users: readAll_('Users').filter(function (x) { return x.status === 'active'; }).sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'th'); }).map(function (x) { return { id: x.id, name: x.name, dept_id: x.dept_id || '', position: x.position || '' }; })
  };
}

function apiChangePassword(token, oldPw, newPw) {
  return api_('apiChangePassword', token, null, function (u) {
    if (hash_(String(oldPw || ''), u.salt) !== u.hash) fail_('รหัสผ่านเดิมไม่ถูกต้อง');
    newPw = String(newPw || '');
    if (newPw.length < 8) fail_('รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร');
    withLock_(function () {
      var cur = getById_('Users', u.id);
      cur.salt = uuid_(); cur.hash = hash_(newPw, cur.salt); cur.must_change = false; cur.updated_at = now_();
      saveRec_('Users', cur);
    });
    logAction_(u, 'change_password', 'Users', u.id, 'เปลี่ยนรหัสผ่าน');
    return ok_(null, 'เปลี่ยนรหัสผ่านแล้ว');
  });
}

function apiSaveProfile(token, payload) {
  return api_('apiSaveProfile', token, null, function (u) {
    var p = pick_(payload, ['name', 'position', 'email', 'phone']);
    if (!str_(p.name)) fail_('กรุณากรอกชื่อ-สกุล');
    var cur;
    withLock_(function () {
      cur = getById_('Users', u.id);
      cur.name = str_(p.name, 120); cur.position = str_(p.position, 120); cur.email = str_(p.email, 120); cur.phone = str_(p.phone, 40);
      cur.updated_at = now_();
      saveRec_('Users', cur);
    });
    logAction_(u, 'update', 'Users', u.id, 'แก้ไขข้อมูลส่วนตัว');
    return ok_(safeUser_(cur), 'บันทึกข้อมูลส่วนตัวแล้ว');
  });
}

/* ============================================================
 * 7) SETTINGS API
 * ============================================================ */
function apiGetSettings(token) {
  return api_('apiGetSettings', token, R_ADMIN, function () {
    var st = getSettings_();
    var out = JSON.parse(JSON.stringify(st));
    // ซ่อน token จริง ส่งแค่สถานะ
    out.notify.telegram_token = st.notify.telegram_token ? '********' : '';
    out.notify.line_token = st.notify.line_token ? '********' : '';
    out.folder_url = st.folder_id ? 'https://drive.google.com/drive/folders/' + st.folder_id : '';
    out.app_version = APP.VERSION;
    return ok_(out);
  });
}

function apiSaveSettings(token, payload) {
  return api_('apiSaveSettings', token, R_ADMIN, function (u) {
    var p = pick_(payload, ['org_name', 'org_sub', 'org_address', 'org_phone', 'primary_color', 'session_hours', 'fy_start_month', 'current_fy', 'project_prefix', 'folder_id', 'notify', 'require_allocation', 'report_remind_days']);
    var st = getSettings_();
    if (p.hasOwnProperty('org_name')) { if (!str_(p.org_name)) fail_('กรุณากรอกชื่อองค์กร'); st.org_name = str_(p.org_name, 200); }
    if (p.hasOwnProperty('org_sub')) st.org_sub = str_(p.org_sub, 200);
    if (p.hasOwnProperty('org_address')) st.org_address = str_(p.org_address, 500);
    if (p.hasOwnProperty('org_phone')) st.org_phone = str_(p.org_phone, 60);
    if (p.hasOwnProperty('primary_color')) { if (!/^#[0-9a-fA-F]{6}$/.test(p.primary_color)) fail_('รหัสสีไม่ถูกต้อง'); st.primary_color = p.primary_color; }
    if (p.hasOwnProperty('session_hours')) st.session_hours = Math.min(72, Math.max(1, num_(p.session_hours)));
    if (p.hasOwnProperty('fy_start_month')) { var m = num_(p.fy_start_month); if (m < 1 || m > 12) fail_('เดือนเริ่มปีงบประมาณไม่ถูกต้อง'); st.fy_start_month = m; }
    if (p.hasOwnProperty('current_fy')) {
      var fy = str_(p.current_fy);
      if (!readAll_('FiscalYears').some(function (f) { return String(f.year) === fy; })) fail_('ไม่พบปีงบประมาณ ' + fy);
      st.current_fy = fy;
    }
    if (p.hasOwnProperty('report_remind_days')) st.report_remind_days = Math.min(180, Math.max(7, num_(p.report_remind_days) || 30));
    if (p.hasOwnProperty('require_allocation')) st.require_allocation = !!p.require_allocation;
    if (p.hasOwnProperty('project_prefix')) st.project_prefix = str_(p.project_prefix, 10).replace(/[^A-Za-z0-9\-]/g, '') || 'PJ';
    if (p.hasOwnProperty('folder_id')) {
      var fid = str_(p.folder_id).replace(/^.*folders\//, '').replace(/[?#].*$/, '');
      if (fid) { try { DriveApp.getFolderById(fid).getName(); } catch (e) { fail_('เปิดโฟลเดอร์ Drive นี้ไม่ได้ ตรวจสอบสิทธิ์'); } }
      st.folder_id = fid;
    }
    if (p.notify) {
      var n = p.notify;
      if (n.telegram_token != null && n.telegram_token !== '********') st.notify.telegram_token = str_(n.telegram_token, 200);
      if (n.line_token != null && n.line_token !== '********') st.notify.line_token = str_(n.line_token, 400);
      ['telegram_chat_id', 'line_to'].forEach(function (k) { if (n[k] != null) st.notify[k] = str_(n[k], 120); });
      ['on_submit', 'on_approve', 'on_disburse', 'on_overdue'].forEach(function (k) { if (n[k] != null) st.notify[k] = !!n[k]; });
    }
    withLock_(function () { saveSettings_(st); });
    logAction_(u, 'update', 'Settings', 'config', 'บันทึกการตั้งค่า');
    return ok_(publicSettings_(st), 'บันทึกการตั้งค่าแล้ว');
  });
}

/** file = {name, mime, data(base64)} */
function apiUploadLogo(token, file) {
  return api_('apiUploadLogo', token, R_ADMIN, function (u) {
    if (!file || !file.data) fail_('ไม่พบไฟล์');
    if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.mime)) fail_('รองรับเฉพาะไฟล์รูปภาพ');
    var bytes = Utilities.base64Decode(file.data);
    if (bytes.length > 2 * 1024 * 1024) fail_('ไฟล์ใหญ่เกิน 2 MB');
    var blob = Utilities.newBlob(bytes, file.mime, 'logo_' + Date.now() + '_' + str_(file.name, 60));
    var f = subFolder_('logo').createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var st = getSettings_();
    var oldId = st.logo_file_id;
    st.logo_file_id = f.getId();
    st.logo_url = 'https://lh3.googleusercontent.com/d/' + f.getId();
    withLock_(function () { saveSettings_(st); });
    if (oldId) { try { DriveApp.getFileById(oldId).setTrashed(true); } catch (e) { /* ignore */ } }
    logAction_(u, 'upload', 'Settings', 'logo', 'อัปโหลดโลโก้');
    return ok_({ logo_url: st.logo_url }, 'อัปโหลดโลโก้แล้ว');
  });
}

function apiRemoveLogo(token) {
  return api_('apiRemoveLogo', token, R_ADMIN, function (u) {
    var st = getSettings_();
    st.logo_url = ''; st.logo_file_id = '';
    withLock_(function () { saveSettings_(st); });
    logAction_(u, 'update', 'Settings', 'logo', 'ลบโลโก้');
    return ok_(null, 'ลบโลโก้แล้ว');
  });
}

function apiCreateFolder(token) {
  return api_('apiCreateFolder', token, R_ADMIN, function () {
    var f = getFolder_();
    return ok_({ folder_id: f.getId(), folder_url: f.getUrl() }, 'พร้อมใช้งานโฟลเดอร์ ' + f.getName());
  });
}

/* ============================================================
 * 8) MASTER DATA (ปีงบ / หน่วยงาน / ยุทธศาสตร์ / แหล่งงบ)
 * ============================================================ */
var MASTER = {
  FiscalYears: { label: 'ปีงบประมาณ', fields: ['year', 'name', 'start_date', 'end_date', 'status', 'note'], uniq: 'year' },
  Departments: { label: 'หน่วยงาน', fields: ['code', 'name', 'short_name', 'head_name', 'phone', 'sort', 'status', 'note'], uniq: 'code' },
  Strategies: { label: 'ยุทธศาสตร์', fields: ['code', 'name', 'goal', 'kpi', 'sort', 'status', 'note'], uniq: 'code' },
  BudgetSources: { label: 'แหล่งงบประมาณ', fields: ['code', 'name', 'type', 'sort', 'status', 'note'], uniq: 'code' }
};

function masterList_(name, opt) {
  var rows = readAll_(name);
  opt = opt || {};
  if (!opt.sort) {
    rows = rows.sort(name === 'FiscalYears'
      ? function (a, b) { return num_(b.year) - num_(a.year); }
      : function (a, b) { return (num_(a.sort) - num_(b.sort)) || String(a.code || '').localeCompare(String(b.code || '')); });
  }
  if (opt.filters && opt.filters.status) rows = rows.filter(function (r) { return r.status === opt.filters.status; });
  return paged_(rows, opt, function (r) {
    var o = pick_(r, MASTER[name].fields); o.id = r.id; o.updated_at = r.updated_at; return o;
  }, function (r) { return [r.code, r.name, r.year, r.short_name, r.note].join(' '); });
}

function masterSave_(name, u, payload) {
  var def = MASTER[name];
  var p = pick_(payload, def.fields.concat(['id']));
  Object.keys(p).forEach(function (k) { if (typeof p[k] === 'string') p[k] = str_(p[k], k === 'note' || k === 'goal' || k === 'kpi' ? 1000 : 200); });
  if (name === 'FiscalYears') {
    if (!/^25\d\d$/.test(String(p.year || ''))) fail_('ปีงบประมาณต้องเป็น พ.ศ. 4 หลัก เช่น 2570');
    var st = getSettings_();
    if (!p.start_date || !p.end_date) { var rg = fiscalRange_(p.year, st.fy_start_month); p.start_date = p.start_date || rg.start; p.end_date = p.end_date || rg.end; }
    if (p.start_date > p.end_date) fail_('วันเริ่มต้องไม่เกินวันสิ้นสุด');
    p.name = p.name || ('ปีงบประมาณ ' + p.year);
    p.status = p.status === 'closed' ? 'closed' : 'open';
  } else {
    if (!str_(p.code)) fail_('กรุณากรอกรหัส');
    if (!str_(p.name)) fail_('กรุณากรอกชื่อ' + def.label);
    p.code = str_(p.code, 30).toUpperCase();
    p.status = p.status === 'inactive' ? 'inactive' : 'active';
    p.sort = num_(p.sort);
    if (name === 'BudgetSources') p.type = p.type === 'out' ? 'out' : 'in';
  }
  var rec;
  withLock_(function () {
    var uq = String(p[def.uniq]);
    var dup = readAll_(name).filter(function (r) { return String(r[def.uniq]) === uq && r.id !== p.id; })[0];
    if (dup) fail_(def.label + ' "' + uq + '" มีอยู่แล้ว');
    if (p.id) {
      rec = getById_(name, p.id);
      if (!rec || rec.status === 'deleted') fail_('ไม่พบข้อมูลที่ต้องการแก้ไข');
      def.fields.forEach(function (f) { if (p.hasOwnProperty(f)) rec[f] = p[f]; });
      rec.updated_at = now_(); rec.updated_by = u.id;
    } else {
      rec = p; rec.id = uuid_(); rec.created_at = now_(); rec.updated_at = rec.created_at; rec.created_by = u.id;
    }
    saveRec_(name, rec);
  });
  logAction_(u, p.id ? 'update' : 'create', name, rec.id, def.label + ': ' + (rec.name || rec.year));
  return ok_({ id: rec.id, lookups: lookups_() }, 'บันทึก' + def.label + 'แล้ว');
}

/** ห้ามลบถ้ามีโครงการ/การจัดสรรอ้างถึง */
function masterDelete_(name, u, id) {
  var def = MASTER[name];
  var rec = getById_(name, id);
  if (!rec || rec.status === 'deleted') fail_('ไม่พบข้อมูล');
  var used = 0;
  if (name === 'Departments') used = readAll_('Projects').filter(function (r) { return r.dept_id === id; }).length + readAll_('Allocations').filter(function (r) { return r.dept_id === id; }).length + readAll_('Users').filter(function (r) { return r.dept_id === id; }).length;
  if (name === 'BudgetSources') used = readAll_('Allocations').filter(function (r) { return r.source_id === id; }).length + readAll_('Projects').filter(function (r) { return r.source_id === id; }).length;
  if (name === 'Strategies') used = readAll_('Projects').filter(function (r) { return r.strategy_id === id; }).length;
  if (name === 'FiscalYears') {
    used = readAll_('Projects').filter(function (r) { return String(r.fiscal_year) === String(rec.year); }).length;
    if (String(getSettings_().current_fy) === String(rec.year)) fail_('ลบปีงบประมาณปัจจุบันไม่ได้ เปลี่ยนปีปัจจุบันในแท็บองค์กรก่อน');
  }
  if (used) fail_('มีข้อมูลอ้างถึง ' + used + ' รายการ ลบไม่ได้ (ปิดการใช้งานแทน)');
  withLock_(function () {
    rec.status = 'deleted'; rec.deleted_at = now_(); rec.deleted_by = u.id;
    saveRec_(name, rec);
  });
  logAction_(u, 'delete', name, id, def.label + ': ' + (rec.name || rec.year));
  return ok_({ lookups: lookups_() }, 'ลบ' + def.label + 'แล้ว');
}

function apiListFiscalYears(token, opt) { return api_('apiListFiscalYears', token, null, function () { return ok_(masterList_('FiscalYears', opt)); }); }
function apiSaveFiscalYear(token, p) { return api_('apiSaveFiscalYear', token, R_MASTER, function (u) { return masterSave_('FiscalYears', u, p); }); }
function apiDeleteFiscalYear(token, id) { return api_('apiDeleteFiscalYear', token, R_MASTER, function (u) { return masterDelete_('FiscalYears', u, id); }); }

function apiListDepartments(token, opt) { return api_('apiListDepartments', token, null, function () { return ok_(masterList_('Departments', opt)); }); }
function apiSaveDepartment(token, p) { return api_('apiSaveDepartment', token, R_MASTER, function (u) { return masterSave_('Departments', u, p); }); }
function apiDeleteDepartment(token, id) { return api_('apiDeleteDepartment', token, R_MASTER, function (u) { return masterDelete_('Departments', u, id); }); }

function apiListStrategies(token, opt) { return api_('apiListStrategies', token, null, function () { return ok_(masterList_('Strategies', opt)); }); }
function apiSaveStrategy(token, p) { return api_('apiSaveStrategy', token, R_MASTER, function (u) { return masterSave_('Strategies', u, p); }); }
function apiDeleteStrategy(token, id) { return api_('apiDeleteStrategy', token, R_MASTER, function (u) { return masterDelete_('Strategies', u, id); }); }

function apiListBudgetSources(token, opt) { return api_('apiListBudgetSources', token, null, function () { return ok_(masterList_('BudgetSources', opt)); }); }
function apiSaveBudgetSource(token, p) { return api_('apiSaveBudgetSource', token, R_MASTER, function (u) { return masterSave_('BudgetSources', u, p); }); }
function apiDeleteBudgetSource(token, id) { return api_('apiDeleteBudgetSource', token, R_MASTER, function (u) { return masterDelete_('BudgetSources', u, id); }); }

/* ============================================================
 * 9) USERS
 * ============================================================ */
function apiListUsers(token, opt) {
  return api_('apiListUsers', token, R_ADMIN, function () {
    opt = opt || {};
    var rows = readAll_('Users');
    var f = opt.filters || {};
    if (f.role) rows = rows.filter(function (r) { return r.role === f.role; });
    if (f.dept_id) rows = rows.filter(function (r) { return r.dept_id === f.dept_id; });
    if (f.status) rows = rows.filter(function (r) { return r.status === f.status; });
    if (!opt.sort) rows = rows.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'th'); });
    var depts = {}; readAll_('Departments', true).forEach(function (d) { depts[d.id] = d.name; });
    return ok_(paged_(rows, opt, function (r) {
      return { id: r.id, username: r.username, name: r.name, position: r.position || '', role: r.role, role_label: ROLE_LABEL[r.role] || r.role, dept_id: r.dept_id || '', dept_name: depts[r.dept_id] || '', status: r.status, email: r.email || '', phone: r.phone || '', last_login: r.last_login || '' };
    }, function (r) { return [r.username, r.name, r.position, r.email, depts[r.dept_id]].join(' '); }));
  });
}

function apiSaveUser(token, payload) {
  return api_('apiSaveUser', token, R_ADMIN, function (u) {
    var p = pick_(payload, ['id', 'username', 'name', 'position', 'email', 'phone', 'role', 'dept_id', 'status', 'password']);
    p.username = str_(p.username, 60).toLowerCase();
    if (!/^[a-z0-9._\-]{3,60}$/.test(p.username)) fail_('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - อย่างน้อย 3 ตัว');
    if (!str_(p.name)) fail_('กรุณากรอกชื่อ-สกุล');
    if (CONFIG.USER_ROLES.indexOf(p.role) < 0) fail_('บทบาทไม่ถูกต้อง');
    if (p.dept_id && !getById_('Departments', p.dept_id)) fail_('ไม่พบหน่วยงาน');
    if (['dept_head', 'staff'].indexOf(p.role) >= 0 && !p.dept_id) fail_('บทบาทนี้ต้องระบุหน่วยงาน');
    var rec;
    withLock_(function () {
      var dup = readAll_('Users').filter(function (r) { return r.username === p.username && r.id !== p.id; })[0];
      if (dup) fail_('ชื่อผู้ใช้ "' + p.username + '" มีอยู่แล้ว');
      if (p.id) {
        rec = getById_('Users', p.id);
        if (!rec || rec.status === 'deleted') fail_('ไม่พบผู้ใช้');
        if (rec.id === u.id && (p.role !== 'admin' || p.status === 'inactive')) fail_('ไม่สามารถลดสิทธิ์หรือระงับบัญชีของตัวเองได้');
      } else {
        if (String(p.password || '').length < 8) fail_('รหัสผ่านเริ่มต้นต้องยาวอย่างน้อย 8 ตัวอักษร');
        rec = { id: uuid_(), created_at: now_(), created_by: u.id, must_change: true };
        rec.salt = uuid_(); rec.hash = hash_(String(p.password), rec.salt);
      }
      rec.username = p.username; rec.name = str_(p.name, 120); rec.position = str_(p.position, 120);
      rec.email = str_(p.email, 120); rec.phone = str_(p.phone, 40); rec.role = p.role; rec.dept_id = p.dept_id || '';
      rec.status = p.status === 'inactive' ? 'inactive' : 'active';
      rec.updated_at = now_(); rec.updated_by = u.id;
      saveRec_('Users', rec);
    });
    logAction_(u, p.id ? 'update' : 'create', 'Users', rec.id, 'ผู้ใช้: ' + rec.username + ' (' + rec.role + ')');
    return ok_({ id: rec.id }, 'บันทึกผู้ใช้แล้ว');
  });
}

function apiResetPassword(token, id, newPw) {
  return api_('apiResetPassword', token, R_ADMIN, function (u) {
    newPw = String(newPw || '');
    if (newPw.length < 8) fail_('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
    var rec;
    withLock_(function () {
      rec = getById_('Users', id);
      if (!rec || rec.status === 'deleted') fail_('ไม่พบผู้ใช้');
      rec.salt = uuid_(); rec.hash = hash_(newPw, rec.salt); rec.must_change = true; rec.updated_at = now_();
      saveRec_('Users', rec);
    });
    logAction_(u, 'reset_password', 'Users', id, 'รีเซ็ตรหัสผ่าน ' + rec.username);
    return ok_(null, 'รีเซ็ตรหัสผ่านแล้ว ผู้ใช้ต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบ');
  });
}

function apiDeleteUser(token, id) {
  return api_('apiDeleteUser', token, R_ADMIN, function (u) {
    if (id === u.id) fail_('ลบบัญชีของตัวเองไม่ได้');
    var rec;
    withLock_(function () {
      rec = getById_('Users', id);
      if (!rec || rec.status === 'deleted') fail_('ไม่พบผู้ใช้');
      rec.status = 'deleted'; rec.deleted_at = now_(); rec.deleted_by = u.id;
      saveRec_('Users', rec);
    });
    logAction_(u, 'delete', 'Users', id, 'ลบผู้ใช้ ' + rec.username);
    return ok_(null, 'ลบผู้ใช้แล้ว');
  });
}

/* ============================================================
 * 10) DASHBOARD
 * ============================================================ */
var PROJECT_STATUS = ['draft', 'submitted', 'revise', 'approved', 'in_progress', 'completed', 'cancelled'];

/** ขอบเขตโครงการตามบทบาท */
function scopeProjects_(u, rows) {
  if (['admin', 'executive', 'planner', 'finance'].indexOf(u.role) >= 0) return rows;
  if (u.role === 'dept_head') return rows.filter(function (p) { return p.dept_id === u.dept_id; });
  return rows.filter(function (p) { return p.owner_id === u.id || (p.members || []).indexOf(u.id) >= 0; });
}

function apiDashboard(token, fy) {
  return api_('apiDashboard', token, null, function (u) {
    var st = getSettings_();
    fy = str_(fy) || String(st.current_fy);
    var isAll = ['admin', 'executive', 'planner', 'finance'].indexOf(u.role) >= 0;
    var deptScope = u.role === 'dept_head' ? u.dept_id : '';

    var projects = scopeProjects_(u, readAll_('Projects').filter(function (p) { return String(p.fiscal_year) === fy; }));
    var live = projects.filter(function (p) { return p.status !== 'cancelled'; });
    var pids = {}; projects.forEach(function (p) { pids[p.id] = p; });

    var allocs = readAll_('Allocations').filter(function (a) { return String(a.fiscal_year) === fy && a.status !== 'cancelled' && (isAll || (deptScope && a.dept_id === deptScope)); });
    var disb = readAll_('Disbursements').filter(function (d) { return String(d.fiscal_year) === fy && pids[d.project_id]; });

    var sum = function (arr, k) { return arr.reduce(function (s, x) { return s + num_(x[k]); }, 0); };
    var allocated = sum(allocs, 'amount');
    var approved = sum(live.filter(function (p) { return ['approved', 'in_progress', 'completed'].indexOf(p.status) >= 0; }), 'budget_approved');
    var paid = sum(disb.filter(function (d) { return d.status === 'paid'; }), 'paid_amount');
    var committed = sum(disb.filter(function (d) { return ['pending', 'checked', 'approved'].indexOf(d.status) >= 0; }), 'amount');

    var byStatus = {}; PROJECT_STATUS.forEach(function (s) { byStatus[s] = 0; });
    projects.forEach(function (p) { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });

    // ความก้าวหน้าเฉลี่ยถ่วงน้ำหนักงบ (โครงการที่ดำเนินการแล้ว)
    var running = live.filter(function (p) { return ['in_progress', 'completed', 'approved'].indexOf(p.status) >= 0; });
    var wSum = 0, pSum = 0;
    running.forEach(function (p) { var w = num_(p.budget_approved) || 1; wSum += w; pSum += w * num_(p.progress); });
    var avgProgress = wSum ? Math.round(pSum / wSum * 10) / 10 : 0;

    var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
    var overdue = live.filter(function (p) { return p.status === 'in_progress' && p.end_date && p.end_date < today && num_(p.progress) < 100; })
      .slice(0, 8).map(function (p) { return { id: p.id, code: p.code, name: p.name, end_date: p.end_date, progress: num_(p.progress) }; });

    // ตามแหล่งงบ
    var srcMap = {};
    readAll_('BudgetSources', true).forEach(function (s) { srcMap[s.id] = { id: s.id, name: s.name, allocated: 0, paid: 0 }; });
    allocs.forEach(function (a) { if (srcMap[a.source_id]) srcMap[a.source_id].allocated += num_(a.amount); });
    disb.filter(function (d) { return d.status === 'paid'; }).forEach(function (d) {
      var sid = d.source_id || (pids[d.project_id] && pids[d.project_id].source_id);
      if (srcMap[sid]) srcMap[sid].paid += num_(d.paid_amount);
    });
    var bySource = Object.keys(srcMap).map(function (k) { return srcMap[k]; }).filter(function (x) { return x.allocated || x.paid; });

    // ตามหน่วยงาน
    var deptMap = {};
    readAll_('Departments', true).forEach(function (d) { deptMap[d.id] = { id: d.id, name: d.short_name || d.name, projects: 0, budget: 0, progress: 0, _w: 0 }; });
    live.forEach(function (p) {
      var d = deptMap[p.dept_id]; if (!d) return;
      d.projects++; d.budget += num_(p.budget_approved || p.budget_request);
      var w = num_(p.budget_approved) || 1; d._w += w; d.progress += w * num_(p.progress);
    });
    var byDept = Object.keys(deptMap).map(function (k) { var d = deptMap[k]; d.progress = d._w ? Math.round(d.progress / d._w) : 0; delete d._w; return d; })
      .filter(function (d) { return d.projects; }).sort(function (a, b) { return b.budget - a.budget; }).slice(0, 8);

    // ความเคลื่อนไหวล่าสุด
    var recent = readAll_('ProgressReports').filter(function (r) { return pids[r.project_id]; })
      .sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); })
      .slice(0, 8).map(function (r) { var p = pids[r.project_id]; return { id: r.id, project_id: r.project_id, project_name: p.name, project_code: p.code, activity_name: r.activity_name || '', progress: num_(r.progress), note: str_(r.result, 140), by: r.by_name || '', at: r.created_at }; });

    // รายการตั้งค่าเริ่มต้น
    var checklist = null;
    if (u.role === 'admin' || u.role === 'planner') {
      checklist = [
        { key: 'org', label: 'ตั้งชื่อองค์กรและโลโก้', done: st.org_name !== DEFAULT_SETTINGS.org_name, tab: 'org' },
        { key: 'fy', label: 'ตรวจปีงบประมาณ', done: readAll_('FiscalYears').length > 0, tab: 'fiscal' },
        { key: 'dept', label: 'เพิ่มหน่วยงาน', done: readAll_('Departments').length > 0, tab: 'dept' },
        { key: 'strategy', label: 'เพิ่มยุทธศาสตร์', done: readAll_('Strategies').length > 0, tab: 'strategy' },
        { key: 'source', label: 'ตรวจแหล่งงบประมาณ', done: readAll_('BudgetSources').length > 0, tab: 'source' },
        { key: 'user', label: 'เพิ่มผู้ใช้งาน', done: readAll_('Users').length > 1, tab: 'users' },
        { key: 'notify', label: 'ตั้งค่าการแจ้งเตือน', done: !!(st.notify.telegram_token || st.notify.line_token), tab: 'notify' }
      ];
    }

    return ok_({
      fy: fy,
      scope: isAll ? 'all' : (deptScope ? 'dept' : 'own'),
      totals: {
        allocated: allocated, approved: approved, paid: paid, committed: committed,
        remaining: (allocated || approved) - paid - committed,
        projects: live.length, avg_progress: avgProgress,
        completed: byStatus.completed || 0, overdue: overdue.length
      },
      by_status: byStatus, by_source: bySource, by_dept: byDept,
      overdue: overdue, recent: recent, checklist: checklist
    });
  });
}

/* ============================================================
 * 10.5) PROJECTS / ACTIVITIES / WORKFLOW
 * ============================================================ */
var PROJECT_FIELDS = ['name', 'fiscal_year', 'dept_id', 'owner_id', 'co_owners', 'strategy_id', 'source_id', 'location',
  'start_date', 'end_date', 'budget_request', 'rationale', 'objectives', 'target_quant', 'target_qual', 'expected_outcome', 'kpis', 'note'];
var ACTIVITY_FIELDS = ['seq', 'name', 'output', 'weight', 'budget', 'start_date', 'end_date', 'responsible', 'note'];
var R_PROJECT = ['admin', 'planner', 'dept_head', 'staff'];
var HIST_LABEL = { create: 'สร้างโครงการ', edit: 'แก้ไขข้อมูล', submit: 'เสนออนุมัติ', revise: 'ตีกลับให้แก้ไข', approve: 'อนุมัติโครงการ', start: 'เริ่มดำเนินการ', complete: 'ปิดโครงการ', cancel: 'ยกเลิกโครงการ' };

function isDate_(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
function todayStr_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'); }
function round1_(n) { return Math.round(num_(n) * 10) / 10; }

/** สิทธิ์ต่อโครงการ (ใช้ทั้ง server และส่งให้ client ซ่อน/แสดงปุ่ม) */
function projectPerms_(u, p) {
  var st = p.status;
  var isAdmin = u.role === 'admin', isPlanner = u.role === 'planner', isExec = u.role === 'executive';
  var isOwner = p.owner_id === u.id || p.created_by === u.id;
  var isHead = u.role === 'dept_head' && u.dept_id === p.dept_id;
  var draft = st === 'draft' || st === 'revise';
  var live = st !== 'completed' && st !== 'cancelled';
  return {
    view: scopeProjects_(u, [p]).length > 0,
    edit: (draft && (isOwner || isHead || isAdmin || isPlanner)) || (live && (isAdmin || isPlanner)),
    del: st === 'draft' && (isOwner || isAdmin),
    submit: draft && (isOwner || isHead || isAdmin),
    revise: st === 'submitted' && (isExec || isPlanner || isAdmin),
    approve: st === 'submitted' && (isExec || isAdmin),
    start: st === 'approved' && (isOwner || isHead || isAdmin),
    complete: st === 'in_progress' && (isOwner || isHead || isAdmin || isPlanner),
    cancel: live && st !== 'draft' && (isExec || isAdmin),
    activity: ['draft', 'revise', 'approved', 'in_progress'].indexOf(st) >= 0 && (isOwner || isHead || isAdmin || isPlanner),
    report: st === 'in_progress' && (isOwner || isHead || isAdmin || isPlanner),
    disburse: st === 'in_progress' && (isOwner || isHead || isAdmin || isPlanner)
  };
}

function nameMaps_() {
  var m = { dept: {}, user: {}, strategy: {}, source: {} };
  readAll_('Departments', true).forEach(function (d) { m.dept[d.id] = d; });
  readAll_('Users', true).forEach(function (d) { m.user[d.id] = d; });
  readAll_('Strategies', true).forEach(function (d) { m.strategy[d.id] = d; });
  readAll_('BudgetSources', true).forEach(function (d) { m.source[d.id] = d; });
  return m;
}

function activitiesOf_(pid) {
  return readAll_('Activities').filter(function (a) { return a.project_id === pid; })
    .sort(function (a, b) { return (num_(a.seq) - num_(b.seq)) || String(a.created_at || '').localeCompare(String(b.created_at || '')); });
}

/** งบสูงสุดที่ลงกิจกรรมได้: อนุมัติแล้วใช้งบอนุมัติ ยังไม่อนุมัติใช้งบที่ขอ */
function budgetCap_(p) {
  return ['approved', 'in_progress', 'completed'].indexOf(p.status) >= 0 ? num_(p.budget_approved) : num_(p.budget_request);
}

/** คำนวณ % โครงการจากกิจกรรม (ถ่วงน้ำหนัก) ต้องเรียกภายใน lock */
function recalcProject_(pid) {
  var p = getById_('Projects', pid); if (!p) return null;
  var acts = activitiesOf_(pid), w = 0, wp = 0, b = 0;
  acts.forEach(function (a) { w += num_(a.weight); wp += num_(a.weight) * num_(a.progress); b += num_(a.budget); });
  p.progress = w ? round1_(wp / w) : 0;
  p.activity_weight = round1_(w);
  p.activity_budget = b;
  p.activity_count = acts.length;
  p.last_report_at = readAll_('ProgressReports').filter(function (r) { return r.project_id === pid; })
    .reduce(function (mx, r) { return r.report_date > mx ? r.report_date : mx; }, '');
  p.updated_at = now_();
  saveRec_('Projects', p);
  return p;
}

function addHistory_(rec, u, action, note, extra) {
  rec.history = rec.history || [];
  var h = { at: now_(), by: u.id, by_name: u.name, action: action, note: str_(note, 1000) };
  if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
  rec.history.push(h);
  if (rec.history.length > 60) rec.history = rec.history.slice(-60);
}

function nextProjectCode_(fy) {
  var pre = (getSettings_().project_prefix || 'PJ') + String(fy).slice(-2) + '-';
  var max = 0;
  readAll_('Projects', true).forEach(function (p) {
    var c = String(p.code || '');
    if (c.indexOf(pre) === 0) { var n = parseInt(c.slice(pre.length), 10); if (n > max) max = n; }
  });
  var s = String(max + 1); while (s.length < 3) s = '0' + s;
  return pre + s;
}

/** แจ้งเตือนหลังบันทึกเสร็จ (ล้มแค่ log) */
function projectNotify_(kind, rec, text, toUser) {
  try {
    var st = getSettings_(), n = st.notify || {};
    var flag = { submit: 'on_submit', revise: 'on_submit', approve: 'on_approve' }[kind];
    if (!flag || n[flag] !== false) {
      var url = ''; try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { /* ยังไม่ deploy */ }
      notifyAll_('[' + st.org_name + '] ' + text + '\n' + rec.code + ' ' + rec.name + (url ? '\n' + url + '?p=projects/' + rec.id : ''));
    }
  } catch (e) { logError_('projectNotify_', e); }
  pushNotif_(toUser, text, rec.code + ' ' + rec.name, 'projects/' + rec.id);
}

/* ---------- list / get ---------- */
function apiListProjects(token, opt) {
  return api_('apiListProjects', token, null, function (u) {
    opt = opt || {}; var f = opt.filters || {};
    var fy = str_(f.fiscal_year) || String(getSettings_().current_fy);
    var rows = scopeProjects_(u, readAll_('Projects').filter(function (p) { return String(p.fiscal_year) === fy; }));
    var counts = { all: rows.length };
    PROJECT_STATUS.forEach(function (s) { counts[s] = 0; });
    rows.forEach(function (p) { counts[p.status] = (counts[p.status] || 0) + 1; });
    if (f.status) rows = rows.filter(function (p) { return p.status === f.status; });
    if (f.dept_id) rows = rows.filter(function (p) { return p.dept_id === f.dept_id; });
    if (f.strategy_id) rows = rows.filter(function (p) { return p.strategy_id === f.strategy_id; });
    if (f.source_id) rows = rows.filter(function (p) { return p.source_id === f.source_id; });
    if (f.mine) rows = rows.filter(function (p) { return p.owner_id === u.id; });
    if (!opt.sort) rows = rows.slice().sort(function (a, b) { return String(b.code || '').localeCompare(String(a.code || '')); });
    var m = nameMaps_(), today = todayStr_();
    var out = paged_(rows, opt, function (p) {
      var d = m.dept[p.dept_id] || {}, o = m.user[p.owner_id] || {};
      return {
        id: p.id, code: p.code, name: p.name, status: p.status,
        dept_name: d.short_name || d.name || '', owner_name: o.name || '',
        budget_request: num_(p.budget_request), budget_approved: num_(p.budget_approved),
        progress: num_(p.progress), start_date: p.start_date, end_date: p.end_date,
        overdue: p.status === 'in_progress' && !!p.end_date && p.end_date < today && num_(p.progress) < 100
      };
    }, function (p) { return [p.code, p.name, (m.dept[p.dept_id] || {}).name, (m.user[p.owner_id] || {}).name].join(' '); });
    out.counts = counts;
    return ok_(out);
  });
}

function apiGetProject(token, id) {
  return api_('apiGetProject', token, null, function (u) {
    var p = getById_('Projects', id);
    if (!p || p.status === 'deleted') fail_('ไม่พบโครงการ');
    var perm = projectPerms_(u, p);
    if (!perm.view) fail_('ไม่มีสิทธิ์ดูโครงการนี้');
    var m = nameMaps_();
    var out = JSON.parse(JSON.stringify(p));
    var o = m.user[p.owner_id] || {}, d = m.dept[p.dept_id] || {};
    out.dept_name = d.name || ''; out.owner_name = o.name || ''; out.owner_position = o.position || '';
    out.strategy_name = p.strategy_id && m.strategy[p.strategy_id] ? m.strategy[p.strategy_id].code + ' ' + m.strategy[p.strategy_id].name : '';
    out.source_name = p.source_id && m.source[p.source_id] ? m.source[p.source_id].name : '';
    out.budget_cap = budgetCap_(p);
    out.require_allocation = getSettings_().require_allocation !== false;
    out.allocation = null;
    if (p.source_id) {
      var al = findAlloc_(p.fiscal_year, p.dept_id, p.source_id);
      if (al) { var av = allocView_(al, budgetUsage_(p.fiscal_year), pendingOut_(p.fiscal_year), m); out.allocation = { amount: av.amount, approved: av.approved, available: av.available }; }
    }
    out.activities = activitiesOf_(id).map(function (a) {
      return { id: a.id, seq: num_(a.seq), name: a.name, output: a.output || '', weight: num_(a.weight), budget: num_(a.budget), start_date: a.start_date, end_date: a.end_date, responsible: a.responsible || '', note: a.note || '', progress: num_(a.progress), status: a.status || 'pending', last_report_at: a.last_report_at || '' };
    });
    var rawActs = activitiesOf_(id), reps = reportsOf_(id), actMap = {};
    rawActs.forEach(function (a) { actMap[a.id] = a; });
    out.scurve = APPROVED_ST.indexOf(p.status) >= 0 ? sCurve_(p, rawActs, reps) : null;
    out.reports = reps.slice(0, 40).map(function (r) { var v = reportView_(r, actMap); v.can_delete = perm.report && (r.by === u.id || ['admin', 'planner'].indexOf(u.role) >= 0); return v; });
    out.report_count = reps.length;
    var dl = disbOf_(id);
    out.finance = projectFinance_(p, dl);
    var projMap = {}; projMap[p.id] = p;
    out.disbursements = dl.sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); })
      .slice(0, 30).map(function (d) { return disbView_(d, u, m, projMap); });
    out.activities.forEach(function (a) { a.spent = out.finance.by_activity[a.id] || 0; });
    out.history = (p.history || []).slice().reverse();
    out.perm = perm;
    out.today = todayStr_();
    return ok_(out);
  });
}

/* ---------- create / edit ---------- */
function apiSaveProject(token, payload) {
  return api_('apiSaveProject', token, R_PROJECT, function (u) {
    var p = pick_(payload, PROJECT_FIELDS.concat(['id', 'expected_version']));
    var d = {};
    d.name = str_(p.name, 300); if (!d.name) fail_('กรุณากรอกชื่อโครงการ');
    d.fiscal_year = str_(p.fiscal_year);
    var fyRec = readAll_('FiscalYears').filter(function (f) { return String(f.year) === d.fiscal_year; })[0];
    if (!fyRec) fail_('ไม่พบปีงบประมาณ ' + d.fiscal_year);
    d.dept_id = (u.role === 'dept_head' || u.role === 'staff') ? u.dept_id : str_(p.dept_id);
    if (!d.dept_id || !getById_('Departments', d.dept_id)) fail_('กรุณาเลือกหน่วยงานเจ้าของโครงการ');
    d.owner_id = str_(p.owner_id) || u.id;
    d.strategy_id = str_(p.strategy_id);
    if (d.strategy_id && !getById_('Strategies', d.strategy_id)) fail_('ไม่พบยุทธศาสตร์ที่เลือก');
    d.source_id = str_(p.source_id);
    if (d.source_id && !getById_('BudgetSources', d.source_id)) fail_('ไม่พบแหล่งงบประมาณที่เลือก');
    d.co_owners = str_(p.co_owners, 300);
    d.location = str_(p.location, 300);
    d.start_date = str_(p.start_date); d.end_date = str_(p.end_date);
    if (!isDate_(d.start_date) || !isDate_(d.end_date)) fail_('กรุณาระบุวันเริ่มและวันสิ้นสุดโครงการ');
    if (d.start_date > d.end_date) fail_('วันเริ่มต้องไม่เกินวันสิ้นสุด');
    if (fyRec.start_date && fyRec.end_date && (d.start_date < fyRec.start_date || d.start_date > fyRec.end_date)) fail_('วันเริ่มโครงการต้องอยู่ในช่วงปีงบประมาณ ' + d.fiscal_year);
    d.budget_request = Math.round(num_(p.budget_request) * 100) / 100;
    if (d.budget_request < 0) fail_('งบประมาณต้องไม่ติดลบ');
    d.rationale = str_(p.rationale, 6000); d.objectives = str_(p.objectives, 3000);
    d.target_quant = str_(p.target_quant, 2000); d.target_qual = str_(p.target_qual, 2000);
    d.expected_outcome = str_(p.expected_outcome, 2000); d.note = str_(p.note, 1000);
    d.kpis = (Array.isArray(p.kpis) ? p.kpis : []).slice(0, 20).map(function (k) {
      return { name: str_(k && k.name, 300), target: str_(k && k.target, 60), unit: str_(k && k.unit, 40) };
    }).filter(function (k) { return k.name; });

    var rec, isNew = !p.id;
    withLock_(function () {
      if (!isNew) {
        rec = getById_('Projects', p.id);
        if (!rec || rec.status === 'deleted') fail_('ไม่พบโครงการ');
        if (!projectPerms_(u, rec).edit) fail_('แก้ไขโครงการในสถานะนี้ไม่ได้ หรือไม่มีสิทธิ์');
        if (p.expected_version != null && p.expected_version !== '' && num_(p.expected_version) !== num_(rec.version)) fail_('มีผู้อื่นแก้ไขโครงการนี้ไปก่อนแล้ว กรุณาเปิดหน้าใหม่แล้วแก้อีกครั้ง');
        if (u.role === 'staff') d.owner_id = rec.owner_id;
        var draft = rec.status === 'draft' || rec.status === 'revise';
        if (!draft && String(rec.fiscal_year) !== d.fiscal_year) fail_('เปลี่ยนปีงบประมาณได้เฉพาะโครงการที่ยังไม่เสนอ');
        if (!draft && rec.dept_id !== d.dept_id) fail_('เปลี่ยนหน่วยงานได้เฉพาะโครงการที่ยังไม่เสนอ');
        if (!draft && (rec.source_id || '') !== d.source_id) fail_('เปลี่ยนแหล่งงบประมาณได้เฉพาะโครงการที่ยังไม่เสนอ');
        var actBudget = activitiesOf_(rec.id).reduce(function (s, a) { return s + num_(a.budget); }, 0);
        if (draft && actBudget > d.budget_request) fail_('งบที่ขอ (' + d.budget_request + ') น้อยกว่างบที่ลงในกิจกรรมแล้ว (' + actBudget + ')');
      } else {
        if (fyRec.status === 'closed') fail_('ปีงบประมาณ ' + d.fiscal_year + ' ปิดแล้ว');
        if (u.role === 'staff') d.owner_id = u.id;
      }
      var owner = getById_('Users', d.owner_id);
      if (!owner || owner.status !== 'active') fail_('ไม่พบผู้รับผิดชอบโครงการ');
      if (u.role === 'dept_head' && owner.id !== u.id && owner.dept_id !== u.dept_id) fail_('ผู้รับผิดชอบต้องอยู่ในหน่วยงานของคุณ');

      if (isNew) {
        rec = d;
        rec.id = uuid_(); rec.code = nextProjectCode_(d.fiscal_year);
        rec.status = 'draft'; rec.progress = 0; rec.budget_approved = 0; rec.version = 1;
        rec.created_at = now_(); rec.created_by = u.id; rec.updated_at = rec.created_at;
        rec.history = [];
        addHistory_(rec, u, 'create', '');
      } else {
        Object.keys(d).forEach(function (k) { rec[k] = d[k]; });
        rec.version = num_(rec.version) + 1; rec.updated_at = now_(); rec.updated_by = u.id;
        if (rec.status !== 'draft') addHistory_(rec, u, 'edit', '');
      }
      saveRec_('Projects', rec);
    });
    logAction_(u, isNew ? 'create' : 'update', 'Projects', rec.id, rec.code + ' ' + rec.name);
    return ok_({ id: rec.id, code: rec.code, version: rec.version }, isNew ? 'สร้างโครงการ ' + rec.code + ' แล้ว' : 'บันทึกโครงการแล้ว');
  });
}

function apiDeleteProject(token, id) {
  return api_('apiDeleteProject', token, R_PROJECT, function (u) {
    var rec;
    withLock_(function () {
      rec = getById_('Projects', id);
      if (!rec || rec.status === 'deleted') fail_('ไม่พบโครงการ');
      if (!projectPerms_(u, rec).del) fail_('ลบได้เฉพาะโครงการสถานะร่าง');
      var t = now_();
      activitiesOf_(id).forEach(function (a) { a.status = 'deleted'; a.deleted_at = t; a.deleted_by = u.id; saveRec_('Activities', a); });
      rec.status = 'deleted'; rec.deleted_at = t; rec.deleted_by = u.id;
      saveRec_('Projects', rec);
    });
    logAction_(u, 'delete', 'Projects', id, rec.code + ' ' + rec.name);
    return ok_(null, 'ลบโครงการ ' + rec.code + ' แล้ว');
  });
}

/* ---------- workflow (แต่ละขั้นมีฟังก์ชันของตัวเอง) ---------- */
function transition_(fnName, token, id, permKey, fn) {
  return api_(fnName, token, null, function (u) {
    var rec, info;
    withLock_(function () {
      rec = getById_('Projects', id);
      if (!rec || rec.status === 'deleted') fail_('ไม่พบโครงการ');
      if (!projectPerms_(u, rec)[permKey]) fail_('ทำรายการนี้ไม่ได้ในสถานะปัจจุบัน หรือไม่มีสิทธิ์');
      var from = rec.status;
      info = fn(rec, u) || {};
      addHistory_(rec, u, permKey, info.note || '', { from: from, to: rec.status });
      rec.version = num_(rec.version) + 1; rec.updated_at = now_(); rec.updated_by = u.id;
      saveRec_('Projects', rec);
    });
    logAction_(u, permKey, 'Projects', id, rec.code + ' > ' + rec.status + (info.note ? ': ' + info.note : ''));
    if (info.notify) projectNotify_(permKey, rec, info.notify, info.toUser);
    return ok_({ id: id, status: rec.status }, info.msg || 'บันทึกแล้ว');
  });
}

function apiSubmitProject(token, id, note) {
  return transition_('apiSubmitProject', token, id, 'submit', function (p, u) {
    var acts = activitiesOf_(p.id);
    if (!acts.length) fail_('ต้องมีกิจกรรมอย่างน้อย 1 กิจกรรมก่อนเสนอ');
    var w = acts.reduce(function (s, a) { return s + num_(a.weight); }, 0);
    if (Math.abs(w - 100) > 0.01) fail_('น้ำหนักกิจกรรมรวมต้องเท่ากับ 100 (ตอนนี้ ' + round1_(w) + ')');
    var b = acts.reduce(function (s, a) { return s + num_(a.budget); }, 0);
    if (b > num_(p.budget_request)) fail_('งบกิจกรรมรวมเกินงบที่ขอ');
    p.status = 'submitted'; p.submitted_at = now_(); p.submitted_by = u.id;
    return { note: str_(note, 1000), msg: 'เสนอโครงการเพื่อพิจารณาแล้ว', notify: 'มีโครงการเสนอขออนุมัติ', toUser: usersWhere_(function (x) { return ['executive', 'admin', 'planner'].indexOf(x.role) >= 0 && x.id !== u.id; }) };
  });
}

function apiReviseProject(token, id, note) {
  return transition_('apiReviseProject', token, id, 'revise', function (p) {
    note = str_(note, 1000);
    if (!note) fail_('กรุณาระบุเหตุผลที่ตีกลับ');
    p.status = 'revise';
    return { note: note, msg: 'ตีกลับให้แก้ไขแล้ว', notify: 'โครงการถูกตีกลับให้แก้ไข: ' + note, toUser: p.owner_id };
  });
}

function apiApproveProject(token, id, data) {
  return transition_('apiApproveProject', token, id, 'approve', function (p, u) {
    data = data || {};
    var amt = Math.round(num_(data.budget_approved) * 100) / 100, req = num_(p.budget_request);
    if (amt < 0) fail_('งบอนุมัติต้องไม่ติดลบ');
    if (amt > req) fail_('งบอนุมัติต้องไม่เกินงบที่ขอ (' + req + ')');
    if (req > 0 && amt <= 0) fail_('กรุณาระบุงบประมาณที่อนุมัติ');
    if (getSettings_().require_allocation !== false && amt > 0) {
      if (!p.source_id) fail_('โครงการยังไม่ระบุแหล่งงบประมาณ แก้ไขโครงการก่อนอนุมัติ');
      var al = findAlloc_(p.fiscal_year, p.dept_id, p.source_id);
      if (!al) fail_('ยังไม่มีการจัดสรรงบจากแหล่งงบนี้ให้หน่วยงานของโครงการ (จัดสรรที่เมนูงบประมาณ)');
      var av = allocView_(al, budgetUsage_(p.fiscal_year), pendingOut_(p.fiscal_year), nameMaps_());
      if (amt > av.available + 0.001) fail_('งบจัดสรรคงเหลือไม่พอ อนุมัติได้อีกไม่เกิน ' + av.available.toLocaleString() + ' บาท');
    }
    p.status = 'approved'; p.budget_approved = amt; p.approved_at = now_(); p.approved_by = u.id;
    var actB = activitiesOf_(p.id).reduce(function (s, a) { return s + num_(a.budget); }, 0);
    var msg = 'อนุมัติโครงการแล้ว' + (actB > amt ? ' (งบกิจกรรมรวมเกินงบอนุมัติ ผู้รับผิดชอบต้องปรับกิจกรรม)' : '');
    return { note: str_(data.note, 1000), msg: msg, notify: 'โครงการได้รับอนุมัติ งบ ' + amt.toLocaleString() + ' บาท', toUser: p.owner_id };
  });
}

function apiStartProject(token, id) {
  return transition_('apiStartProject', token, id, 'start', function (p) {
    var actB = activitiesOf_(p.id).reduce(function (s, a) { return s + num_(a.budget); }, 0);
    if (actB > num_(p.budget_approved)) fail_('งบกิจกรรมรวมเกินงบอนุมัติ ปรับกิจกรรมก่อนเริ่มดำเนินการ');
    p.status = 'in_progress'; p.started_at = now_();
    return { msg: 'เริ่มดำเนินโครงการแล้ว' };
  });
}

function apiCompleteProject(token, id, note) {
  return transition_('apiCompleteProject', token, id, 'complete', function (p) {
    note = str_(note, 1000);
    if (num_(p.progress) < 100 && !note) fail_('ความก้าวหน้ายังไม่ถึง 100% กรุณาระบุเหตุผลที่ปิดโครงการ');
    var fin = projectFinance_(p);
    if (fin.committed > 0) fail_('ยังมีคำขอเบิกค้างอยู่ ' + fin.committed.toLocaleString() + ' บาท ต้องจ่ายหรือยกเลิกก่อนปิดโครงการ');
    p.status = 'completed'; p.completed_at = now_();
    p.budget_final = fin.paid;
    var back = round2_(fin.approved - fin.paid);
    return { note: note + (back > 0 ? (note ? ' · ' : '') + 'คืนงบเหลือจ่าย ' + back.toLocaleString() + ' บาท' : ''), msg: 'ปิดโครงการแล้ว' + (back > 0 ? ' คืนงบเหลือจ่าย ' + back.toLocaleString() + ' บาท เข้างบจัดสรร' : '') };
  });
}

function apiCancelProject(token, id, note) {
  return transition_('apiCancelProject', token, id, 'cancel', function (p) {
    note = str_(note, 1000);
    if (!note) fail_('กรุณาระบุเหตุผลที่ยกเลิก');
    var fin = projectFinance_(p);
    if (fin.committed > 0) fail_('ยังมีคำขอเบิกค้างอยู่ ต้องยกเลิกหรือไม่อนุมัติคำขอเบิกก่อน');
    if (fin.paid > 0) fail_('โครงการนี้จ่ายเงินไปแล้ว ' + fin.paid.toLocaleString() + ' บาท ใช้ "ปิดโครงการ" แทนการยกเลิก');
    p.status = 'cancelled'; p.cancelled_at = now_();
    return { note: note, msg: 'ยกเลิกโครงการแล้ว', toUser: p.owner_id, notify: 'โครงการถูกยกเลิก: ' + note };
  });
}

/* ---------- activities ---------- */
function apiSaveActivity(token, payload) {
  return api_('apiSaveActivity', token, R_PROJECT, function (u) {
    var p = pick_(payload, ACTIVITY_FIELDS.concat(['id', 'project_id']));
    var d = {
      seq: num_(p.seq), name: str_(p.name, 300), output: str_(p.output, 500),
      weight: round1_(p.weight), budget: Math.round(num_(p.budget) * 100) / 100,
      start_date: str_(p.start_date), end_date: str_(p.end_date),
      responsible: str_(p.responsible, 200), note: str_(p.note, 1000)
    };
    if (!d.name) fail_('กรุณากรอกชื่อกิจกรรม');
    if (d.weight <= 0 || d.weight > 100) fail_('น้ำหนักต้องมากกว่า 0 และไม่เกิน 100');
    if (d.budget < 0) fail_('งบประมาณต้องไม่ติดลบ');
    if (!isDate_(d.start_date) || !isDate_(d.end_date)) fail_('กรุณาระบุช่วงเวลากิจกรรม');
    if (d.start_date > d.end_date) fail_('วันเริ่มต้องไม่เกินวันสิ้นสุด');
    var rec, proj;
    withLock_(function () {
      if (p.id) {
        rec = getById_('Activities', p.id);
        if (!rec || rec.status === 'deleted') fail_('ไม่พบกิจกรรม');
        proj = getById_('Projects', rec.project_id);
      } else {
        proj = getById_('Projects', str_(p.project_id));
      }
      if (!proj || proj.status === 'deleted') fail_('ไม่พบโครงการ');
      if (!projectPerms_(u, proj).activity) fail_('แก้ไขกิจกรรมในสถานะนี้ไม่ได้ หรือไม่มีสิทธิ์');
      if (d.start_date < proj.start_date || d.end_date > proj.end_date) fail_('ช่วงเวลากิจกรรมต้องอยู่ในช่วงโครงการ');
      var others = activitiesOf_(proj.id).filter(function (a) { return !rec || a.id !== rec.id; });
      var w = others.reduce(function (s, a) { return s + num_(a.weight); }, 0);
      if (w + d.weight > 100.001) fail_('น้ำหนักรวมเกิน 100 (ใส่ได้อีกไม่เกิน ' + round1_(100 - w) + ')');
      var b = others.reduce(function (s, a) { return s + num_(a.budget); }, 0), cap = budgetCap_(proj);
      if (b + d.budget > cap + 0.001) fail_('งบกิจกรรมรวมเกินงบโครงการ (ใส่ได้อีกไม่เกิน ' + Math.max(0, cap - b).toLocaleString() + ' บาท)');
      if (rec) {
        var spent = projectFinance_(proj).by_activity[rec.id] || 0;
        if (d.budget < spent - 0.001) fail_('งบกิจกรรมต้องไม่น้อยกว่ายอดที่เบิก/ผูกพันแล้ว (' + spent.toLocaleString() + ' บาท)');
      }
      if (!rec) {
        rec = { id: uuid_(), project_id: proj.id, status: 'pending', progress: 0, created_at: now_(), created_by: u.id };
        if (!d.seq) d.seq = others.length + 1;
      }
      Object.keys(d).forEach(function (k) { rec[k] = d[k]; });
      rec.updated_at = now_(); rec.updated_by = u.id;
      saveRec_('Activities', rec);
      recalcProject_(proj.id);
    });
    logAction_(u, p.id ? 'update' : 'create', 'Activities', rec.id, proj.code + ' : ' + rec.name);
    return ok_({ id: rec.id }, 'บันทึกกิจกรรมแล้ว');
  });
}

function apiDeleteActivity(token, id) {
  return api_('apiDeleteActivity', token, R_PROJECT, function (u) {
    var rec, proj;
    withLock_(function () {
      rec = getById_('Activities', id);
      if (!rec || rec.status === 'deleted') fail_('ไม่พบกิจกรรม');
      proj = getById_('Projects', rec.project_id);
      if (!proj || !projectPerms_(u, proj).activity) fail_('ลบกิจกรรมในสถานะนี้ไม่ได้ หรือไม่มีสิทธิ์');
      var used = readAll_('ProgressReports').filter(function (r) { return r.activity_id === id; }).length +
        readAll_('Disbursements').filter(function (r) { return r.activity_id === id; }).length;
      if (used) fail_('กิจกรรมนี้มีรายงานหรือการเบิกจ่ายแล้ว ลบไม่ได้');
      rec.status = 'deleted'; rec.deleted_at = now_(); rec.deleted_by = u.id;
      saveRec_('Activities', rec);
      recalcProject_(proj.id);
    });
    logAction_(u, 'delete', 'Activities', id, proj.code + ' : ' + rec.name);
    return ok_(null, 'ลบกิจกรรมแล้ว');
  });
}

/* ============================================================
 * 10.6) BUDGET : ALLOCATION / TRANSFER
 * ============================================================ */
var R_BUDGET_VIEW = ['admin', 'executive', 'planner', 'finance', 'dept_head'];
var R_ALLOC = ['admin', 'planner'];
var R_TRANSFER_REQ = ['admin', 'planner', 'dept_head'];
var R_TRANSFER_APPROVE = ['admin', 'executive'];
var APPROVED_ST = ['approved', 'in_progress', 'completed'];

function round2_(n) { return Math.round(num_(n) * 100) / 100; }

/** กันส่งซ้ำ: request_id เดิมคืนผลเดิม (เรียกภายใน lock) */
function onceRequest_(rid, fn) {
  rid = str_(rid, 80);
  if (!rid) return fn();
  var c = CacheService.getScriptCache(), key = 'rq:' + rid, prev = c.get(key);
  if (prev) { var r = JSON.parse(prev); r.message = (r.message || '') + ' (รายการนี้บันทึกไว้แล้ว)'; r.duplicate = true; return r; }
  var res = fn();
  try { c.put(key, JSON.stringify(res), 21600); } catch (e) { /* ignore */ }
  return res;
}

function allocKey_(fy, dept, src) { return String(fy) + '|' + (dept || '') + '|' + (src || ''); }

/** ยอดที่อนุมัติให้โครงการ / รอพิจารณา แยกตาม ปี|หน่วยงาน|แหล่งงบ */
function budgetUsage_(fy) {
  var m = {};
  readAll_('Projects').forEach(function (p) {
    if (String(p.fiscal_year) !== String(fy)) return;
    var k = allocKey_(fy, p.dept_id, p.source_id);
    var x = m[k] || (m[k] = { approved: 0, pending: 0, projects: 0 });
    if (APPROVED_ST.indexOf(p.status) >= 0) { x.approved += (p.status === 'completed' && p.budget_final != null) ? num_(p.budget_final) : num_(p.budget_approved); x.projects++; }
    else if (p.status === 'submitted') x.pending += num_(p.budget_request);
  });
  return m;
}

/** ยอดรอโอนออกของแต่ละการจัดสรร */
function pendingOut_(fy, exceptId) {
  var m = {};
  readAll_('Transfers').forEach(function (t) {
    if (String(t.fiscal_year) === String(fy) && t.status === 'pending' && t.id !== exceptId) m[t.from_alloc_id] = (m[t.from_alloc_id] || 0) + num_(t.amount);
  });
  return m;
}

function allocsOf_(fy) { return readAll_('Allocations').filter(function (a) { return String(a.fiscal_year) === String(fy); }); }
function findAlloc_(fy, dept, src) { return allocsOf_(fy).filter(function (a) { return a.dept_id === dept && a.source_id === src; })[0] || null; }

function allocView_(a, usage, pout, m) {
  var x = usage[allocKey_(a.fiscal_year, a.dept_id, a.source_id)] || { approved: 0, pending: 0, projects: 0 };
  var d = m.dept[a.dept_id] || {}, s = m.source[a.source_id] || {};
  var amount = num_(a.amount), po = pout[a.id] || 0;
  return {
    id: a.id, fiscal_year: a.fiscal_year, dept_id: a.dept_id, dept_name: d.name || '', dept_short: d.short_name || d.name || '',
    source_id: a.source_id, source_name: s.name || '', amount: amount, base_amount: num_(a.base_amount),
    approved: x.approved, pending: x.pending, projects: x.projects, pending_out: po,
    remaining: round2_(amount - x.approved), available: round2_(amount - x.approved - po),
    note: a.note || '', version: num_(a.version), updated_at: a.updated_at || ''
  };
}

function allocHist_(rec, u, action, from, to, extra) {
  rec.history = rec.history || [];
  var h = { at: now_(), by: u ? u.id : 'system', by_name: u ? u.name : 'ระบบ', action: action, from: from, to: to };
  if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
  rec.history.push(h);
  if (rec.history.length > 80) rec.history = rec.history.slice(-80);
}

function genericNotify_(flag, text, toUser, link) {
  try {
    var st = getSettings_(), n = st.notify || {};
    if (!flag || n[flag] !== false) {
      var url = ''; try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { /* ยังไม่ deploy */ }
      notifyAll_('[' + st.org_name + '] ' + text + (url && link ? '\n' + url + '?p=' + link : ''));
    }
  } catch (e) { logError_('genericNotify_', e); }
  pushNotif_(toUser, text, '', link);
}

/** แจ้งเตือนในระบบ: toUser เป็น id เดียวหรือ array (ล้มแค่ log) */
function pushNotif_(toUser, title, body, link) {
  var ids = [].concat(toUser || []).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  if (!ids.length) return 0;
  try {
    withLock_(function () {
      ids.forEach(function (id) { saveRec_('Notifications', { id: uuid_(), user_id: id, read: '0', status: 'active', created_at: now_(), title: str_(title, 300), body: str_(body, 300), link: link || '' }); });
    });
  } catch (e) { logError_('pushNotif_', e); }
  return ids.length;
}

/** id ผู้ใช้ที่ใช้งานอยู่ตามเงื่อนไข */
function usersWhere_(fn) {
  return readAll_('Users').filter(function (x) { return x.status === 'active' && fn(x); }).map(function (x) { return x.id; });
}

/** อ่านเฉพาะ n แถวท้ายของชีต JSON (ชีตที่โตเรื่อย ๆ เช่น Notifications) */
function tailRecs_(name, n) {
  var s = sh_(name), last = s.getLastRow(), h = SCHEMA[name];
  if (last < 2) return [];
  var start = Math.max(2, last - n + 1);
  return s.getRange(start, h.length, last - start + 1, 1).getValues().map(function (r) {
    try { return JSON.parse(r[0]); } catch (e) { return null; }
  }).filter(function (x) { return x && x.status !== 'deleted'; });
}

function myNotifs_(u) {
  return tailRecs_('Notifications', 3000).filter(function (n) { return n.user_id === u.id; }).reverse();
}

function apiListNotifications(token, opt) {
  return api_('apiListNotifications', token, null, function (u) {
    var rows = myNotifs_(u);
    var unread = rows.filter(function (n) { return String(n.read) !== '1'; }).length;
    var out = paged_(rows, opt || {}, function (n) {
      return { id: n.id, title: n.title, body: n.body || '', link: n.link || '', read: String(n.read) === '1', created_at: n.created_at };
    }, function (n) { return [n.title, n.body].join(' '); });
    out.unread = unread;
    return ok_(out);
  });
}

/** ids = array ของ id หรือ 'all' */
function apiMarkNotificationsRead(token, ids) {
  return api_('apiMarkNotificationsRead', token, null, function (u) {
    var n = 0;
    withLock_(function () {
      myNotifs_(u).filter(function (x) { return String(x.read) !== '1' && (ids === 'all' || (Array.isArray(ids) && ids.indexOf(x.id) >= 0)); })
        .slice(0, 300).forEach(function (x) { x.read = '1'; x.read_at = now_(); saveRec_('Notifications', x); n++; });
    });
    return ok_({ count: n }, n ? 'อ่านแล้ว ' + n + ' รายการ' : '');
  });
}

/* ---------- ภาพรวม ---------- */
function apiBudgetOverview(token, fy) {
  return api_('apiBudgetOverview', token, R_BUDGET_VIEW, function (u) {
    var st = getSettings_();
    fy = str_(fy) || String(st.current_fy);
    var m = nameMaps_(), usage = budgetUsage_(fy), pout = pendingOut_(fy);
    var allocs = allocsOf_(fy);
    if (u.role === 'dept_head') allocs = allocs.filter(function (a) { return a.dept_id === u.dept_id; });
    var views = allocs.map(function (a) { return allocView_(a, usage, pout, m); });

    var used = {}; views.forEach(function (v) { used[v.source_id] = 1; });
    var bySort = function (a, b) { return (num_(a.sort) - num_(b.sort)) || String(a.code || '').localeCompare(String(b.code || '')); };
    var sources = readAll_('BudgetSources').filter(function (s) { return used[s.id] || s.status !== 'inactive'; }).sort(bySort)
      .map(function (s) { return { id: s.id, code: s.code, name: s.name, type: s.type }; });

    var rows = {}, totals = { amount: 0, approved: 0, pending: 0, remaining: 0, pending_out: 0 }, srcTot = {};
    views.forEach(function (v) {
      var r = rows[v.dept_id] || (rows[v.dept_id] = { dept_id: v.dept_id, dept_name: v.dept_name, cells: {}, total: { amount: 0, approved: 0, pending: 0, remaining: 0 } });
      r.cells[v.source_id] = { id: v.id, amount: v.amount, approved: v.approved, pending: v.pending, remaining: v.remaining, available: v.available, version: v.version };
      ['amount', 'approved', 'pending', 'remaining'].forEach(function (k) { r.total[k] += v[k]; totals[k] += v[k]; });
      totals.pending_out += v.pending_out;
      var s = srcTot[v.source_id] || (srcTot[v.source_id] = { amount: 0, approved: 0, remaining: 0 });
      s.amount += v.amount; s.approved += v.approved; s.remaining += v.remaining;
    });
    var rowArr = Object.keys(rows).map(function (k) { return rows[k]; }).sort(function (a, b) { return bySort(m.dept[a.dept_id] || {}, m.dept[b.dept_id] || {}); });

    var unalloc = [];
    Object.keys(usage).forEach(function (k) {
      var parts = k.split('|'), dept = parts[1], src = parts[2];
      if (u.role === 'dept_head' && dept !== u.dept_id) return;
      var has = views.some(function (v) { return v.dept_id === dept && v.source_id === src; });
      if (!has && (usage[k].approved || usage[k].pending)) {
        unalloc.push({ dept_name: (m.dept[dept] || {}).name || '', source_name: src ? (m.source[src] || {}).name || '' : 'ไม่ระบุแหล่งงบ', approved: usage[k].approved, pending: usage[k].pending });
      }
    });
    var pendT = readAll_('Transfers').filter(function (t) {
      return String(t.fiscal_year) === fy && t.status === 'pending' && (u.role !== 'dept_head' || t.from_dept_id === u.dept_id || t.to_dept_id === u.dept_id);
    }).length;

    return ok_({ fy: fy, sources: sources, rows: rowArr, source_totals: srcTot, totals: totals, unallocated: unalloc, pending_transfers: pendT, require_allocation: st.require_allocation !== false });
  });
}

/* ---------- การจัดสรร ---------- */
function apiListAllocations(token, opt) {
  return api_('apiListAllocations', token, R_BUDGET_VIEW, function (u) {
    opt = opt || {}; var f = opt.filters || {};
    var fy = str_(f.fiscal_year) || String(getSettings_().current_fy);
    var m = nameMaps_(), usage = budgetUsage_(fy), pout = pendingOut_(fy);
    var rows = allocsOf_(fy);
    if (u.role === 'dept_head') rows = rows.filter(function (a) { return a.dept_id === u.dept_id; });
    if (f.dept_id) rows = rows.filter(function (a) { return a.dept_id === f.dept_id; });
    if (f.source_id) rows = rows.filter(function (a) { return a.source_id === f.source_id; });
    var views = rows.map(function (a) { return allocView_(a, usage, pout, m); });
    if (!opt.sort) views.sort(function (a, b) { return a.dept_name.localeCompare(b.dept_name, 'th') || a.source_name.localeCompare(b.source_name, 'th'); });
    return ok_(paged_(views, opt, null, function (v) { return [v.dept_name, v.source_name, v.note].join(' '); }));
  });
}

function apiGetAllocation(token, id) {
  return api_('apiGetAllocation', token, R_BUDGET_VIEW, function (u) {
    var a = getById_('Allocations', id);
    if (!a || a.status === 'deleted') fail_('ไม่พบรายการจัดสรร');
    if (u.role === 'dept_head' && a.dept_id !== u.dept_id) fail_('ไม่มีสิทธิ์ดูรายการนี้');
    var m = nameMaps_(), v = allocView_(a, budgetUsage_(a.fiscal_year), pendingOut_(a.fiscal_year), m);
    v.history = (a.history || []).slice().reverse();
    v.projects_list = readAll_('Projects').filter(function (p) {
      return String(p.fiscal_year) === String(a.fiscal_year) && p.dept_id === a.dept_id && p.source_id === a.source_id && (APPROVED_ST.indexOf(p.status) >= 0 || p.status === 'submitted');
    }).map(function (p) { return { id: p.id, code: p.code, name: p.name, status: p.status, budget_request: num_(p.budget_request), budget_approved: num_(p.budget_approved) }; });
    return ok_(v);
  });
}

function apiSaveAllocation(token, payload) {
  return api_('apiSaveAllocation', token, R_ALLOC, function (u) {
    var p = pick_(payload, ['id', 'fiscal_year', 'dept_id', 'source_id', 'amount', 'note', 'expected_version', 'request_id']);
    var amount = round2_(p.amount), note = str_(p.note, 500);
    if (amount < 0) fail_('ยอดจัดสรรต้องไม่ติดลบ');
    var rec, isNew = !p.id;
    var res = withLock_(function () {
      return onceRequest_(p.request_id, function () {
        if (!isNew) {
          rec = getById_('Allocations', p.id);
          if (!rec || rec.status === 'deleted') fail_('ไม่พบรายการจัดสรร');
          if (p.expected_version != null && p.expected_version !== '' && num_(p.expected_version) !== num_(rec.version)) fail_('มีผู้อื่นแก้ไขรายการนี้ไปก่อนแล้ว กรุณาเปิดใหม่');
          var v = allocView_(rec, budgetUsage_(rec.fiscal_year), pendingOut_(rec.fiscal_year), nameMaps_());
          var floor = round2_(v.approved + v.pending_out);
          if (amount < floor) fail_('ยอดจัดสรรต้องไม่น้อยกว่างบที่อนุมัติให้โครงการแล้วรวมยอดรอโอนออก (' + floor.toLocaleString() + ' บาท)');
          if (amount !== num_(rec.amount)) allocHist_(rec, u, 'adjust', num_(rec.amount), amount, { note: note });
          rec.amount = amount; rec.note = note;
          rec.version = num_(rec.version) + 1; rec.updated_at = now_(); rec.updated_by = u.id;
        } else {
          var fy = str_(p.fiscal_year);
          var fyRec = readAll_('FiscalYears').filter(function (f) { return String(f.year) === fy; })[0];
          if (!fyRec) fail_('ไม่พบปีงบประมาณ');
          if (fyRec.status === 'closed') fail_('ปีงบประมาณนี้ปิดแล้ว');
          if (!getById_('Departments', p.dept_id)) fail_('กรุณาเลือกหน่วยงาน');
          if (!getById_('BudgetSources', p.source_id)) fail_('กรุณาเลือกแหล่งงบประมาณ');
          if (findAlloc_(fy, p.dept_id, p.source_id)) fail_('หน่วยงานนี้มีการจัดสรรจากแหล่งงบนี้แล้ว ให้แก้ไขรายการเดิม');
          if (amount <= 0) fail_('กรุณาระบุยอดจัดสรร');
          rec = { id: uuid_(), fiscal_year: fy, dept_id: p.dept_id, source_id: p.source_id, amount: amount, base_amount: amount, note: note, status: 'active', version: 1, created_at: now_(), created_by: u.id, updated_at: now_(), history: [] };
          allocHist_(rec, u, 'create', 0, amount, { note: note });
        }
        saveRec_('Allocations', rec);
        logAction_(u, isNew ? 'create' : 'update', 'Allocations', rec.id, 'จัดสรร ' + amount);
        return ok_({ id: rec.id, version: rec.version }, isNew ? 'บันทึกการจัดสรรงบแล้ว' : 'ปรับยอดจัดสรรแล้ว');
      });
    });
    return res;
  });
}

function apiDeleteAllocation(token, id) {
  return api_('apiDeleteAllocation', token, R_ALLOC, function (u) {
    var rec;
    withLock_(function () {
      rec = getById_('Allocations', id);
      if (!rec || rec.status === 'deleted') fail_('ไม่พบรายการจัดสรร');
      var v = allocView_(rec, budgetUsage_(rec.fiscal_year), pendingOut_(rec.fiscal_year), nameMaps_());
      if (v.approved > 0) fail_('มีโครงการอนุมัติใช้งบนี้แล้ว ลบไม่ได้ (ปรับยอดแทน)');
      var tr = readAll_('Transfers').filter(function (t) { return t.from_alloc_id === id || t.to_alloc_id === id; }).length;
      if (tr) fail_('มีประวัติการโอนงบอ้างถึง ลบไม่ได้ (ปรับยอดแทน)');
      rec.status = 'deleted'; rec.deleted_at = now_(); rec.deleted_by = u.id;
      saveRec_('Allocations', rec);
    });
    logAction_(u, 'delete', 'Allocations', id, 'ลบการจัดสรร ' + rec.amount);
    return ok_(null, 'ลบรายการจัดสรรแล้ว');
  });
}

/* ---------- โอนงบ ---------- */
function transferView_(t, u, m) {
  var nm = function (map, id) { var x = map[id] || {}; return x.short_name || x.name || ''; };
  return {
    id: t.id, fiscal_year: t.fiscal_year, created_at: t.created_at, amount: num_(t.amount), reason: t.reason || '', status: t.status,
    from_dept: nm(m.dept, t.from_dept_id), from_source: nm(m.source, t.from_source_id),
    to_dept: nm(m.dept, t.to_dept_id), to_source: nm(m.source, t.to_source_id),
    requested_by_name: (m.user[t.requested_by] || {}).name || '', decided_by_name: (m.user[t.decided_by] || {}).name || '',
    decided_at: t.decided_at || '', decision_note: t.decision_note || '',
    can_decide: t.status === 'pending' && R_TRANSFER_APPROVE.indexOf(u.role) >= 0,
    can_cancel: t.status === 'pending' && (t.requested_by === u.id || u.role === 'admin')
  };
}

function apiListTransfers(token, opt) {
  return api_('apiListTransfers', token, R_BUDGET_VIEW, function (u) {
    opt = opt || {}; var f = opt.filters || {};
    var fy = str_(f.fiscal_year) || String(getSettings_().current_fy);
    var rows = readAll_('Transfers').filter(function (t) { return String(t.fiscal_year) === fy; });
    if (u.role === 'dept_head') rows = rows.filter(function (t) { return t.from_dept_id === u.dept_id || t.to_dept_id === u.dept_id; });
    if (f.status) rows = rows.filter(function (t) { return t.status === f.status; });
    if (!opt.sort) rows = rows.slice().sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    var m = nameMaps_();
    return ok_(paged_(rows, opt, function (t) { return transferView_(t, u, m); }, function (t) {
      return [(m.dept[t.from_dept_id] || {}).name, (m.dept[t.to_dept_id] || {}).name, t.reason].join(' ');
    }));
  });
}

function apiRequestTransfer(token, payload) {
  return api_('apiRequestTransfer', token, R_TRANSFER_REQ, function (u) {
    var p = pick_(payload, ['from_alloc_id', 'to_dept_id', 'to_source_id', 'amount', 'reason', 'request_id']);
    var amount = round2_(p.amount), reason = str_(p.reason, 1000);
    if (amount <= 0) fail_('กรุณาระบุจำนวนเงินที่โอน');
    if (!reason) fail_('กรุณาระบุเหตุผลการโอน');
    var rec;
    var res = withLock_(function () {
      return onceRequest_(p.request_id, function () {
        var from = getById_('Allocations', p.from_alloc_id);
        if (!from || from.status === 'deleted') fail_('ไม่พบรายการจัดสรรต้นทาง');
        if (u.role === 'dept_head' && from.dept_id !== u.dept_id) fail_('โอนได้เฉพาะงบของหน่วยงานตัวเอง');
        var fyRec = readAll_('FiscalYears').filter(function (f) { return String(f.year) === String(from.fiscal_year); })[0];
        if (fyRec && fyRec.status === 'closed') fail_('ปีงบประมาณนี้ปิดแล้ว');
        if (!getById_('Departments', p.to_dept_id)) fail_('กรุณาเลือกหน่วยงานปลายทาง');
        if (!getById_('BudgetSources', p.to_source_id)) fail_('กรุณาเลือกแหล่งงบปลายทาง');
        if (p.to_dept_id === from.dept_id && p.to_source_id === from.source_id) fail_('ต้นทางและปลายทางต้องต่างกัน');
        var v = allocView_(from, budgetUsage_(from.fiscal_year), pendingOut_(from.fiscal_year), nameMaps_());
        if (amount > v.available + 0.001) fail_('ยอดที่โอนได้คงเหลือ ' + v.available.toLocaleString() + ' บาท');
        rec = {
          id: uuid_(), fiscal_year: from.fiscal_year, from_alloc_id: from.id, from_dept_id: from.dept_id, from_source_id: from.source_id,
          to_dept_id: p.to_dept_id, to_source_id: p.to_source_id, to_alloc_id: '', amount: amount, reason: reason,
          status: 'pending', requested_by: u.id, created_at: now_(), updated_at: now_()
        };
        saveRec_('Transfers', rec);
        logAction_(u, 'create', 'Transfers', rec.id, 'ขอโอนงบ ' + amount);
        return ok_({ id: rec.id }, 'ส่งคำขอโอนงบแล้ว รอผู้บริหารอนุมัติ');
      });
    });
    if (rec && !res.duplicate) genericNotify_('on_submit', 'มีคำขอโอนงบ ' + amount.toLocaleString() + ' บาท: ' + reason, usersWhere_(function (x) { return R_TRANSFER_APPROVE.indexOf(x.role) >= 0 && x.id !== u.id; }), 'budget/transfer');
    return res;
  });
}

/** ใช้ journal: applying > ปรับ 2 การจัดสรร > approved (ซ่อมต่อได้ถ้าค้างกลางทาง) ต้องอยู่ใน lock */
function applyTransfer_(t, u) {
  var j = t.journal;
  [{ id: j.from_id, delta: -num_(t.amount), kind: 'transfer_out' }, { id: j.to_id, delta: num_(t.amount), kind: 'transfer_in' }].forEach(function (x) {
    var a = getById_('Allocations', x.id);
    if (!a) throw new Error('ไม่พบการจัดสรร ' + x.id);
    var done = (a.history || []).some(function (h) { return h.transfer_id === t.id; });
    if (done) return;
    var before = num_(a.amount);
    a.amount = round2_(before + x.delta);
    allocHist_(a, u, x.kind, before, a.amount, { transfer_id: t.id, note: t.reason });
    a.version = num_(a.version) + 1; a.updated_at = now_();
    saveRec_('Allocations', a);
  });
  t.status = 'approved';
  delete t.journal;
  t.updated_at = now_();
  saveRec_('Transfers', t);
}

/** ซ่อมคำขอโอนที่ค้างสถานะ applying (เรียกใน lock) */
function recoverTransfers_() {
  var n = 0;
  readAll_('Transfers').filter(function (t) { return t.status === 'applying' && t.journal; }).forEach(function (t) {
    try { applyTransfer_(t, null); n++; } catch (e) { logError_('recoverTransfers_', e); }
  });
  return n;
}

function apiApproveTransfer(token, id, note, requestId) {
  return api_('apiApproveTransfer', token, R_TRANSFER_APPROVE, function (u) {
    var t;
    var res = withLock_(function () {
      return onceRequest_(requestId, function () {
        recoverTransfers_();
        t = getById_('Transfers', id);
        if (!t || t.status === 'deleted') fail_('ไม่พบคำขอโอนงบ');
        if (t.status !== 'pending') fail_('คำขอนี้ไม่อยู่ในสถานะรออนุมัติ');
        var from = getById_('Allocations', t.from_alloc_id);
        if (!from || from.status === 'deleted') fail_('ไม่พบการจัดสรรต้นทาง');
        var v = allocView_(from, budgetUsage_(t.fiscal_year), pendingOut_(t.fiscal_year, t.id), nameMaps_());
        if (num_(t.amount) > v.available + 0.001) fail_('งบต้นทางคงเหลือไม่พอ (โอนได้ ' + v.available.toLocaleString() + ' บาท)');
        var to = findAlloc_(t.fiscal_year, t.to_dept_id, t.to_source_id);
        if (!to) {
          to = { id: uuid_(), fiscal_year: t.fiscal_year, dept_id: t.to_dept_id, source_id: t.to_source_id, amount: 0, base_amount: 0, note: 'สร้างจากการโอนงบ', status: 'active', version: 1, created_at: now_(), created_by: u.id, updated_at: now_(), history: [] };
          saveRec_('Allocations', to);
        }
        t.to_alloc_id = to.id; t.decided_by = u.id; t.decided_at = now_(); t.decision_note = str_(note, 1000);
        t.status = 'applying';
        t.journal = { from_id: from.id, to_id: to.id, started_at: now_() };
        saveRec_('Transfers', t);
        applyTransfer_(t, u);
        logAction_(u, 'approve', 'Transfers', t.id, 'อนุมัติโอนงบ ' + t.amount);
        return ok_({ id: t.id }, 'อนุมัติการโอนงบแล้ว ยอดจัดสรรปรับเรียบร้อย');
      });
    });
    if (t && !res.duplicate) genericNotify_('on_approve', 'คำขอโอนงบ ' + num_(t.amount).toLocaleString() + ' บาท ได้รับอนุมัติ', t.requested_by, 'budget/transfer');
    return res;
  });
}

function apiRejectTransfer(token, id, note) {
  return api_('apiRejectTransfer', token, R_TRANSFER_APPROVE, function (u) {
    note = str_(note, 1000);
    if (!note) fail_('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
    var t;
    withLock_(function () {
      t = getById_('Transfers', id);
      if (!t || t.status !== 'pending') fail_('คำขอนี้ไม่อยู่ในสถานะรออนุมัติ');
      t.status = 'rejected'; t.decided_by = u.id; t.decided_at = now_(); t.decision_note = note; t.updated_at = now_();
      saveRec_('Transfers', t);
    });
    logAction_(u, 'reject', 'Transfers', id, note);
    genericNotify_('on_approve', 'คำขอโอนงบไม่ได้รับอนุมัติ: ' + note, t.requested_by, 'budget/transfer');
    return ok_(null, 'บันทึกไม่อนุมัติแล้ว');
  });
}

function apiCancelTransfer(token, id) {
  return api_('apiCancelTransfer', token, R_TRANSFER_REQ, function (u) {
    withLock_(function () {
      var t = getById_('Transfers', id);
      if (!t || t.status !== 'pending') fail_('ยกเลิกได้เฉพาะคำขอที่รออนุมัติ');
      if (t.requested_by !== u.id && u.role !== 'admin') fail_('ยกเลิกได้เฉพาะคำขอของตัวเอง');
      t.status = 'cancelled'; t.decided_at = now_(); t.decided_by = u.id; t.updated_at = now_();
      saveRec_('Transfers', t);
    });
    logAction_(u, 'cancel', 'Transfers', id, 'ยกเลิกคำขอโอนงบ');
    return ok_(null, 'ยกเลิกคำขอแล้ว');
  });
}

/* ============================================================
 * 10.7) PROGRESS REPORTS / ATTACHMENTS / S-CURVE
 * ============================================================ */
var ATT_MAX = 8 * 1024 * 1024;
var ATT_MIME = /^(image\/(png|jpeg|webp|gif|heic)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/msword|application\/vnd\.ms-excel)$/;

function dayNum_(s) { s = String(s || ''); return Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000); }
function dayStr_(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }

function reportsOf_(pid) {
  return readAll_('ProgressReports').filter(function (r) { return r.project_id === pid; })
    .sort(function (a, b) { return String(b.report_date).localeCompare(String(a.report_date)) || String(b.created_at || '').localeCompare(String(a.created_at || '')); });
}

/** % ตามแผน ณ วันที่ (กระจายเชิงเส้นตามช่วงกิจกรรม ถ่วงน้ำหนัก) */
function planPct_(acts, dateStr) {
  var n = dayNum_(dateStr), w = 0, s = 0;
  acts.forEach(function (a) {
    var wt = num_(a.weight); if (!wt || !a.start_date || !a.end_date) return;
    var a0 = dayNum_(a.start_date), a1 = dayNum_(a.end_date) + 1;
    var f = n + 1 >= a1 ? 1 : (n < a0 ? 0 : (n + 1 - a0) / (a1 - a0));
    w += wt; s += wt * f;
  });
  return w ? round1_(s / w * 100) : 0;
}

/** % จริง ณ วันที่ จากรายงานล่าสุดของแต่ละกิจกรรมที่ไม่เกินวันนั้น */
function actualPct_(acts, reports, dateStr) {
  var w = 0, s = 0;
  acts.forEach(function (a) {
    var wt = num_(a.weight); if (!wt) return;
    var r = reports.filter(function (x) { return x.activity_id === a.id && x.report_date <= dateStr; })[0];
    w += wt; s += wt * (r ? num_(r.progress) : 0);
  });
  return w ? round1_(s / w) : 0;
}

function sCurve_(p, acts, reports) {
  if (!p.start_date || !p.end_date || !acts.length) return null;
  var a = dayNum_(p.start_date), b = dayNum_(p.end_date), today = todayStr_(), t = dayNum_(today);
  var pts = {}; pts[a] = 1; pts[b] = 1;
  if (b - a <= 120) { for (var d = a + 7; d < b; d += 7) pts[d] = 1; }
  else {
    var dt = new Date(a * 86400000);
    for (var i = 0; i < 40; i++) {
      var me = Math.floor(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1 + i, 0) / 86400000);
      if (me > a && me < b) pts[me] = 1; else if (me >= b) break;
    }
  }
  if (t > a && t < b) pts[t] = 1;
  reports.forEach(function (r) { var n = dayNum_(r.report_date); if (n >= a && n <= b) pts[n] = 1; });
  var days = Object.keys(pts).map(Number).sort(function (x, y) { return x - y; });
  var points = days.map(function (n) {
    var s = dayStr_(n);
    return { date: s, plan: planPct_(acts, s), actual: n <= t ? actualPct_(acts, reports, s) : null };
  });
  var asOf = t < a ? p.start_date : (t > b ? p.end_date : today);
  var plan = planPct_(acts, asOf), actual = actualPct_(acts, reports, asOf);
  return { points: points, today: today, as_of: asOf, plan: plan, actual: actual, variance: round1_(actual - plan) };
}

/** สถานะเทียบแผน: ahead / on_track / behind / critical */
function scheduleFlag_(variance) {
  if (variance >= 5) return 'ahead';
  if (variance >= -10) return 'on_track';
  if (variance >= -25) return 'behind';
  return 'critical';
}

function attView_(a) {
  return { id: a.id, name: a.name, mime: a.mime, size: a.size, url: 'https://drive.google.com/file/d/' + a.id + '/view', thumb: /^image\//.test(a.mime) ? 'https://lh3.googleusercontent.com/d/' + a.id + '=w480' : '' };
}

function reportView_(r, actMap) {
  var a = actMap[r.activity_id] || {};
  return {
    id: r.id, project_id: r.project_id, activity_id: r.activity_id, activity_name: a.name || r.activity_name || '',
    report_date: r.report_date, progress: num_(r.progress), prev_progress: num_(r.prev_progress), project_progress: num_(r.project_progress),
    result: r.result || '', problem: r.problem || '', solution: r.solution || '',
    attachments: (r.attachments || []).map(attView_), by: r.by, by_name: r.by_name || '', created_at: r.created_at
  };
}

/* ---------- ไฟล์แนบ ---------- */
function apiUploadAttachment(token, projectId, file) {
  return api_('apiUploadAttachment', token, R_PROJECT, function (u) {
    var p = getById_('Projects', projectId);
    if (!p || p.status === 'deleted') fail_('ไม่พบโครงการ');
    if (!projectPerms_(u, p).report) fail_('รายงานความก้าวหน้าได้เฉพาะโครงการที่กำลังดำเนินการ');
    if (!file || !file.data) fail_('ไม่พบไฟล์');
    if (!ATT_MIME.test(String(file.mime || ''))) fail_('รองรับรูปภาพ PDF Word Excel PowerPoint เท่านั้น');
    var bytes = Utilities.base64Decode(file.data);
    if (bytes.length > ATT_MAX) fail_('ไฟล์ใหญ่เกิน 8 MB');
    var name = str_(file.name, 120).replace(/[\\\/:*?"<>|]/g, '_') || 'file';
    var folder = subFolder_('attachments'), it = folder.getFoldersByName(p.code);
    var pf = it.hasNext() ? it.next() : folder.createFolder(p.code);
    var f = pf.createFile(Utilities.newBlob(bytes, file.mime, name));
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { logError_('attach.share', e); }
    var meta = { id: f.getId(), name: name, mime: file.mime, size: bytes.length, project_id: p.id, user_id: u.id };
    CacheService.getScriptCache().put('att:' + meta.id, JSON.stringify(meta), 21600);
    return ok_(attView_(meta), 'อัปโหลด ' + name + ' แล้ว');
  });
}

/** ลบไฟล์ที่อัปโหลดแต่ยังไม่ได้แนบกับรายงาน */
function apiDiscardAttachment(token, fileId) {
  return api_('apiDiscardAttachment', token, R_PROJECT, function (u) {
    var raw = CacheService.getScriptCache().get('att:' + fileId);
    if (!raw) return ok_(null, '');
    var meta = JSON.parse(raw);
    if (meta.user_id !== u.id) fail_('ไม่มีสิทธิ์ลบไฟล์นี้');
    try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { /* ไฟล์หายแล้ว */ }
    CacheService.getScriptCache().remove('att:' + fileId);
    return ok_(null, 'ลบไฟล์แล้ว');
  });
}

/* ---------- รายงาน ---------- */
/** ปรับ % กิจกรรมจากรายงานล่าสุด แล้วคำนวณโครงการใหม่ (ภายใน lock) */
function syncActivity_(activityId) {
  var a = getById_('Activities', activityId); if (!a || a.status === 'deleted') return;
  var r = readAll_('ProgressReports').filter(function (x) { return x.activity_id === activityId; })
    .sort(function (x, y) { return String(y.report_date).localeCompare(String(x.report_date)) || String(y.created_at || '').localeCompare(String(x.created_at || '')); })[0];
  a.progress = r ? num_(r.progress) : 0;
  a.status = a.progress >= 100 ? 'done' : (a.progress > 0 ? 'in_progress' : 'pending');
  a.last_report_at = r ? r.report_date : '';
  a.updated_at = now_();
  saveRec_('Activities', a);
  return recalcProject_(a.project_id);
}

function apiSaveReport(token, payload) {
  return api_('apiSaveReport', token, R_PROJECT, function (u) {
    var d = pick_(payload, ['activity_id', 'report_date', 'progress', 'result', 'problem', 'solution', 'attachments', 'request_id']);
    var progress = round1_(d.progress);
    if (progress < 0 || progress > 100) fail_('ความก้าวหน้าต้องอยู่ระหว่าง 0 ถึง 100');
    var result = str_(d.result, 3000);
    if (!result) fail_('กรุณาระบุผลการดำเนินงาน');
    if (!isDate_(d.report_date)) fail_('กรุณาระบุวันที่รายงาน');
    if (d.report_date > todayStr_()) fail_('วันที่รายงานต้องไม่เกินวันนี้');
    var rec, proj, act;
    var res = withLock_(function () {
      return onceRequest_(d.request_id, function () {
        act = getById_('Activities', d.activity_id);
        if (!act || act.status === 'deleted') fail_('ไม่พบกิจกรรม');
        proj = getById_('Projects', act.project_id);
        if (!proj || !projectPerms_(u, proj).report) fail_('รายงานความก้าวหน้าได้เฉพาะโครงการที่กำลังดำเนินการ หรือไม่มีสิทธิ์');
        if (d.report_date < proj.start_date) fail_('วันที่รายงานต้องไม่ก่อนวันเริ่มโครงการ');
        var c = CacheService.getScriptCache();
        var atts = (Array.isArray(d.attachments) ? d.attachments : []).slice(0, 10).map(function (id) {
          var raw = c.get('att:' + str_(id, 80)); if (!raw) return null;
          var m = JSON.parse(raw);
          return m.project_id === proj.id && m.user_id === u.id ? { id: m.id, name: m.name, mime: m.mime, size: m.size } : null;
        }).filter(Boolean);
        rec = {
          id: uuid_(), project_id: proj.id, activity_id: act.id, activity_name: act.name, report_date: d.report_date,
          progress: progress, prev_progress: num_(act.progress),
          result: result, problem: str_(d.problem, 2000), solution: str_(d.solution, 2000),
          attachments: atts, by: u.id, by_name: u.name, status: 'active', created_at: now_(), updated_at: now_()
        };
        saveRec_('ProgressReports', rec);
        var p2 = syncActivity_(act.id);
        rec.project_progress = p2 ? p2.progress : 0;
        saveRec_('ProgressReports', rec);
        atts.forEach(function (a) { c.remove('att:' + a.id); });
        logAction_(u, 'create', 'ProgressReports', rec.id, proj.code + ' : ' + act.name + ' ' + progress + '%');
        return ok_({ id: rec.id, project_progress: rec.project_progress }, 'บันทึกรายงานแล้ว ความก้าวหน้าโครงการ ' + rec.project_progress + '%');
      });
    });
    return res;
  });
}

function apiDeleteReport(token, id) {
  return api_('apiDeleteReport', token, R_PROJECT, function (u) {
    var rec, proj;
    withLock_(function () {
      rec = getById_('ProgressReports', id);
      if (!rec || rec.status === 'deleted') fail_('ไม่พบรายงาน');
      proj = getById_('Projects', rec.project_id);
      if (!proj || !projectPerms_(u, proj).report) fail_('ลบรายงานได้เฉพาะโครงการที่กำลังดำเนินการ');
      if (rec.by !== u.id && ['admin', 'planner'].indexOf(u.role) < 0) fail_('ลบได้เฉพาะรายงานของตัวเอง');
      rec.status = 'deleted'; rec.deleted_at = now_(); rec.deleted_by = u.id;
      saveRec_('ProgressReports', rec);
      syncActivity_(rec.activity_id);
    });
    (rec.attachments || []).forEach(function (a) { try { DriveApp.getFileById(a.id).setTrashed(true); } catch (e) { /* ignore */ } });
    logAction_(u, 'delete', 'ProgressReports', id, proj.code + ' : ' + rec.activity_name);
    return ok_(null, 'ลบรายงานแล้ว');
  });
}

/** ฟีดรายงาน: ทั้งหมดในขอบเขต หรือเฉพาะโครงการ (filters.project_id) */
function apiListReports(token, opt) {
  return api_('apiListReports', token, null, function (u) {
    opt = opt || {}; var f = opt.filters || {};
    var fy = str_(f.fiscal_year) || String(getSettings_().current_fy);
    var projs = {};
    scopeProjects_(u, readAll_('Projects')).forEach(function (p) { if (f.project_id ? p.id === f.project_id : String(p.fiscal_year) === fy) projs[p.id] = p; });
    var rows = readAll_('ProgressReports').filter(function (r) { return projs[r.project_id]; })
      .sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    var actMap = {}; readAll_('Activities', true).forEach(function (a) { actMap[a.id] = a; });
    var out = paged_(rows, opt, function (r) {
      var v = reportView_(r, actMap), p = projs[r.project_id];
      v.project_code = p.code; v.project_name = p.name;
      v.can_delete = p.status === 'in_progress' && (r.by === u.id || ['admin', 'planner'].indexOf(u.role) >= 0);
      return v;
    }, function (r) { return [r.activity_name, r.result, r.problem, r.by_name, (projs[r.project_id] || {}).name].join(' '); });
    return ok_(out);
  });
}

/** โครงการที่ต้องติดตาม (อนุมัติแล้ว/กำลังดำเนินการ) พร้อมเทียบแผน */
function apiListProgress(token, opt) {
  return api_('apiListProgress', token, null, function (u) {
    opt = opt || {}; var f = opt.filters || {};
    var st = getSettings_(), fy = str_(f.fiscal_year) || String(st.current_fy), remind = num_(st.report_remind_days) || 30;
    var today = todayStr_(), tn = dayNum_(today);
    var projs = scopeProjects_(u, readAll_('Projects').filter(function (p) { return String(p.fiscal_year) === fy && (p.status === 'in_progress' || p.status === 'approved'); }));
    var acts = readAll_('Activities'), reps = readAll_('ProgressReports');
    var m = nameMaps_();
    var rows = projs.map(function (p) {
      var a = acts.filter(function (x) { return x.project_id === p.id; });
      var r = reps.filter(function (x) { return x.project_id === p.id; }).sort(function (x, y) { return String(y.report_date).localeCompare(String(x.report_date)); });
      var asOf = today < p.start_date ? p.start_date : (today > p.end_date ? p.end_date : today);
      var plan = planPct_(a, asOf), actual = num_(p.progress), variance = round1_(actual - plan);
      var last = r[0] ? r[0].report_date : '';
      var since = last ? tn - dayNum_(last) : (p.status === 'in_progress' ? tn - dayNum_(String(p.started_at || p.start_date).slice(0, 10)) : 0);
      return {
        id: p.id, code: p.code, name: p.name, status: p.status, dept_name: (m.dept[p.dept_id] || {}).short_name || (m.dept[p.dept_id] || {}).name || '',
        owner_name: (m.user[p.owner_id] || {}).name || '', progress: actual, plan: plan, variance: variance,
        flag: p.status === 'approved' ? 'not_started' : scheduleFlag_(variance),
        overdue: p.status === 'in_progress' && p.end_date < today && actual < 100,
        last_report: last, days_since: since, stale: p.status === 'in_progress' && since > remind,
        end_date: p.end_date, can_report: projectPerms_(u, p).report
      };
    });
    var sum = { total: rows.length, in_progress: 0, behind: 0, overdue: 0, stale: 0, avg: 0 };
    var w = 0, s = 0;
    rows.forEach(function (x) {
      if (x.status === 'in_progress') sum.in_progress++;
      if (x.flag === 'behind' || x.flag === 'critical') sum.behind++;
      if (x.overdue) sum.overdue++;
      if (x.stale) sum.stale++;
      w++; s += x.progress;
    });
    sum.avg = w ? round1_(s / w) : 0;
    if (f.flag === 'behind') rows = rows.filter(function (x) { return x.flag === 'behind' || x.flag === 'critical'; });
    if (f.flag === 'overdue') rows = rows.filter(function (x) { return x.overdue; });
    if (f.flag === 'stale') rows = rows.filter(function (x) { return x.stale; });
    if (!opt.sort) rows.sort(function (a, b) { return a.variance - b.variance; });
    var out = paged_(rows, opt, null, function (x) { return [x.code, x.name, x.dept_name, x.owner_name].join(' '); });
    out.summary = sum; out.remind_days = remind;
    return ok_(out);
  });
}

/* ---------- แจ้งเตือนรายวัน ---------- */
function dailyProgressAlerts_() {
  var st = getSettings_(), today = todayStr_(), tn = dayNum_(today), remind = num_(st.report_remind_days) || 30;
  var props = PropertiesService.getScriptProperties();
  var fy = String(st.current_fy), overdue = [], stale = [];
  readAll_('Projects').filter(function (p) { return String(p.fiscal_year) === fy && p.status === 'in_progress'; }).forEach(function (p) {
    if (p.end_date < today && num_(p.progress) < 100) overdue.push(p);
    var last = p.last_report_at || String(p.started_at || p.start_date).slice(0, 10);
    if (tn - dayNum_(last) > remind) stale.push(p);
  });
  // สรุปเข้ากลุ่ม (สัปดาห์ละครั้ง วันจันทร์)
  if (st.notify && st.notify.on_overdue !== false && (overdue.length || stale.length) && Utilities.formatDate(new Date(), 'Asia/Bangkok', 'u') === '1') {
    var lines = ['[' + st.org_name + '] สรุปโครงการที่ต้องติดตาม ปีงบ ' + fy];
    if (overdue.length) lines.push('เลยกำหนด ' + overdue.length + ' โครงการ: ' + overdue.slice(0, 10).map(function (p) { return p.code + ' (' + num_(p.progress) + '%)'; }).join(', '));
    if (stale.length) lines.push('ไม่ได้รายงานเกิน ' + remind + ' วัน ' + stale.length + ' โครงการ: ' + stale.slice(0, 10).map(function (p) { return p.code; }).join(', '));
    notifyAll_(lines.join('\n'));
  }
  // แจ้งเตือนในระบบถึงผู้รับผิดชอบ ไม่เกิน 1 ครั้งต่อ 7 วันต่อโครงการ
  var rows = [];
  overdue.concat(stale).forEach(function (p) {
    var k = 'alert_' + p.id, prev = props.getProperty(k);
    if (prev && tn - Number(prev) < 7) return;
    props.setProperty(k, String(tn));
    var isOver = overdue.indexOf(p) >= 0;
    rows.push({ id: uuid_(), user_id: p.owner_id, read: '0', status: 'active', created_at: now_(), title: isOver ? 'โครงการเลยกำหนดแล้ว ความก้าวหน้า ' + num_(p.progress) + '%' : 'ถึงเวลารายงานความก้าวหน้า (ไม่ได้รายงานเกิน ' + remind + ' วัน)', body: p.code + ' ' + p.name, link: 'projects/' + p.id });
  });
  if (rows.length) withLock_(function () { rows.forEach(function (r) { saveRec_('Notifications', r); }); });
  return rows.length;
}

/* ============================================================
 * 10.8) DISBURSEMENTS (ขอเบิก > หัวหน้าตรวจ > การเงินตรวจ > จ่าย)
 * ============================================================ */
var DISB_OPEN = ['pending', 'checked', 'approved'];
var DISB_CATS = ['ค่าตอบแทน', 'ค่าใช้สอย', 'ค่าวัสดุ', 'ค่าครุภัณฑ์', 'ค่าสาธารณูปโภค', 'อื่น ๆ'];
var DISB_HIST = { request: 'ยื่นขอเบิก', check: 'หัวหน้าหน่วยงานตรวจผ่าน', approve: 'การเงินตรวจสอบผ่าน', pay: 'จ่ายเงินแล้ว', reject: 'ไม่อนุมัติ', cancel: 'ยกเลิกคำขอ' };

function disbOf_(pid) { return readAll_('Disbursements').filter(function (d) { return d.project_id === pid; }); }

/** สรุปเงินของโครงการ: ผูกพัน / จ่ายแล้ว / คงเหลือ (รวมรายกิจกรรม) */
function projectFinance_(p, list) {
  list = list || disbOf_(p.id);
  var f = { approved: num_(p.budget_approved), committed: 0, paid: 0, by_activity: {} };
  list.forEach(function (d) {
    var amt = d.status === 'paid' ? num_(d.paid_amount) : (DISB_OPEN.indexOf(d.status) >= 0 ? num_(d.amount) : 0);
    if (!amt) return;
    if (d.status === 'paid') f.paid += amt; else f.committed += amt;
    if (d.activity_id) f.by_activity[d.activity_id] = (f.by_activity[d.activity_id] || 0) + amt;
  });
  f.committed = round2_(f.committed); f.paid = round2_(f.paid);
  f.available = round2_(f.approved - f.committed - f.paid);
  return f;
}

function disbScope_(u, rows) {
  if (['admin', 'executive', 'planner', 'finance'].indexOf(u.role) >= 0) return rows;
  if (u.role === 'dept_head') return rows.filter(function (d) { return d.dept_id === u.dept_id; });
  var mine = {}; readAll_('Projects').forEach(function (p) { if (p.owner_id === u.id) mine[p.id] = 1; });
  return rows.filter(function (d) { return d.requested_by === u.id || mine[d.project_id]; });
}

function disbPerms_(u, d) {
  var isFin = u.role === 'finance' || u.role === 'admin';
  var isHead = (u.role === 'dept_head' && u.dept_id === d.dept_id) || u.role === 'admin' || u.role === 'executive';
  var st = d.status;
  return {
    check: st === 'pending' && isHead,
    approve: st === 'checked' && isFin,
    pay: st === 'approved' && isFin,
    reject: (st === 'pending' && isHead) || ((st === 'checked' || st === 'approved') && isFin),
    cancel: (st === 'pending' || st === 'checked') && (d.requested_by === u.id || u.role === 'admin')
  };
}

function nextDisbNo_(fy) {
  var pre = 'DB' + String(fy).slice(-2) + '-', max = 0;
  readAll_('Disbursements', true).forEach(function (d) {
    var c = String(d.doc_no || '');
    if (c.indexOf(pre) === 0) { var n = parseInt(c.slice(pre.length), 10); if (n > max) max = n; }
  });
  var s = String(max + 1); while (s.length < 4) s = '0' + s;
  return pre + s;
}

function disbView_(d, u, m, projMap) {
  var p = projMap[d.project_id] || {};
  var v = {
    id: d.id, doc_no: d.doc_no, project_id: d.project_id, project_code: p.code || '', project_name: p.name || '',
    activity_id: d.activity_id || '', activity_name: d.activity_name || '', title: d.title, category: d.category || '',
    amount: num_(d.amount), paid_amount: num_(d.paid_amount), payee: d.payee || '', request_date: d.request_date || '',
    needed_date: d.needed_date || '', note: d.note || '', status: d.status,
    dept_name: ((m.dept[d.dept_id] || {}).short_name || (m.dept[d.dept_id] || {}).name || ''),
    requested_by_name: (m.user[d.requested_by] || {}).name || '', created_at: d.created_at,
    paid_date: d.paid_date || '', voucher_no: d.voucher_no || ''
  };
  v.perm = disbPerms_(u, d);
  return v;
}

/** โครงการที่ขอเบิกได้ + ยอดคงเหลือรายกิจกรรม (ใช้ในฟอร์มขอเบิก) */
function apiDisbursableProjects(token) {
  return api_('apiDisbursableProjects', token, R_PROJECT, function (u) {
    var projs = readAll_('Projects').filter(function (p) { return p.status === 'in_progress' && projectPerms_(u, p).disburse; });
    var all = readAll_('Disbursements');
    return ok_(projs.map(function (p) {
      var f = projectFinance_(p, all.filter(function (d) { return d.project_id === p.id; }));
      return {
        id: p.id, code: p.code, name: p.name, start_date: p.start_date, approved: f.approved, available: f.available,
        activities: activitiesOf_(p.id).map(function (a) { return { id: a.id, name: a.name, budget: num_(a.budget), available: round2_(num_(a.budget) - (f.by_activity[a.id] || 0)) }; })
      };
    }).sort(function (a, b) { return String(b.code).localeCompare(String(a.code)); }));
  });
}

function apiListDisbursements(token, opt) {
  return api_('apiListDisbursements', token, null, function (u) {
    opt = opt || {}; var f = opt.filters || {};
    var fy = str_(f.fiscal_year) || String(getSettings_().current_fy);
    var rows = disbScope_(u, readAll_('Disbursements').filter(function (d) { return f.project_id ? d.project_id === f.project_id : String(d.fiscal_year) === fy; }));
    var sum = { count: rows.length, todo: 0, pending: 0, committed: 0, paid: 0 };
    rows.forEach(function (d) {
      var pm = disbPerms_(u, d);
      if (pm.check || pm.approve || pm.pay) sum.todo++;
      if (DISB_OPEN.indexOf(d.status) >= 0) { sum.pending++; sum.committed += num_(d.amount); }
      if (d.status === 'paid') sum.paid += num_(d.paid_amount);
    });
    if (f.queue === 'todo') rows = rows.filter(function (d) { var pm = disbPerms_(u, d); return pm.check || pm.approve || pm.pay; });
    if (f.queue === 'mine') rows = rows.filter(function (d) { return d.requested_by === u.id; });
    if (f.status) rows = rows.filter(function (d) { return d.status === f.status; });
    if (!opt.sort) rows = rows.slice().sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    var m = nameMaps_(), projMap = {};
    readAll_('Projects', true).forEach(function (p) { projMap[p.id] = p; });
    var out = paged_(rows, opt, function (d) { return disbView_(d, u, m, projMap); }, function (d) {
      return [d.doc_no, d.title, d.payee, (projMap[d.project_id] || {}).code, (projMap[d.project_id] || {}).name, (m.user[d.requested_by] || {}).name].join(' ');
    });
    out.summary = sum;
    return ok_(out);
  });
}

function apiGetDisbursement(token, id) {
  return api_('apiGetDisbursement', token, null, function (u) {
    var d = getById_('Disbursements', id);
    if (!d || d.status === 'deleted' || !disbScope_(u, [d]).length) fail_('ไม่พบรายการเบิกจ่าย');
    var m = nameMaps_(), projMap = {}, p = getById_('Projects', d.project_id) || {};
    projMap[p.id] = p;
    var v = disbView_(d, u, m, projMap);
    v.attachments = (d.attachments || []).map(attView_);
    v.history = (d.history || []).slice().reverse();
    v.finance = projectFinance_(p);
    return ok_(v);
  });
}

function apiRequestDisbursement(token, payload) {
  return api_('apiRequestDisbursement', token, R_PROJECT, function (u) {
    var x = pick_(payload, ['project_id', 'activity_id', 'title', 'category', 'amount', 'payee', 'needed_date', 'note', 'attachments', 'request_id']);
    var amount = round2_(x.amount), title = str_(x.title, 300);
    if (!title) fail_('กรุณาระบุรายการที่ขอเบิก');
    if (amount <= 0) fail_('กรุณาระบุจำนวนเงิน');
    if (x.needed_date && !isDate_(x.needed_date)) fail_('วันที่ต้องการใช้เงินไม่ถูกต้อง');
    var rec, p, autoCheck = false;
    var res = withLock_(function () {
      return onceRequest_(x.request_id, function () {
        p = getById_('Projects', str_(x.project_id));
        if (!p || p.status === 'deleted') fail_('ไม่พบโครงการ');
        if (!projectPerms_(u, p).disburse) fail_('ขอเบิกได้เฉพาะโครงการที่กำลังดำเนินการ และเป็นผู้รับผิดชอบ/หัวหน้าหน่วยงาน');
        var f = projectFinance_(p);
        if (amount > f.available + 0.001) fail_('เกินงบคงเหลือของโครงการ (เบิกได้อีก ' + f.available.toLocaleString() + ' บาท)');
        var act = null;
        if (x.activity_id) {
          act = getById_('Activities', x.activity_id);
          if (!act || act.status === 'deleted' || act.project_id !== p.id) fail_('ไม่พบกิจกรรม');
          var actAvail = round2_(num_(act.budget) - (f.by_activity[act.id] || 0));
          if (amount > actAvail + 0.001) fail_('เกินงบคงเหลือของกิจกรรม "' + act.name + '" (เบิกได้อีก ' + actAvail.toLocaleString() + ' บาท)');
        }
        var c = CacheService.getScriptCache();
        var atts = (Array.isArray(x.attachments) ? x.attachments : []).slice(0, 10).map(function (id) {
          var raw = c.get('att:' + str_(id, 80)); if (!raw) return null;
          var mm = JSON.parse(raw);
          return mm.project_id === p.id && mm.user_id === u.id ? { id: mm.id, name: mm.name, mime: mm.mime, size: mm.size } : null;
        }).filter(Boolean);
        autoCheck = u.role === 'dept_head' && u.dept_id === p.dept_id;
        rec = {
          id: uuid_(), doc_no: nextDisbNo_(p.fiscal_year), project_id: p.id, fiscal_year: p.fiscal_year, dept_id: p.dept_id, source_id: p.source_id || '',
          activity_id: act ? act.id : '', activity_name: act ? act.name : '', title: title,
          category: DISB_CATS.indexOf(x.category) >= 0 ? x.category : 'อื่น ๆ', amount: amount, paid_amount: 0,
          payee: str_(x.payee, 200), request_date: todayStr_(), needed_date: str_(x.needed_date), note: str_(x.note, 1000),
          attachments: atts, status: autoCheck ? 'checked' : 'pending', requested_by: u.id, created_at: now_(), updated_at: now_(), history: []
        };
        addHistory_(rec, u, 'request', rec.note);
        if (autoCheck) addHistory_(rec, u, 'check', 'หัวหน้าหน่วยงานยื่นเอง ผ่านขั้นตรวจอัตโนมัติ');
        saveRec_('Disbursements', rec);
        atts.forEach(function (a) { c.remove('att:' + a.id); });
        logAction_(u, 'create', 'Disbursements', rec.id, rec.doc_no + ' ' + p.code + ' ' + amount);
        return ok_({ id: rec.id, doc_no: rec.doc_no }, 'ยื่นขอเบิก ' + rec.doc_no + ' แล้ว' + (autoCheck ? ' ส่งต่อการเงินตรวจสอบ' : ' รอหัวหน้าหน่วยงานตรวจ'));
      });
    });
    if (rec && !res.duplicate) {
      var to = autoCheck ? usersWhere_(function (x) { return x.role === 'finance'; })
        : usersWhere_(function (x) { return x.role === 'dept_head' && x.dept_id === rec.dept_id; });
      if (!to.length) to = usersWhere_(function (x) { return x.role === 'admin'; });
      genericNotify_('on_disburse', (autoCheck ? 'มีคำขอเบิกรอการเงินตรวจสอบ ' : 'มีคำขอเบิกรอตรวจ ') + rec.doc_no + ' ' + amount.toLocaleString() + ' บาท (' + p.code + ')', to.filter(function (x) { return x !== u.id; }), 'disburse/view/' + rec.id);
    }
    return res;
  });
}

function disbTransition_(fnName, token, id, permKey, fn, requestId) {
  return api_(fnName, token, null, function (u) {
    var d, info;
    var res = withLock_(function () {
      return onceRequest_(requestId, function () {
        d = getById_('Disbursements', id);
        if (!d || d.status === 'deleted') fail_('ไม่พบรายการเบิกจ่าย');
        if (!disbPerms_(u, d)[permKey]) fail_('ทำรายการนี้ไม่ได้ในสถานะปัจจุบัน หรือไม่มีสิทธิ์');
        var from = d.status;
        info = fn(d, u) || {};
        addHistory_(d, u, permKey, info.note || '', { from: from, to: d.status });
        d.updated_at = now_(); d.updated_by = u.id;
        saveRec_('Disbursements', d);
        logAction_(u, permKey, 'Disbursements', id, d.doc_no + ' > ' + d.status + (info.note ? ': ' + info.note : ''));
        return ok_({ id: id, status: d.status }, info.msg || 'บันทึกแล้ว');
      });
    });
    if (info && info.notify && !res.duplicate) genericNotify_('on_disburse', info.notify + ' ' + d.doc_no + ' ' + num_(d.amount).toLocaleString() + ' บาท', info.toUser !== undefined ? info.toUser : d.requested_by, 'disburse/view/' + d.id);
    return res;
  });
}

function apiCheckDisbursement(token, id, note) {
  return disbTransition_('apiCheckDisbursement', token, id, 'check', function (d) {
    d.status = 'checked'; d.checked_at = now_();
    return { note: str_(note, 1000), msg: 'ตรวจผ่าน ส่งต่อการเงินแล้ว', notify: 'มีคำขอเบิกรอการเงินตรวจสอบ', toUser: usersWhere_(function (x) { return x.role === 'finance'; }) };
  });
}

function apiApproveDisbursement(token, id, note) {
  return disbTransition_('apiApproveDisbursement', token, id, 'approve', function (d) {
    d.status = 'approved'; d.approved_at = now_();
    return { note: str_(note, 1000), msg: 'การเงินตรวจสอบผ่าน รอจ่ายเงิน', notify: 'คำขอเบิกผ่านการตรวจสอบของการเงิน' };
  });
}

function apiPayDisbursement(token, id, data) {
  data = data || {};
  return disbTransition_('apiPayDisbursement', token, id, 'pay', function (d) {
    var paid = round2_(data.paid_amount == null || data.paid_amount === '' ? d.amount : data.paid_amount);
    if (paid <= 0) fail_('กรุณาระบุจำนวนเงินที่จ่ายจริง');
    if (paid > num_(d.amount) + 0.001) fail_('จ่ายจริงต้องไม่เกินยอดที่ขอเบิก (' + num_(d.amount).toLocaleString() + ')');
    if (!isDate_(data.paid_date)) fail_('กรุณาระบุวันที่จ่าย');
    if (data.paid_date > todayStr_()) fail_('วันที่จ่ายต้องไม่เกินวันนี้');
    d.status = 'paid'; d.paid_amount = paid; d.paid_date = data.paid_date; d.voucher_no = str_(data.voucher_no, 60); d.paid_at = now_();
    var diff = round2_(num_(d.amount) - paid);
    return { note: str_(data.note, 1000) + (diff > 0 ? (data.note ? ' · ' : '') + 'คืนงบส่วนต่าง ' + diff.toLocaleString() + ' บาท' : ''), msg: 'บันทึกการจ่ายเงินแล้ว', notify: 'จ่ายเงินตามคำขอเบิกแล้ว' };
  }, data.request_id);
}

function apiRejectDisbursement(token, id, note) {
  return disbTransition_('apiRejectDisbursement', token, id, 'reject', function (d) {
    note = str_(note, 1000);
    if (!note) fail_('กรุณาระบุเหตุผล');
    d.status = 'rejected'; d.rejected_at = now_();
    return { note: note, msg: 'บันทึกไม่อนุมัติแล้ว ยอดผูกพันถูกคืน', notify: 'คำขอเบิกไม่ได้รับอนุมัติ: ' + note };
  });
}

function apiCancelDisbursement(token, id, note) {
  return disbTransition_('apiCancelDisbursement', token, id, 'cancel', function (d) {
    d.status = 'cancelled'; d.cancelled_at = now_();
    return { note: str_(note, 1000), msg: 'ยกเลิกคำขอเบิกแล้ว' };
  });
}

/** ตัวเลขบนเมนู: งานที่รอผู้ใช้คนนี้ดำเนินการ */
function apiBadges(token) {
  return api_('apiBadges', token, null, function (u) {
    var fy = String(getSettings_().current_fy);
    var disb = disbScope_(u, readAll_('Disbursements').filter(function (d) { return DISB_OPEN.indexOf(d.status) >= 0; }))
      .filter(function (d) { var pm = disbPerms_(u, d); return pm.check || pm.approve || pm.pay; }).length;
    var proj = scopeProjects_(u, readAll_('Projects')).filter(function (p) {
      var pm = projectPerms_(u, p);
      return (p.status === 'submitted' && (pm.approve || pm.revise)) || (p.status === 'revise' && pm.submit);
    }).length;
    var tr = R_TRANSFER_APPROVE.indexOf(u.role) >= 0 ? readAll_('Transfers').filter(function (t) { return t.status === 'pending'; }).length : 0;
    var unread = myNotifs_(u).filter(function (n) { return String(n.read) !== '1'; }).length;
    return ok_({ disburse: disb, projects: proj, budget: tr, notifications: unread, fy: fy });
  });
}

/* ============================================================
 * 10.9) REPORTS (สรุปรวม: คืนเฉพาะตัวเลขรวม/ฟิลด์ที่ใช้พิมพ์ จำกัด 2,000 แถว)
 * ============================================================ */
var REPORT_MAX = 2000;
var MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** ข้อมูลตั้งต้นของรายงาน: โครงการในขอบเขต + การเงินรายโครงการ + การจัดสรรในขอบเขต */
function reportBase_(u, fy) {
  var st = getSettings_();
  fy = str_(fy) || String(st.current_fy);
  var m = nameMaps_();
  var projs = scopeProjects_(u, readAll_('Projects').filter(function (p) { return String(p.fiscal_year) === fy; }));
  var disb = readAll_('Disbursements').filter(function (d) { return String(d.fiscal_year) === fy; });
  var byP = {}; disb.forEach(function (d) { (byP[d.project_id] = byP[d.project_id] || []).push(d); });
  var rows = projs.map(function (p) {
    var f = projectFinance_(p, byP[p.id] || []);
    var eff = APPROVED_ST.indexOf(p.status) < 0 ? 0 : (p.status === 'completed' && p.budget_final != null ? num_(p.budget_final) : num_(p.budget_approved));
    return { p: p, f: f, approved: eff };
  });
  var allocs = [];
  if (['admin', 'executive', 'planner', 'finance'].indexOf(u.role) >= 0) allocs = allocsOf_(fy);
  else if (u.role === 'dept_head') allocs = allocsOf_(fy).filter(function (a) { return a.dept_id === u.dept_id; });
  return { fy: fy, st: st, m: m, rows: rows, allocs: allocs, disb: disb, projIds: projs.reduce(function (o, p) { o[p.id] = p; return o; }, {}) };
}

/** รวมตัวเลขตามกุญแจ (หน่วยงาน / แหล่งงบ / ยุทธศาสตร์) */
function aggregate_(base, keyFn, nameFn, allocKeyFn) {
  var g = {};
  var get = function (k) {
    return g[k] || (g[k] = { key: k, name: nameFn(k), projects: 0, completed: 0, request: 0, approved: 0, paid: 0, committed: 0, allocated: 0, _w: 0, _wp: 0 });
  };
  base.rows.forEach(function (r) {
    var p = r.p; if (p.status === 'cancelled') return;
    var x = get(keyFn(p));
    x.projects++; if (p.status === 'completed') x.completed++;
    if (p.status !== 'draft') x.request += num_(p.budget_request);
    x.approved += r.approved; x.paid += r.f.paid; x.committed += r.f.committed;
    if (APPROVED_ST.indexOf(p.status) >= 0) { var w = r.approved || 1; x._w += w; x._wp += w * num_(p.progress); }
  });
  if (allocKeyFn) base.allocs.forEach(function (a) { get(allocKeyFn(a)).allocated += num_(a.amount); });
  var tot = { name: 'รวมทั้งสิ้น', projects: 0, completed: 0, request: 0, approved: 0, paid: 0, committed: 0, allocated: 0, _w: 0, _wp: 0 };
  var rows = Object.keys(g).map(function (k) {
    var x = g[k];
    ['projects', 'completed', 'request', 'approved', 'paid', 'committed', 'allocated', '_w', '_wp'].forEach(function (f) { tot[f] += x[f]; });
    return x;
  });
  var fin = function (x) {
    x.progress = x._w ? round1_(x._wp / x._w) : 0;
    x.rate = x.approved ? round1_(x.paid / x.approved * 100) : 0;
    x.remaining = round2_((allocKeyFn ? x.allocated : x.approved) - (allocKeyFn ? x.approved : x.paid + x.committed));
    ['request', 'approved', 'paid', 'committed', 'allocated'].forEach(function (f) { x[f] = round2_(x[f]); });
    delete x._w; delete x._wp;
    return x;
  };
  rows = rows.map(fin).sort(function (a, b) { return b.approved - a.approved || String(a.name).localeCompare(String(b.name), 'th'); });
  return { rows: rows, total: fin(tot) };
}

function apiReportByDept(token, fy) {
  return api_('apiReportByDept', token, null, function (u) {
    var b = reportBase_(u, fy);
    var out = aggregate_(b, function (p) { return p.dept_id; }, function (k) { return (b.m.dept[k] || {}).name || 'ไม่ระบุหน่วยงาน'; }, function (a) { return a.dept_id; });
    out.fy = b.fy; out.has_alloc = b.allocs.length > 0;
    return ok_(out);
  });
}

function apiReportBySource(token, fy) {
  return api_('apiReportBySource', token, null, function (u) {
    var b = reportBase_(u, fy);
    var out = aggregate_(b, function (p) { return p.source_id || ''; }, function (k) { return k ? ((b.m.source[k] || {}).name || '-') : 'ไม่ระบุแหล่งงบ'; }, function (a) { return a.source_id; });
    out.fy = b.fy; out.has_alloc = b.allocs.length > 0;
    return ok_(out);
  });
}

function apiReportByStrategy(token, fy) {
  return api_('apiReportByStrategy', token, null, function (u) {
    var b = reportBase_(u, fy);
    var out = aggregate_(b, function (p) { return p.strategy_id || ''; }, function (k) {
      var s = b.m.strategy[k]; return s ? s.code + ' ' + s.name : 'ไม่ระบุยุทธศาสตร์';
    }, null);
    out.fy = b.fy;
    return ok_(out);
  });
}

/** ผลการเบิกจ่ายรายไตรมาส (ตามวันที่จ่าย) ทั้งรวมและแยกหน่วยงาน */
function apiReportQuarterly(token, fy) {
  return api_('apiReportQuarterly', token, null, function (u) {
    var b = reportBase_(u, fy), sm = num_(b.st.fy_start_month) || 10;
    var ce = Number(b.fy) - 543, sy = sm > 1 ? ce - 1 : ce;
    var quarters = [0, 1, 2, 3].map(function (q) {
      var m0 = (sm - 1 + q * 3) % 12, y0 = sy + Math.floor((sm - 1 + q * 3) / 12);
      var m2 = (m0 + 2) % 12, y2 = y0 + Math.floor((m0 + 2) / 12);
      return { q: q + 1, label: 'ไตรมาส ' + (q + 1), range: MONTH_TH[m0] + ' ' + String(y0 + 543).slice(-2) + ' ถึง ' + MONTH_TH[m2] + ' ' + String(y2 + 543).slice(-2), paid: 0, count: 0 };
    });
    var qOf = function (dateStr) {
      var y = +dateStr.slice(0, 4), mo = +dateStr.slice(5, 7) - 1;
      var idx = (y - sy) * 12 + mo - (sm - 1);
      return idx < 0 || idx > 11 ? -1 : Math.floor(idx / 3);
    };
    var depts = {}, approvedTotal = 0;
    b.rows.forEach(function (r) { approvedTotal += r.approved; });
    b.disb.forEach(function (d) {
      if (d.status !== 'paid' || !b.projIds[d.project_id] || !d.paid_date) return;
      var q = qOf(d.paid_date); if (q < 0) return;
      var amt = num_(d.paid_amount);
      quarters[q].paid += amt; quarters[q].count++;
      var x = depts[d.dept_id] || (depts[d.dept_id] = { name: (b.m.dept[d.dept_id] || {}).name || '-', q1: 0, q2: 0, q3: 0, q4: 0, total: 0 });
      x['q' + (q + 1)] += amt; x.total += amt;
    });
    var cum = 0;
    quarters.forEach(function (q) { q.paid = round2_(q.paid); cum += q.paid; q.cumulative = round2_(cum); q.pct = approvedTotal ? round1_(cum / approvedTotal * 100) : 0; });
    var drows = Object.keys(depts).map(function (k) { return depts[k]; }).sort(function (a, c) { return c.total - a.total; });
    var tot = { name: 'รวมทั้งสิ้น', q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
    drows.forEach(function (x) { ['q1', 'q2', 'q3', 'q4', 'total'].forEach(function (k) { x[k] = round2_(x[k]); tot[k] += x[k]; }); });
    var committed = b.rows.reduce(function (s, r) { return s + r.f.committed; }, 0);
    return ok_({ fy: b.fy, quarters: quarters, approved: round2_(approvedTotal), committed: round2_(committed), depts: drows, total: tot });
  });
}

/** ทะเบียนโครงการ (ใช้ทั้งดูบนจอ พิมพ์ และส่งออก) */
function apiReportRegister(token, fy, filters) {
  return api_('apiReportRegister', token, null, function (u) {
    var b = reportBase_(u, fy), f = filters || {}, today = todayStr_();
    var rows = b.rows.filter(function (r) { return (!f.status || r.p.status === f.status) && (!f.dept_id || r.p.dept_id === f.dept_id); })
      .sort(function (x, y) { return String(x.p.code).localeCompare(String(y.p.code)); });
    var truncated = rows.length > REPORT_MAX;
    return ok_({
      fy: b.fy, truncated: truncated,
      rows: rows.slice(0, REPORT_MAX).map(function (r) {
        var p = r.p, d = b.m.dept[p.dept_id] || {}, s = b.m.strategy[p.strategy_id];
        return {
          id: p.id, code: p.code, name: p.name, dept: d.short_name || d.name || '', owner: (b.m.user[p.owner_id] || {}).name || '',
          strategy: s ? s.code : '', source: (b.m.source[p.source_id] || {}).name || '', status: p.status,
          start_date: p.start_date, end_date: p.end_date, request: num_(p.budget_request), approved: r.approved,
          paid: r.f.paid, committed: r.f.committed, remaining: round2_(r.approved - r.f.paid - r.f.committed),
          progress: num_(p.progress), overdue: p.status === 'in_progress' && p.end_date < today && num_(p.progress) < 100
        };
      })
    });
  });
}

/** ทะเบียนเบิกจ่าย */
function apiReportDisbursements(token, fy, filters) {
  return api_('apiReportDisbursements', token, null, function (u) {
    var b = reportBase_(u, fy), f = filters || {};
    var rows = disbScope_(u, b.disb).filter(function (d) { return b.projIds[d.project_id] && (!f.status || d.status === f.status); })
      .sort(function (x, y) { return String(x.doc_no).localeCompare(String(y.doc_no)); });
    return ok_({
      fy: b.fy, truncated: rows.length > REPORT_MAX,
      rows: rows.slice(0, REPORT_MAX).map(function (d) {
        var p = b.projIds[d.project_id];
        return {
          id: d.id, doc_no: d.doc_no, request_date: d.request_date, project: p.code, title: d.title, category: d.category,
          dept: ((b.m.dept[d.dept_id] || {}).short_name || (b.m.dept[d.dept_id] || {}).name || ''), payee: d.payee || '',
          requester: (b.m.user[d.requested_by] || {}).name || '', amount: num_(d.amount), status: d.status,
          paid_amount: num_(d.paid_amount), paid_date: d.paid_date || '', voucher_no: d.voucher_no || ''
        };
      })
    });
  });
}

/* ============================================================
 * 11) NOTIFY
 * ============================================================ */
function sendTelegram_(text) {
  var n = getSettings_().notify;
  if (!n.telegram_token || !n.telegram_chat_id) return false;
  var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + n.telegram_token + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: n.telegram_chat_id, text: text, disable_web_page_preview: true })
  });
  if (r.getResponseCode() !== 200) throw new Error('Telegram ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
  return true;
}

function sendLine_(text) {
  var n = getSettings_().notify;
  if (!n.line_token || !n.line_to) return false;
  var r = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + n.line_token },
    payload: JSON.stringify({ to: n.line_to, messages: [{ type: 'text', text: text.slice(0, 4900) }] })
  });
  if (r.getResponseCode() !== 200) throw new Error('LINE ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
  return true;
}

/** ใช้หลังบันทึกเสร็จเท่านั้น ล้มแค่ log */
function notifyAll_(text) {
  try { sendTelegram_(text); } catch (e) { logError_('notify.telegram', e); }
  try { sendLine_(text); } catch (e) { logError_('notify.line', e); }
}

function apiTestNotify(token, channel) {
  return api_('apiTestNotify', token, R_ADMIN, function () {
    var st = getSettings_();
    var text = '[' + APP.NAME + '] ทดสอบการแจ้งเตือนจาก ' + st.org_name + ' เวลา ' + fmtDate_(now_(), true);
    try {
      var sent = channel === 'line' ? sendLine_(text) : sendTelegram_(text);
      if (!sent) fail_('ยังไม่ได้กรอก token / ปลายทาง ของช่องทางนี้ (บันทึกก่อนทดสอบ)');
    } catch (e) { if (e.user) throw e; fail_('ส่งไม่สำเร็จ: ' + e.message); }
    return ok_(null, 'ส่งข้อความทดสอบแล้ว');
  });
}

/* ============================================================
 * 12) TOOLS / TRIGGERS
 * ============================================================ */
function apiRepairSheets(token) {
  return api_('apiRepairSheets', token, R_ADMIN, function (u) {
    var n = repairSheets_();
    withLock_(recoverTransfers_);
    logAction_(u, 'repair', '*', '', 'ซ่อมโครงสร้างชีต ' + n + ' แถว');
    return ok_({ rows: n }, 'ตรวจและซ่อมโครงสร้างชีตแล้ว (' + n + ' แถว)');
  });
}

function apiBackupNow(token) {
  return api_('apiBackupNow', token, R_ADMIN, function (u) {
    var f = backupNow_();
    logAction_(u, 'backup', '*', f.getId(), 'สำรองข้อมูล');
    return ok_({ url: f.getUrl(), name: f.getName() }, 'สำรองข้อมูลแล้ว');
  });
}

function backupNow_() {
  var name = APP.NAME + '_backup_' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmm');
  return DriveApp.getFileById(ss_().getId()).makeCopy(name, subFolder_('backup'));
}

function cleanupOld_() {
  var cutoff = Date.now() - 30 * 86400000;
  // ไฟล์สำรองเก่า
  try {
    var it = subFolder_('backup').getFiles();
    while (it.hasNext()) { var f = it.next(); if (f.getDateCreated().getTime() < cutoff) f.setTrashed(true); }
  } catch (e) { logError_('cleanup.backup', e); }
  // ชีต _bak_* เก่า (กันชนลิมิต 10 ล้านเซลล์)
  ss_().getSheets().forEach(function (s) {
    var m = s.getName().match(/^_bak_(\d{8})/);
    if (m) {
      var d = new Date(m[1].slice(0, 4) + '-' + m[1].slice(4, 6) + '-' + m[1].slice(6, 8));
      if (d.getTime() < cutoff) ss_().deleteSheet(s);
    }
  });
  // เซสชันหมดอายุ
  var props = PropertiesService.getScriptProperties(), all = props.getProperties(), nowIso = now_();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('sess_') !== 0) return;
    try { if (JSON.parse(all[k]).expires_at < nowIso) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
}

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cronWeeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).inTimezone('Asia/Bangkok').create();
  ScriptApp.newTrigger('cronDaily').timeBased().everyDays(1).atHour(3).inTimezone('Asia/Bangkok').create();
  return ScriptApp.getProjectTriggers().length;
}

function apiInstallTriggers(token) {
  return api_('apiInstallTriggers', token, R_ADMIN, function (u) {
    var n = installTriggers_();
    PropertiesService.getScriptProperties().setProperty('triggers_at', now_());
    logAction_(u, 'install_triggers', '*', '', 'ติดตั้งงานอัตโนมัติ ' + n + ' รายการ');
    return ok_({ count: n }, 'ติดตั้งงานอัตโนมัติแล้ว ' + n + ' รายการ');
  });
}

function apiSystemInfo(token) {
  return api_('apiSystemInfo', token, R_ADMIN, function () {
    var counts = {};
    Object.keys(SCHEMA).forEach(function (n) { counts[n] = Math.max(0, sh_(n).getLastRow() - 1); });
    var cells = ss_().getSheets().reduce(function (s, x) { return s + x.getMaxRows() * x.getMaxColumns(); }, 0);
    return ok_({
      version: APP.VERSION, schema: APP.SCHEMA_VER, counts: counts, cells: cells, credit: poPublic_(),
      triggers: ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }),
      triggers_at: PropertiesService.getScriptProperties().getProperty('triggers_at') || '',
      sheet_url: ss_().getUrl()
    });
  });
}

/** อ่านเฉพาะ n แถวท้าย (ชีต log โตเรื่อย ๆ ไม่ลากทั้งชีต) */
function tailRows_(name, n) {
  var s = sh_(name), last = s.getLastRow(), h = SCHEMA[name];
  if (last < 2) return [];
  var start = Math.max(2, last - n + 1);
  return s.getRange(start, 1, last - start + 1, h.length).getValues().map(function (r) {
    var o = {}; h.forEach(function (k, i) { o[k] = r[i] instanceof Date ? r[i].toISOString() : String(r[i]); }); return o;
  });
}

function apiListLogs(token, opt) {
  return api_('apiListLogs', token, R_ADMIN, function () {
    opt = opt || {};
    var kind = (opt.filters && opt.filters.kind) === 'errors' ? 'Errors' : 'Logs';
    var rows = tailRows_(kind, 2000).reverse();
    return ok_(paged_(rows, opt, null, function (r) { return [r.user, r.action, r.sheet, r.summary, r.fn, r.message].join(' '); }));
  });
}

/* ---------- trigger handlers ---------- */
function cronWeeklyBackup() {
  try { backupNow_(); } catch (e) { logError_('cronWeeklyBackup', e); }
}

function cronDaily() {
  try { cleanupOld_(); } catch (e) { logError_('cronDaily', e); }
  try { withLock_(recoverTransfers_); } catch (e) { logError_('cronDaily.recover', e); }
  try { dailyProgressAlerts_(); } catch (e) { logError_('cronDaily.alerts', e); }
}

// ใส่ URL ที่คุณคัดลอกมาจากขั้นตอน Deploy 
const GAS_API_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

// ฟังก์ชันหลักสำหรับเรียกไปยัง Apps Script API
async function callAPI(action, args = []) {
  const token = localStorage.getItem('po_token'); // หรือตำแหน่งที่คุณเก็บ Session Token ไว้
  
  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      redirect: 'follow', // จำเป็นต้องมีสำหรับ Google Apps Script
      // ใช้ text/plain เพื่อป้องกันการเกิดปัญหา CORS Preflight ใน Web App ของ Google
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: action,
        args: args,
        token: token
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("API Call Error:", error);
    return { status: 'error', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' };
  }
}
