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
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState(null);

  const validateField = (name, value) => {
    const normalizedValue = value.trim();
    if (name === 'name' && normalizedValue.length < 2) return 'Please enter at least 2 characters.';
    if (name === '_replyto') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedValue)) return 'Please enter a valid email address.';
    }
    if (name === 'message' && normalizedValue.length < 12) return 'Message should be at least 12 characters.';
    return '';
  };

  const validateForm = () => {
    const nextErrors = Object.keys(formValues).reduce((accumulator, key) => {
      const error = validateField(key, formValues[key]);
      if (error) accumulator[key] = error;
      return accumulator;
    }, {});
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitMessage(null);
    if (!validateForm()) {
      setSubmitMessage({ type: 'error', text: 'Please fix the highlighted fields and try again.' });
      return;
    }

    setIsSubmitting(true);
    const response = await onSubmit(formValues, () => {
      setFormValues({ name: '', _replyto: '', message: '' });
      setErrors({});
    });
    if (response?.ok) {
      setSubmitMessage({ type: 'success', text: 'Thanks, your message was sent successfully.' });
    } else {
      setSubmitMessage({
        type: 'error',
        text: response?.message || 'Could not send your message right now. Please try again.'
      });
    }
    setIsSubmitting(false);
  };

  return (
    <SectionReveal as="section" id="contact" className="section contact-section">
      <div className="section-heading">
        <p className="section-kicker">Contact</p>
        <h2>Start a conversation.</h2>
      </div>

      <motion.div className="contact-container" whileHover={{ y: -2 }}>
        <div className="contact-info">
          <h3>1% Digital Solutions</h3>
          <p>info@1percent.digital</p>
          <p>Kigali, Rwanda</p>
          <p>Business-first AI products, Friday demos, and project delivery.</p>
        </div>

        <form id="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formValues.name}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name ? (
              <p id="name-error" className="form-error" role="alert">
                {errors.name}
              </p>
            ) : null}
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
              onBlur={handleBlur}
              aria-invalid={Boolean(errors._replyto)}
              aria-describedby={errors._replyto ? 'email-error' : undefined}
            />
            {errors._replyto ? (
              <p id="email-error" className="form-error" role="alert">
                {errors._replyto}
              </p>
            ) : null}
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
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? 'message-error' : undefined}
            ></textarea>
            {errors.message ? (
              <p id="message-error" className="form-error" role="alert">
                {errors.message}
              </p>
            ) : null}
          </div>

          {submitMessage ? (
            <p className={`form-status ${submitMessage.type}`} role="status" aria-live="polite">
              {submitMessage.text}
            </p>
          ) : null}

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </motion.div>
    </SectionReveal>
  );
}

export default ContactSection;
