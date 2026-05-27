import { useState, useEffect, useRef } from 'react';
import { sendChatMessage, fetchChatHistory, uploadChatAttachment } from '../lib/chat';

function truncateEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 6)}...@${domain}`;
}

export default function ChatTab({ userEmail }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadChatHistory() {
    setLoading(true);
    setLoadError(null);
    try {
      const history = await fetchChatHistory();
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setLoadError('Failed to load conversation. Check your connection.');
    }
    setLoading(false);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend() {
    if (!input.trim() && attachments.length === 0) return;
    if (sending) return;

    const messageText = input.trim();
    const messageAttachments = attachments.length > 0 ? attachments : null;

    // Optimistic update - add user message immediately
    const optimisticUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      author_email: userEmail,
      content: messageText,
      attachments: messageAttachments,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticUserMsg]);
    setInput('');
    setAttachments([]);
    setSending(true);

    try {
      const result = await sendChatMessage(messageText, messageAttachments);

      // Add Marco's response
      const assistantMsg = {
        id: result.message_id || `assistant-${Date.now()}`,
        role: 'assistant',
        author_email: null,
        content: result.response,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Update the optimistic message to show error with message and original content for retry
      setMessages(prev => prev.map(m =>
        m.id === optimisticUserMsg.id
          ? { ...m, _error: true, _errorMessage: err.message }
          : m
      ));
    }

    setSending(false);
  }

  async function handleRetry(failedMsg) {
    // Remove the failed message
    setMessages(prev => prev.filter(m => m.id !== failedMsg.id));
    // Restore input and attachments
    setInput(failedMsg.content);
    if (failedMsg.attachments) {
      setAttachments(failedMsg.attachments);
    }
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingAttachment(true);

    for (const file of files) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'];
      if (!validTypes.includes(file.type)) {
        alert(`File type not supported: ${file.type}`);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name} (max 10MB)`);
        continue;
      }

      try {
        const attachment = await uploadChatAttachment(file);
        setAttachments(prev => [...prev, attachment]);
      } catch (err) {
        console.error('Failed to upload attachment:', err);
        alert(`Failed to upload: ${file.name}`);
      }
    }

    setUploadingAttachment(false);
    e.target.value = '';
  }

  function removeAttachment(index) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 380px)', minHeight: '400px' }}>
      {/* Header */}
      <div style={{
        padding: '0.8rem 1rem',
        borderBottom: '1px solid rgba(255,200,80,0.15)',
        marginBottom: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🇮🇹</span>
          <div>
            <div style={{ fontSize: '0.95rem', color: '#f5e6c8', fontWeight: 600 }}>
              Chat with Marco
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6a8898' }}>
              Your local Aeolian Islands guide
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6a8898', fontSize: '0.9rem' }}>
            Loading conversation...
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ color: '#e88070', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
              {loadError}
            </div>
            <button
              onClick={loadChatHistory}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(200,168,75,0.2)',
                border: '1px solid rgba(200,168,75,0.4)',
                borderRadius: '6px',
                color: '#c8a84b',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Try Again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            background: 'rgba(200,168,75,0.08)',
            borderLeft: '3px solid #c8a84b',
            borderRadius: '0 10px 10px 0',
            padding: '1rem 1.2rem',
            maxWidth: '85%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>🇮🇹</span>
              <span style={{ fontSize: '0.75rem', color: '#c8a84b', fontWeight: 600 }}>Marco</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#d8c8a8', lineHeight: 1.6 }}>
              Benvenuti! I'm Marco, your local guide to the beautiful Aeolian Islands.
              I know every hidden cove, the best granita spots, and which trattorias the locals love.
              Ask me anything about your trip — I'm here to help make it unforgettable!
              <em style={{ color: '#8bacc8' }}> Che bella avventura vi aspetta!</em> (What a beautiful adventure awaits you!)
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'assistant' ? (
                // Marco's message
                <div style={{
                  background: 'rgba(200,168,75,0.08)',
                  borderLeft: '3px solid #c8a84b',
                  borderRadius: '0 10px 10px 0',
                  padding: '0.8rem 1rem',
                  maxWidth: '85%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>🇮🇹</span>
                    <span style={{ fontSize: '0.7rem', color: '#c8a84b', fontWeight: 600 }}>Marco</span>
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#d8c8a8',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                // User message
                <div style={{
                  background: msg._error ? 'rgba(220,80,60,0.15)' : 'rgba(139,172,200,0.12)',
                  borderRadius: '10px 10px 0 10px',
                  padding: '0.8rem 1rem',
                  maxWidth: '85%',
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#6a8898', marginBottom: '0.3rem' }}>
                    {truncateEmail(msg.author_email)}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: msg._error ? '#f0a090' : '#c8d8e8',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                    {msg._error && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#e88070' }}>
                          {msg._errorMessage || 'Failed to send'}
                        </span>
                        <button
                          onClick={() => handleRetry(msg)}
                          style={{
                            marginTop: '0.3rem',
                            padding: '0.2rem 0.5rem',
                            background: 'rgba(220,80,60,0.2)',
                            border: '1px solid rgba(220,80,60,0.4)',
                            borderRadius: '4px',
                            color: '#f0a090',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                      {msg.attachments.map((att, i) => (
                        <span key={i} style={{
                          padding: '0.2rem 0.5rem',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          color: '#8bacc8',
                        }}>
                          {att.type.startsWith('image/') ? '🖼️' : '📄'} {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {sending && (
          <div style={{
            background: 'rgba(200,168,75,0.08)',
            borderLeft: '3px solid #c8a84b',
            borderRadius: '0 10px 10px 0',
            padding: '0.8rem 1rem',
            maxWidth: '85%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem' }}>🇮🇹</span>
              <span style={{ fontSize: '0.7rem', color: '#c8a84b', fontWeight: 600 }}>Marco</span>
              <span style={{ fontSize: '0.75rem', color: '#6a8898', marginLeft: '0.3rem' }}>
                is typing<span className="typing-dots">...</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div style={{
          padding: '0.5rem 1rem',
          borderTop: '1px solid rgba(255,200,80,0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}>
          {attachments.map((att, i) => (
            <span key={i} style={{
              padding: '0.3rem 0.6rem',
              background: 'rgba(200,168,75,0.15)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#c8a84b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}>
              {att.type.startsWith('image/') ? '🖼️' : '📄'} {att.name}
              <button
                onClick={() => removeAttachment(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8a7848',
                  cursor: 'pointer',
                  padding: '0 0.2rem',
                  fontSize: '0.8rem',
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '0.8rem',
        borderTop: '1px solid rgba(255,200,80,0.15)',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end',
      }}>
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAttachment || sending}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,200,80,0.2)',
            borderRadius: '8px',
            padding: '0.6rem',
            color: uploadingAttachment ? '#4a6888' : '#8bacc8',
            cursor: uploadingAttachment || sending ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
          title="Attach file"
        >
          {uploadingAttachment ? '⏳' : '📎'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Text input */}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Marco anything..."
          rows={1}
          disabled={sending}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,200,80,0.2)',
            borderRadius: '10px',
            padding: '0.7rem 1rem',
            color: '#e8dcc8',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            resize: 'none',
            outline: 'none',
            minHeight: '40px',
            maxHeight: '120px',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || (!input.trim() && attachments.length === 0)}
          style={{
            background: sending || (!input.trim() && attachments.length === 0)
              ? 'rgba(200,168,75,0.3)'
              : 'linear-gradient(135deg, #c8a84b, #e8c87a)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.6rem 0.8rem',
            color: '#0a1628',
            cursor: sending || (!input.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
          title="Send message"
        >
          {sending ? '⏳' : '➤'}
        </button>
      </div>

      {/* Inline styles for typing animation */}
      <style>{`
        @keyframes typing {
          0%, 20% { opacity: 0.3; }
          50% { opacity: 1; }
          80%, 100% { opacity: 0.3; }
        }
        .typing-dots {
          animation: typing 1.4s infinite;
        }
      `}</style>
    </div>
  );
}
