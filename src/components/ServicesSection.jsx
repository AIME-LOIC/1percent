import { motion } from 'framer-motion';
import Card from './Card';
import SectionReveal from './SectionReveal';

const services = [
  {
    title: 'AI product design',
    text: 'Business-first AI experiences with strong hierarchy, clear language, and practical workflows.'
  },
  {
    title: 'Web applications',
    text: 'Modern React interfaces that are fast, responsive, and built to support real product delivery.'
  },
  {
    title: 'Assistant workflows',
    text: 'Chat, reminders, search, and automation flows packaged as user-facing product experiences.'
  },
  {
    title: 'Deployment support',
    text: 'Production-ready delivery setup for frontend, API, and environment configuration.'
  }
];

function ServicesSection() {
  return (
    <SectionReveal as="section" id="services" className="section">
      <div className="section-heading">
        <p className="section-kicker">Services</p>
        <h2>What 1% Digital Solutions delivers.</h2>
      </div>

      <div className="services-grid">
        {services.map((service, index) => (
          <Card
            className="service-card"
            key={service.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4 }}
          >
            <motion.div className="service-number" aria-hidden="true">
              0{index + 1}
            </motion.div>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
          </Card>
        ))}
      </div>
    </SectionReveal>
  );
}

export default ServicesSection;
