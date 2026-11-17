import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { createChatSocket } from '../api/socket';
import { isChatSoundEnabled, playNotificationSound, setChatSoundEnabled } from '../utils/sound';
import { Icon } from './Icon';

function formatChatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function UserSupportChatModal({ isOpen, onClose }) {
  const { accessToken, user } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(isChatSoundEnabled());
  const [sending, setSending] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Toggle sound control
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    setChatSoundEnabled(nextState);
    if (nextState) {
      playNotificationSound(true); // Preview chime
    }
  };

  // Fetch thread and history
  useEffect(() => {
    if (!isOpen || !accessToken) return;

    let isMounted = true;
    setLoading(true);

    const initChat = async () => {
      try {
        const threadData = await api.getMyChatThread(accessToken);
        if (!isMounted) return;
        setThread(threadData);

        const history = await api.getChatMessages(accessToken, threadData.id, 50);
        if (!isMounted) return;
        setMessages(history);

        // Mark thread as read
        await api.markChatThreadRead(accessToken, threadData.id);

        // Connect socket
        const socket = createChatSocket(accessToken);
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('chat:join_thread', { threadId: threadData.id });
        });

        socket.on('chat:new_message', (payload) => {
          if (!payload?.message) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.message.id)) return prev;
            return [...prev, payload.message];
          });

          // Play sound if incoming from agency support
          if (payload.message.senderRole === 'agency_admin') {
            playNotificationSound();
            api.markChatThreadRead(accessToken, threadData.id).catch(() => {});
          }
        });
      } catch (err) {
        console.error('Failed to initialize support chat', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isOpen, accessToken]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !thread || sending) return;

    setSending(true);
    setInputText('');

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(
          'chat:send_message',
          { threadId: thread.id, text },
          (ack) => {
            if (!ack?.success) {
              // fallback to REST if socket emit returned unsuccessful
              api.sendChatMessage(accessToken, thread.id, text);
            }
          },
        );
      } else {
        const res = await api.sendChatMessage(accessToken, thread.id, text);
        if (res?.message) {
          setMessages((prev) => [...prev, res.message]);
        }
      }
    } catch (err) {
      console.error('Failed to send chat message', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="support-chat-overlay" onClick={onClose}>
      <div
        className="support-chat-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Chat Header */}
        <div className="support-chat-header">
          <div className="header-agent-info">
            <div className="agent-avatar-badge">
              <span>🏢</span>
              <span className="online-dot" />
            </div>
            <div>
              <div className="agent-title">
                {thread?.agency?.name || 'এজেন্সি সাপোর্ট'}
              </div>
              <div className="agent-status">২৪/৭ লাইভ কাস্টমার সাপোর্ট</div>
            </div>
          </div>

          <div className="header-controls">
            {/* Sound Toggle Control */}
            <button
              type="button"
              className={`chat-ctrl-btn sound-toggle ${soundEnabled ? 'active' : 'muted'}`}
              onClick={handleToggleSound}
              title={soundEnabled ? 'সাউন্ড নোটিফিকেশন অন (ক্লিক করে মিউট করুন)' : 'সাউন্ড মিউট (ক্লিক করে চালু করুন)'}
              aria-label="Toggle notification sound"
            >
              {soundEnabled ? '🔔' : '🔕'}
            </button>

            {/* Close Button */}
            <button
              type="button"
              className="chat-ctrl-btn close-btn"
              onClick={onClose}
              aria-label="Close support chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="support-chat-body">
          <div className="chat-intro-banner">
            <div className="intro-icon">💬</div>
            <div className="intro-text">
              স্বাগতম <strong>{user?.name || 'প্লেয়ার'}</strong>! ডিপোজিট, উইথড্রয়াল বা গেম সংক্রান্ত যেকোনো প্রয়োজনে সরাসরি আপনার এজেন্সির সাথে কথা বলুন।
            </div>
          </div>

          {loading ? (
            <div className="chat-loading-state">
              <div className="chat-spinner" />
              <span>চ্যাট লোড হচ্ছে...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty-state">
              এখনও কোনো বার্তা আদান-প্রদান হয়নি। নিচে বার্তা লিখে চ্যাট শুরু করুন।
            </div>
          ) : (
            <div className="chat-message-list">
              {messages.map((m) => {
                const isMe = m.senderRole === 'user';
                return (
                  <div
                    key={m.id}
                    className={`chat-bubble-row ${isMe ? 'outgoing' : 'incoming'}`}
                  >
                    {!isMe && (
                      <div className="incoming-avatar" title="Support Agent">
                        🏢
                      </div>
                    )}
                    <div className="chat-bubble">
                      <div className="bubble-text">{m.text}</div>
                      <div className="bubble-time">{formatChatTime(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form className="support-chat-footer" onSubmit={handleSend}>
          <input
            type="text"
            className="chat-input-field"
            placeholder="আপনার বার্তা লিখুন..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            maxLength={1000}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputText.trim() || sending || loading}
            aria-label="Send message"
          >
            <Icon name="paper-plane-right" weight="fill" size={20} />
          </button>
        </form>
      </div>

      <style>{`
        .support-chat-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 7, 15, 0.82);
          backdrop-filter: blur(6px);
          z-index: 1300;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 16px;
          animation: chatFadeIn 0.2s ease-out;
        }
        @keyframes chatFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .support-chat-dialog {
          width: 100%;
          max-width: 400px;
          height: 560px;
          max-height: 90vh;
          background: #0b101b;
          border: 1px solid rgba(2, 132, 199, 0.35);
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.7), 0 0 25px rgba(2, 132, 199, 0.15);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #f1f5f9;
        }
        @media (max-width: 480px) {
          .support-chat-overlay {
            padding: 0;
            align-items: stretch;
          }
          .support-chat-dialog {
            max-width: 100%;
            height: 100%;
            max-height: 100vh;
            border-radius: 0;
            border: none;
          }
        }
        .support-chat-header {
          padding: 14px 16px;
          background: #0f172a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .header-agent-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .agent-avatar-badge {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(2, 132, 199, 0.2);
          border: 1px solid rgba(2, 132, 199, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid #0f172a;
        }
        .agent-title {
          font-size: 15px;
          font-weight: 800;
          color: #f8fafc;
        }
        .agent-status {
          font-size: 11px;
          color: #10b981;
          font-weight: 600;
        }
        .header-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chat-ctrl-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.2s, transform 0.15s;
        }
        .chat-ctrl-btn.sound-toggle {
          background: rgba(255, 255, 255, 0.08);
          color: #f59e0b;
        }
        .chat-ctrl-btn.sound-toggle.muted {
          color: #64748b;
          opacity: 0.7;
        }
        .chat-ctrl-btn.sound-toggle:hover {
          background: rgba(255, 255, 255, 0.16);
          transform: scale(1.05);
        }
        .chat-ctrl-btn.close-btn {
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-size: 14px;
        }
        .chat-ctrl-btn.close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }
        .support-chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: radial-gradient(circle at 50% 0%, #0d1527 0%, #080d16 100%);
        }
        .chat-intro-banner {
          background: rgba(2, 132, 199, 0.1);
          border: 1px solid rgba(2, 132, 199, 0.25);
          border-radius: 12px;
          padding: 12px;
          font-size: 12px;
          color: #93c5fd;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          line-height: 1.5;
        }
        .intro-icon {
          font-size: 20px;
        }
        .chat-loading-state,
        .chat-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: auto;
          color: #64748b;
          font-size: 13px;
          text-align: center;
          padding: 20px;
        }
        .chat-spinner {
          width: 28px;
          height: 28px;
          border: 2px solid rgba(2, 132, 199, 0.2);
          border-top-color: #0284c7;
          border-radius: 50%;
          animation: chatSpin 0.7s linear infinite;
          margin-bottom: 10px;
        }
        @keyframes chatSpin {
          to { transform: rotate(360deg); }
        }
        .chat-message-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .chat-bubble-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .chat-bubble-row.outgoing {
          justify-content: flex-end;
        }
        .chat-bubble-row.incoming {
          justify-content: flex-start;
        }
        .incoming-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
          margin-bottom: 2px;
        }
        .chat-bubble {
          max-width: 78%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.45;
          position: relative;
          word-break: break-word;
        }
        .chat-bubble-row.outgoing .chat-bubble {
          background: linear-gradient(135deg, #0284c7, #0369a1);
          color: #ffffff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
        }
        .chat-bubble-row.incoming .chat-bubble {
          background: #1e293b;
          color: #f1f5f9;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .bubble-time {
          font-size: 10px;
          margin-top: 4px;
          opacity: 0.7;
          text-align: right;
        }
        .support-chat-footer {
          padding: 12px 14px;
          background: #0f172a;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .chat-input-field {
          flex: 1;
          height: 42px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 21px;
          padding: 0 16px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .chat-input-field:focus {
          border-color: #0284c7;
        }
        .chat-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0284c7, #0369a1);
          border: none;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          flex-shrink: 0;
        }
        .chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .chat-send-btn:not(:disabled):hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
