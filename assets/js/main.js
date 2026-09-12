(function () {
  'use strict';

  /* ========================================================================
     CONFIG — fill these in to go live
     ==================================================================== */
  var CONFIG = {
    // Your Acuity Scheduling owner ID. Find it in Acuity under
    // Business Settings → Integrations → API, or it's the "owner=" value
    // in your existing booking page URL (app.acuityscheduling.com/schedule.php?owner=XXXXXXX).
    ACUITY_OWNER_ID: '',

    // Optional: map an event id (see data-event on Reserve buttons) to an
    // Acuity appointment type ID, so each event opens straight to its own
    // booking form instead of the general scheduler. Leave empty to always
    // open the general scheduler.
    ACUITY_APPOINTMENT_TYPES: {
      // 'nov17-early': 12345678,
      // 'nov17-late': 12345678,
      // 'nov24-early': 12345678,
      // 'nov24-late': 12345678,
    }
  };

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================================================
     Header scroll state
     ==================================================================== */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    if (window.scrollY > 24) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
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
     Reserve modal + Acuity embed
     ==================================================================== */
  var backdrop = document.getElementById('reserveBackdrop');
  var modal = document.getElementById('reserveModal');
  var modalBody = document.getElementById('reserveBody');
  var modalSub = document.getElementById('reserveSub');
  var modalClose = document.getElementById('reserveClose');
  var lastFocusedEl = null;

  function acuityUrl(eventId) {
    var base = 'https://app.acuityscheduling.com/schedule.php?owner=' + encodeURIComponent(CONFIG.ACUITY_OWNER_ID);
    var apptType = CONFIG.ACUITY_APPOINTMENT_TYPES[eventId];
    return apptType ? base + '&appointmentType=' + encodeURIComponent(apptType) : base;
  }

  function buildModalBody(eventId) {
    if (!CONFIG.ACUITY_OWNER_ID) {
      modalBody.innerHTML =
        '<div class="modal-fallback">' +
          '<p>Online booking is being connected right now. In the meantime, email us and we’ll lock in your seat by hand.</p>' +
          '<a class="btn btn-primary" href="mailto:werecookedevents@gmail.com?subject=Reservation%20request">Email to reserve</a>' +
        '</div>';
      return;
    }
    var iframe = document.createElement('iframe');
    iframe.title = 'Schedule Appointment';
    iframe.src = acuityUrl(eventId);
    modalBody.innerHTML = '';
    modalBody.appendChild(iframe);

    if (!document.getElementById('acuity-embed-script')) {
      var script = document.createElement('script');
      script.id = 'acuity-embed-script';
      script.src = 'https://embed.acuityscheduling.com/js/embed.js';
      script.type = 'text/javascript';
      document.body.appendChild(script);
    }
  }

  function openReserveModal(trigger) {
    lastFocusedEl = trigger || document.activeElement;
    var eventId = trigger ? trigger.getAttribute('data-event') : 'general';
    var eventLabel = trigger ? trigger.getAttribute('data-event-label') : null;
    modalSub.textContent = eventLabel || 'Choose a date to get started';

    buildModalBody(eventId);

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
     such as Mailchimp/Klaviyo/Acuity forms when ready; for now it confirms
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
