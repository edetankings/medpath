import React, { useState, useRef, useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { ChatMessage, TriageLevel } from '../types';
import { ErrorState } from '../components/UI';
import { api } from '../services/api';

export const AiNavigatorPage: React.FC = () => {
  const { navigate } = useApp();
  const [inputQuery, setInputQuery] = useState('');
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'navigator',
      text: 'Welcome to the Navigator prototype. You can explore general healthcare questions here. Responses may be inaccurate and must not be used for diagnosis, treatment or emergency triage. Conversation history is available only while this page is open.',
      timestamp: 'Just now',

      suggestedActions: [
        'Help me find a doctor',
        'I need to find a laboratory',
        "I don't know what type of care I need",
        'Help me understand my health records',
      ],
    },
  ]);

  const suggestedPrompts = [
    'Help me find a doctor',
    'I need to find a laboratory',
    "I don't know what type of care I need",
    'Help me understand my health records',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || isTyping) return;
    setError('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const result = await api.sendNavigatorMessage(text, messages);
      setIsTyping(false);
      const navReply: ChatMessage = {
        id: `nav-${Date.now()}`,
        sender: 'navigator',
        text: result.reply,
        timestamp: 'Just now',
        triageLevel: result.triageLevel,
        suggestedActions: result.suggestedActions || [],
      };
      setMessages((prev) => [...prev, navReply]);
    } catch {
      setIsTyping(false);
      setError('The Navigator could not respond. Please try again. No medical guidance was generated.');
    }
  };

  const handleActionClick = (action: string) => {
    if (action.toLowerCase().includes('doctor') || action.toLowerCase().includes('care') || action.toLowerCase().includes('cardiologist')) {
      navigate('find-care');
    } else if (action.toLowerCase().includes('passport') || action.toLowerCase().includes('record')) {
      navigate('passport');
    } else if (action.toLowerCase().includes('appointment') || action.toLowerCase().includes('visit')) {
      navigate('appointments');
    } else {
      handleSend(action);
    }
  };

  const getTriageBadge = (_level?: TriageLevel) => <span className="badge badge-warning">Unverified prototype output</span>;

  return (
    <AppShell
      title="AI Healthcare Navigator"
      subtitle="A place for general questions. A prototype, not a clinical decision tool."
      actions={
        <button
          type="button"
          className="btn btn-outline btn-sm" disabled={isTyping}
          onClick={() => {
            setMessages([messages[0]]); setError('');
          }}
        >
          Reset Conversation
        </button>
      }
    >
      <div className="navigator-container">
        {/* Pinned Clinical Scope & Safety Notice */}
        <div className="navigator-disclaimer" role="note">
          <Icons.Info size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Prototype safety notice:</strong> Outputs are not reliable diagnoses, treatment advice or emergency triage. Speak with a qualified clinician about health decisions. In an emergency, contact your local emergency services.
          </span>
        </div>

        {error && <ErrorState message={error}/>}
        {/* Conversation Feed */}
        <div className="navigator-messages-feed" role="log" aria-live="polite">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-navigator'}`}
              >
                {!isUser && (
                  <div className="navigator-bubble-header">
                    <div className="navigator-bubble-title">
                      <Icons.Compass size={14} />
                      <span>MedPath Navigator</span>
                    </div>
                    {getTriageBadge(msg.triageLevel)}
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                {/* Actionable Clinical Recommendation Chips */}
                {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="navigator-actions-list">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="action-chip-btn" disabled={isTyping}
                        onClick={() => handleActionClick(action)}
                      >
                        {action} &rarr;
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Loading Indicator */}
          {isTyping && (
            <div className="chat-bubble chat-bubble-navigator" style={{ maxWidth: '140px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge-pulse" />
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Waiting for response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Question Chips */}
        <div className="navigator-prompts-bar">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-navy)', whiteSpace: 'nowrap' }}>
            Suggested:
          </span>
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              className="prompt-pill" disabled={isTyping}
              onClick={() => handleSend(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <p className="ui-navigator-action-note">Suggestion buttons open app sections or send follow-up questions. They do not contact providers or emergency services.</p>
        {/* Input Composer */}
        <div className="navigator-input-bar">
          <form
            className="navigator-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="form-control"
              aria-label="Your question for the Navigator" placeholder="Ask a general healthcare question..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!inputQuery.trim() || isTyping}
              title="Send to Navigator"
              style={{ flexShrink: 0 }}
            >
              <Icons.Send size={16} />
              <span>Ask Navigator</span>
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
};
