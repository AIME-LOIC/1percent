import AboutSection from '../components/AboutSection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import ProjectsSection from '../components/ProjectsSection';
import ServicesSection from '../components/ServicesSection';
import TeamSection from '../components/TeamSection';

function HomePage({ isDarkMode, onContactSubmit }) {
  return (
    <>
      <Hero isDarkMode={isDarkMode} />

      <main className="main-content" id="main" tabIndex="-1">
        <AboutSection />
        <ServicesSection />
        <ProjectsSection />
        <TeamSection />
        <ContactSection onSubmit={onContactSubmit} />
      </main>

      <Footer />
    </>
  );
}

export default HomePage;
