/**
 * Araku Trails - Blog Client Scripts (blog.js)
 * Theme toggle (Light/Dark mode with persistence) & TOC toggle
 */

(function () {
  'use strict';

  // 1. Theme Management
  var THEME_KEY = 'araku_theme';
  
  function getPreferredTheme() {
    var stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    // Default to clean light mode matching Trails of Inju, or system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeToggleButtons(theme);
  }

  function updateThemeToggleButtons(theme) {
    var buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(function (btn) {
      var icon = btn.querySelector('i');
      var label = btn.querySelector('.theme-label');
      if (theme === 'dark') {
        if (icon) icon.className = 'fa-solid fa-sun';
        if (label) label.textContent = 'Light';
        btn.setAttribute('aria-label', 'Switch to light theme');
        btn.setAttribute('title', 'Switch to light theme');
      } else {
        if (icon) icon.className = 'fa-solid fa-moon';
        if (label) label.textContent = 'Dark';
        btn.setAttribute('aria-label', 'Switch to dark theme');
        btn.setAttribute('title', 'Switch to dark theme');
      }
    });
  }

  // Initialize theme on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    var currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    applyTheme(currentTheme);

    // Bind all theme toggle buttons
    var buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var activeTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(activeTheme);
      });
    });

    // 2. Table of Contents Toggle
    var tocToggleBtn = document.querySelector('.toc-toggle-btn');
    var tocList = document.querySelector('.toc-list');
    if (tocToggleBtn && tocList) {
      tocToggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isHidden = tocList.style.display === 'none';
        if (isHidden) {
          tocList.style.display = 'flex';
          tocToggleBtn.textContent = '[Hide]';
        } else {
          tocList.style.display = 'none';
          tocToggleBtn.textContent = '[Show]';
        }
      });
    }

    var tocHeader = document.querySelector('.toc-header');
    if (tocHeader && tocList && tocToggleBtn) {
      tocHeader.addEventListener('click', function () {
        var isHidden = tocList.style.display === 'none';
        if (isHidden) {
          tocList.style.display = 'flex';
          tocToggleBtn.textContent = '[Hide]';
        } else {
          tocList.style.display = 'none';
          tocToggleBtn.textContent = '[Show]';
        }
      });
    }
  });
})();
