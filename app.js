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

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('active');
        const spans = menuToggle.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      });
    });
  }

  // ==========================================
  // 2. Active Menu Link Highlighting based on URL
  // ==========================================
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  navLinks.forEach(link => {
    link.classList.remove('active');
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPath || (currentPath === 'index.html' && linkHref === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ==========================================
  // 3. Scroll Reveal Animations
  // ==========================================
  const revealElements = document.querySelectorAll('.reveal');
  
  if (revealElements.length > 0) {
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
  }

  // ==========================================
  // 4. Portfolio Filters
  // ==========================================
  const filterButtons = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  let currentFilteredItems = Array.from(portfolioItems);

  if (filterButtons.length > 0 && portfolioItems.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const filterValue = button.getAttribute('data-filter');

        portfolioItems.forEach(item => {
          if (filterValue === 'all' || item.classList.contains(filterValue)) {
            item.style.display = 'block';
            item.offsetHeight; // force reflow
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
              if (item.style.opacity === '0') {
                item.style.display = 'none';
              }
            }, 400);
          }
        });

        setTimeout(() => {
          currentFilteredItems = Array.from(portfolioItems).filter(item => item.style.display !== 'none');
          currentFilteredItems.forEach((item, index) => {
            item.setAttribute('data-visible-index', index);
          });
        }, 450);
      });
    });

    currentFilteredItems.forEach((item, index) => {
      item.setAttribute('data-visible-index', index);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam) {
      const targetBtn = document.querySelector(`.filter-btn[data-filter="${filterParam}"]`);
      if (targetBtn) {
        setTimeout(() => targetBtn.click(), 100);
      }
    }
  }

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

  if (lightbox && lightboxImg && portfolioItems.length > 0) {
    const openLightbox = (index) => {
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
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    };

    const navigateLightbox = (direction) => {
      let nextIdx = currentImageIdx + direction;
      if (nextIdx >= currentFilteredItems.length) {
        nextIdx = 0;
      } else if (nextIdx < 0) {
        nextIdx = currentFilteredItems.length - 1;
      }
      openLightbox(nextIdx);
    };

    portfolioItems.forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-visible-index'));
        openLightbox(idx);
      });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => navigateLightbox(1));

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') navigateLightbox(1);
      else if (e.key === 'ArrowLeft') navigateLightbox(-1);
    });
  }

  // ==========================================
  // 6. Testimonial Slider / Carousel
  // ==========================================
  const track = document.getElementById('testimonials-track');
  const dots = document.querySelectorAll('.dot');
  let currentSlide = 0;
  const slideIntervalTime = 5000;
  let slideInterval;

  if (track && dots.length > 0) {
    const goToSlide = (slideIdx) => {
      currentSlide = slideIdx;
      track.style.transform = `translateX(-${slideIdx * 100}%)`;
      dots.forEach(dot => dot.classList.remove('active'));
      dots[slideIdx].classList.add('active');
    };

    const startSlideShow = () => {
      slideInterval = setInterval(() => {
        let nextSlide = currentSlide + 1;
        if (nextSlide >= dots.length) {
          nextSlide = 0;
        }
        goToSlide(nextSlide);
      }, slideIntervalTime);
    };

    const resetSlideShow = () => {
      clearInterval(slideInterval);
      startSlideShow();
    };

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const slideIdx = parseInt(dot.getAttribute('data-slide'));
        goToSlide(slideIdx);
        resetSlideShow();
      });
    });

    startSlideShow();
  }

  // ==========================================
  // 7. Booking & WhatsApp Redirection
  // ==========================================
  const bookingForm = document.getElementById('booking-form');
  const formStatus = document.getElementById('form-status-msg');
  const serviceSelect = document.getElementById('form-service');

  if (bookingForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const packageParam = urlParams.get('package');
    if (packageParam && serviceSelect) {
      const packageMap = {
        'bronze': 'Bronze Package',
        'silver': 'Silver Package',
        'gold': 'Gold Package',
        'custom': 'Custom Creative Project'
      };
      if (packageMap[packageParam]) {
        serviceSelect.value = packageMap[packageParam];
        serviceSelect.dispatchEvent(new Event('change'));
      }
    }

    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('form-name').value.trim();
      const email = document.getElementById('form-email').value.trim();
      const service = serviceSelect.value;
      const date = document.getElementById('form-date').value;
      const message = document.getElementById('form-message').value.trim();

      if (!name || !email || !service || !date || !message) {
        showStatus('Please fill in all details to book a package.', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showStatus('Please enter a valid email address.', 'error');
        return;
      }

      showStatus('Thank you! Redirecting to WhatsApp to complete your booking...', 'success');

      const businessPhone = '2348030000000';
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

      setTimeout(() => {
        bookingForm.reset();
        window.open(whatsappUrl, '_blank');
      }, 1500);
    });

    function showStatus(text, type) {
      if (formStatus) {
        formStatus.textContent = text;
        formStatus.className = `form-status ${type}`;
        formStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
});
