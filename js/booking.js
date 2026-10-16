/**
 * js/booking.js — Shared Booking Modal & API Submission Logic
 * Used across the homepage and all tour pages.
 * Handles:
 * - ARIA modal dialog state (role="dialog", aria-modal="true")
 * - Focus trapping and Escape key closing
 * - Server submission to /api/bookings (Cloudflare D1)
 * - Safe notification forwarding without exposing master secrets
 * - Touch-friendly form inputs
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingModalForm');
    const modalPackageTitle = document.getElementById('modalPackageTitle');
    const modalSelectedPackage = document.getElementById('modalSelectedPackage');
    const modalTourCategory = document.getElementById('modalTourCategory');
    const bookingModalContent = document.getElementById('bookingModalContent');
    const bookingSuccessBox = document.getElementById('bookingSuccessBox');
    const btnBookingSubmit = document.getElementById('btnBookingSubmit');
    const modalDate = document.getElementById('modalDate');

    let lastActiveElement = null;

    // Minimum date is today
    if (modalDate) {
      modalDate.min = new Date().toISOString().split('T')[0];
    }

    function openBookingModal(pkgName) {
      if (!bookingModal) return;
      lastActiveElement = document.activeElement;

      const title = pkgName && pkgName !== 'General' && pkgName !== 'General Booking' ? `Book: ${pkgName}` : 'Inquire & Book a Trail';
      if (modalPackageTitle) modalPackageTitle.textContent = title;
      if (modalSelectedPackage) modalSelectedPackage.value = pkgName || 'General Tour Inquiry';

      if (modalTourCategory && pkgName) {
        for (let i = 0; i < modalTourCategory.options.length; i++) {
          if (modalTourCategory.options[i].value.toLowerCase().includes(pkgName.toLowerCase()) ||
              pkgName.toLowerCase().includes(modalTourCategory.options[i].value.toLowerCase())) {
            modalTourCategory.selectedIndex = i;
            break;
          }
        }
      }

      if (bookingModalContent) bookingModalContent.style.display = 'block';
      if (bookingSuccessBox) bookingSuccessBox.style.display = 'none';
      if (btnBookingSubmit) {
        btnBookingSubmit.disabled = false;
        btnBookingSubmit.textContent = 'Submit Booking Request';
      }

      bookingModal.classList.add('active');
      bookingModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      const firstInput = bookingModal.querySelector('input:not([type="hidden"]), select, button');
      if (firstInput) setTimeout(() => firstInput.focus(), 50);
    }

    function closeBookingModal() {
      if (!bookingModal) return;
      bookingModal.classList.remove('active');
      bookingModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (bookingForm) bookingForm.reset();
      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        lastActiveElement.focus();
      }
    }

    window.openBookingModal = openBookingModal;
    window.closeBookingModal = closeBookingModal;

    if (bookingModal) {
      bookingModal.addEventListener('click', function (e) {
        if (e.target === bookingModal || e.target.closest('[data-action="close-booking-modal"]')) {
          closeBookingModal();
        }
      });

      document.addEventListener('keydown', function (e) {
        if (!bookingModal.classList.contains('active')) return;

        if (e.key === 'Escape') {
          e.preventDefault();
          closeBookingModal();
          return;
        }

        // Focus trap
        if (e.key === 'Tab') {
          const focusables = bookingModal.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }

    // Process Booking API & Dispatch
    async function submitBooking(name, phone, travelDate, chosenPackage, notes) {
      const emailRecipient = 'krsh2852@gmail.com';

      // 1. Submit to Cloudflare D1
      try {
        await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            phone: phone,
            travel_date: travelDate,
            package: chosenPackage,
            channel: 'Web Booking Modal',
            status: 'New',
            notes: notes || `Direct booking request for ${chosenPackage}`
          })
        });
      } catch (err) {
        console.warn('Booking API save notice:', err);
      }

      // 2. Dispatch Email via FormSubmit AJAX (with timeout)
      try {
        const emailPromise = fetch('https://formsubmit.co/ajax/' + emailRecipient, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            name: name,
            phone: phone,
            travel_date: travelDate,
            package: chosenPackage,
            notes: notes,
            _subject: `[Araku Trails Booking] New Inbound Request: ${name} (${chosenPackage})`,
            _template: 'table'
          })
        });
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3500));
        await Promise.race([emailPromise, timeoutPromise]);
      } catch (err) {
        console.warn('Email dispatch notice:', err);
      }
    }

    if (bookingForm) {
      bookingForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('modalName').value.trim();
        const phone = document.getElementById('modalPhone').value.trim();
        const date = document.getElementById('modalDate').value;
        const notes = document.getElementById('modalNotes') ? document.getElementById('modalNotes').value.trim() : '';
        const categorySelect = document.getElementById('modalTourCategory');
        const selectedPkg = (categorySelect && categorySelect.value) ? categorySelect.value : (modalSelectedPackage ? modalSelectedPackage.value : 'General Tour Inquiry');

        if (btnBookingSubmit) {
          btnBookingSubmit.disabled = true;
          btnBookingSubmit.textContent = 'Submitting Request...';
        }

        await submitBooking(name, phone, date, selectedPkg, notes);

        // Show confirmation view with XSS-safe DOM node creation
        if (bookingModalContent) bookingModalContent.style.display = 'none';
        if (bookingSuccessBox) {
          const msgEl = document.getElementById('bookingSuccessMessage');
          if (msgEl) {
            msgEl.replaceChildren();
            msgEl.appendChild(document.createTextNode('Thank you, '));
            const strongName = document.createElement('strong');
            strongName.textContent = name;
            msgEl.appendChild(strongName);
            msgEl.appendChild(document.createTextNode('! Your request for '));
            const strongPkg = document.createElement('strong');
            strongPkg.textContent = selectedPkg;
            msgEl.appendChild(strongPkg);
            msgEl.appendChild(document.createTextNode(' on '));
            const strongDate = document.createElement('strong');
            strongDate.textContent = date;
            msgEl.appendChild(strongDate);
            msgEl.appendChild(document.createTextNode(' has been received. Our team will contact you directly on '));
            const strongPhone = document.createElement('strong');
            strongPhone.textContent = phone;
            msgEl.appendChild(strongPhone);
            msgEl.appendChild(document.createTextNode(' via call or WhatsApp shortly.'));
          }
          bookingSuccessBox.style.display = 'block';
        }
      });
    }

    // Global click delegation for [data-book-pkg] triggers
    document.addEventListener('click', function (e) {
      const bookBtn = e.target.closest('[data-book-pkg]');
      if (bookBtn) {
        e.preventDefault();
        const pkgName = bookBtn.getAttribute('data-book-pkg');
        openBookingModal(pkgName);
      }
    });
  });
})();
