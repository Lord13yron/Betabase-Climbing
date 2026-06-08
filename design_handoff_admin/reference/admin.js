/* ============================================================
   BETABASE — /admin  superuser console logic
   Vanilla JS, in-memory state. Three views: gyms · admins · messages.
   ============================================================ */
(function () {
  'use strict';

  var D = window.ADMIN_DATA;

  // ---- working state (clone so seed stays pristine) ----
  var gyms       = D.gyms.map(function (g) { return Object.assign({}, g); });
  var users      = D.users.slice();
  var adminships = D.adminships.map(function (a) { return Object.assign({}, a); });
  var messages   = D.messages.map(function (m) { return Object.assign({}, m); });
  var topics     = D.topics;
  var TODAY      = '2026-06-07';

  // ---- DOM helpers ----
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var userById = function (id) { return users.filter(function (u) { return u.id === id; })[0]; };
  var gymById  = function (id) { return gyms.filter(function (g) { return g.id === id; })[0]; };

  // ---- icons (Lucide) ----
  var ICON = {
    mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    mapPin: '<path d="M20 10c0 4.4-5.5 9.5-7.3 11a1 1 0 0 1-1.4 0C9.5 19.5 4 14.4 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    reply: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    unarchive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="m9 15 3-3 3 3"/><path d="M12 12v6"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
    userX: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5"/><path d="m22 8-5 5"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    dotMark: '<circle cx="12" cy="12" r="9"/>'
  };
  var svg = function (paths, cls) {
    return '<svg class="a-ico ' + (cls || '') + '" viewBox="0 0 24 24">' + paths + '</svg>';
  };
  // inject sidebar / tab icons declared in markup via data-icon
  $$('[data-icon]').forEach(function (n) { n.insertAdjacentHTML('afterbegin', svg(ICON[n.dataset.icon] || '')); });

  // ---- formatting ----
  function initials(name) {
    var p = name.trim().split(/\s+/);
    return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || (p[0] || '')[1] || '');
  }
  function fmtMsgTime(iso) {
    var d = iso.split('T')[0], t = iso.split('T')[1] || '00:00';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var dp = d.split('-');
    if (d === TODAY) {
      var h = parseInt(t.split(':')[0], 10), m = t.split(':')[1];
      var ap = h >= 12 ? 'PM' : 'AM'; var hh = h % 12; if (hh === 0) hh = 12;
      return hh + ':' + m + ' ' + ap;
    }
    return months[parseInt(dp[1], 10) - 1] + ' ' + parseInt(dp[2], 10);
  }
  function fmtMsgFull(iso) {
    var d = iso.split('T')[0], t = iso.split('T')[1] || '00:00';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var dp = d.split('-');
    var h = parseInt(t.split(':')[0], 10), m = t.split(':')[1];
    var ap = h >= 12 ? 'PM' : 'AM'; var hh = h % 12; if (hh === 0) hh = 12;
    return months[parseInt(dp[1], 10) - 1] + ' ' + parseInt(dp[2], 10) + ', ' + dp[0] +
           ' · ' + hh + ':' + m + ' ' + ap;
  }

  var STATUS_LABEL = { live: 'Live', draft: 'Draft', archived: 'Archived' };
  var STATUS_DOT   = { live: '#4E9D5B', draft: '#EDB23A', archived: '#5B6776' };

  // ============================================================
  // NAVIGATION
  // ============================================================
  var currentView = 'gyms';
  function setView(v) {
    currentView = v;
    $$('.a-view').forEach(function (n) { n.classList.toggle('is-active', n.dataset.view === v); });
    $$('.a-navitem').forEach(function (n) { n.classList.toggle('is-active', n.dataset.nav === v); });
    $$('.a-tab').forEach(function (n) { n.classList.toggle('is-active', n.dataset.nav === v); });
    window.scrollTo(0, 0);
  }
  $$('[data-nav]').forEach(function (n) {
    n.addEventListener('click', function () { setView(n.dataset.nav); });
  });

  function unreadCount() { return messages.filter(function (m) { return !m.read && !m.archived; }).length; }
  function refreshBadges() {
    var c = unreadCount();
    $$('.a-badge').forEach(function (b) { b.textContent = c; b.dataset.count = c; });
  }

  // ============================================================
  // GYMS VIEW
  // ============================================================
  var gymRowsEl = $('#a-gym-rows');
  var gymEmptyEl = $('#a-gym-empty');
  var gymSearchEl = $('#a-gym-search');
  var gymFilter = 'all';
  var gymQuery = '';

  function adminCount(gymId) { return adminships.filter(function (a) { return a.gymId === gymId; }).length; }

  function renderGyms() {
    var q = gymQuery.trim().toLowerCase();
    var list = gyms.filter(function (g) {
      if (gymFilter !== 'all' && g.status !== gymFilter) return false;
      if (q && (g.name + ' ' + g.city).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    // filter counts
    $$('#a-gym-filter button').forEach(function (b) {
      var f = b.dataset.filter;
      var n = f === 'all' ? gyms.length : gyms.filter(function (g) { return g.status === f; }).length;
      var c = b.querySelector('.cnt'); if (c) c.textContent = n;
    });

    gymRowsEl.innerHTML = '';
    if (list.length === 0) {
      gymRowsEl.style.display = 'none';
      gymEmptyEl.style.display = 'flex';
      $('#a-gym-empty-msg').textContent = (gyms.length === 0)
        ? 'No gyms yet. Add the first one to seed the directory.'
        : 'No gyms match this filter. Try a different status or clear the search.';
    } else {
      gymRowsEl.style.display = 'flex';
      gymEmptyEl.style.display = 'none';
      list.forEach(function (g) { gymRowsEl.appendChild(gymRow(g)); });
    }

    var live = gyms.filter(function (g) { return g.status === 'live'; }).length;
    $('#a-gym-sub').textContent = gyms.length + (gyms.length === 1 ? ' gym' : ' gyms') + ' · ' + live + ' live';
    refreshBadges();
  }

  function gymRow(g) {
    var row = el('div', 'a-gym');
    row.dataset.id = g.id;

    var thumb = el('img', 'a-gym-thumb');
    thumb.src = g.img; thumb.alt = '';

    var main = el('div', 'a-gym-main');
    main.innerHTML = '<div class="a-gym-name">' + esc(g.name) + '</div>' +
      '<div class="a-gym-loc">' + svg(ICON.mapPin) + esc(g.city) + '</div>';

    var chipsCell = el('div', 'a-gym-chipscell');
    var chips = el('div', 'a-chips');
    g.chips.forEach(function (c) { chips.appendChild(el('span', 'a-chip', esc(c))); });
    chipsCell.appendChild(chips);

    var stats = el('div', 'a-gym-stats');
    stats.innerHTML =
      '<div class="a-stat"><span class="n">' + g.routes + '</span><span class="l">Routes</span></div>' +
      '<div class="a-stat"><span class="n">' + adminCount(g.id) + '</span><span class="l">Admins</span></div>';

    var end = el('div', 'a-gym-end');
    end.appendChild(statusControl(g));
    var acts = el('div', 'a-gym-acts');
    var manage = el('button', 'a-iconbtn'); manage.innerHTML = svg(ICON.users);
    manage.title = 'Manage admins'; manage.setAttribute('aria-label', 'Manage admins');
    manage.onclick = function () { goToGymAdmins(g.id); };
    var edit = el('button', 'a-iconbtn'); edit.innerHTML = svg(ICON.pencil);
    edit.title = 'Edit gym'; edit.setAttribute('aria-label', 'Edit gym');
    edit.onclick = function () { openGymModal(g); };
    var del = el('button', 'a-iconbtn is-danger'); del.innerHTML = svg(ICON.trash);
    del.title = 'Delete gym'; del.setAttribute('aria-label', 'Delete gym');
    del.onclick = function () { confirmDeleteGym(g); };
    acts.appendChild(manage); acts.appendChild(edit); acts.appendChild(del);
    end.appendChild(acts);

    row.appendChild(thumb); row.appendChild(main); row.appendChild(chipsCell);
    row.appendChild(stats); row.appendChild(end);
    return row;
  }

  // status pill + dropdown
  function statusControl(g) {
    var wrap = el('div', 'a-statuswrap');
    var pill = el('button', 'a-status');
    pill.dataset.status = g.status;
    pill.innerHTML = '<span class="sdot"></span>' + STATUS_LABEL[g.status] + svg(ICON.chev, 'scaret');
    var menu = el('div', 'a-menu');
    ['live', 'draft', 'archived'].forEach(function (s) {
      var item = el('button', 'a-menu-item' + (s === g.status ? ' is-current' : ''));
      item.innerHTML = '<span class="sdot" style="background:' + STATUS_DOT[s] + '"></span>' + STATUS_LABEL[s];
      item.onclick = function (e) {
        e.stopPropagation(); closeMenus();
        if (s === g.status) return;
        if (s === 'archived' && adminCount(g.id) > 0) {
          confirmArchiveGym(g);
        } else { g.status = s; renderGyms(); toast('“' + g.name + '” set to ' + STATUS_LABEL[s]); }
      };
      menu.appendChild(item);
    });
    pill.onclick = function (e) {
      e.stopPropagation();
      var open = menu.classList.contains('is-open');
      closeMenus();
      if (!open) menu.classList.add('is-open');
    };
    wrap.appendChild(pill); wrap.appendChild(menu);
    return wrap;
  }
  function closeMenus() { $$('.a-menu.is-open').forEach(function (m) { m.classList.remove('is-open'); }); }
  document.addEventListener('click', closeMenus);

  // ---- gym add/edit modal ----
  var gymOverlay = $('#a-gym-overlay');
  var gymForm = $('#a-gym-form');
  var gfName = $('#a-gf-name'), gfCity = $('#a-gf-city'), gfSlug = $('#a-gf-slug');
  var gfStatusField = $('#a-gf-status-field'), gfStatus = $('#a-gf-status');
  var gfError = $('#a-gf-error'), gfDisc = $('#a-gf-disc');
  var editingGymId = null, slugTouched = false, curDisc = [];

  function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  gfName.addEventListener('input', function () {
    if (!slugTouched && !editingGymId) gfSlug.value = slugify(gfName.value);
  });
  gfSlug.addEventListener('input', function () { slugTouched = true; });
  $$('#a-gf-disc .a-multibtn').forEach(function (b) {
    b.onclick = function () {
      b.classList.toggle('on');
      var d = b.dataset.disc;
      var i = curDisc.indexOf(d);
      if (i === -1) curDisc.push(d); else curDisc.splice(i, 1);
    };
  });

  function openGymModal(g) {
    gfError.classList.remove('show');
    slugTouched = !!g;
    if (g) {
      editingGymId = g.id;
      $('#a-gym-modal-title').textContent = 'Edit gym';
      $('#a-gym-modal-sub').textContent = g.name;
      $('#a-gf-submit').textContent = 'Save changes';
      gfName.value = g.name; gfCity.value = g.city; gfSlug.value = g.id;
      curDisc = g.chips.slice();
      gfStatusField.style.display = 'flex';
      gfStatus.value = g.status;
    } else {
      editingGymId = null;
      $('#a-gym-modal-title').textContent = 'Add gym';
      $('#a-gym-modal-sub').textContent = 'New gym · starts as a draft';
      $('#a-gf-submit').textContent = 'Add gym';
      gymForm.reset(); gfSlug.value = '';
      curDisc = [];
      gfStatusField.style.display = 'none';
    }
    $$('#a-gf-disc .a-multibtn').forEach(function (b) {
      b.classList.toggle('on', curDisc.indexOf(b.dataset.disc) !== -1);
    });
    gymOverlay.classList.add('is-open');
    setTimeout(function () { gfName.focus(); }, 40);
  }
  function closeGymModal() { gymOverlay.classList.remove('is-open'); }

  gymForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = gfName.value.trim(), city = gfCity.value.trim();
    var slug = slugify(gfSlug.value || name);
    if (!name) { return showGfErr('Gym name is required.', gfName); }
    if (!city) { return showGfErr('City / location is required.', gfCity); }
    if (!slug) { return showGfErr('URL slug is required.', gfSlug); }
    if (curDisc.length === 0) { return showGfErr('Pick at least one discipline.'); }
    var clash = gyms.filter(function (g) { return g.id === slug && g.id !== editingGymId; }).length;
    if (clash) { return showGfErr('That URL slug is already taken — pick a unique one.', gfSlug); }

    var order = ['Boulder', 'Lead', 'Top-rope'];
    var chips = order.filter(function (o) { return curDisc.indexOf(o) !== -1; });

    if (editingGymId) {
      var g = gymById(editingGymId);
      // moving adminships if slug changed
      if (slug !== g.id) {
        adminships.forEach(function (a) { if (a.gymId === g.id) a.gymId = slug; });
        messages.forEach(function (m) { if (m.gymId === g.id) m.gymId = slug; });
      }
      g.name = name; g.city = city; g.chips = chips; g.id = slug; g.status = gfStatus.value;
      toast('Gym updated');
    } else {
      gyms.unshift({ id: slug, name: name, city: city, chips: chips, routes: 0,
        status: 'draft', img: 'assets/climbing-wall-hero.png' });
      toast('“' + name + '” added as a draft');
    }
    closeGymModal(); renderGyms();
  });
  function showGfErr(msg, focusEl) {
    gfError.textContent = msg; gfError.classList.add('show');
    if (focusEl) focusEl.focus();
  }

  function confirmDeleteGym(g) {
    var n = adminCount(g.id);
    openConfirm('Delete “' + g.name + '”?',
      'This permanently removes the gym and all its walls, routes, and beta videos.' +
      (n > 0 ? ' Its ' + n + ' admin' + (n === 1 ? '' : 's') + ' will lose access.' : '') +
      ' This can’t be undone.',
      'Delete gym',
      function () {
        gyms = gyms.filter(function (x) { return x.id !== g.id; });
        adminships = adminships.filter(function (a) { return a.gymId !== g.id; });
        renderGyms(); toast('Gym deleted');
      });
  }
  function confirmArchiveGym(g) {
    var n = adminCount(g.id);
    openConfirm('Archive “' + g.name + '”?',
      'It will be hidden from the public directory but its data is kept. Its ' + n +
      ' admin' + (n === 1 ? '' : 's') + ' keep access. You can set it back to Live anytime.',
      'Archive gym',
      function () { g.status = 'archived'; renderGyms(); toast('“' + g.name + '” archived'); },
      'a-btn--ghost');
  }

  $('#a-add-gym').onclick = function () { openGymModal(null); };
  $('#a-add-gym-empty').onclick = function () { openGymModal(null); };
  $$('[data-close-gym]').forEach(function (b) { b.onclick = closeGymModal; });
  gymOverlay.addEventListener('click', function (e) { if (e.target === gymOverlay) closeGymModal(); });

  gymSearchEl.addEventListener('input', function () { gymQuery = gymSearchEl.value; renderGyms(); });
  $$('#a-gym-filter button').forEach(function (b) {
    b.onclick = function () {
      gymFilter = b.dataset.filter;
      $$('#a-gym-filter button').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderGyms();
    };
  });

  // ============================================================
  // ADMINS VIEW
  // ============================================================
  var adminGroupsEl = $('#a-admin-groups');
  var adminSearchEl = $('#a-admin-search');
  var adminQuery = '';
  var collapsed = {}; // gymId -> bool

  function goToGymAdmins(gymId) {
    setView('admins');
    adminQuery = ''; adminSearchEl.value = '';
    Object.keys(collapsed).forEach(function (k) { collapsed[k] = true; });
    collapsed[gymId] = false;
    renderAdmins();
    setTimeout(function () {
      var g = $('.a-group[data-id="' + gymId + '"]');
      if (g) g.scrollIntoView({ block: 'center' });
    }, 60);
  }

  function renderAdmins() {
    var q = adminQuery.trim().toLowerCase();
    adminGroupsEl.innerHTML = '';
    var shown = 0, totalAdmins = 0;

    gyms.forEach(function (g) {
      var gymAdmins = adminships.filter(function (a) { return a.gymId === g.id; })
        .map(function (a) { return userById(a.userId); }).filter(Boolean);
      totalAdmins += gymAdmins.length;

      if (q) {
        var gymMatch = g.name.toLowerCase().indexOf(q) !== -1;
        var matched = gymAdmins.filter(function (u) {
          return (u.name + ' ' + u.username + ' ' + u.email).toLowerCase().indexOf(q) !== -1;
        });
        if (!gymMatch && matched.length === 0) return;
        if (!gymMatch) gymAdmins = matched;
      }
      shown++;
      adminGroupsEl.appendChild(adminGroup(g, gymAdmins));
    });

    $('#a-admin-empty').style.display = shown === 0 ? 'flex' : 'none';
    adminGroupsEl.style.display = shown === 0 ? 'none' : 'flex';
    var gymsWith = gyms.filter(function (g) { return adminCount(g.id) > 0; }).length;
    $('#a-admin-sub').textContent = totalAdmins + (totalAdmins === 1 ? ' admin' : ' admins') +
      ' across ' + gymsWith + ' of ' + gyms.length + ' gyms';
  }

  function adminGroup(g, gymAdmins) {
    var card = el('div', 'a-group');
    card.dataset.id = g.id;
    card.dataset.collapsed = collapsed[g.id] ? 'true' : 'false';

    var head = el('div', 'a-group-head');
    var chev = el('span', 'a-chev', svg(ICON.chev));
    var thumb = el('img', 'a-group-thumb'); thumb.src = g.img; thumb.alt = '';
    var idw = el('div', 'a-group-id');
    idw.innerHTML = '<span class="a-group-name">' + esc(g.name) + '</span>' +
      '<span class="a-group-count">' + adminCount(g.id) + (adminCount(g.id) === 1 ? ' admin' : ' admins') + '</span>';
    var endw = el('div', 'a-group-end');
    endw.innerHTML = '<span class="a-group-status" data-status="' + g.status + '">' + STATUS_LABEL[g.status] + '</span>';
    head.appendChild(chev); head.appendChild(thumb); head.appendChild(idw); head.appendChild(endw);
    head.onclick = function () {
      collapsed[g.id] = !collapsed[g.id];
      card.dataset.collapsed = collapsed[g.id] ? 'true' : 'false';
    };
    card.appendChild(head);

    var body = el('div', 'a-group-body');
    if (gymAdmins.length === 0) {
      body.appendChild(el('div', 'a-group-empty', 'No admins yet — assign someone to manage this gym’s walls and routes.'));
    } else {
      var list = el('div', 'a-admins');
      gymAdmins.forEach(function (u) { list.appendChild(adminRow(g, u)); });
      body.appendChild(list);
    }
    var addBtn = el('button', 'a-btn a-btn--ghost a-btn--sm');
    addBtn.innerHTML = svg(ICON.userPlus) + 'Add admin';
    addBtn.onclick = function () { openAddAdmin(g); };
    body.appendChild(addBtn);
    card.appendChild(body);
    return card;
  }

  function adminRow(g, u) {
    var row = el('div', 'a-admin');
    var av = el('div', 'a-av'); av.style.background = u.av; av.textContent = initials(u.name).toUpperCase();
    var main = el('div', 'a-admin-main');
    main.innerHTML = '<div class="a-admin-name">' + esc(u.name) + '</div>' +
      '<div class="a-admin-meta"><span>@' + esc(u.username) + '</span><span class="dot"></span>' +
      '<span class="em">' + esc(u.email) + '</span></div>';
    var rm = el('button', 'a-iconbtn is-danger'); rm.innerHTML = svg(ICON.userX);
    rm.title = 'Remove from gym'; rm.setAttribute('aria-label', 'Remove admin');
    rm.onclick = function () {
      openConfirm('Remove ' + u.name + ' as an admin?',
        'They’ll lose access to manage ' + g.name + '’s walls and routes. You can re-add them anytime.',
        'Remove admin',
        function () {
          adminships = adminships.filter(function (a) { return !(a.gymId === g.id && a.userId === u.id); });
          renderAdmins(); renderGyms(); toast(u.name + ' removed from ' + g.name);
        });
    };
    row.appendChild(av); row.appendChild(main); row.appendChild(rm);
    return row;
  }

  adminSearchEl.addEventListener('input', function () { adminQuery = adminSearchEl.value; renderAdmins(); });

  // ---- add-admin search modal ----
  var aaOverlay = $('#a-aa-overlay');
  var aaSearch = $('#a-aa-search');
  var aaResults = $('#a-aa-results');
  var aaGymId = null;

  function openAddAdmin(g) {
    aaGymId = g.id;
    $('#a-aa-sub').textContent = g.name;
    aaSearch.value = '';
    renderAaResults('');
    aaOverlay.classList.add('is-open');
    setTimeout(function () { aaSearch.focus(); }, 40);
  }
  function closeAddAdmin() { aaOverlay.classList.remove('is-open'); }

  function renderAaResults(q) {
    q = q.trim().toLowerCase();
    aaResults.innerHTML = '';
    var existing = adminships.filter(function (a) { return a.gymId === aaGymId; })
      .map(function (a) { return a.userId; });
    var list = users.filter(function (u) {
      if (!q) return true;
      return (u.name + ' ' + u.username + ' ' + u.email).toLowerCase().indexOf(q) !== -1;
    });
    if (list.length === 0) {
      aaResults.appendChild(el('div', 'a-unoresults', 'No users match “' + esc(q) + '”.'));
      return;
    }
    list.forEach(function (u) {
      var added = existing.indexOf(u.id) !== -1;
      var item = el('div', 'a-uitem' + (added ? ' is-added' : ''));
      var av = el('div', 'a-av'); av.style.background = u.av; av.textContent = initials(u.name).toUpperCase();
      av.style.width = '40px'; av.style.height = '40px';
      var main = el('div', 'a-uitem-main');
      main.innerHTML = '<div class="a-uitem-name">' + esc(u.name) + '</div>' +
        '<div class="a-uitem-meta">@' + esc(u.username) + ' · <span class="em">' + esc(u.email) + '</span></div>';
      item.appendChild(av); item.appendChild(main);
      if (added) {
        item.appendChild(el('span', 'a-uitem-tag', svg(ICON.check) + 'Admin'));
      } else {
        var add = el('button', 'a-btn a-btn--primary a-btn--sm a-uadd', 'Add');
        add.onclick = function () {
          adminships.push({ gymId: aaGymId, userId: u.id });
          renderAaResults(aaSearch.value);
          renderAdmins(); renderGyms();
          toast(u.name + ' added as admin');
        };
        item.appendChild(add);
      }
      aaResults.appendChild(item);
    });
  }
  aaSearch.addEventListener('input', function () { renderAaResults(aaSearch.value); });
  $$('[data-close-aa]').forEach(function (b) { b.onclick = closeAddAdmin; });
  aaOverlay.addEventListener('click', function (e) { if (e.target === aaOverlay) closeAddAdmin(); });

  // ============================================================
  // MESSAGES VIEW
  // ============================================================
  var msgListEl = $('#a-msglist');
  var msgSearchEl = $('#a-msg-search');
  var inboxEl = $('#a-inbox');
  var readEl = $('#a-read');
  var msgFilter = 'all';
  var msgQuery = '';
  var selectedMsg = null;

  function visibleMessages() {
    var q = msgQuery.trim().toLowerCase();
    return messages.filter(function (m) {
      if (msgFilter === 'all' && m.archived) return false;
      if (msgFilter === 'unread' && (m.read || m.archived)) return false;
      if (msgFilter === 'archived' && !m.archived) return false;
      if (q && (m.name + ' ' + m.email + ' ' + m.body).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderMessages() {
    // filter counts
    var inbox = messages.filter(function (m) { return !m.archived; });
    var counts = {
      all: inbox.length,
      unread: inbox.filter(function (m) { return !m.read; }).length,
      archived: messages.filter(function (m) { return m.archived; }).length
    };
    $$('#a-msg-filter button').forEach(function (b) {
      var c = b.querySelector('.cnt'); if (c) c.textContent = counts[b.dataset.filter];
    });

    var list = visibleMessages();
    msgListEl.innerHTML = '';
    if (list.length === 0) {
      msgListEl.appendChild(el('div', 'a-unoresults', 'Nothing here.'));
    } else {
      list.forEach(function (m) { msgListEl.appendChild(msgItem(m)); });
    }

    $('#a-msg-sub').textContent = counts.unread + ' unread · ' + inbox.length + ' in inbox';
    refreshBadges();
  }

  function topicTag(t) {
    var tp = topics[t] || topics.other;
    var span = el('span', 'a-topic');
    span.textContent = tp.label;
    span.style.color = tp.color;
    span.style.background = hexA(tp.color, 0.14);
    return span;
  }
  function hexA(hex, a) {
    var h = hex.replace('#', '');
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function msgItem(m) {
    var item = el('div', 'a-msg' + (m.read ? ' is-read' : '') + (selectedMsg === m.id ? ' is-selected' : ''));
    item.appendChild(el('span', 'a-msg-dot'));
    var body = el('div', 'a-msg-body');
    var top = el('div', 'a-msg-top');
    top.innerHTML = '<span class="a-msg-from">' + esc(m.name) + '</span>' +
      '<span class="a-msg-time">' + fmtMsgTime(m.ts) + '</span>';
    body.appendChild(top);
    body.appendChild(el('div', 'a-msg-snip', esc(m.body.replace(/\n+/g, ' '))));
    var tags = el('div', 'a-msg-tags');
    tags.appendChild(topicTag(m.topic));
    if (m.gymId && gymById(m.gymId)) {
      tags.appendChild(el('span', 'a-gymtag', svg(ICON.mountain) + esc(gymById(m.gymId).name)));
    }
    body.appendChild(tags);
    item.appendChild(body);
    item.onclick = function () { selectMessage(m.id); };
    return item;
  }

  function selectMessage(id) {
    selectedMsg = id;
    var m = messages.filter(function (x) { return x.id === id; })[0];
    if (m && !m.read) { m.read = true; }
    inboxEl.classList.add('show-read');
    renderMessages();
    renderRead(m);
  }

  function renderRead(m) {
    if (!m) {
      readEl.innerHTML = '<div class="a-read-empty">' +
        '<div class="a-read-empty-ic">' + svg(ICON.inbox) + '</div>' +
        '<h3>No message selected</h3>' +
        '<p>Pick a message from the list to read it, reply, archive, or delete.</p></div>';
      return;
    }
    var gym = m.gymId ? gymById(m.gymId) : null;
    readEl.innerHTML = '';

    var head = el('div', 'a-read-head');
    var back = el('div', 'a-read-back', svg(ICON.arrowLeft) + 'Back to inbox');
    back.onclick = function () { inboxEl.classList.remove('show-read'); selectedMsg = null; renderMessages(); };
    head.appendChild(back);
    head.appendChild(el('h2', 'a-read-subj', (topics[m.topic] || topics.other).label + ' enquiry'));
    var tagrow = el('div', 'a-read-tags');
    tagrow.appendChild(topicTag(m.topic));
    if (gym) tagrow.appendChild(el('span', 'a-gymtag', svg(ICON.mountain) + esc(gym.name)));
    head.appendChild(tagrow);

    var from = el('div', 'a-read-from');
    var av = el('div', 'a-read-av'); av.style.background = avatarFor(m); av.textContent = initials(m.name).toUpperCase();
    var who = el('div', 'a-read-who');
    who.innerHTML = '<div class="a-read-name">' + esc(m.name) + '</div>' +
      '<a class="a-read-email" href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>';
    from.appendChild(av); from.appendChild(who);
    from.appendChild(el('div', 'a-read-time', fmtMsgFull(m.ts)));
    head.appendChild(from);
    readEl.appendChild(head);

    var bodyWrap = el('div', 'a-read-bodywrap');
    var text = el('div', 'a-read-text'); text.textContent = m.body;
    bodyWrap.appendChild(text);
    readEl.appendChild(bodyWrap);

    var foot = el('div', 'a-read-foot');
    var reply = el('a', 'a-btn a-btn--primary');
    reply.href = 'mailto:' + m.email + '?subject=' + encodeURIComponent('Re: your message to Betabase');
    reply.innerHTML = svg(ICON.reply) + 'Reply';
    foot.appendChild(reply);

    var readToggle = el('button', 'a-btn a-btn--ghost');
    readToggle.innerHTML = svg(ICON.eye) + (m.read ? 'Mark unread' : 'Mark read');
    readToggle.onclick = function () { m.read = !m.read; renderMessages(); renderRead(m); };
    foot.appendChild(readToggle);

    foot.appendChild(el('span', 'spacer'));

    var arch = el('button', 'a-btn a-btn--ghost');
    arch.innerHTML = svg(m.archived ? ICON.unarchive : ICON.archive) + (m.archived ? 'Unarchive' : 'Archive');
    arch.onclick = function () {
      m.archived = !m.archived;
      toast(m.archived ? 'Message archived' : 'Message restored');
      if (m.archived && msgFilter !== 'archived') { closeRead(); } else { renderMessages(); renderRead(m); }
    };
    foot.appendChild(arch);

    var del = el('button', 'a-iconbtn is-danger'); del.innerHTML = svg(ICON.trash);
    del.title = 'Delete message'; del.setAttribute('aria-label', 'Delete message');
    del.onclick = function () {
      openConfirm('Delete this message?', 'It will be permanently removed from the inbox. This can’t be undone.',
        'Delete', function () {
          messages = messages.filter(function (x) { return x.id !== m.id; });
          toast('Message deleted'); closeRead();
        });
    };
    foot.appendChild(del);
    readEl.appendChild(foot);
  }

  function closeRead() {
    selectedMsg = null;
    inboxEl.classList.remove('show-read');
    renderMessages();
    renderRead(null);
  }

  function avatarFor(m) {
    // deterministic-ish color from name
    var s = 0; for (var i = 0; i < m.name.length; i++) s += m.name.charCodeAt(i);
    return D.avatars[s % D.avatars.length];
  }

  msgSearchEl.addEventListener('input', function () { msgQuery = msgSearchEl.value; renderMessages(); });
  $$('#a-msg-filter button').forEach(function (b) {
    b.onclick = function () {
      msgFilter = b.dataset.filter;
      $$('#a-msg-filter button').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderMessages();
    };
  });

  // ============================================================
  // GENERIC CONFIRM DIALOG
  // ============================================================
  var confirmOverlay = $('#a-confirm-overlay');
  var confirmAction = null;
  function openConfirm(title, msg, okLabel, onOk, okClass) {
    $('#a-confirm-title').textContent = title;
    $('#a-confirm-msg').textContent = msg;
    var ok = $('#a-confirm-ok');
    ok.textContent = okLabel || 'Confirm';
    ok.className = 'a-btn ' + (okClass || 'a-btn--danger');
    confirmAction = onOk;
    confirmOverlay.classList.add('is-open');
  }
  function closeConfirm() { confirmOverlay.classList.remove('is-open'); confirmAction = null; }
  $('#a-confirm-cancel').onclick = closeConfirm;
  $('#a-confirm-ok').onclick = function () { if (confirmAction) confirmAction(); closeConfirm(); };
  confirmOverlay.addEventListener('click', function (e) { if (e.target === confirmOverlay) closeConfirm(); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (confirmOverlay.classList.contains('is-open')) closeConfirm();
    else if (aaOverlay.classList.contains('is-open')) closeAddAdmin();
    else if (gymOverlay.classList.contains('is-open')) closeGymModal();
  });

  // ============================================================
  // TOAST
  // ============================================================
  var toastEl = $('#a-toast'), toastTimer = null;
  function toast(msg) {
    $('#a-toast-msg').textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  // ============================================================
  // INIT
  // ============================================================
  renderGyms();
  renderAdmins();
  renderMessages();
  renderRead(null);
  refreshBadges();
  setView('gyms');
})();
