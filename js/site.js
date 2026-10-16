/**
 * js/site.js — Site Interaction & Mobile-First Controls
 * - Navigation header scroll state
 * - Accessible mobile slide-in sheet drawer with Escape handler & focus trapping
 * - Hero slider with portrait/landscape art direction, touch swipe & prefers-reduced-motion check
 * - Sticky bottom action bar reveal on scroll up, hide on scroll down
 * - Scroll-reveal animations via IntersectionObserver
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // 1. Current Year Footer
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // 2. Mobile Drawer Controls
    const drawerOverlay = document.getElementById('mobileDrawerOverlay');
    const drawerOpenBtn = document.getElementById('btnMobileMenuOpen');
    const drawerCloseBtn = document.getElementById('btnMobileMenuClose');
    let lastActiveElement = null;

    function openDrawer() {
      if (!drawerOverlay) return;
      lastActiveElement = document.activeElement;
      drawerOverlay.classList.add('active');
      drawerOverlay.setAttribute('aria-hidden', 'false');
      if (drawerOpenBtn) drawerOpenBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';

      const firstFocusable = drawerOverlay.querySelector('a, button');
      if (firstFocusable) setTimeout(() => firstFocusable.focus(), 100);
    }

    function closeDrawer() {
      if (!drawerOverlay) return;
      drawerOverlay.classList.remove('active');
      drawerOverlay.setAttribute('aria-hidden', 'true');
      if (drawerOpenBtn) drawerOpenBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        lastActiveElement.focus();
      }
    }

    if (drawerOpenBtn) drawerOpenBtn.addEventListener('click', openDrawer);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);

    if (drawerOverlay) {
      drawerOverlay.addEventListener('click', function (e) {
        if (e.target === drawerOverlay || e.target.closest('[data-action="close-drawer"]')) {
          closeDrawer();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (drawerOverlay && drawerOverlay.classList.contains('active')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDrawer();
        }
      }
    });

    // 3. Sticky Bottom Bar Reveal on Scroll-Up / Hide on Scroll-Down
    const stickyBottomBar = document.getElementById('stickyBottomBar');
    let lastScrollY = window.scrollY;

    if (stickyBottomBar) {
      window.addEventListener('scroll', function () {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 120) {
          stickyBottomBar.classList.add('hidden'); // Scrolling down
        } else {
          stickyBottomBar.classList.remove('hidden'); // Scrolling up
        }
        lastScrollY = currentScrollY;
      }, { passive: true });
    }

    // 4. Hero Slider with Reduced-Motion Awareness & Pause/Play
    const heroSlides = document.querySelectorAll('.hero-slide-item');
    const heroDots = document.querySelectorAll('.hero-dot-btn');
    const heroTitle = document.getElementById('heroTitle');
    const heroEyebrow = document.getElementById('heroEyebrow');
    const heroDesc = document.getElementById('heroDesc');
    const heroPauseBtn = document.getElementById('heroPauseBtn');
    const heroLiveRegion = document.getElementById('heroLiveRegion');

    const heroData = [
      {
        eyebrow: "Community-Guided • Eastern Ghats",
        title: "Walk the Ridge Trails with the People Who Call Them Home",
        desc: "Lesser-visited forest paths, heirloom Araku coffee, and living tribal heritage in Andhra Pradesh's Eastern Ghats — hosted directly by local indigenous guides."
      },
      {
        eyebrow: "Ocean of Clouds • Vanjangi Ridge (3,400 FT)",
        title: "Witness Sunrise Over the Mist of Vanjangi Hills",
        desc: "Ascend the mountain dawn trail above a vast white sea of clouds with experienced community navigators who know every mountain turn."
      },
      {
        eyebrow: "Village Ethno-Tourism • Forest Traditions",
        title: "Heirloom Millets, Dhimsa Drums & Forest Homestays",
        desc: "Sit with village elders around the woodfire, taste traditional bamboo-steamed cuisine, and experience respectful, community-owned hospitality."
      }
    ];

    let currentSlide = 0;
    let isPaused = false;
    let autoInterval = null;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function renderSlide(index) {
      if (!heroSlides.length) return;
      heroSlides.forEach((slide, idx) => {
        slide.classList.toggle('active', idx === index);
      });
      heroDots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === index);
        dot.setAttribute('aria-pressed', idx === index ? 'true' : 'false');
      });

      if (heroData[index]) {
        if (heroEyebrow) heroEyebrow.textContent = heroData[index].eyebrow;
        if (heroTitle) heroTitle.textContent = heroData[index].title;
        if (heroDesc) heroDesc.textContent = heroData[index].desc;
        if (heroLiveRegion) {
          heroLiveRegion.textContent = `Showing slide ${index + 1}: ${heroData[index].title}`;
        }
      }
      currentSlide = index;
    }

    function nextHeroSlide() {
      const nextIndex = (currentSlide + 1) % heroSlides.length;
      renderSlide(nextIndex);
    }

    function startAutoSlide() {
      if (prefersReducedMotion || isPaused || heroSlides.length <= 1) return;
      clearInterval(autoInterval);
      autoInterval = setInterval(nextHeroSlide, 6500);
    }

    if (!prefersReducedMotion && heroSlides.length > 1) {
      startAutoSlide();
    }

    if (heroPauseBtn) {
      heroPauseBtn.addEventListener('click', function () {
        isPaused = !isPaused;
        if (isPaused) {
          clearInterval(autoInterval);
          heroPauseBtn.innerHTML = '<span class="icon">&#9658;</span>'; // Play icon
          heroPauseBtn.setAttribute('aria-label', 'Resume carousel auto-advance');
        } else {
          startAutoSlide();
          heroPauseBtn.innerHTML = '<span class="icon">&#10074;&#10074;</span>'; // Pause icon
          heroPauseBtn.setAttribute('aria-label', 'Pause carousel auto-advance');
        }
      });
    }

    heroDots.forEach((dot, idx) => {
      dot.addEventListener('click', function () {
        renderSlide(idx);
        if (!isPaused) startAutoSlide();
      });
    });

    // Mobile Swipe for Hero
    const heroSection = document.getElementById('hero');
    let touchStartX = 0;
    if (heroSection) {
      heroSection.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].clientX;
      }, { passive: true });

      heroSection.addEventListener('touchend', function (e) {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) {
          renderSlide((currentSlide + 1) % heroSlides.length);
          if (!isPaused) startAutoSlide();
        } else if (touchEndX - touchStartX > 50) {
          renderSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
          if (!isPaused) startAutoSlide();
        }
      }, { passive: true });
    }

    // 5. Scroll Reveal with IntersectionObserver (Subtle 12px rise)
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
      const revealElements = document.querySelectorAll('.reveal-on-scroll');
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -40px 0px', threshold: 0.1 });

      revealElements.forEach(el => observer.observe(el));
    }
  });
})();
