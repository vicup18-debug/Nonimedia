document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. Header Scroll Effect & Mobile Menu
  // ==========================================
  const header = document.getElementById('main-header');
  const menuToggle = document.getElementById('menu-toggle-btn');
  const mainNav = document.getElementById('main-nav');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('active');
    menuToggle.classList.toggle('open');
    // Simple rotation animation for toggle lines
    const spans = menuToggle.querySelectorAll('span');
    if (mainNav.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });

  // Close nav on click of links
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('active');
      const spans = menuToggle.querySelectorAll('span');
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    });
  });

  // ==========================================
  // 2. Active Menu Link Highlighting on Scroll
  // ==========================================
  const sections = document.querySelectorAll('section, header');
  
  const activeLinkObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, {
    rootMargin: '-30% 0px -70% 0px'
  });

  sections.forEach(section => {
    activeLinkObserver.observe(section);
  });

  // ==========================================
  // 3. Scroll Reveal Animations
  // ==========================================
  const revealElements = document.querySelectorAll('.reveal');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target); // Reveal only once
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // ==========================================
  // 4. Portfolio Filters
  // ==========================================
  const filterButtons = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  let currentFilteredItems = Array.from(portfolioItems);

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const filterValue = button.getAttribute('data-filter');

      // Filter portfolio items
      portfolioItems.forEach(item => {
        if (filterValue === 'all' || item.classList.contains(filterValue)) {
          item.style.display = 'block';
          // Force a reflow for transition
          item.offsetHeight;
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.95)';
          // Wait for transition before hiding completely
          setTimeout(() => {
            if (item.style.opacity === '0') {
              item.style.display = 'none';
            }
          }, 400);
        }
      });

      // Update visible items list for Lightbox navigation
      setTimeout(() => {
        currentFilteredItems = Array.from(portfolioItems).filter(item => item.style.display !== 'none');
        // Re-assign data index for active visible items to facilitate lightbox indexing
        currentFilteredItems.forEach((item, index) => {
          item.setAttribute('data-visible-index', index);
        });
      }, 450);
    });
  });

  // Initially set indices for visible items
  currentFilteredItems.forEach((item, index) => {
    item.setAttribute('data-visible-index', index);
  });

  // ==========================================
  // 5. Lightbox Modal Gallery
  // ==========================================
  const lightbox = document.getElementById('portfolio-lightbox');
  const lightboxImg = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption-text');
  const lightboxMeta = document.getElementById('lightbox-meta-text');
  const lightboxClose = document.getElementById('lightbox-close-btn');
  const lightboxPrev = document.getElementById('lightbox-prev-btn');
  const lightboxNext = document.getElementById('lightbox-next-btn');
  let currentImageIdx = 0;

  function openLightbox(index) {
    const item = currentFilteredItems[index];
    if (!item) return;
    
    currentImageIdx = index;
    const img = item.querySelector('img');
    const title = item.querySelector('.portfolio-title').textContent;
    const category = item.querySelector('.portfolio-category').textContent;

    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = title;
    lightboxMeta.textContent = category;

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // Stop background scroll
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    let nextIdx = currentImageIdx + direction;
    if (nextIdx >= currentFilteredItems.length) {
      nextIdx = 0;
    } else if (nextIdx < 0) {
      nextIdx = currentFilteredItems.length - 1;
    }
    openLightbox(nextIdx);
  }

  // Click on items opens lightbox
  portfolioItems.forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-visible-index'));
      openLightbox(idx);
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
  lightboxNext.addEventListener('click', () => navigateLightbox(1));

  // Close lightbox by clicking backdrop
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      navigateLightbox(1);
    } else if (e.key === 'ArrowLeft') {
      navigateLightbox(-1);
    }
  });

  // ==========================================
  // 6. Testimonial Slider / Carousel
  // ==========================================
  const track = document.getElementById('testimonials-track');
  const dots = document.querySelectorAll('.dot');
  let currentSlide = 0;
  const slideIntervalTime = 5000;
  let slideInterval;

  function goToSlide(slideIdx) {
    currentSlide = slideIdx;
    track.style.transform = `translateX(-${slideIdx * 100}%)`;
    dots.forEach(dot => dot.classList.remove('active'));
    dots[slideIdx].classList.add('active');
  }

  function startSlideShow() {
    slideInterval = setInterval(() => {
      let nextSlide = currentSlide + 1;
      if (nextSlide >= dots.length) {
        nextSlide = 0;
      }
      goToSlide(nextSlide);
    }, slideIntervalTime);
  }

  function resetSlideShow() {
    clearInterval(slideInterval);
    startSlideShow();
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const slideIdx = parseInt(dot.getAttribute('data-slide'));
      goToSlide(slideIdx);
      resetSlideShow();
    });
  });

  startSlideShow();

  // ==========================================
  // 7. Booking & WhatsApp Redirection
  // ==========================================
  const bookingForm = document.getElementById('booking-form');
  const formStatus = document.getElementById('form-status-msg');
  const serviceSelect = document.getElementById('form-service');
  const packageButtons = document.querySelectorAll('.btn-package-book');

  // Handle select package button clicks (Services -> Form link)
  packageButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const packageName = btn.getAttribute('data-package');
      if (packageName) {
        serviceSelect.value = packageName;
        // Trigger floating label update by dispatching change event
        serviceSelect.dispatchEvent(new Event('change'));
      }
    });
  });

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const email = document.getElementById('form-email').value.trim();
    const service = serviceSelect.value;
    const date = document.getElementById('form-date').value;
    const message = document.getElementById('form-message').value.trim();

    // Client-side Validation
    if (!name || !email || !service || !date || !message) {
      showStatus('Please fill in all details to book a shoot.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showStatus('Please enter a valid email address.', 'error');
      return;
    }

    // Success Status
    showStatus('Thank you! Redirecting to WhatsApp to complete your booking...', 'success');

    // Create Pre-filled WhatsApp message
    const businessPhone = '2348030000000'; // Target phone number (Nonimedia Production Concept)
    const formattedDate = new Date(date).toLocaleDateString('en-NG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const whatsappMessage = `Hello Nonimedia Production Concept, I would like to book a package!
    
*Details:*
• *Name:* ${name}
• *Email:* ${email}
• *Package:* ${service}
• *Preferred Date:* ${formattedDate}
• *Vision/Details:* ${message}

Looking forward to capturing our story together!`;

    const encodedMsg = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${businessPhone}&text=${encodedMsg}`;

    // Reset Form after 1.5 seconds and redirect
    setTimeout(() => {
      bookingForm.reset();
      // Reset label animations
      const inputs = bookingForm.querySelectorAll('.form-input');
      inputs.forEach(input => input.dispatchEvent(new Event('blur')));
      window.open(whatsappUrl, '_blank');
    }, 1500);
  });

  function showStatus(text, type) {
    formStatus.textContent = text;
    formStatus.className = `form-status ${type}`;
    // Scroll to status message for visibility on mobile
    formStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
