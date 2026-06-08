/* ============================================================
   BETABASE — /admin seed data
   In-memory only (prototype). Exposed on window.ADMIN_DATA.
   ============================================================ */
(function () {
  'use strict';

  var IMG = {
    exterior: 'assets/gym-exterior.png',
    hero: 'assets/climbing-wall-hero.png',
    sending: 'assets/sending-climb.png',
    filming: 'assets/filming-climb.png'
  };

  // ---- avatar palette (hold colors, dark ink kept readable) ----
  var AV = ['#C79F65','#4E9D5B','#3E6FB3','#7E5CA8','#D85B9A','#2E93AE','#E5743A','#D6453B'];

  // ---- Gyms ----
  var gyms = [
    { id: 'summit',     name: 'Summit Climbing',      city: 'Portland, OR',        chips: ['Boulder','Lead','Top-rope'], routes: 142, status: 'live',     img: IMG.exterior },
    { id: 'basecamp',   name: 'Basecamp Boulders',    city: 'Denver, CO',          chips: ['Boulder'],                   routes: 98,  status: 'live',     img: IMG.hero },
    { id: 'crag',       name: 'The Crag House',       city: 'Austin, TX',          chips: ['Boulder','Top-rope'],        routes: 176, status: 'live',     img: IMG.sending },
    { id: 'ironside',   name: 'Ironside Climbing',    city: 'Seattle, WA',         chips: ['Lead','Top-rope'],           routes: 64,  status: 'live',     img: IMG.filming },
    { id: 'granite',    name: 'Granite Works',        city: 'Salt Lake City, UT',  chips: ['Boulder','Lead'],            routes: 121, status: 'live',     img: IMG.exterior },
    { id: 'northpoint', name: 'Northpoint Bouldering',city: 'Brooklyn, NY',        chips: ['Boulder'],                   routes: 0,   status: 'draft',    img: IMG.hero },
    { id: 'redpoint',   name: 'Redpoint Collective',  city: 'Boulder, CO',         chips: ['Boulder','Lead','Top-rope'], routes: 154, status: 'live',     img: IMG.sending },
    { id: 'foundry',    name: 'The Foundry',          city: 'Chicago, IL',         chips: ['Boulder','Top-rope'],        routes: 109, status: 'archived', img: IMG.filming },
    { id: 'tidewater',  name: 'Tidewater Climbing',   city: 'Richmond, VA',        chips: ['Boulder','Top-rope'],        routes: 0,   status: 'draft',    img: IMG.exterior }
  ];

  // ---- Betabase users (the directory you assign admins from) ----
  var users = [
    { id: 'u1',  name: 'Sam Hill',        username: 'samhill',     email: 'sam@summitclimbing.com',   av: AV[0] },
    { id: 'u2',  name: 'Maya Okafor',     username: 'mayaok',      email: 'maya.okafor@gmail.com',    av: AV[1] },
    { id: 'u3',  name: 'Devon Reyes',     username: 'dreyes',      email: 'devon@basecampboulders.co',av: AV[2] },
    { id: 'u4',  name: 'Priya Nadkarni',  username: 'priyaclimbs', email: 'priya.n@craghouse.com',    av: AV[3] },
    { id: 'u5',  name: 'Jonas Wexler',    username: 'jwex',        email: 'jonas@ironside.io',        av: AV[4] },
    { id: 'u6',  name: 'Leah Brandt',     username: 'leahb',       email: 'leah.brandt@graniteworks.com', av: AV[5] },
    { id: 'u7',  name: 'Theo Marchetti',  username: 'theomarch',   email: 'theo@redpointco.org',      av: AV[6] },
    { id: 'u8',  name: 'Camila Duarte',   username: 'camclimbs',   email: 'camila.duarte@gmail.com',  av: AV[7] },
    { id: 'u9',  name: 'Ben Sorensen',    username: 'bsorensen',   email: 'ben@summitclimbing.com',   av: AV[1] },
    { id: 'u10', name: 'Aisha Rahman',    username: 'aisharah',    email: 'aisha.r@redpointco.org',   av: AV[3] },
    { id: 'u11', name: 'Marcus Webb',     username: 'mwebb',       email: 'marcus.webb@gmail.com',    av: AV[2] },
    { id: 'u12', name: 'Hana Kobayashi',  username: 'hanak',       email: 'hana@graniteworks.com',    av: AV[5] },
    { id: 'u13', name: 'Eli Fontaine',    username: 'elifon',      email: 'eli.fontaine@gmail.com',   av: AV[6] },
    { id: 'u14', name: 'Nora Vance',      username: 'noravance',   email: 'nora@tidewaterclimbing.com', av: AV[7] }
  ];

  // ---- admin assignments: gymId -> [userId] ----
  var adminships = [
    { gymId: 'summit',     userId: 'u1' },
    { gymId: 'summit',     userId: 'u9' },
    { gymId: 'basecamp',   userId: 'u3' },
    { gymId: 'crag',       userId: 'u4' },
    { gymId: 'ironside',   userId: 'u5' },
    { gymId: 'granite',    userId: 'u6' },
    { gymId: 'granite',    userId: 'u12' },
    { gymId: 'redpoint',   userId: 'u7' },
    { gymId: 'redpoint',   userId: 'u10' },
    { gymId: 'foundry',    userId: 'u2' }
    // northpoint + tidewater intentionally have 0 admins (fresh drafts)
  ];

  // ---- topics for the contact form ----
  var topics = {
    general:     { label: 'General',     color: '#2E93AE' },
    add_gym:     { label: 'Add my gym',  color: '#4E9D5B' },
    bug:         { label: 'Bug report',  color: '#D6453B' },
    partnership: { label: 'Partnership', color: '#7E5CA8' },
    other:       { label: 'Other',       color: '#8593A2' }
  };

  // ---- contact-form messages (newest first) ----
  var messages = [
    { id: 'm1', name: 'Hannah Cho', email: 'hannah.cho@gmail.com', topic: 'add_gym', gymId: null,
      ts: '2026-06-07T09:12:00', read: false, archived: false,
      body: "Hi! I manage Vertical Edge in Madison, WI and we'd love to get our gym on Betabase. We're a bouldering + top-rope facility with about 130 routes that we reset every six weeks.\n\nWhat's the process for getting listed and who from our staff should be set up as admins? Happy to send over photos and our wall layout.\n\nThanks,\nHannah" },
    { id: 'm2', name: 'Marcus Webb', email: 'marcus.webb@gmail.com', topic: 'bug', gymId: 'summit',
      ts: '2026-06-07T08:40:00', read: false, archived: false,
      body: "The grade on \"Crimp Theory\" at Summit Climbing shows as V5 on the route page but V4 in the search filter results. Minor, but it threw me off when I was looking for projects.\n\nReproduced on iOS Safari and on desktop Chrome. Love the app otherwise — the beta videos have completely changed how I work my projects." },
    { id: 'm3', name: 'Priya Nadkarni', email: 'priya.n@craghouse.com', topic: 'general', gymId: 'crag',
      ts: '2026-06-06T17:25:00', read: false, archived: false,
      body: "Quick question — is there a way to bulk-import our route list at The Crag House? We reset 40+ problems at once and adding them one at a time in the manager is slow. A CSV upload would save our setters a ton of time.\n\nAppreciate any guidance." },
    { id: 'm4', name: 'Dana Whitfield', email: 'dana.whitfield@outlook.com', topic: 'partnership', gymId: null,
      ts: '2026-06-06T13:02:00', read: true, archived: false,
      body: "Hello Betabase team,\n\nI run partnerships at HoldFast, a climbing-hold manufacturer. We're interested in exploring a co-marketing arrangement — featuring Betabase gyms that use our holds, and cross-promoting to our network.\n\nIs there someone on your side who handles partnerships? Would love to set up a call." },
    { id: 'm5', name: 'Tyler Brooks', email: 'tbrooks@gmail.com', topic: 'general', gymId: null,
      ts: '2026-06-06T10:48:00', read: true, archived: false,
      body: "Just wanted to say the new beta video player is fantastic. Slow-motion scrubbing on the crux moves is exactly what I needed. Keep it up!" },
    { id: 'm6', name: 'Sofia Mendez', email: 'sofia.mendez@gmail.com', topic: 'bug', gymId: 'redpoint',
      ts: '2026-06-05T19:33:00', read: true, archived: false,
      body: "I tried to favorite Redpoint Collective as my home gym but the heart button doesn't seem to save — it resets when I reload the page. Using the latest app on Android.\n\nNot urgent but figured you'd want to know." },
    { id: 'm7', name: 'Owen Park', email: 'owen.park@verticalworld.com', topic: 'add_gym', gymId: null,
      ts: '2026-06-05T14:10:00', read: true, archived: false,
      body: "We're opening a new gym, Vertical World North, in Tacoma this fall and want to launch with Betabase from day one. How early can we get a draft listing set up so we can pre-load routes before opening day?" },
    { id: 'm8', name: 'Rachel Imani', email: 'rachel.imani@gmail.com', topic: 'other', gymId: null,
      ts: '2026-06-04T21:57:00', read: true, archived: false,
      body: "Is there an option to export my send history? I've logged almost two years of climbs and would love a CSV for my own tracking spreadsheet. Thanks!" },
    { id: 'm9', name: 'Greg Halloran', email: 'greg.h@basecampboulders.co', topic: 'general', gymId: 'basecamp',
      ts: '2026-06-04T11:20:00', read: true, archived: false,
      body: "Can we add a second admin for Basecamp Boulders? Our new head setter, Devon, should be able to manage the route list. His username is dreyes." },
    { id: 'm10', name: 'Anonymous', email: 'no-reply@betabase.app', topic: 'other', gymId: null,
      ts: '2026-06-03T08:05:00', read: true, archived: true,
      body: "Test message from the contact form QA pass. Please ignore / archive." },
    { id: 'm11', name: 'Lena Fischer', email: 'lena.fischer@gmail.com', topic: 'partnership', gymId: null,
      ts: '2026-06-02T16:44:00', read: true, archived: true,
      body: "We're a climbing media outlet interested in writing about Betabase. Who handles press inquiries?" }
  ];

  window.ADMIN_DATA = {
    gyms: gyms,
    users: users,
    adminships: adminships,
    topics: topics,
    messages: messages,
    avatars: AV
  };
})();
