import { motion } from 'framer-motion';
import { useState } from 'react';
import SectionReveal from './SectionReveal';

function ContactSection({ onSubmit }) {
  const [formValues, setFormValues] = useState({
    name: '',
    _replyto: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState('Send Message');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    await onSubmit(
      formValues,
      () => setFormValues({ name: '', _replyto: '', message: '' }),
      setSubmitLabel
    );
    setIsSubmitting(false);
  };

  return (
    <SectionReveal as="section" id="contact">
      <h2>Contact Us</h2>
      <motion.div className="contact-container" whileHover={{ y: -4 }}>
        <div className="contact-info">
          <h3>Get In Touch</h3>
          <p>
            <i className="fa-solid fa-envelope" aria-hidden="true"></i> info@1percent.digital
          </p>
          <p>
            <i className="fa-solid fa-phone" aria-hidden="true"></i> +250 791749219
          </p>
          <p>
            <i className="fa-solid fa-location-dot" aria-hidden="true"></i> Kigali, Rwanda
          </p>
        </div>

        <form id="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" required value={formValues.name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="_replyto"
              required
              value={formValues._replyto}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              rows="5"
              name="message"
              required
              value={formValues.message}
              onChange={handleChange}
            ></textarea>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {submitLabel}
          </button>
        </form>
      </motion.div>
    </SectionReveal>
  );
}

export default ContactSection;
