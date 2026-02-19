import Card from './Card';
import SectionReveal from './SectionReveal';

const teamMembers = [
  {
    image: '/assets/loic.png',
    alt: 'aime',
    name: 'Aime',
    role: 'Cybersecurity Engineer & Backend Engineer & CEO',
    links: [
      { href: 'https://x.com/aime_loic_132', label: 'aime Twitter', icon: 'fa-brands fa-twitter' },
      { href: 'https://rw.linkedin.com/in/aimeloic', label: 'Nancy LinkedIn', icon: 'fa-brands fa-linkedin-in' },
      { href: 'https://github.com/AIME-LOIC', label: 'Nora GitHub', icon: 'fa-brands fa-github' }
    ]
  },
  {
    image: '/assets/nani.png',
    alt: 'Nani',
    name: 'Nani',
    role: 'Co-founder & Frontend Engineer',
    links: [
      { href: '#', label: 'Kessy Twitter', icon: 'fa-brands fa-twitter' },
      { href: '#', label: 'Nancy LinkedIn', icon: 'fa-brands fa-linkedin-in' },
      { href: '#', label: 'Nora GitHub', icon: 'fa-brands fa-github' }
    ]
  },
  {
    image: 'https://source.unsplash.com/150x150/?man',
    alt: 'Greyson',
    name: 'Greyson',
    role: ' Designer & Blockchain Engineer',
    links: [
      { href: '#', label: 'Kessy Twitter', icon: 'fa-brands fa-twitter' },
      { href: '#', label: 'Nancy LinkedIn', icon: 'fa-brands fa-linkedin-in' },
      { href: '#', label: 'Nora GitHub', icon: 'fa-brands fa-github' }
    ]
  },
  {
    image: '/assets/',
    alt: 'dieu',
    name: 'Dieu Merci',
    role: 'Cybersecurity Engineer &',
    links: [
      { href: 'https://x.com/aime_loic_132', label: 'aime Twitter', icon: 'fa-brands fa-twitter' },
      { href: 'https://rw.linkedin.com/in/aimeloic', label: 'Nancy LinkedIn', icon: 'fa-brands fa-linkedin-in' },
      { href: 'https://github.com/AIME-LOIC', label: 'Nora GitHub', icon: 'fa-brands fa-github' }
    ]
  }
];

function TeamSection() {
  return (
    <SectionReveal as="section" id="team">
      <h2>Our Team</h2>
      <div className="cards">
        {teamMembers.map((member, idx) => (
          <Card
            className="team-card"
            key={member.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: idx * 0.06 }}
            whileHover={{ y: -6 }}
          >
            <img src={member.image} alt={member.alt} loading="lazy" decoding="async" />
            <h3>{member.name}</h3>
            <div className="team-role">{member.role}</div>
            <div className="team-links">
              {member.links.map((link) => (
                <a href={link.href} aria-label={link.label} key={link.label + member.name}>
                  <i className={link.icon}></i>
                </a>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </SectionReveal>
  );
}

export default TeamSection;
