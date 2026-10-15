// js/tour.js
// Shared client-side logic for Araku Trails Tour Detail Pages
// - Mobile Navigation Drawer toggle
// - Accessible Booking Modal with ARIA dialog, focus trapping, Escape-to-close
// - D1 API booking submission (/api/bookings) with FormSubmit email fallback and WhatsApp redirect

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // 1. Footer Year
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }

    // 2. Minimum Booking Date (today)
    const dateInput = document.getElementById('modalDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
    }

    // 3. Mobile Sidebar Navigation Drawer
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const appSidebar = document.getElementById('appSidebar');
    if (mobileMenuBtn && appSidebar) {
      mobileMenuBtn.addEventListener('click', function () {
        const isOpen = appSidebar.classList.toggle('open');
        mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // 4. Modal Dialog Accessibility & State Management
    const bookingModal = document.getElementById('bookingModal');
    const modalPackageTitle = document.getElementById('modalPackageTitle');
    const modalSelectedPackage = document.getElementById('modalSelectedPackage');
    const modalForm = bookingModal ? bookingModal.querySelector('form') : null;
    let lastActiveElement = null;

    function openBookingModal(pkgName) {
      if (!bookingModal) return;
      lastActiveElement = document.activeElement;

      if (modalPackageTitle) {
        modalPackageTitle.textContent = pkgName ? `Book: ${pkgName}` : "Book Your Tour";
      }
      if (modalSelectedPackage && pkgName) {
        modalSelectedPackage.value = pkgName;
      }

      bookingModal.classList.add('active');
      bookingModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Focus first input
      const firstInput = bookingModal.querySelector('input:not([type="hidden"]), button, select');
      if (firstInput) {
        setTimeout(function () { firstInput.focus(); }, 50);
      }
    }

    function closeBookingModal() {
      if (!bookingModal) return;
      bookingModal.classList.remove('active');
      bookingModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        lastActiveElement.focus();
      }
    }

    // Expose open/close functions globally for inline onclick handlers if present
    window.openBookingModal = openBookingModal;
    window.closeBookingModal = closeBookingModal;

    // Overlay click to close
    if (bookingModal) {
      bookingModal.addEventListener('click', function (e) {
        if (e.target === bookingModal || e.target.getAttribute('data-action') === 'close-booking-modal') {
          closeBookingModal();
        }
      });

      // Escape key to close modal & Focus Trap
      document.addEventListener('keydown', function (e) {
        if (!bookingModal.classList.contains('active')) return;

        if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          closeBookingModal();
          return;
        }

        // Trap focus inside modal
        if (e.key === 'Tab') {
          const focusables = bookingModal.querySelectorAll(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;

          const firstEl = focusables[0];
          const lastEl = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      });
    }

    // Close button trigger delegation
    document.querySelectorAll('[data-action="close-booking-modal"], .modal-close').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        closeBookingModal();
      });
    });

    // 5. Booking Dispatch (D1 API + FormSubmit Email + WhatsApp Redirect)
    async function processBookingNotification(name, mobile, date, packageChoice) {
      const emailRecipient = "krsh2852@gmail.com";
      const targetPhone = "919494177921";
      const messageContent = `*New Booking Request - Araku Trails*\n\n` +
        `*Customer Name:* ${name}\n` +
        `*Mobile Number:* ${mobile}\n` +
        `*Travel Date:* ${date}\n` +
        `*Package / Tour:* ${packageChoice}\n\n` +
        `Submitted via arakutrails.com tour portal`;

      // 1. Submit to D1 Database via Cloudflare Pages Function
      try {
        await fetch("/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            name: name,
            phone: mobile,
            date: date,
            package: packageChoice,
            channel: "Tour Detail Page",
            status: "New",
            notes: "Reservation submitted via tour detail page for " + packageChoice
          })
        });
      } catch (err) {
        console.warn("D1 booking submission notice:", err);
      }

      // 2. Dispatch Email via FormSubmit AJAX (with 3.5s timeout race)
      try {
        const emailPromise = fetch("https://formsubmit.co/ajax/" + emailRecipient, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            name: name,
            phone: mobile,
            travel_date: date,
            package: packageChoice,
            channel: "Tour Detail Page",
            _subject: `[Araku Trails Booking] ${name} (${packageChoice})`,
            _template: "table"
          })
        });
        const timeoutPromise = new Promise(function (resolve) { setTimeout(resolve, 3500); });
        await Promise.race([emailPromise, timeoutPromise]);
      } catch (err) {
        console.warn("Email dispatch notice:", err);
      }

      // 3. Open WhatsApp for instant customer confirmation
      const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageContent)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }

    // 6. Handle Form Submit
    if (modalForm) {
      modalForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const submitBtn = modalForm.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

        const nameInput = document.getElementById('modalName');
        const phoneInput = document.getElementById('modalPhone');
        const dateInput = document.getElementById('modalDate');

        const name = nameInput ? nameInput.value.trim() : '';
        const mobile = phoneInput ? phoneInput.value.trim() : '';
        const date = dateInput ? dateInput.value : '';
        const pkg = (modalSelectedPackage && modalSelectedPackage.value) ? modalSelectedPackage.value : 'Araku Tour';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        }

        try {
          await processBookingNotification(name, mobile, date, pkg);
          alert(`Thank you, ${name}! Your booking request for "${pkg}" on ${date} has been sent successfully. Our team will contact you shortly via call/WhatsApp.`);
          closeBookingModal();
          modalForm.reset();
        } catch (err) {
          console.error("Booking submission error:", err);
          alert("We received your request, and our team will get in touch shortly.");
          closeBookingModal();
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          }
        }
      });
    }
  });
})();
