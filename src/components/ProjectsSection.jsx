import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import projects from '../data/projects.json';
import Card from './Card';
import SectionReveal from './SectionReveal';

const tabs = ['All', 'Web', 'AI', 'Mobile', 'Blockchain'];

function ProjectsSection() {
  const [activeTab, setActiveTab] = useState('All');

  const filteredProjects = useMemo(() => {
    if (activeTab === 'All') return projects;
    return projects.filter((project) => project.category === activeTab);
  }, [activeTab]);

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
          {filteredProjects.map((project) => (
            <Card
              layout
              className="project-card"
              key={project.title + project.meta}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25 }}
              whileHover={{ y: -6, scale: 1.01 }}
            >
              <img src={project.image} alt={project.alt} loading="lazy" decoding="async" />
              <h3>{project.title}</h3>
              <div className="project-meta">{project.meta}</div>
              <p>{project.description}</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{project.details}</p>
              <a href={project.href} className="btn btn-primary" role="button">
                {project.cta}
              </a>
            </Card>
          ))}
        </AnimatePresence>
      </motion.div>
    </SectionReveal>
  );
}

export default ProjectsSection;
