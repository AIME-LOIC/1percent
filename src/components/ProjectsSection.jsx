import projects from '../data/projects.json';
import Card from './Card';
import SectionReveal from './SectionReveal';

function ProjectsSection() {
  return (
    <SectionReveal as="section" id="projects" className="section">
      <div className="section-heading">
        <p className="section-kicker">Other work</p>
        <h2>Projects beyond Friday.</h2>
      </div>

      <div className="project-grid">
        {projects.map((project) => {
          const imageSrc = project.image?.startsWith('/')
            ? `${import.meta.env.BASE_URL}${project.image.slice(1)}`
            : project.image;

          return (
            <Card className="project-card" key={project.title} whileHover={{ y: -4 }}>
              <div className="project-card-top">
                {imageSrc ? <img src={imageSrc} alt={project.alt} loading="lazy" decoding="async" /> : null}
                <span className="project-category">{project.category}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <p className="project-details">{project.details}</p>
              {project.href && project.href !== '#' ? (
                <a className="project-link" href={project.href} target="_blank" rel="noreferrer">
                  {project.cta || 'Visit'}
                </a>
              ) : null}
            </Card>
          );
        })}
      </div>
    </SectionReveal>
  );
}

export default ProjectsSection;
