import { useState, useRef, useEffect } from 'react';

interface AIAssistantFloatProps {
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
}

const SUGGESTIONS = [
  'Which hospital is reachable now?',
  'Predict road failures next 6h',
  'Run flood simulation zone 4',
  'Explain current route',
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'bot',
    text: 'Route Resilience AI ready. I can analyze routes, predict failures, and assist with emergency decisions.',
  },
];

export function AIAssistantFloat({ onClose }: AIAssistantFloatProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const handleSend = (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      const responses: Record<string, string> = {
        'Which hospital is reachable now?': 'Coimbatore Medical College (2.4km) via NH-544 — ETA 8 min. KMCH (4.1km) route partially blocked — ETA 14 min.',
        'Predict road failures next 6h': 'High risk: Avinashi Rd (flood score 87%), Race Course Rd (erosion score 72%). Suggest pre-routing ambulances now.',
        'Run flood simulation zone 4': 'Flood simulation initiated for Zone 4 (Ukkadam). Projected 1.2m water level by 03:00 IST. 6 roads impacted, 2 hospitals at risk.',
        'Explain current route': 'Current route via Trichy Rd avoids flood zone near Ukkadam lake. Distance: 3.8km. Confidence: 94%. No critical segments blocked.',
      };
      const botReply = responses[msg] ?? 'Processing your request. Analyzing current road network and emergency data...';
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', text: botReply };
      setMessages(prev => [...prev, botMsg]);
    }, 600);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-title">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
          AI Assistant
          <span className="ai-indicator" />
        </div>
        <button className="float-panel-close" onClick={onClose}>✕</button>
      </div>

      {/* Chat */}
      <div className="ai-chat" ref={chatRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`ai-msg ${msg.role}`}>
            {msg.text}
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div className="ai-suggestions">
        <div className="ai-suggestion-label">Quick Prompts</div>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            className="ai-suggestion-btn"
            onClick={() => handleSend(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="ai-input-row">
        <input
          id="ai-chat-input"
          className="ai-input"
          type="text"
          placeholder="Ask AI assistant..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          id="ai-send-btn"
          className="ai-send-btn"
          onClick={() => handleSend()}
          title="Send message"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            send
          </span>
        </button>
      </div>
    </div>
  );
}
