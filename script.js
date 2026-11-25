const sections = [...document.querySelectorAll(".panel")];
const navLinks = [...document.querySelectorAll(".nav-link")];
const floatingNav = document.querySelector(".floating-nav");
const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pendingNavTarget = null;

function setActiveNavLink(activeLink) {
  if (!activeLink) return;

  navLinks.forEach((link) => {
    const isActive = link === activeLink;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const navBounds = floatingNav.getBoundingClientRect();
  const linkBounds = activeLink.getBoundingClientRect();
  floatingNav.style.setProperty("--nav-indicator-x", `${linkBounds.left - navBounds.left}px`);
  floatingNav.style.setProperty("--nav-indicator-y", `${linkBounds.top - navBounds.top}px`);
  floatingNav.style.setProperty("--nav-indicator-width", `${linkBounds.width}px`);
  floatingNav.style.setProperty("--nav-indicator-height", `${linkBounds.height}px`);
}

setActiveNavLink(navLinks.find((link) => link.classList.contains("is-active")));
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    pendingNavTarget = link.getAttribute("href").slice(1);
    setActiveNavLink(link);
  });
});

function clearPendingNavTarget() {
  pendingNavTarget = null;
}

window.addEventListener("wheel", clearPendingNavTarget, { passive: true });
window.addEventListener("touchstart", clearPendingNavTarget, { passive: true });
window.addEventListener("resize", () => {
  setActiveNavLink(navLinks.find((link) => link.classList.contains("is-active")));
});

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
}

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visibleSection = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visibleSection) return;
    if (pendingNavTarget) {
      const targetId = pendingNavTarget;
      const destination = entries.find((entry) => entry.target.id === targetId);
      if (!destination || destination.intersectionRatio < 0.6) return;
      pendingNavTarget = null;
      setActiveNavLink(navLinks.find((link) => link.getAttribute("href") === `#${targetId}`));
      return;
    }

    const activeLink = navLinks.find((link) => link.getAttribute("href") === `#${visibleSection.target.id}`);
    setActiveNavLink(activeLink);
  }, { threshold: [0.2, 0.4, 0.6] });

  sections.forEach((section) => sectionObserver.observe(section));
}

const trailCanvas = document.querySelector(".mouse-trail");
const trailContext = trailCanvas.getContext("2d");
const trailMotionEnabled = !reduceMotion && window.matchMedia("(pointer: fine)").matches;
const trailParticles = [];
const trailLifetime = 850;
const trailSpacing = 18;
let trailWidth = 0;
let trailHeight = 0;
let lastTrailPoint = null;
let trailDistance = 0;
let trailAnimation = 0;

function resizeTrailCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  trailWidth = window.innerWidth;
  trailHeight = window.innerHeight;
  trailCanvas.width = trailWidth * pixelRatio;
  trailCanvas.height = trailHeight * pixelRatio;
  trailContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function addTrailParticle(x, y, direction, timestamp) {
  const sides = 3 + Math.floor(Math.random() * 4);
  const radius = 4 + Math.random() * 9;
  const vertices = Array.from({ length: sides }, (_, index) => {
    const angle = (index / sides) * Math.PI * 2;
    const size = radius * (0.65 + Math.random() * 0.7);
    return [Math.cos(angle) * size, Math.sin(angle) * size];
  });

  trailParticles.push({
    x,
    y,
    direction,
    phase: Math.random() * Math.PI * 2,
    rotation: Math.random() * Math.PI,
    rotationSpeed: (Math.random() - 0.5) * 0.0015,
    vertices,
    born: timestamp
  });
}

function drawTrail(timestamp) {
  trailContext.clearRect(0, 0, trailWidth, trailHeight);

  for (let index = trailParticles.length - 1; index >= 0; index -= 1) {
    const particle = trailParticles[index];
    const age = timestamp - particle.born;
    if (age >= trailLifetime) {
      trailParticles.splice(index, 1);
      continue;
    }

    const progress = age / trailLifetime;
    const angle = particle.phase + age * 0.006;
    const orbitRadius = 4 + progress * 13;
    const drift = progress * 26;
    const x = particle.x - Math.cos(particle.direction) * drift - Math.sin(angle) * orbitRadius;
    const y = particle.y - Math.sin(particle.direction) * drift + Math.cos(angle) * orbitRadius;

    trailContext.save();
    trailContext.translate(x, y);
    trailContext.rotate(particle.rotation + age * particle.rotationSpeed);
    trailContext.beginPath();
    particle.vertices.forEach(([vertexX, vertexY], vertexIndex) => {
      if (vertexIndex === 0) trailContext.moveTo(vertexX, vertexY);
      else trailContext.lineTo(vertexX, vertexY);
    });
    trailContext.closePath();
    trailContext.strokeStyle = `rgba(240, 238, 233, ${0.72 * (1 - progress)})`;
    trailContext.lineWidth = 1;
    trailContext.stroke();
    trailContext.restore();
  }

  if (trailParticles.length) {
    trailAnimation = window.requestAnimationFrame(drawTrail);
  } else {
    trailAnimation = 0;
  }
}

if (trailMotionEnabled) {
  resizeTrailCanvas();
  window.addEventListener("resize", resizeTrailCanvas);
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const currentPoint = { x: event.clientX, y: event.clientY };

    if (lastTrailPoint) {
      const deltaX = currentPoint.x - lastTrailPoint.x;
      const deltaY = currentPoint.y - lastTrailPoint.y;
      const distance = Math.hypot(deltaX, deltaY);
      const direction = Math.atan2(deltaY, deltaX);

      for (let offset = trailSpacing - trailDistance; offset <= distance; offset += trailSpacing) {
        const ratio = offset / distance;
        addTrailParticle(
          lastTrailPoint.x + deltaX * ratio,
          lastTrailPoint.y + deltaY * ratio,
          direction,
          performance.now()
        );
      }
      trailDistance = (trailDistance + distance) % trailSpacing;

      if (!trailAnimation && trailParticles.length) {
        trailAnimation = window.requestAnimationFrame(drawTrail);
      }
    }

    lastTrailPoint = currentPoint;
  });
}
