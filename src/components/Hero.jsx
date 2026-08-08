import { useEffect } from 'react';
import LandingScene from './LandingScene';

const beats = [
  {
    id: 'friday',
    eyebrow: '01 — Founding idea',
    title: '1% Digital Solutions launches with premium product craft.',
    copy:
      '1% builds practical digital products with a premium business presentation. Our new site elevates the brand with a scroll-driven 3D reveal and bold black-and-lime motion.',
    bullets: ['AI product delivery', 'Web and mobile experiences', 'Blockchain and business systems']
  },
  {
    id: 'story',
    eyebrow: '02 — Our flagship',
    title: 'Friday is the personal AI assistant in the portfolio.',
    copy:
      'Friday helps users chat naturally, set reminders, search the web, and manage smart-home tasks from one interface. It is designed to feel like a serious product, not a demo.',
    bullets: ['Chat', 'Reminders', 'Web search', 'Smart-home control']
  },
  {
    id: 'features',
    eyebrow: '03 — Product focus',
    title: 'Built for clarity, trust, and scalable delivery.',
    copy:
      'The company grew from a simple idea: focused execution creates compounding impact. We build dependable products with premium presentation and business-ready detail.',
    bullets: ['Mission-driven product design', 'AI-assistive interfaces', 'Modern web architecture']
  },
  {
    id: 'contact',
    eyebrow: '04 — Connect',
    title: 'Start a project with 1percent.',
    copy: 'For product strategy, AI tooling, or full-stack delivery, contact the team directly and we will shape the next phase of your digital launch.',
    bullets: ['hello@onepercent.digital', 'Rwanda-based delivery', 'Focused product execution']
  }
];

function Hero() {
  useEffect(() => {
    const beats = Array.from(document.querySelectorAll('.hero-beat'));
    const railItems = Array.from(document.querySelectorAll('#rail .stage'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          const index = beats.findIndex((beat) => beat.id === id);

          entry.target.classList.toggle('show', entry.isIntersecting);
          if (railItems[index]) {
            railItems[index].classList.toggle('active', entry.isIntersecting);
          }
        });
      },
      {
        threshold: 0.45,
        rootMargin: '-20% 0px -40% 0px'
      }
    );

    beats.forEach((beat) => observer.observe(beat));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <header className="hero-shell">
      <LandingScene />

      <div className="hero-overlay">
        <div className="hero-copy-block">
          <span className="hero-eyebrow">1% Digital Solutions</span>
          <h1>Premium digital products with a 3D first impression.</h1>
          <p>
            Our new site now opens with a scroll-driven 3D stage, a refined black-and-lime palette, and bold brand motion that mirrors the xray animation pattern.
          </p>
        </div>

        <div id="rail">
          {beats.map((beat, index) => (
            <div className="stage" key={beat.id} data-i={index}>
              <span className="n">0{index + 1}</span>
              <span className="bar" />
              <span className="label">{beat.eyebrow.replace(/^[0-9]+ — /, '')}</span>
            </div>
          ))}
        </div>
      </div>

      <div id="scrollhint">
        <span>SCROLL</span>
        <span className="chev">⌄</span>
      </div>

      <main className="hero-story" id="story">
        {beats.map((beat) => (
          <section className="hero-beat" id={beat.id} key={beat.id}>
            <div className="beat-copy">
              <span className="beat-eyebrow">{beat.eyebrow}</span>
              <h2>{beat.title}</h2>
              <p>{beat.copy}</p>
              <ul className="beat-list">
                {beat.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </main>
    </header>
  );
}

export default Hero;
