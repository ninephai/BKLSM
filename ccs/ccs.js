/* พัฒนาโดย นายเกียรติอนันต์ สุกทน · Copyright (c) 2026 นายเกียรติอนันต์ สุกทน */
/* ==========================================================
   ProjectOne : Super App UI
   สีหลักเปลี่ยนที่ --sb-primary* / --sb-grad-* (JS SP.theme() เขียนทับใน #theme-vars)
   ========================================================== */
:root{
  --sb-primary:#F26522; --sb-primary-600:#d9530f; --sb-primary-700:#b0430c;
  --sb-primary-50:#fef3ed; --sb-primary-100:#fde6da; --sb-primary-200:#fbccb5;
  --sb-primary-rgb:242,101,34;
  --sb-grad-from:#ff9a4d; --sb-grad-to:#ef5b1c;
  --sb-bg:#f4f5f7; --sb-card:#fff; --sb-border:#eceef2; --sb-line:#f0f1f4;
  --sb-text:#1f2937; --sb-muted:#6b7280; --sb-faint:#9ca3af;
  --sb-success:#16a34a; --sb-warning:#d97706; --sb-danger:#dc2626; --sb-info:#0284c7; --sb-purple:#7c3aed; --sb-blue:#2563eb; --sb-teal:#0d9488;
  --sb-r-card:16px; --sb-r-btn:12px; --sb-r-modal:20px; --sb-r-dd:14px; --sb-r-hero:22px;
  --sb-shadow:0 1px 2px rgba(16,24,40,.04),0 2px 8px rgba(16,24,40,.04);
  --sb-shadow-lift:0 10px 30px rgba(16,24,40,.10);
  --sb-rail:84px; --sb-top:62px;
  --bs-body-font-family:'Sarabun',system-ui,sans-serif;
  --bs-body-color:var(--sb-text); --bs-body-bg:var(--sb-bg);
  --bs-primary:var(--sb-primary); --bs-primary-rgb:var(--sb-primary-rgb);
  --bs-link-color:var(--sb-primary-600); --bs-link-hover-color:var(--sb-primary-700);
  --bs-border-color:var(--sb-border);
}
html{font-size:15px}
body{font-family:'Sarabun',system-ui,sans-serif;background:var(--sb-bg);color:var(--sb-text);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4,h5,h6{font-weight:700;letter-spacing:-.01em;color:inherit}
.text-muted{color:var(--sb-muted)!important}
.small-xs{font-size:.78rem}
.fw-600{font-weight:600}
.num{font-variant-numeric:tabular-nums}
.d-none-i{display:none!important}
.min-w-0{min-width:0}

/* ---------- Buttons / inputs ---------- */
.btn{border-radius:var(--sb-r-btn);font-weight:600;padding:.5rem 1rem}
.btn-sm{border-radius:10px;padding:.32rem .7rem;font-size:.85rem}
.btn-lg{border-radius:14px}
.btn-primary{--bs-btn-bg:var(--sb-primary);--bs-btn-border-color:var(--sb-primary);--bs-btn-hover-bg:var(--sb-primary-600);--bs-btn-hover-border-color:var(--sb-primary-600);--bs-btn-active-bg:var(--sb-primary-700);--bs-btn-active-border-color:var(--sb-primary-700);--bs-btn-disabled-bg:var(--sb-primary);--bs-btn-disabled-border-color:var(--sb-primary);box-shadow:0 4px 12px rgba(var(--sb-primary-rgb),.25)}
.btn-soft{background:var(--sb-primary-50);color:var(--sb-primary-700);border:0}
.btn-soft:hover,.btn-soft:focus{background:var(--sb-primary-100);color:var(--sb-primary-700)}
.btn-light{background:#fff;border:1px solid var(--sb-border);color:var(--sb-text)}
.btn-light:hover{background:#f8f9fb;border-color:#e2e5ea}
.btn-icon{width:38px;height:38px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:12px}
.btn-ghost-danger{color:var(--sb-danger);background:transparent;border:0}
.btn-ghost-danger:hover{background:#fef2f2;color:var(--sb-danger)}
.form-control,.form-select{border-radius:var(--sb-r-btn);border-color:#e3e6eb;padding:.55rem .85rem}
.form-control-sm,.form-select-sm{border-radius:10px}
.form-control:focus,.form-select:focus,.form-check-input:focus{border-color:var(--sb-primary-200);box-shadow:0 0 0 .22rem rgba(var(--sb-primary-rgb),.15)}
.form-check-input:checked{background-color:var(--sb-primary);border-color:var(--sb-primary)}
.form-label{font-weight:600;font-size:.88rem;margin-bottom:.3rem}
.form-text{color:var(--sb-muted)}
.req::after{content:" *";color:var(--sb-danger)}
.input-group-text{border-radius:var(--sb-r-btn);background:#fafbfc;border-color:#e3e6eb}

/* ---------- Cards / tables ---------- */
.card{border:0;border-radius:var(--sb-r-card);box-shadow:var(--sb-shadow);background:var(--sb-card)}
.card-header{background:transparent;border-bottom:1px solid var(--sb-line);padding:.9rem 1.15rem;font-weight:700;display:flex;align-items:center;gap:.5rem}
.card-header:first-child{border-radius:var(--sb-r-card) var(--sb-r-card) 0 0}
.card-body{padding:1.15rem}
.table{--bs-table-hover-bg:var(--sb-primary-50);margin-bottom:0;vertical-align:middle}
.table>thead th{font-size:.82rem;color:var(--sb-muted);font-weight:600;background:#fafbfc;border-bottom:1px solid var(--sb-border);white-space:nowrap;padding:.65rem .8rem}
.table>tbody td{padding:.7rem .8rem;border-color:var(--sb-line)}
.table-wrap{overflow-x:auto}
.table.is-empty>thead{display:none}
.cell-2 .t1{font-weight:600}
.cell-2 .t2{font-size:.8rem;color:var(--sb-muted)}

/* ---------- Badges ---------- */
.pill{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .65rem;border-radius:999px;font-size:.78rem;font-weight:600;white-space:nowrap}
.pill-mute{background:#f1f3f6;color:#4b5563}
.pill-primary{background:var(--sb-primary-50);color:var(--sb-primary-700)}
.pill-success{background:#ecfdf3;color:#15803d}
.pill-warning{background:#fffbeb;color:#b45309}
.pill-danger{background:#fef2f2;color:#b91c1c}
.pill-info{background:#eff8ff;color:#0369a1}
.pill-purple{background:#f5f3ff;color:#6d28d9}
.pill-blue{background:#eff4ff;color:#1d4ed8}
.pill-dot::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}

/* ---------- Nav rail ---------- */
.sb-rail{position:fixed;top:0;left:0;bottom:0;width:var(--sb-rail);background:#fff;border-right:1px solid var(--sb-border);display:flex;flex-direction:column;align-items:center;padding:.85rem 0;z-index:1030}
.sb-logo{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,var(--sb-grad-from),var(--sb-grad-to));display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.35rem;margin-bottom:1rem;box-shadow:0 6px 16px rgba(var(--sb-primary-rgb),.3);overflow:hidden;flex:0 0 auto}
.sb-logo img{width:100%;height:100%;object-fit:cover;background:#fff}
.sb-rail-items{display:flex;flex-direction:column;gap:.3rem;width:100%;align-items:center;overflow-y:auto;flex:1 1 auto;scrollbar-width:none}
.sb-rail-items::-webkit-scrollbar{display:none}
.sb-rail-bottom{display:flex;flex-direction:column;gap:.3rem;align-items:center;width:100%;padding-top:.5rem}
.rail-item{display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--sb-muted);width:72px;padding:.25rem 0;border-radius:12px;position:relative;cursor:pointer}
.rail-item .ri-ico{width:44px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;transition:background .15s,color .15s}
.rail-item .ri-lbl{font-size:10.5px;font-weight:600;line-height:1.15;text-align:center}
.rail-item:hover .ri-ico{background:#f4f5f7;color:var(--sb-text)}
.rail-item.active{color:var(--sb-primary-700)}
.rail-item.active .ri-ico{background:var(--sb-primary-50);color:var(--sb-primary)}
.rail-badge{position:absolute;top:0;right:12px;min-width:18px;height:18px;border-radius:999px;background:var(--sb-danger);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff}
.rail-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--sb-grad-from),var(--sb-grad-to));color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:.35rem;cursor:pointer;border:0}

/* ---------- Main + topbar ---------- */
.sb-main{margin-left:var(--sb-rail);min-height:100vh;box-sizing:border-box}
.sb-topbar{position:sticky;top:0;height:var(--sb-top);background:rgba(255,255,255,.92);backdrop-filter:saturate(180%) blur(8px);-webkit-backdrop-filter:saturate(180%) blur(8px);border-bottom:1px solid var(--sb-border);display:flex;align-items:center;gap:1rem;padding:0 1.6rem;z-index:1020}
.sb-org{min-width:0;flex:1 1 auto}
.sb-org .o1{font-weight:700;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-org .o2{font-size:.78rem;color:var(--sb-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-search{display:flex;align-items:center;gap:.5rem;background:#f4f5f7;border:1px solid transparent;border-radius:999px;padding:.42rem .5rem .42rem .9rem;color:var(--sb-muted);min-width:240px;cursor:pointer;font-size:.88rem}
.sb-search:hover{border-color:var(--sb-border);background:#fff}
.sb-search kbd{margin-left:auto;background:#fff;color:var(--sb-muted);border:1px solid var(--sb-border);font-size:.72rem;border-radius:7px;padding:.1rem .4rem;box-shadow:none}
.top-ico{position:relative;width:40px;height:40px;border-radius:12px;border:0;background:transparent;color:#4b5563;font-size:1.15rem;display:inline-flex;align-items:center;justify-content:center}
.top-ico:hover{background:#f4f5f7}
.top-ico .dot{position:absolute;top:9px;right:10px;width:8px;height:8px;border-radius:50%;background:var(--sb-danger);border:2px solid #fff}
.top-prof{display:flex;align-items:center;gap:.55rem;border:0;background:transparent;padding:.25rem .4rem;border-radius:12px}
.top-prof:hover{background:#f4f5f7}
.top-prof .p1{font-weight:600;font-size:.88rem;line-height:1.1;text-align:left}
.top-prof .p2{font-size:.74rem;color:var(--sb-muted);text-align:left}
.dropdown-menu{border:0;border-radius:var(--sb-r-dd);box-shadow:var(--sb-shadow-lift);padding:.4rem}
.dropdown-item{border-radius:10px;padding:.5rem .75rem;font-size:.9rem}
.dropdown-item:active{background:var(--sb-primary)}
.sb-content{padding:1.4rem 1.6rem 2rem}

/* ---------- Avatars ---------- */
.avatar{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--sb-grad-from),var(--sb-grad-to));flex:0 0 auto;font-size:.9rem}
.avatar-xs{width:26px;height:26px;font-size:.72rem}
.avatar-sm{width:32px;height:32px;font-size:.8rem}
.avatar-lg{width:56px;height:56px;font-size:1.2rem}
.avatar-xl{width:76px;height:76px;font-size:1.6rem}

/* ---------- Page head / hero ---------- */
.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:1.2rem;flex-wrap:wrap}
.page-head h1{font-size:1.55rem;font-weight:700;letter-spacing:-.02em;margin:0}
.page-head .sub{color:var(--sb-muted);margin-top:.2rem;font-size:.92rem}
.page-head .actions{display:flex;gap:.5rem;flex-wrap:wrap}
.section-hero{position:relative;border-radius:var(--sb-r-hero);padding:1.6rem 1.7rem;color:#fff;overflow:hidden;background:linear-gradient(120deg,#263451 0%,#493b69 55%,#75446a 100%);margin-bottom:1.2rem;min-height:150px}
.section-hero::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.12) 1px,transparent 1px);background-size:16px 16px;mask-image:linear-gradient(90deg,transparent,#000 60%);-webkit-mask-image:linear-gradient(90deg,transparent,#000 60%)}
.section-hero>*{position:relative}
.section-hero .eyebrow{font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;opacity:.75;font-weight:700}
.section-hero h2{font-size:1.5rem;margin:.3rem 0 .35rem;letter-spacing:-.02em}
.section-hero p{opacity:.85;margin:0 0 .9rem;max-width:560px}
.section-hero .hero-art{position:absolute;right:1.2rem;bottom:0;width:210px;height:150px;pointer-events:none}
.section-hero .btn-hero{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.22)}
.section-hero .btn-hero:hover{background:rgba(255,255,255,.24);color:#fff}

/* ---------- Stats ---------- */
.stat{display:flex;flex-direction:row;align-items:center;gap:.85rem;padding:1rem 1.1rem}
.stat .s-ico{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex:0 0 auto}
.stat .s-val{font-size:1.5rem;font-weight:700;line-height:1.1;letter-spacing:-.02em}
.stat .s-lbl{font-size:.82rem;color:var(--sb-muted)}
.stat .s-sub{font-size:.75rem;color:var(--sb-faint)}
.tint-primary{background:var(--sb-primary-50);color:var(--sb-primary)}
.tint-success{background:#ecfdf3;color:var(--sb-success)}
.tint-warning{background:#fffbeb;color:var(--sb-warning)}
.tint-danger{background:#fef2f2;color:var(--sb-danger)}
.tint-info{background:#eff8ff;color:var(--sb-info)}
.tint-purple{background:#f5f3ff;color:var(--sb-purple)}
.tint-blue{background:#eff4ff;color:var(--sb-blue)}
.tint-teal{background:#f0fdfa;color:var(--sb-teal)}
.stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin-bottom:1.2rem}

/* ---------- Dashboard 3 col ---------- */
.dash-grid{display:grid;grid-template-columns:290px minmax(0,1fr) 320px;gap:1.2rem;align-items:start}
.dash-side{position:sticky;top:calc(var(--sb-top) + 1rem);display:flex;flex-direction:column;gap:1.2rem}
.dash-feed{display:flex;flex-direction:column;gap:1.2rem;min-width:0}
@media (min-width:1600px){.dash-grid{grid-template-columns:19% minmax(0,1fr) 22%}}

/* ---------- App tiles ---------- */
.tile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.9rem .5rem}
.app-tile{display:flex;flex-direction:column;align-items:center;gap:.4rem;text-decoration:none;color:var(--sb-text);font-size:.8rem;font-weight:600;text-align:center;position:relative;transition:transform .15s;cursor:pointer}
.app-tile:hover{transform:translateY(-2px);color:var(--sb-text)}
.app-ico{width:56px;height:56px;border-radius:17px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.45rem;background:linear-gradient(135deg,var(--sb-grad-from),var(--sb-grad-to));box-shadow:0 6px 14px rgba(var(--sb-primary-rgb),.22)}
.app-ico.teal{background:linear-gradient(135deg,#2dd4bf,#0d9488);box-shadow:0 6px 14px rgba(13,148,136,.22)}
.app-ico.blue{background:linear-gradient(135deg,#60a5fa,#2563eb);box-shadow:0 6px 14px rgba(37,99,235,.22)}
.app-ico.slate{background:linear-gradient(135deg,#94a3b8,#475569);box-shadow:0 6px 14px rgba(71,85,105,.2)}
.app-ico.purple{background:linear-gradient(135deg,#a78bfa,#7c3aed);box-shadow:0 6px 14px rgba(124,58,237,.22)}
.app-ico.green{background:linear-gradient(135deg,#4ade80,#16a34a);box-shadow:0 6px 14px rgba(22,163,74,.22)}
.app-tile .t-badge{position:absolute;top:-4px;right:calc(50% - 34px);min-width:20px;height:20px;border-radius:999px;background:var(--sb-danger);color:#fff;font-size:.7rem;display:flex;align-items:center;justify-content:center;border:2px solid #fff;padding:0 5px}

/* ---------- Ring / progress ---------- */
.ring{position:relative;display:inline-flex;align-items:center;justify-content:center}
.ring svg{transform:rotate(-90deg)}
.ring .r-val{position:absolute;text-align:center;line-height:1.1}
.ring .r-val b{font-size:1.35rem;letter-spacing:-.02em}
.ring .r-val small{display:block;font-size:.72rem;color:var(--sb-muted)}
.progress{height:8px;border-radius:999px;background:#eef0f3}
.progress-bar{background:linear-gradient(90deg,var(--sb-grad-from),var(--sb-grad-to));border-radius:999px}
.bar-row{margin-bottom:.85rem}
.bar-row:last-child{margin-bottom:0}
.bar-row .b-top{display:flex;justify-content:space-between;gap:.5rem;font-size:.86rem;margin-bottom:.3rem}

/* ---------- Lists / feed ---------- */
.list-row{display:flex;align-items:center;gap:.75rem;padding:.7rem 0;border-bottom:1px solid var(--sb-line)}
.list-row:last-child{border-bottom:0}
.list-row .l-main{flex:1 1 auto;min-width:0}
.list-row .l-t1{font-weight:600;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list-row .l-t2{font-size:.78rem;color:var(--sb-muted)}
.check-row{display:flex;align-items:center;gap:.65rem;padding:.55rem .6rem;border-radius:12px;text-decoration:none;color:var(--sb-text);font-size:.88rem;cursor:pointer}
.check-row:hover{background:#f8f9fb;color:var(--sb-text)}
.check-row .c-ico{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex:0 0 auto;border:2px solid #d8dce3;color:transparent}
.check-row.done .c-ico{background:var(--sb-success);border-color:var(--sb-success);color:#fff}
.check-row.done .c-lbl{color:var(--sb-muted);text-decoration:line-through}

/* ---------- Empty state ---------- */
.empty{text-align:center;padding:2.2rem 1rem}
.empty .e-ico{width:68px;height:68px;border-radius:20px;background:var(--sb-primary-50);color:var(--sb-primary);font-size:1.8rem;display:inline-flex;align-items:center;justify-content:center;margin-bottom:.8rem}
.empty .e-t{font-weight:700;font-size:1rem}
.empty .e-d{color:var(--sb-muted);font-size:.88rem;max-width:380px;margin:.25rem auto 0}

/* ---------- Nav pills / tabs ---------- */
.nav-pills{gap:.35rem;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.nav-pills::-webkit-scrollbar{display:none}
.nav-pills .nav-link{border-radius:999px;color:#4b5563;font-weight:600;font-size:.88rem;padding:.45rem .95rem;white-space:nowrap;background:#fff;box-shadow:var(--sb-shadow)}
.nav-pills .nav-link:hover{color:var(--sb-primary-700)}
.nav-pills .nav-link.active{background:var(--sb-primary);color:#fff;box-shadow:0 4px 12px rgba(var(--sb-primary-rgb),.25)}
.pagination{--bs-pagination-border-radius:10px;--bs-pagination-color:var(--sb-text);--bs-pagination-active-bg:var(--sb-primary);--bs-pagination-active-border-color:var(--sb-primary);gap:.25rem}
.pagination .page-link{border-radius:10px!important;border-color:var(--sb-border);font-size:.85rem}

/* ---------- Toolbar ---------- */
.toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;padding:.85rem 1.15rem;border-bottom:1px solid var(--sb-line)}
.toolbar .search{position:relative;flex:1 1 220px;max-width:340px}
.toolbar .search i{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:var(--sb-faint)}
.toolbar .search input{padding-left:2.1rem}
.list-foot{display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.75rem 1.15rem;border-top:1px solid var(--sb-line);font-size:.85rem;color:var(--sb-muted);flex-wrap:wrap}

/* ---------- Modal ---------- */
.modal-content{border:0;border-radius:var(--sb-r-modal);box-shadow:var(--sb-shadow-lift)}
.modal-header{border-bottom:1px solid var(--sb-line);padding:1rem 1.3rem}
.modal-title{font-weight:700;font-size:1.08rem}
.modal-body{padding:1.2rem 1.3rem}
.modal-footer{border-top:1px solid var(--sb-line);padding:.8rem 1.3rem}
.alert{border:0;border-radius:14px;display:flex;gap:.65rem;align-items:flex-start;font-size:.9rem}
.alert>i{font-size:1.1rem;line-height:1.3}

/* ---------- Combo (searchable select) ---------- */
.combo{position:relative}
.combo .combo-list{position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;border-radius:var(--sb-r-dd);box-shadow:var(--sb-shadow-lift);max-height:260px;overflow-y:auto;z-index:1065;padding:.35rem;display:none}
.combo.open .combo-list{display:block}
.combo .c-opt{padding:.5rem .7rem;border-radius:10px;cursor:pointer;font-size:.9rem}
.combo .c-opt small{display:block;color:var(--sb-muted);font-size:.76rem}
.combo .c-opt:hover,.combo .c-opt.hl{background:var(--sb-primary-50)}
.combo .c-opt.sel{font-weight:700;color:var(--sb-primary-700)}
.combo .c-empty{padding:.6rem;color:var(--sb-muted);font-size:.85rem;text-align:center}
.combo .c-caret{position:absolute;right:.8rem;top:50%;transform:translateY(-50%);color:var(--sb-faint);pointer-events:none}

/* ---------- Color swatches ---------- */
.swatches{display:flex;flex-wrap:wrap;gap:.5rem}
.swatch{width:34px;height:34px;border-radius:11px;border:3px solid #fff;box-shadow:0 0 0 1px var(--sb-border);cursor:pointer}
.swatch.active{box-shadow:0 0 0 2px var(--sb-text)}
.logo-box{width:96px;height:96px;border-radius:20px;background:#f4f5f7;display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--sb-faint);font-size:2rem;flex:0 0 auto}
.logo-box img{width:100%;height:100%;object-fit:contain}

/* ---------- Toast ---------- */
#toastBox{position:fixed;top:1rem;right:1rem;z-index:2000;display:flex;flex-direction:column;gap:.5rem;max-width:min(380px,calc(100vw - 2rem))}
.sp-toast{background:#1f2937;color:#fff;border-radius:14px;padding:.75rem 1rem;box-shadow:var(--sb-shadow-lift);display:flex;gap:.6rem;align-items:flex-start;font-size:.9rem;animation:tIn .2s ease-out}
.sp-toast.success i{color:#4ade80}.sp-toast.error i{color:#f87171}.sp-toast.warning i{color:#fbbf24}.sp-toast.info i{color:#60a5fa}
@keyframes tIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}

/* ---------- Login ---------- */
.login-wrap{min-height:100vh;display:grid;grid-template-columns:1.1fr 1fr}
.login-art{background:linear-gradient(135deg,var(--sb-grad-from),var(--sb-grad-to));color:#fff;padding:3rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
.login-art::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.16) 1px,transparent 1px);background-size:18px 18px}
.login-art>*{position:relative}
.login-art h1{font-size:2.1rem;letter-spacing:-.02em;max-width:460px}
.login-form{display:flex;align-items:center;justify-content:center;padding:2rem}
.login-card{width:100%;max-width:380px}
.boot{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.8rem;color:var(--sb-muted)}

/* ---------- Search modal (Ctrl K) ---------- */
.sk-item{display:flex;align-items:center;gap:.75rem;padding:.6rem .75rem;border-radius:12px;cursor:pointer;color:var(--sb-text);text-decoration:none}
.sk-item:hover,.sk-item.hl{background:var(--sb-primary-50)}
.sk-item .sk-ico{width:34px;height:34px;border-radius:10px;background:#f4f5f7;display:flex;align-items:center;justify-content:center}

/* ---------- Bottom nav (mobile) ---------- */
.sb-bottom{display:none}
.menu-sheet .tile-grid{grid-template-columns:repeat(4,1fr)}

/* ---------- Project detail ---------- */
.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.95rem 1.4rem}
.info-grid .ig-l{font-size:.78rem;color:var(--sb-muted);margin-bottom:.1rem}
.info-grid .ig-v{font-weight:600;font-size:.92rem;word-break:break-word}
.prose{white-space:pre-wrap;line-height:1.75}
.timeline{position:relative;padding-left:1.4rem}
.timeline::before{content:"";position:absolute;left:.4rem;top:.35rem;bottom:.35rem;width:2px;background:var(--sb-line)}
.tl-item{position:relative;padding-bottom:1rem}
.tl-item:last-child{padding-bottom:0}
.tl-dot{position:absolute;left:-1.3rem;top:.3rem;width:12px;height:12px;border-radius:50%;background:var(--sb-primary);border:2px solid #fff;box-shadow:0 0 0 2px var(--sb-primary-100)}
.mini-bar{display:flex;align-items:center;gap:.5rem;min-width:120px}
.mini-bar .progress{flex:1;height:6px}
.section-label{font-size:.8rem;font-weight:700;color:var(--sb-primary-700);padding:.2rem 0 .4rem;border-bottom:1px solid var(--sb-line);margin-top:.3rem}
.rep-row{display:grid;grid-template-columns:minmax(0,1fr) 130px 110px 38px;gap:.5rem;margin-bottom:.5rem}
.table tfoot td{background:#fafbfc;border-top:1px solid var(--sb-border)}
.nav-pills button.nav-link{border:0}

/* ---------- Budget ---------- */
.cell-btn{display:block;width:100%;text-align:right;background:transparent;border:0;border-radius:10px;padding:.35rem .5rem;color:inherit}
.cell-btn:hover{background:var(--sb-primary-50)}
.budget-matrix td{min-width:150px;vertical-align:top}
.budget-matrix td:first-child{min-width:170px;vertical-align:middle}

/* ---------- Progress ---------- */
.rp-item{padding:.9rem 0;border-bottom:1px solid var(--sb-line)}
.rp-item:last-child{border-bottom:0}
.att-grid{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.55rem}
.att-thumb{width:84px;height:84px;border-radius:12px;object-fit:cover;background:#f4f5f7;display:block}
.att-chip{display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .7rem;border-radius:10px;background:#f4f5f7;font-size:.82rem;color:var(--sb-text);text-decoration:none;max-width:240px}
.att-chip:hover{background:var(--sb-primary-50);color:var(--sb-text)}
.upl-list{display:flex;flex-direction:column;gap:.4rem;margin-bottom:.5rem}
.upl-item{display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:12px;background:#fafbfc;font-size:.86rem;min-width:0}
.upl-item img{width:36px;height:36px;border-radius:8px;object-fit:cover}
.upl-item>i{font-size:1.2rem;color:var(--sb-muted);width:36px;text-align:center}
.spin{display:inline-block;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.form-range{accent-color:var(--sb-primary)}
.form-range::-webkit-slider-thumb{background:var(--sb-primary)}
.form-range::-moz-range-thumb{background:var(--sb-primary)}
.sc-wrap{position:relative;touch-action:pan-y}
.sc-tip{position:absolute;pointer-events:none;background:#fff;border-radius:12px;box-shadow:var(--sb-shadow-lift);padding:.5rem .7rem;font-size:.8rem;display:none;min-width:150px;z-index:5}
.sc-legend{display:flex;gap:1.1rem;font-size:.82rem;color:var(--sb-muted);margin-bottom:.4rem}
.sc-key{display:inline-block;width:18px;height:0;border-top:2px solid;vertical-align:middle;margin-right:.35rem}
.sc-key.dashed{border-top-style:dashed}

/* ---------- Disbursement steps ---------- */
.steps{display:flex;align-items:center;gap:0;min-width:150px}
.st-dot{position:relative;width:12px;height:12px;border-radius:50%;background:#e5e7eb;flex:0 0 auto}
.st-dot span{position:absolute;top:15px;left:50%;transform:translateX(-50%);font-size:.66rem;color:var(--sb-faint);white-space:nowrap;display:none}
.st-dot.done{background:var(--sb-success)}
.st-dot.cur{background:#fff;box-shadow:0 0 0 2px var(--sb-warning) inset}
.st-line{flex:1 1 auto;height:2px;background:#e5e7eb;min-width:14px}
.st-line.done{background:var(--sb-success)}
.modal .steps{margin-bottom:1.1rem}
.modal .st-dot span{display:block}
.bn-item{position:relative}
.bn-item .rail-badge{top:0;right:calc(50% - 26px)}

/* ---------- Bell ---------- */
.bell-count{position:absolute;top:4px;right:2px;min-width:18px;height:18px;border-radius:999px;background:var(--sb-danger);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff}
.bell-menu{width:380px;max-width:calc(100vw - 1.5rem);overflow:hidden}
.bell-list{max-height:min(460px,70vh);overflow-y:auto;padding:.3rem}
.bell-item{display:flex;gap:.65rem;width:100%;text-align:left;border:0;background:transparent;padding:.6rem .65rem;border-radius:12px;color:var(--sb-text)}
.bell-item:hover{background:#f6f7f9}
.bell-item.unread{background:var(--sb-primary-50)}
.bell-item.unread:hover{background:var(--sb-primary-100)}
.bell-ico{width:34px;height:34px;border-radius:11px;background:#fff;box-shadow:var(--sb-shadow);display:flex;align-items:center;justify-content:center;color:var(--sb-primary);flex:0 0 auto}
.bell-txt{display:flex;flex-direction:column;min-width:0}
.bell-txt .b1{font-size:.86rem;font-weight:600;line-height:1.35}
.bell-txt .b2{font-size:.78rem;color:var(--sb-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bell-txt .b3{font-size:.72rem;color:var(--sb-faint);margin-top:2px}

/* ---------- Mobile ---------- */
@media (max-width:991.98px){
  .sb-rail{display:none}
  .sb-main{margin-left:0;padding-bottom:calc(76px + env(safe-area-inset-bottom))}
  .sb-topbar{padding:0 1rem;padding-top:env(safe-area-inset-top);height:calc(var(--sb-top) + env(safe-area-inset-top))}
  .sb-search{min-width:0;width:40px;height:40px;padding:0;justify-content:center;background:transparent}
  .sb-search span,.sb-search kbd{display:none}
  .top-prof .p-txt{display:none}
  .sb-content{padding:1rem}
  .sb-bottom{display:flex;position:fixed;left:0;right:0;bottom:0;height:calc(66px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:#fff;border-top:1px solid var(--sb-border);z-index:1030;justify-content:space-around;align-items:center;box-shadow:0 -4px 20px rgba(16,24,40,.06)}
  .bn-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--sb-muted);text-decoration:none;font-size:10.5px;font-weight:600;border:0;background:transparent;padding:.3rem 0}
  .bn-item i{font-size:1.25rem}
  .bn-item.active{color:var(--sb-primary)}
  .bn-center .bn-fab{width:52px;height:52px;border-radius:18px;margin-top:-26px;background:linear-gradient(135deg,var(--sb-grad-from),var(--sb-grad-to));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.35rem;box-shadow:0 8px 20px rgba(var(--sb-primary-rgb),.35);border:4px solid #fff}
  .dash-grid{grid-template-columns:1fr}
  .dash-side{position:static}
  .stat-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}
  .stat{padding:.8rem}
  .stat .s-val{font-size:1.2rem}
  .stat .s-ico{width:40px;height:40px;font-size:1.1rem}
  .page-head h1{font-size:1.3rem}
  .section-hero{padding:1.25rem 1.25rem 3.4rem;border-radius:0 0 26px 26px;margin:-1rem -1rem 1rem}
  .section-hero .hero-art{width:140px;height:100px;opacity:.6}
  .m-float{margin-top:-2.6rem;position:relative}
  .login-wrap{grid-template-columns:1fr}
  .login-art{padding:2rem 1.5rem;min-height:220px;border-radius:0 0 26px 26px}
  .login-art h1{font-size:1.5rem}
  .login-art .la-foot{display:none}
  .hscroll{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:.7rem;scrollbar-width:none;margin:0 -1rem;padding:0 1rem}
  .hscroll>*{scroll-snap-align:start;flex:0 0 78%}
  #toastBox{top:auto;bottom:calc(80px + env(safe-area-inset-bottom));left:1rem;right:1rem;max-width:none}
  .toolbar .search{max-width:none}
  .modal-dialog{margin:.6rem}
  .table-wrap>.table{min-width:680px}
  .table-wrap>.table.is-empty{min-width:0}
  .table-wrap>.table td:first-child{min-width:150px}
  .toolbar .search{flex:1 1 100%}
  .toolbar>.form-select{flex:1 1 140px}
  .table-wrap>.table.table-sm{min-width:0}
  .info-grid{grid-template-columns:1fr}
  .rep-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 38px}
  .rep-row .rep-name{grid-column:1/-1}
  .page-head .actions{width:100%}
}
@media (max-width:575.98px){
  .menu-sheet .tile-grid{grid-template-columns:repeat(3,1fr)}
  .sb-org .o2{display:none}
}
.report-table td,.report-table th{white-space:nowrap}
.report-table td:first-child,.report-table td:nth-child(2){white-space:normal;min-width:140px}
#printArea{display:none}
.po-host{display:block}
.pr-credit{display:none}
@media print{
  body{background:#fff!important}
  body>*:not(#printArea){display:none!important}
  #printArea{display:block!important}
  .pr-doc{font-family:'Sarabun',sans-serif;font-size:11.5pt;color:#000;line-height:1.5}
  .pr-head{display:flex;align-items:center;gap:10px;border-bottom:1.5px solid #000;padding-bottom:6px;margin-bottom:10px}
  .pr-logo{width:46px;height:46px;object-fit:contain}
  .pr-orgbox{flex:1}
  .pr-org{font-weight:700;font-size:13pt}
  .pr-sub{font-size:10pt}
  .pr-meta{font-size:8.5pt;text-align:right;color:#333}
  .pr-title{font-size:16pt;font-weight:700;text-align:center;margin:6px 0 2px}
  .pr-subtitle{text-align:center;margin-bottom:10px}
  .pr-h{margin:10px 0 4px}
  .pr-sec{margin-bottom:6px;break-inside:avoid}
  .pr-body{padding-left:18px}
  .pr-body ol{margin:0;padding-left:18px}
  .pr-table{width:100%;border-collapse:collapse;margin:4px 0 8px;font-size:10.5pt}
  .pr-table th,.pr-table td{border:1px solid #555;padding:3px 6px;vertical-align:top}
  .pr-table th{background:#eee;font-weight:700;text-align:center}
  .pr-table tfoot td{background:#f5f5f5;font-weight:700}
  .pr-table tr{break-inside:avoid}
  .pr-table .r,.pr-table td.r{text-align:right;white-space:nowrap}
  .pr-table .c{text-align:center}
  .pr-kv{border-collapse:collapse;margin:4px 0 8px;width:100%}
  .pr-kv th{text-align:left;font-weight:600;width:32%;padding:2px 8px 2px 0;vertical-align:top}
  .pr-kv td{padding:2px 0}
  .pr-muted{color:#555}
  .pr-indent{text-indent:2.5em;margin:8px 0}
  .pr-row2{display:flex;justify-content:space-between}
  .pr-rep{border-bottom:1px dotted #999;padding:4px 0;break-inside:avoid}
  .pr-signs{display:flex;justify-content:space-around;gap:12px;margin-top:28px;break-inside:avoid;flex-wrap:wrap}
  .pr-sign{text-align:center;min-width:30%;line-height:1.9}
  .pr-date{font-size:10pt}
  .pr-box{border:1px solid #555;padding:8px 12px;margin-top:18px;break-inside:avoid}
  .prose{white-space:pre-wrap}
  .pr-credit{display:block!important;margin-top:16px;padding-top:4px;border-top:1px solid #ccc;font-size:8pt;color:#555;text-align:right}
}
