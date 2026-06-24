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

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('active');
      menuToggle.classList.remove('open');
      const spans = menuToggle.querySelectorAll('span');
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    });
  });

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
  // 3. Scroll Reveal Animations Observer
  // ==========================================
  const revealElementsObserved = new Set();
  let revealObserver = null;

  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');
    if (revealElements.length === 0) return;

    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
            revealElementsObserved.delete(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });
    }

    revealElements.forEach(el => {
      if (!revealElementsObserved.has(el)) {
        revealObserver.observe(el);
        revealElementsObserved.add(el);
      }
    });
  }

  // Initial trigger for static elements
  initScrollReveal();

  // ==========================================
  // 4. Dynamic Portfolio Loader & Filtering
  // ==========================================
  const portfolioGrid = document.getElementById('portfolio-grid');
  const portfolioGridFeatured = document.getElementById('portfolio-grid-featured');

  if (portfolioGrid || portfolioGridFeatured) {
    fetch('assets/data/portfolio.json')
      .then(response => response.json())
      .then(data => {
        if (portfolioGrid) {
          renderPortfolioGrid(portfolioGrid, data);
          initPortfolioFilters();
        } else if (portfolioGridFeatured) {
          // Curated homepage preview (first 3 items)
          renderPortfolioGrid(portfolioGridFeatured, data.slice(0, 3));
        }
        initLightbox();
        initScrollReveal();
      })
      .catch(err => console.error('Error loading portfolio:', err));
  }

  function renderPortfolioGrid(container, items) {
    container.innerHTML = items.map((item, idx) => {
      return `
        <div class="portfolio-item ${item.aspect || 'standard'} ${item.category.toLowerCase()}" data-id="${item.id}" data-visible-index="${idx}" id="${item.id}">
          <div class="portfolio-item-inner">
            <img src="${item.imageUrl}" alt="${item.alt}" loading="lazy">
            <div class="portfolio-overlay">
              <span class="portfolio-category">${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</span>
              <h3 class="portfolio-title">${item.title}</h3>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Assign stagger indexes
    Array.from(container.children).forEach((child, idx) => {
      child.style.setProperty('--stagger-index', idx);
      child.classList.add('reveal-scale-up');
    });
  }

  function initPortfolioFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    if (filterButtons.length === 0 || portfolioItems.length === 0) return;

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const filterValue = button.getAttribute('data-filter').toLowerCase();
        let visibleIdx = 0;

        portfolioItems.forEach(item => {
          if (filterValue === 'all' || item.classList.contains(filterValue)) {
            item.style.display = 'block';
            item.offsetHeight; // force reflow
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
            item.setAttribute('data-visible-index', visibleIdx++);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            item.removeAttribute('data-visible-index');
            setTimeout(() => {
              if (item.style.opacity === '0') {
                item.style.display = 'none';
              }
            }, 400);
          }
        });
      });
    });

    // Check query params for filters
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
  // 5. Dynamic Lightbox Modal Gallery
  // ==========================================
  function initLightbox() {
    const lightbox = document.getElementById('portfolio-lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    const lightboxCaption = document.getElementById('lightbox-caption-text');
    const lightboxMeta = document.getElementById('lightbox-meta-text');
    const lightboxClose = document.getElementById('lightbox-close-btn');
    const lightboxPrev = document.getElementById('lightbox-prev-btn');
    const lightboxNext = document.getElementById('lightbox-next-btn');
    
    if (!lightbox || !lightboxImg) return;
    
    let currentImageIdx = 0;
    let currentFilteredItems = [];

    const getVisibleItems = () => {
      return Array.from(document.querySelectorAll('.portfolio-item')).filter(item => item.style.display !== 'none');
    };

    const openLightbox = (index) => {
      currentFilteredItems = getVisibleItems();
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
      currentFilteredItems = getVisibleItems();
      if (currentFilteredItems.length === 0) return;
      let nextIdx = currentImageIdx + direction;
      if (nextIdx >= currentFilteredItems.length) {
        nextIdx = 0;
      } else if (nextIdx < 0) {
        nextIdx = currentFilteredItems.length - 1;
      }
      openLightbox(nextIdx);
    };

    // Global click delegate for portfolio items opening lightbox
    document.removeEventListener('click', handleGridItemClick);
    document.addEventListener('click', handleGridItemClick);

    function handleGridItemClick(e) {
      const item = e.target.closest('.portfolio-item');
      if (!item) return;
      
      if (!item.closest('#portfolio-grid') && !item.closest('#portfolio-grid-featured')) return;
      
      currentFilteredItems = getVisibleItems();
      const idx = currentFilteredItems.indexOf(item);
      if (idx !== -1) {
        openLightbox(idx);
      }
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    document.removeEventListener('keydown', handleLightboxKeys);
    document.addEventListener('keydown', handleLightboxKeys);

    function handleLightboxKeys(e) {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') navigateLightbox(1);
      else if (e.key === 'ArrowLeft') navigateLightbox(-1);
    }
  }

  // ==========================================
  // 6. Dynamic Journal Stories Loader
  // ==========================================
  const storiesGrid = document.getElementById('stories-grid');
  const storyDetailContainer = document.getElementById('story-detail-container');
  const pageHeader = document.getElementById('stories-page-header');
  const pageTitle = document.getElementById('stories-page-title');
  const pageSubtitle = document.getElementById('stories-page-subtitle');

  if (storiesGrid && storyDetailContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');

    fetch('assets/data/stories.json')
      .then(response => response.json())
      .then(stories => {
        if (storyId) {
          const story = stories.find(s => s.id === storyId);
          if (story) {
            renderStoryDetail(story);
          } else {
            window.history.replaceState({}, '', 'stories.html');
            renderStoriesGrid(stories);
          }
        } else {
          renderStoriesGrid(stories);
        }
        initScrollReveal();
      })
      .catch(err => console.error('Error loading stories:', err));
  }

  function renderStoriesGrid(stories) {
    storiesGrid.style.display = 'grid';
    storyDetailContainer.style.display = 'none';
    if (pageHeader) pageHeader.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Stories & Moments';
    if (pageSubtitle) pageSubtitle.textContent = 'Our Journal';

    if (stories.length === 0) {
      storiesGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary);">No stories published yet.</p>`;
      return;
    }

    storiesGrid.innerHTML = stories.map((story) => {
      const formattedDate = new Date(story.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      return `
        <article class="story-card reveal">
          <a href="stories.html?id=${story.id}" class="story-card-img-link">
            <img src="${story.coverImage}" alt="${story.title} cover image" class="story-card-img" loading="lazy">
          </a>
          <div class="story-card-body">
            <div class="story-card-meta">
              <span class="story-card-category">${story.category}</span>
              <time class="story-card-date">${formattedDate}</time>
            </div>
            <h3 class="story-card-title">${story.title}</h3>
            <p class="story-card-excerpt">${story.excerpt}</p>
            <a href="stories.html?id=${story.id}" class="story-card-link">Read Story</a>
          </div>
        </article>
      `;
    }).join('');

    Array.from(storiesGrid.children).forEach((child, idx) => {
      child.style.setProperty('--stagger-index', idx);
      child.classList.add('reveal-fade-up');
    });
  }

  function renderStoryDetail(story) {
    storiesGrid.style.display = 'none';
    storyDetailContainer.style.display = 'block';
    if (pageHeader) pageHeader.style.display = 'none';

    const formattedDate = new Date(story.date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const paragraphsHtml = story.content
      .split('\n\n')
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    storyDetailContainer.innerHTML = `
      <div class="story-detail reveal reveal-fade-up">
        <a class="story-detail-back" id="story-back-btn">Back to Journal</a>
        <img src="${story.coverImage}" alt="${story.title}" class="story-detail-hero">
        <div class="story-detail-meta">
          <span class="story-detail-category">${story.category}</span>
          <time class="story-detail-date">${formattedDate}</time>
        </div>
        <h1 class="story-detail-title">${story.title}</h1>
        <div class="story-detail-divider"></div>
        <div class="story-detail-content">
          ${paragraphsHtml}
        </div>
      </div>
    `;

    document.getElementById('story-back-btn').addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, '', 'stories.html');
      if (pageHeader) pageHeader.style.display = 'block';
      fetch('assets/data/stories.json')
        .then(response => response.json())
        .then(stories => {
          renderStoriesGrid(stories);
          initScrollReveal();
        });
    });
  }

  // ==========================================
  // 7. Testimonial Slider / Carousel
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
  // 8. Booking & WhatsApp Redirection
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

      const businessPhone = '2349075830613';
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
