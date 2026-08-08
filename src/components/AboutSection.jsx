import SectionReveal from './SectionReveal';
import Card from './Card';

function AboutSection() {
  return (
    <SectionReveal as="section" id="friday" className="section friday-section">
      <div className="section-heading">
        <p className="section-kicker">Friday</p>
        <h2>Our flagship personal AI assistant.</h2>
      </div>

      <div className="friday-grid">
        <Card className="friday-story-card" whileHover={{ y: -4 }}>
          <div className="card-head">
            <span className="mini-label">What it is</span>
            <h3>Friday is a personal AI assistant built for everyday use.</h3>
          </div>
          <p>
            It helps users chat naturally, set reminders, search the web, and control smart-home tasks from one
            simple interface. Friday is designed to feel like a serious product, not a demo gimmick.
          </p>
          <div className="friday-tags">
            <span>Chat</span>
            <span>Reminders</span>
            <span>Web search</span>
            <span>Smart-home control</span>
          </div>
        </Card>

        <div className="friday-side">
          <Card className="friday-info-card" whileHover={{ y: -4 }}>
            <span className="mini-label">Company story</span>
            <p>
              1% Digital Solutions builds practical digital products with a premium business presentation. The company
              grew from a simple idea: small focused execution can create compounding impact.
            </p>
          </Card>

          <div className="friday-meta-grid">
            <Card className="friday-meta-card" whileHover={{ y: -4 }}>
              <span className="mini-label">Mission</span>
              <p>To build dependable AI-powered products that help businesses move with clarity and confidence.</p>
            </Card>
            <Card className="friday-meta-card" whileHover={{ y: -4 }}>
              <span className="mini-label">Aim</span>
              <p>To present 1percent universal AI as a focused operating layer for the company’s product portfolio.</p>
            </Card>
            <Card className="friday-meta-card" whileHover={{ y: -4 }}>
              <span className="mini-label">Version</span>
              <p>Current release: v1.0, positioned for business presentation and product showcase.</p>
            </Card>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}

export default AboutSection;
