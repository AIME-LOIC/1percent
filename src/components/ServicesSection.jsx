import { motion } from 'framer-motion';
import Card from './Card';
import SectionReveal from './SectionReveal';

const services = [
  {
    icon: 'fa-solid fa-code service-icon',
    title: 'Web Development',
    text: 'Building responsive, accessible websites and web apps using modern stacks (React, Next.js, Node).'
  },
  {
    icon: 'fa-solid fa-mobile-screen service-icon',
    title: 'App Development',
    text: 'Native and cross-platform mobile apps (Flutter, React Native) optimized for local connectivity.'
  },
  {
    icon: 'fa-solid fa-brain service-icon',
    title: 'AI Solutions',
    text: 'Practical ML solutions: automation, prediction models and NLP for local languages.'
  },
  {
    icon: 'fa-solid fa-shield-halved service-icon',
    title: 'Cybersecurity',
    text: 'Security assessments, secure-by-design development and training for teams and SMEs.'
  },
  {
    icon: 'fa-solid fa-robot service-icon',
    title: 'Robotics & Embedded Systems',
    text: 'Design and firmware for robotics, IoT devices and embedded controllers — from prototyping to production-ready hardware and firmware.'
  },
  {
    icon: 'fa-solid fa-bitcoin-sign service-icon',
    title: 'Blockchain & Digital Currency',
    text: 'Advisory and implementations for secure ledgers, tokenization and digital payment flows tailored for local marketplaces and remittances.'
  },
  {
    icon: 'fa-solid fa-gamepad service-icon',
    title: 'Game Development',
    text: "We're building games for kids,Adults, and more Rwandans who want to relex playing cool games"
  }
];

function ServicesSection() {
  return (
    <SectionReveal as="section" id="services">
      <h2>Our Services</h2>
      <div className="services-grid">
        {services.map((service, index) => (
          <Card
            className="service-card"
            key={service.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ y: -6, scale: 1.01 }}
          >
            <motion.i className={service.icon} aria-hidden="true" whileHover={{ rotate: 6, scale: 1.1 }}></motion.i>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
          </Card>
        ))}
      </div>
    </SectionReveal>
  );
}

export default ServicesSection;
