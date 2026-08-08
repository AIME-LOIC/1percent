import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const starterMessages = [
  { role: 'assistant', content: 'Hi, I am Friday. I can help you chat, set reminders, search the web, or manage smart-home tasks.' }
];

const demoSuggestions = ['What can you do?', 'Set a reminder for 4 PM', 'Search the web for AI tools', 'Turn on the living room lights'];

function FridayDemo() {
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [sessionId] = useState(() => localStorage.getItem('friday-demo-session') || crypto.randomUUID());
  const scrollRef = useRef(null);

  const apiUrl = import.meta.env.VITE_FRIDAY_API_URL || '';
  const apiKey = import.meta.env.VITE_FRIDAY_API_KEY || '';
  const canSend = Boolean(apiUrl && apiKey);

  useEffect(() => {
    localStorage.setItem('friday-demo-session', sessionId);
  }, [sessionId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const statusText = useMemo(() => {
    if (canSend) return 'Live demo connected';
    return 'Demo preview mode';
  }, [canSend]);

  const sendMessage = async (rawMessage) => {
    const message = rawMessage.trim();
    if (!message || isSending) return;

    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setIsSending(true);

    try {
      if (!canSend) {
        throw new Error('The Friday API is not configured for this deployment.');
      }

      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/friday/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          message,
          session_id: sessionId
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Friday is temporarily unavailable.');
      }

      const reply = (payload.response || payload.message || '').trim() || 'Friday did not return a response.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Friday demo failed.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'The live demo is not connected yet, but Friday is designed for chat, reminders, web search, and smart-home control.'
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.section
      className="friday-demo"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="friday-demo-header">
        <div>
          <p className="section-kicker">Friday</p>
          <h3>Personal AI assistant</h3>
        </div>
        <span className="demo-status">{statusText}</span>
      </div>

      <p className="friday-demo-copy">
        Friday helps users chat naturally, set reminders, search the web, and control smart-home tasks from one assistant.
      </p>

      <div className="demo-window" ref={scrollRef} aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`demo-bubble ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>

      <div className="demo-suggestions" aria-label="Suggested prompts">
        {demoSuggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} className="demo-chip">
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="demo-form"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Friday anything..."
          aria-label="Ask Friday anything"
        />
        <button type="submit" className="button button-primary" disabled={isSending}>
          {isSending ? 'Sending' : 'Send'}
        </button>
      </form>

      {error ? <p className="demo-error">{error}</p> : null}
    </motion.section>
  );
}

export default FridayDemo;
