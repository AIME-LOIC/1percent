const projects = [
  {
    image: '/assets/download.png',
    alt: 'BookIt',
    title: 'BookIt',
    meta: 'Booking platform — web & mobile',
    description: 'Online and offline bus ticket booking app made for Rwandans. for desktop and mobile',
    details: 'Tech: React, Node.js, PostgreSQL. Status: WEB',
    href: 'https://bookit-web-lxpp.onrender.com',
    cta: 'Visit'
  },
  {
    image: '/assets/logo.png',
    alt: 'Rwanda Chat',
    title: 'Rwanda Chat',
    meta: 'Rwanda messaging app',
    description:
      'Rwanda Chat is a lightweight messaging app designed for low-bandwidth areas with end-to-end encryption, groups and local language support.',
    details: 'Tech: Flutter, Firebase. Status: WEB',
    href: 'http://rwandachat.xyz',
    cta: 'visit'
  },
  {
    image: '/assets/MRT-LOGO.png',
    alt: 'MRT',
    title: 'MRT',
    meta: 'Tech Hub for all digital solutions',
    description:
      'MRT centralizes essential digital tools for Rwandans: global accounts, wallet payments, hosting, and a discovery hub — all connected and easy to use.',
    details: 'Tech: Node.js, MongoDB, Payment integrations. Status: WEB',
    href: 'https://mrt-yz7k.onrender.com/',
    cta: 'visit'
  },
  {
    image: '/assets/class.png',
    alt: 'ClassRoom',
    title: 'ClassRoom',
    meta: 'Education platform',
    description:
      'ClassRoom helps teachers create lessons, assignments and grade students. Optimized for offline usage and low-data environments.',
    details: 'Tech: Vue.js, Local storage sync. Status: WEB',
    href: 'https://classroom-tpj8.onrender.com',
    cta: 'visit'
  },
  {
    image: '/assets/hack.png',
    alt: 'HackLab',
    title: 'HackLab',
    meta: 'Community labs & resources',
    description:
      'HackLab is a community for developers who are working together to achieve somethig making their work easy without using many tools',
    details: 'Tech: JAMstack. Status: WEB',
    href: 'https://hacklab-9a4f.onrender.com/',
    cta: 'visit'
  },
  {
    image: '/assets/k&d.png',
    alt: 'K&D Shop',
    title: 'K&D Shop',
    meta: 'E‑commerce MVP',
    description:
      'K&D Shop is a marketplace MVP for local artisans with catalog management, orders and simple shipping workflows.',
    details: 'Tech: Shopify + integrations. Status: WEB',
    href: 'https://kandd-shop.onrender.com/',
    cta: 'visit'
  },
  {
    image: '/assets/qnexus.png',
    alt: 'K&D Shop',
    title: 'Q-nexus',
    meta: 'Health AI',
    description: 'Q-nexus is a health support powered by AI ,supporting Doctors in Rwanda',
    details: 'Tech: Shopify + integrations. Status: WEB',
    href: 'https://kandd-shop.onrender.com/',
    cta: 'visit'
  },
  {
    image: '/assets/vlab.png',
    alt: 'K&D Shop',
    title: 'V-lab',
    meta: 'V science lab',
    description:
      'V-Lab is a virtual science laboratory platform that simulates real laboratory experiments in chemistry and biology through software. It allows students to perform experiments safely, interactively, and repeatedly without physical risk, chemical waste, or high costs',
    details: 'Status: WEB',
    href: 'https://kandd-shop.onrender.com/',
    cta: 'visit'
  }
];

function ProjectsSection() {
  return (
    <section id="projects">
      <h2>
        Our Projects <i className="fa-solid fa-tree" style={{ color: '#2ecc71' }}></i>
      </h2>
      <div className="cards">
        {projects.map((project) => (
          <div className="card" key={project.title + project.meta}>
            <img src={project.image} alt={project.alt} />
            <h3>{project.title}</h3>
            <div className="project-meta">{project.meta}</div>
            <p>{project.description}</p>
            <p style={{ fontSize: '0.9rem', color: 'gray' }}>{project.details}</p>
            <a href={project.href} className="btn" role="button">
              {project.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ProjectsSection;
