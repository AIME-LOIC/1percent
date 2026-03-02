import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import projects from '../data/projects.json';
import Card from './Card';
import SectionReveal from './SectionReveal';

const tabs = ['All', 'Web', 'AI', 'Mobile', 'Blockchain'];

function ProjectsSection() {
  const [activeTab, setActiveTab] = useState('All');
  const [flippedCards, setFlippedCards] = useState({});

  const filteredProjects = useMemo(() => {
    if (activeTab === 'All') return projects;
    return projects.filter((project) => project.category === activeTab);
  }, [activeTab]);

  const toggleFlip = (cardKey) => {
    setFlippedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  return (
    <SectionReveal as="section" id="projects">
      <h2>Our Projects</h2>

      <div className="filter-tabs" role="tablist" aria-label="Project filters">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <motion.div layout className="cards">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project) => {
            const cardKey = project.title + project.meta;
            const isFlipped = Boolean(flippedCards[cardKey]);

            return (
              <Card
                layout
                className={`project-card ${isFlipped ? 'is-flipped' : ''}`}
                key={cardKey}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.25 }}
                whileHover={{ y: -6, scale: 1.01 }}
              >
                <div className="project-card-inner">
                  <div className="project-face project-face-front">
                    <img src={project.image} alt={project.alt} loading="lazy" decoding="async" />
                    <h3>{project.title}</h3>
                    <div className="project-meta">{project.meta}</div>
                    <p>{project.description}</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{project.details}</p>
                    <div className="project-actions">
                      {project.href !== '#' ? (
                        <a href={project.href} className="btn btn-primary" role="button" target="_blank" rel="noreferrer">
                          {project.cta}
                        </a>
                      ) : (
                        <button type="button" className="btn btn-primary" disabled aria-disabled="true">
                          Coming Soon
                        </button>
                      )}
                      <button
                        type="button"
                        className="project-flip-btn"
                        onClick={() => toggleFlip(cardKey)}
                        aria-label={`Flip ${project.title} card to see full explanation`}
                        aria-pressed={isFlipped}
                      >
                        <i className="fa-solid fa-rotate" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>

                  <div className="project-face project-face-back">
                    <h3>{project.title}</h3>
                    <div className="project-meta">{project.meta}</div>
                    <p className="project-full-explanation">{project.description}</p>
                    <p className="project-full-explanation">{project.details}</p>
                    <p className="project-full-explanation">
                      This project focuses on practical outcomes, scalable architecture, and a user experience that
                      remains reliable in real-world conditions.
                    </p>
                    <div className="project-actions">
                      {project.href !== '#' ? (
                        <a href={project.href} className="btn btn-primary" role="button" target="_blank" rel="noreferrer">
                          Visit Project
                        </a>
                      ) : (
                        <button type="button" className="btn btn-primary" disabled aria-disabled="true">
                          Coming Soon
                        </button>
                      )}
                      <button
                        type="button"
                        className="project-flip-btn"
                        onClick={() => toggleFlip(cardKey)}
                        aria-label={`Flip ${project.title} card back to front`}
                        aria-pressed={isFlipped}
                      >
                        <i className="fa-solid fa-rotate-left" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </SectionReveal>
  );
}

export default ProjectsSection;
