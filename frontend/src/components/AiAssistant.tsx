import { useState } from 'react';

export function AiAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello, Commander. I am Route Resilience AI. How can I assist you with the current situation?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let aiResponse = "I've analyzed the request. The infrastructure is currently operational, but I'll continue to monitor satellite feeds for any changes.";
      
      if (userMessage.toLowerCase().includes('hospital')) {
        aiResponse = "Based on current network centrality, the safest route to Kovai Medical Center (KMCH) is open. Expected ETA is 14 minutes. Should I plot this route?";
      } else if (userMessage.toLowerCase().includes('flood') || userMessage.toLowerCase().includes('water')) {
        aiResponse = "There is a simulated flood event active near the Noyyal River basin. 4 road segments are currently impassable. I have updated the graph weights to avoid this area.";
      } else if (userMessage.toLowerCase().includes('report')) {
        aiResponse = "Generating emergency report... Network health is at 98%. 1 active disaster zone. 15 critical chokepoints identified. Report exported successfully.";
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <div className="card ai-chat-container">
      <div className="card-title">
        <span className="card-icon">🤖</span>
        Route Resilience AI Assistant
      </div>

      <div className="ai-chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-chat-msg ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="ai-chat-msg ai" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div className="status-dot"></div>
            <div className="status-dot" style={{ animationDelay: '0.2s' }}></div>
            <div className="status-dot" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
      </div>

      <div className="ai-chat-input-area">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Route Resilience AI..."
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={isTyping || !input.trim()}>
          Send
        </button>
      </div>

      <div className="ai-chat-suggestions">
        <button className="ai-chat-suggestion" onClick={() => handleSuggestion('Which hospital is reachable?')}>
          Hospital access?
        </button>
        <button className="ai-chat-suggestion" onClick={() => handleSuggestion('Show safest evacuation route.')}>
          Evac route
        </button>
        <button className="ai-chat-suggestion" onClick={() => handleSuggestion('Generate emergency report.')}>
          Status report
        </button>
      </div>
    </div>
  );
}
