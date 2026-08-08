import SectionReveal from './SectionReveal';
import Card from './Card';

const collaborators = [
  {
    name: 'withintech.org',
    role: 'Collaborator',
    text: 'Implementation and ecosystem support around practical delivery.'
  },
  {
    name: '1percent',
    role: 'Core studio',
    text: 'Design, engineering, and product direction for the portfolio.'
  },
  {
    name: 'Delivery partners',
    role: 'Network',
    text: 'Additional collaborators supporting production work and rollout.'
  }
];

function TeamSection() {
  return (
    <SectionReveal as="section" id="team" className="section">
      <div className="section-heading">
        <p className="section-kicker">Collaborators</p>
        <h2>The people and partners around the work.</h2>
      </div>

      <div className="collaborator-grid">
        {collaborators.map((collaborator) => (
          <Card className="collaborator-card" key={collaborator.name} whileHover={{ y: -4 }}>
            <span className="mini-label">{collaborator.role}</span>
            <h3>{collaborator.name}</h3>
            <p>{collaborator.text}</p>
          </Card>
        ))}
      </div>
    </SectionReveal>
  );
}

export default TeamSection;
