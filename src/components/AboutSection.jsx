import SectionReveal from './SectionReveal';

function AboutSection() {
  return (
    <SectionReveal as="section" id="about">
      <h2>About Us </h2>
      <div className="about-text">
        <div className="about-img">
          <img src="https://source.unsplash.com/600x400/?technology" alt="Our Festive Team" />
        </div>

        <div className="about-cards cards" aria-hidden="false" style={{ marginTop: '20px' }}>
          <div className="card">
            <div className="about-icon" aria-hidden="true">
              <i className="fa-solid fa-bullseye"></i>
            </div>
            <div>
              <h4>our story</h4>
              <p>
                {' '}
                1% was born from the vision of creating a platform that empowers individuals to achieve more, learn
                more, and connect more in the digital age. The project started with a simple but ambitious idea: what
                if just 1% of effort, focus, and innovation could spark a change in people’s lives and communities?
                From this, the name 1% emerged, symbolizing the small but powerful impact consistent action can create.
                <br />
                <br />
                <br />
                The journey began with a focus on education, technology, and human connection. The founders noticed
                that while there is abundant knowledge and opportunity online, many people struggle to access it in an
                organized, engaging, and practical way. They wanted a platform that not only provides information but
                also encourages learning by doing, collaboration, and real-world application.
                <br />
                <br />
                <br />
                Over time, 1% evolved into more than just an educational tool—it became a hub for creativity,
                problem-solving, and community growth. Its mission is to help individuals develop skills in areas like
                programming, cybersecurity, AI, and entrepreneurship while fostering connections with like-minded peers.
                <br />
                <br />
                <br />
                Every feature, project, and initiative under 1% is designed with a single principle in mind: small
                consistent steps lead to big transformations. Whether it’s learning a new programming language,
                understanding ethical hacking, or building a personal project, 1% is about empowering people to take
                that first crucial step and continue progressing.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="about-icon" aria-hidden="true">
              <i className="fa-solid fa-eye"></i>
            </div>
            <div>
              <h4>vision</h4>
              <p>
                To empower individuals to grow, learn, and innovate by improving just 1% every day — creating a world
                driven by consistency, creativity, and progress
              </p>
            </div>
          </div>

          <div className="card">
            <div className="about-icon" aria-hidden="true">
              <i className="fa-solid fa-bullseye"></i>
            </div>
            <div>
              <h4>mission</h4>
              <p>
                To build a community and digital ecosystem that inspires continuous learning, supports innovation, and
                provides tools, knowledge, and opportunities for personal and professional growth.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="about-icon" aria-hidden="true">
              <i className="fa-solid fa-hand-holding-heart"></i>
            </div>
            <div>
              <h4>Impact</h4>
              <p>
                Over 10,000 users reached across health, education and commerce projects. We design with measurable
                outcomes in mind.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="about-icon" aria-hidden="true">
              <i className="fa-solid fa-handshake-angle"></i>
            </div>
            <div>
              <h4>Partnerships</h4>
              <p>
                Working with local NGOs, microfinance cooperatives and education institutions to co-build practical
                solutions.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="about-icon" aria-hidden="true">
              <i className="fa-solid fa-users"></i>
            </div>
            <div>
              <h4>Community</h4>
              <p>Monthly meetups, workshops and hackathons to grow talent and make technology more accessible.</p>
            </div>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}

export default AboutSection;
