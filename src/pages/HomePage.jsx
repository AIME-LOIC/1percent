import { lazy, Suspense } from 'react';
import Hero from '../components/Hero';
import SectionSkeleton from '../components/SectionSkeleton';

const AboutSection = lazy(() => import('../components/AboutSection'));
const ServicesSection = lazy(() => import('../components/ServicesSection'));
const ProjectsSection = lazy(() => import('../components/ProjectsSection'));
const TeamSection = lazy(() => import('../components/TeamSection'));
const ContactSection = lazy(() => import('../components/ContactSection'));
const Footer = lazy(() => import('../components/Footer'));

function HomePage({ isDarkMode, onContactSubmit }) {
  return (
    <>
      <Hero isDarkMode={isDarkMode} />

      <main className="main-content" id="main" tabIndex="-1">
        <Suspense fallback={<SectionSkeleton lines={3} cards={2} />}>
          <AboutSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton lines={2} cards={3} />}>
          <ServicesSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton lines={2} cards={3} />}>
          <ProjectsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton lines={2} cards={3} />}>
          <TeamSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton lines={2} cards={1} />}>
          <ContactSection onSubmit={onContactSubmit} />
        </Suspense>
      </main>

      <Suspense fallback={<SectionSkeleton lines={1} cards={1} />}>
        <Footer />
      </Suspense>
    </>
  );
}

export default HomePage;
