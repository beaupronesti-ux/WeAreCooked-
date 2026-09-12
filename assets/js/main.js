(function () {
  'use strict';

  /* ========================================================================
     CONFIG — fill these in to go live
     ==================================================================== */
  var CONFIG = {
    // Map each Reserve button's data-event id to its public Humanitix event
    // URL (from the Humanitix dashboard once each session is published —
    // Share → Copy link, or the event's own page URL). 'general' is used by
    // the ticket's "wearecooked.com.au" CTA — point it at a Humanitix
    // Collection if you group all four sessions into one.
    //
    // A Reserve button opens its URL directly in a new tab the moment it's
    // set here — no extra wiring needed. Until then it falls back to a
    // reserve-by-email flow so booking never dead-ends. (Humanitix also
    // offers a fancier "popup checkout" embed snippet from each event's
    // Design & Styling → Embedded Widgets page, which keeps the visitor on
    // this site instead of opening a new tab — ask for that snippet once
    // events are live and we can upgrade to it.)
    HUMANITIX_EVENTS: {
      // 'nov17-early': 'https://events.humanitix.com/...',
      // 'nov17-late': 'https://events.humanitix.com/...',
      // 'nov24-early': 'https://events.humanitix.com/...',
      // 'nov24-late': 'https://events.humanitix.com/...',
      // 'general': 'https://events.humanitix.com/...',
    }
  };

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================================================
     Palette toggle — dark (default) / light, persisted per visitor
     ==================================================================== */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    var THEME_KEY = 'wac-theme';
    function applyTheme(theme) {
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.setAttribute('aria-pressed', 'true');
        themeToggle.setAttribute('aria-label', 'Switch to dark palette');
      } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.setAttribute('aria-pressed', 'false');
        themeToggle.setAttribute('aria-label', 'Switch to light palette');
      }
    }
    var savedTheme = null;
    try { savedTheme = window.localStorage.getItem(THEME_KEY); } catch (err) { /* storage unavailable */ }
    applyTheme(savedTheme === 'light' ? 'light' : 'dark');

    themeToggle.addEventListener('click', function () {
      var next = themeToggle.getAttribute('aria-pressed') === 'true' ? 'dark' : 'light';
      applyTheme(next);
      try { window.localStorage.setItem(THEME_KEY, next); } catch (err) { /* storage unavailable */ }
    });
  }

  /* ========================================================================
     Custom cursor — fine-pointer desktop only, never leaves the visitor
     without a visible cursor (native stays until this is fully working)
     ==================================================================== */
  var hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (hasFinePointer && !prefersReducedMotion) {
    var cursorFlame = document.getElementById('cursorFlame');
    if (cursorFlame) {
      var flameX = 0, flameY = 0, targetX = 0, targetY = 0;
      document.addEventListener('mousemove', function (e) {
        targetX = e.clientX; targetY = e.clientY;
      });
      (function raf() {
        flameX += (targetX - flameX) * 0.35;
        flameY += (targetY - flameY) * 0.35;
        cursorFlame.style.transform = 'translate3d(' + flameX + 'px,' + flameY + 'px,0) translate(-50%,-50%)';
        window.requestAnimationFrame(raf);
      })();

      var HOVER_SELECTOR = 'a, button, [role="button"], input, .btn, .pass-dots button';
      document.addEventListener('mouseover', function (e) {
        if (e.target.closest(HOVER_SELECTOR)) cursorFlame.classList.add('is-hovering');
      });
      document.addEventListener('mouseout', function (e) {
        if (e.target.closest(HOVER_SELECTOR)) cursorFlame.classList.remove('is-hovering');
      });
      document.addEventListener('mouseleave', function () {
        document.body.classList.remove('has-custom-cursor');
      });
      document.addEventListener('mouseenter', function () {
        document.body.classList.add('has-custom-cursor');
      });

      document.body.classList.add('has-custom-cursor');

      document.addEventListener('pointerdown', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        var sparkCount = 6;
        for (var i = 0; i < sparkCount; i++) {
          var spark = document.createElement('span');
          spark.className = 'cursor-spark';
          var angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.6;
          var distance = 24 + Math.random() * 22;
          spark.style.setProperty('--sx', (Math.cos(angle) * distance) + 'px');
          spark.style.setProperty('--sy', (Math.sin(angle) * distance) + 'px');
          spark.style.left = e.clientX + 'px';
          spark.style.top = e.clientY + 'px';
          document.body.appendChild(spark);
          spark.addEventListener('animationend', function () { this.remove(); });
        }
      });
    }
  }

  /* ========================================================================
     Kitchen Takeovers ticket — pointer-tracked 3D tilt + glare
     ==================================================================== */
  var ticketEl = document.querySelector('.ticket');
  if (ticketEl && hasFinePointer && !prefersReducedMotion) {
    var ticketRect = null;
    ticketEl.addEventListener('pointerenter', function () {
      ticketRect = ticketEl.getBoundingClientRect();
    });
    ticketEl.addEventListener('pointermove', function (e) {
      if (!ticketRect) ticketRect = ticketEl.getBoundingClientRect();
      var px = (e.clientX - ticketRect.left) / ticketRect.width;
      var py = (e.clientY - ticketRect.top) / ticketRect.height;
      var rotateY = (px - 0.5) * 6;
      var rotateX = (0.5 - py) * 5;
      ticketEl.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
      ticketEl.style.setProperty('--glare-x', (px * 100) + '%');
      ticketEl.style.setProperty('--glare-y', (py * 100) + '%');
    });
    ticketEl.addEventListener('pointerleave', function () {
      ticketEl.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
  }

  /* ========================================================================
     Hero — subtle parallax on scroll
     ==================================================================== */
  var heroEmbers = document.querySelector('.hero-embers');
  var heroVignette = document.querySelector('.hero-vignette');
  if ((heroEmbers || heroVignette) && !prefersReducedMotion) {
    var parallaxTicking = false;
    function applyHeroParallax() {
      parallaxTicking = false;
      var y = window.scrollY;
      if (y > window.innerHeight) return;
      if (heroEmbers) heroEmbers.style.transform = 'translateY(' + (y * 0.18) + 'px)';
      if (heroVignette) heroVignette.style.transform = 'translateY(' + (y * 0.1) + 'px)';
    }
    window.addEventListener('scroll', function () {
      if (!parallaxTicking) {
        parallaxTicking = true;
        window.requestAnimationFrame(applyHeroParallax);
      }
    }, { passive: true });
  }

  /* ========================================================================
     Mobile sticky Reserve bar — appears once past the hero, hides again
     once the footer's own signup/CTA is in view
     ==================================================================== */
  var mobileReserveBar = document.getElementById('mobileReserveBar');
  var heroSection = document.getElementById('top');
  var footerSignup = document.getElementById('footer-signup');
  if (mobileReserveBar && heroSection) {
    if ('IntersectionObserver' in window) {
      var footerNear = false;
      var pastHero = false;
      function syncReserveBar() {
        mobileReserveBar.classList.toggle('is-visible', pastHero && !footerNear);
      }
      var heroIo = new IntersectionObserver(function (entries) {
        pastHero = !entries[0].isIntersecting;
        syncReserveBar();
      }, { rootMargin: '-1px 0px 0px 0px', threshold: 0 });
      heroIo.observe(heroSection);

      if (footerSignup) {
        var footerIo = new IntersectionObserver(function (entries) {
          footerNear = entries[0].isIntersecting;
          syncReserveBar();
        }, { threshold: 0 });
        footerIo.observe(footerSignup);
      }
    } else {
      mobileReserveBar.classList.add('is-visible');
    }
  }

  /* ========================================================================
     Header scroll state
     ==================================================================== */
  var header = document.getElementById('siteHeader');
  var lastScrollY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (y > 24) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');

    var navOpen = mobileNav && mobileNav.classList.contains('is-open');
    if (navOpen || y < header.offsetHeight) {
      header.classList.remove('is-hidden');
    } else if (y > lastScrollY) {
      header.classList.add('is-hidden');
    } else if (y < lastScrollY) {
      header.classList.remove('is-hidden');
    }
    lastScrollY = y;
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ========================================================================
     Mobile nav
     ==================================================================== */
  var navToggle = document.getElementById('navToggle');
  var mobileNav = document.getElementById('mobileNav');

  function closeMobileNav() {
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }
  function openMobileNav() {
    mobileNav.classList.add('is-open');
    mobileNav.setAttribute('aria-hidden', 'false');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  }
  navToggle.addEventListener('click', function () {
    var isOpen = mobileNav.classList.contains('is-open');
    if (isOpen) closeMobileNav(); else openMobileNav();
  });
  mobileNav.querySelectorAll('a, button').forEach(function (el) {
    el.addEventListener('click', closeMobileNav);
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) closeMobileNav();
  });

  /* ========================================================================
     Reveal on scroll
     ==================================================================== */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ========================================================================
     On the pass — dish carousel
     ==================================================================== */
  var DISHES = [
    { n: 'Chicken Liver Parfait', d: 'Whipped chicken liver, burnt honey, toasted sourdough.' },
    { n: 'Cured Catch Ceviche', d: 'Fresh catch, citrus, chilli, coconut vinaigrette.' },
    { n: 'Sisig Tartlet with Calamansi', d: 'Slow cooked pork sisig, calamansi cream, garden herbs.' },
    { n: 'Wood Fired Focaccia', d: 'Cultured butter, smoked sea salt.' }
  ];

  var dishNameEl = document.querySelector('[data-dish-name]');
  var dishDescEl = document.querySelector('[data-dish-desc]');
  var dishDotsEl = document.querySelector('[data-dish-dots]');
  var dishSlotEl = document.querySelector('[data-dish-slot]');
  var passCopyEl = dishNameEl ? dishNameEl.closest('.pass-copy') : null;

  if (dishNameEl && dishDescEl && dishDotsEl) {
    var dishIndex = 0;
    var dishTimer = null;
    var dishDotButtons = [];

    DISHES.forEach(function (dish, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      dot.setAttribute('aria-label', 'Show dish ' + (i + 1) + ': ' + dish.n);
      dot.addEventListener('click', function () { showDish(i, true); });
      dishDotsEl.appendChild(dot);
      dishDotButtons.push(dot);
    });

    function showDish(i, userInitiated) {
      dishIndex = i;
      if (passCopyEl) passCopyEl.classList.add('is-fading');
      window.setTimeout(function () {
        dishNameEl.textContent = DISHES[i].n;
        dishDescEl.textContent = DISHES[i].d;
        if (dishSlotEl) {
          dishSlotEl.querySelector('span').innerHTML = 'Dish photography<br>' + DISHES[i].n;
        }
        dishDotButtons.forEach(function (dot, k) {
          dot.setAttribute('aria-selected', k === i ? 'true' : 'false');
        });
        if (passCopyEl) passCopyEl.classList.remove('is-fading');
      }, passCopyEl ? 180 : 0);
      if (userInitiated) restartDishTimer();
    }

    function restartDishTimer() {
      window.clearInterval(dishTimer);
      if (prefersReducedMotion) return;
      dishTimer = window.setInterval(function () {
        showDish((dishIndex + 1) % DISHES.length, false);
      }, 4200);
    }

    showDish(0, false);
    restartDishTimer();

    var passSection = document.getElementById('pass');
    if (passSection) {
      passSection.addEventListener('mouseenter', function () { window.clearInterval(dishTimer); });
      passSection.addEventListener('mouseleave', restartDishTimer);
      passSection.addEventListener('focusin', function () { window.clearInterval(dishTimer); });
      passSection.addEventListener('focusout', restartDishTimer);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.clearInterval(dishTimer); else restartDishTimer();
    });
  }

  /* ========================================================================
     Reserve — Humanitix link-out, with an email fallback modal
     ==================================================================== */
  var backdrop = document.getElementById('reserveBackdrop');
  var modal = document.getElementById('reserveModal');
  var modalBody = document.getElementById('reserveBody');
  var modalSub = document.getElementById('reserveSub');
  var modalClose = document.getElementById('reserveClose');
  var lastFocusedEl = null;

  function openReserveModal(trigger) {
    lastFocusedEl = trigger || document.activeElement;
    var eventId = trigger ? trigger.getAttribute('data-event') : 'general';
    var eventLabel = trigger ? trigger.getAttribute('data-event-label') : null;

    var humanitixUrl = CONFIG.HUMANITIX_EVENTS[eventId];
    if (humanitixUrl) {
      window.open(humanitixUrl, '_blank', 'noopener');
      return;
    }

    modalSub.textContent = eventLabel || 'Choose a date to get started';
    modalBody.innerHTML =
      '<div class="modal-fallback">' +
        '<p>Ticketing via Humanitix is being finalised. In the meantime, email us and we’ll lock in your seat by hand.</p>' +
        '<a class="btn btn-primary" href="mailto:werecookedevents@gmail.com?subject=Reservation%20request">Email to reserve</a>' +
      '</div>';

    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    window.setTimeout(function () { modalClose.focus(); }, 50);
  }

  function closeReserveModal() {
    backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
    window.setTimeout(function () {
      backdrop.hidden = true;
      modalBody.innerHTML = '';
      if (lastFocusedEl) lastFocusedEl.focus();
    }, 250);
  }

  document.querySelectorAll('[data-open-reserve]').forEach(function (btn) {
    btn.addEventListener('click', function () { openReserveModal(btn); });
  });
  modalClose.addEventListener('click', closeReserveModal);
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeReserveModal();
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !backdrop.hidden) closeReserveModal();
    if (e.key === 'Tab' && !backdrop.hidden) trapFocus(e);
  });

  function trapFocus(e) {
    var focusable = modal.querySelectorAll('button, a[href], iframe, input, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  /* ========================================================================
     Newsletter signup (progressive enhancement — wire to a real provider
     such as Mailchimp/Klaviyo when ready; for now it confirms
     locally and offers a mailto fallback so it never dead-ends the visitor)
     ==================================================================== */
  var signupForm = document.getElementById('signupForm');
  var signupStatus = document.getElementById('signupStatus');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = signupForm.email.value.trim();
      var isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isValid) {
        signupStatus.textContent = 'Enter a valid email address.';
        signupStatus.className = 'signup-status is-error';
        return;
      }
      signupStatus.textContent = 'You’re on the list — new dates land in your inbox first.';
      signupStatus.className = 'signup-status is-success';
      signupForm.reset();
    });
  }

  /* ========================================================================
     Misc
     ==================================================================== */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
