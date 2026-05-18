// FAQ toggle
function toggleFaq(item) {
  const answer = item.querySelector('.faq-answer');
  const icon = item.querySelector('.faq-icon');
  const isOpen = answer.style.display === 'block';
  document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');
  document.querySelectorAll('.faq-icon').forEach(i => {
    i.textContent = '+';
    i.style.background = 'var(--off-white)';
    i.style.color = 'var(--navy)';
  });
  if (!isOpen) {
    answer.style.display = 'block';
    icon.textContent = '−';
    icon.style.background = 'var(--navy)';
    icon.style.color = 'white';
  }
}

// Sticky nav
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
});

// Reveal on scroll
if ('IntersectionObserver' in window) {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => observer.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.add('visible');
  });
}

// Smooth scroll for same-page anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Mobile hamburger menu
const hamburger = document.getElementById('navHamburger');
const navLinksList = document.querySelector('.nav-links');
if (hamburger) {
  function openNav() {
    hamburger.classList.add('open');
    navLinksList.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    const firstLink = navLinksList.querySelector('a');
    if (firstLink) firstLink.focus();
  }
  function closeNav() {
    hamburger.classList.remove('open');
    navLinksList.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.focus();
  }
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.addEventListener('click', () => {
    hamburger.classList.contains('open') ? closeNav() : openNav();
  });
  navLinksList.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => closeNav());
  });
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinksList.contains(e.target)) {
      if (hamburger.classList.contains('open')) closeNav();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!hamburger.classList.contains('open')) return;
    if (e.key === 'Escape') { closeNav(); return; }
    if (e.key !== 'Tab') return;
    const focusable = Array.from(navLinksList.querySelectorAll('a'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

// Contact form — only runs on contact.html
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;

  function showFieldError(id, msg) {
    const el  = document.getElementById(id);
    const err = document.getElementById(id + '-error');
    el.classList.add('field-error');
    el.setAttribute('aria-invalid', 'true');
    if (err) { err.textContent = msg; err.style.display = 'block'; }
  }

  function clearFieldError(id) {
    const el  = document.getElementById(id);
    const err = document.getElementById(id + '-error');
    el.classList.remove('field-error');
    el.setAttribute('aria-invalid', 'false');
    if (err) err.style.display = 'none';
  }

  ['firstName', 'lastName', 'email', 'message'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => clearFieldError(id));
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const btn    = document.getElementById('submitBtn');
    const status = document.getElementById('formStatus');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const SUCCESS_STYLE = 'display:block;padding:12px 16px;border-radius:4px;margin-bottom:16px;font-family:"DM Sans",sans-serif;font-size:0.875rem;line-height:1.5;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;';
    const ERROR_STYLE   = 'display:block;padding:12px 16px;border-radius:4px;margin-bottom:16px;font-family:"DM Sans",sans-serif;font-size:0.875rem;line-height:1.5;background:#fee2e2;color:#c0392b;border:1px solid #fca5a5;';

    const firstName = document.getElementById('firstName').value.trim();
    const lastName  = document.getElementById('lastName').value.trim();
    const email     = document.getElementById('email').value.trim();
    const message   = document.getElementById('message').value.trim();

    let firstError = null;
    if (!firstName) {
      showFieldError('firstName', 'Please enter your first name.');
      firstError = firstError || 'firstName';
    }
    if (!lastName) {
      showFieldError('lastName', 'Please enter your last name.');
      firstError = firstError || 'lastName';
    }
    if (!email) {
      showFieldError('email', 'Please enter your email address.');
      firstError = firstError || 'email';
    } else if (!emailRegex.test(email)) {
      showFieldError('email', 'Please enter a valid email address.');
      firstError = firstError || 'email';
    }
    if (!message) {
      showFieldError('message', 'Please describe your requirements.');
      firstError = firstError || 'message';
    }
    if (firstError) {
      document.getElementById(firstError).focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';
    status.style.cssText = 'display:none;';

    const payload = {
      firstName: firstName,
      lastName:  lastName,
      company:   document.getElementById('company').value.trim(),
      email:     email,
      country:   document.getElementById('country').value.trim(),
      role:      document.getElementById('role').value,
      intent:    document.getElementById('intent').value,
      message:   message,
    };

    try {
      const res  = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        status.style.cssText = SUCCESS_STYLE;
        status.textContent = 'Thank you for your enquiry. A member of our team will be in touch within 2 business days.';
        this.reset();
      } else {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      status.style.cssText = ERROR_STYLE;
      status.textContent = 'Something went wrong. Please try again or email us directly at enquiries@globalmedsource.com.au';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Enquiry →';
    }
  });
}());
