import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { createChatSocket } from '../../api/socket';
import { isChatSoundEnabled, playNotificationSound, setChatSoundEnabled } from '../../utils/sound';

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AgencySupportChat() {
  const { accessToken, user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(isChatSoundEnabled());
  const [sending, setSending] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const selectedThreadIdRef = useRef(null);

  selectedThreadIdRef.current = selectedThread?.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    setChatSoundEnabled(nextState);
    if (nextState) {
      playNotificationSound(true); // Preview sound
    }
  };

  // Fetch all threads for agency
  const fetchThreads = async () => {
    if (!accessToken) return;
    try {
      const data = await api.getAgencyChatThreads(accessToken);
      setThreads(data || []);
      if (data?.length > 0 && !selectedThreadIdRef.current) {
        selectThread(data[0]);
      }
    } catch (err) {
      console.error('Failed to load agency chat threads', err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const selectThread = async (t) => {
    setSelectedThread(t);
    setLoadingMessages(true);
    try {
      const msgs = await api.getChatMessages(accessToken, t.id, 50);
      setMessages(msgs || []);
      await api.markChatThreadRead(accessToken, t.id);

      // Decrement unread count locally
      setThreads((prev) =>
        prev.map((item) => (item.id === t.id ? { ...item, agencyUnreadCount: 0 } : item)),
      );

      // Join socket room
      if (socketRef.current?.connected) {
        socketRef.current.emit('chat:join_thread', { threadId: t.id });
      }
    } catch (err) {
      console.error('Failed to load thread messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchThreads();

    const socket = createChatSocket(accessToken);
    socketRef.current = socket;

    socket.on('connect', () => {
      if (user?.agencyId) {
        socket.emit('chat:join_thread', { threadId: `agency:${user.agencyId}` });
      }
      if (selectedThreadIdRef.current) {
        socket.emit('chat:join_thread', { threadId: selectedThreadIdRef.current });
      }
    });

    socket.on('chat:new_message', (payload) => {
      if (!payload?.message) return;

      // If message is in currently selected thread
      if (payload.threadId === selectedThreadIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });

        // Mark as read immediately
        api.markChatThreadRead(accessToken, payload.threadId).catch(() => {});
      }

      // If message is from player, play chime sound!
      if (payload.message.senderRole === 'user') {
        playNotificationSound();
      }

      // Refresh thread list to update preview and badges
      fetchThreads();
    });

    socket.on('chat:thread_updated', (updatedThread) => {
      setThreads((prev) => {
        const index = prev.findIndex((t) => t.id === updatedThread.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...updatedThread };
          return updated.sort(
            (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
          );
        }
        return [updatedThread, ...prev];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user?.agencyId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedThread || sending) return;

    setSending(true);
    setInputText('');

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(
          'chat:send_message',
          { threadId: selectedThread.id, text },
          (ack) => {
            if (!ack?.success) {
              api.sendChatMessage(accessToken, selectedThread.id, text);
            }
          },
        );
      } else {
        const res = await api.sendChatMessage(accessToken, selectedThread.id, text);
        if (res?.message) {
          setMessages((prev) => [...prev, res.message]);
        }
      }
    } catch (err) {
      console.error('Failed to send admin message', err);
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = t.user?.name?.toLowerCase() || '';
    const phone = t.user?.phone?.toLowerCase() || '';
    return name.includes(q) || phone.includes(q);
  });

  return (
    <div className="agency-chat-page">
      <div className="agency-chat-top-bar">
        <h2>💬 লাইভ কাস্টমার সাপোর্ট ইনবক্স (Live Support Chat)</h2>
        <div className="agency-chat-global-controls">
          <button
            type="button"
            className={`admin-sound-toggle-btn ${soundEnabled ? 'active' : 'muted'}`}
            onClick={handleToggleSound}
            title={soundEnabled ? 'নোটিফিকেশন সাউন্ড চালু রয়েছে' : 'নোটিফিকেশন সাউন্ড মিউট রয়েছে'}
          >
            <span>{soundEnabled ? '🔔 সাউন্ড অন' : '🔕 সাউন্ড মিউট'}</span>
          </button>
        </div>
      </div>

      <div className="agency-chat-layout">
        {/* Left Column: Player Threads List */}
        <aside className="chat-threads-sidebar">
          <div className="threads-search-box">
            <input
              type="text"
              placeholder="প্লেয়ারের নাম বা ফোন নম্বর খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="threads-list">
            {loadingThreads ? (
              <div className="threads-loading">থ্রেড তালিকা লোড হচ্ছে...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="threads-empty">কোনো সক্রিয় চ্যাট পাওয়া যায়নি।</div>
            ) : (
              filteredThreads.map((t) => {
                const isActive = selectedThread?.id === t.id;
                const unread = t.agencyUnreadCount || 0;
                return (
                  <div
                    key={t.id}
                    className={`thread-item ${isActive ? 'active' : ''} ${unread > 0 ? 'unread' : ''}`}
                    onClick={() => selectThread(t)}
                  >
                    <div className="thread-avatar">
                      {t.user?.name ? t.user.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div className="thread-details">
                      <div className="thread-title-row">
                        <strong className="thread-username">{t.user?.name || 'প্লেয়ার'}</strong>
                        <span className="thread-time">{formatTime(t.lastMessageAt)}</span>
                      </div>
                      <div className="thread-phone">{t.user?.phone}</div>
                      <div className="thread-snippet-row">
                        <p className="thread-last-msg">
                          {t.lastMessage || 'কোনো বার্তা নেই'}
                        </p>
                        {unread > 0 && (
                          <span className="thread-unread-badge">{unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Chat Conversation Stream */}
        <main className="chat-conversation-area">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="conversation-header">
                <div className="selected-user-card">
                  <div className="user-icon-circle">
                    {selectedThread.user?.name
                      ? selectedThread.user.name.charAt(0).toUpperCase()
                      : 'U'}
                  </div>
                  <div>
                    <h3 className="user-display-name">
                      {selectedThread.user?.name || 'প্লেয়ার'}
                    </h3>
                    <div className="user-meta-sub">
                      <span>ফোন: {selectedThread.user?.phone}</span>
                      <span className="bullet-sep">•</span>
                      <span className="user-status-online">🟢 সক্রিয়</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Body */}
              <div className="conversation-messages">
                {loadingMessages ? (
                  <div className="messages-loading">মেসেজ লোড হচ্ছে...</div>
                ) : messages.length === 0 ? (
                  <div className="messages-empty">
                    এই প্লেয়ারের সাথে এখনও কোনো বার্তা বিনিময় হয়নি।
                  </div>
                ) : (
                  <div className="message-bubbles">
                    {messages.map((m) => {
                      const isMe = m.senderRole === 'agency_admin';
                      return (
                        <div
                          key={m.id}
                          className={`agency-msg-row ${isMe ? 'outgoing' : 'incoming'}`}
                        >
                          <div className="agency-msg-bubble">
                            <div className="msg-sender-title">
                              {isMe ? 'এজেন্সি অ্যাডমিন' : selectedThread.user?.name || 'প্লেয়ার'}
                            </div>
                            <div className="msg-text-content">{m.text}</div>
                            <div className="msg-meta-timestamp">
                              {formatTime(m.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input Bar */}
              <form className="conversation-input-bar" onSubmit={handleSend}>
                <input
                  type="text"
                  placeholder="প্লেয়ারকে রিপ্লাই দিন..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={loadingMessages}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending || loadingMessages}
                  className="btn-send-reply"
                >
                  {sending ? 'পাঠানো হচ্ছে...' : 'পাঠান'}
                </button>
              </form>
            </>
          ) : (
            <div className="no-thread-selected">
              <span className="empty-icon">💬</span>
              <h3>চ্যাট শুরু করতে বাম পাশ থেকে একজন প্লেয়ার সিলেক্ট করুন</h3>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .agency-chat-page {
          padding: 18px 24px;
          height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
        }
        .agency-chat-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .agency-chat-top-bar h2 {
          font-size: 20px;
          margin: 0;
          color: #f8fafc;
        }
        .admin-sound-toggle-btn {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.12);
          transition: background 0.2s;
        }
        .admin-sound-toggle-btn.active {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.4);
        }
        .admin-sound-toggle-btn.muted {
          background: rgba(255, 255, 255, 0.05);
          color: #94a3b8;
        }
        .agency-chat-layout {
          flex: 1;
          display: flex;
          background: #0b101b;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .chat-threads-sidebar {
          width: 320px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          background: #0f172a;
        }
        .threads-search-box {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .threads-search-box input {
          width: 100%;
          padding: 8px 12px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #f8fafc;
          font-size: 13px;
          outline: none;
        }
        .threads-list {
          flex: 1;
          overflow-y: auto;
        }
        .thread-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          cursor: pointer;
          transition: background 0.15s;
        }
        .thread-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .thread-item.active {
          background: rgba(2, 132, 199, 0.18);
          border-left: 3px solid #0284c7;
        }
        .thread-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #38bdf8;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .thread-details {
          flex: 1;
          min-width: 0;
        }
        .thread-title-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2px;
        }
        .thread-username {
          font-size: 14px;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .thread-time {
          font-size: 11px;
          color: #94a3b8;
        }
        .thread-phone {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .thread-snippet-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .thread-last-msg {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .thread-unread-badge {
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 10px;
          margin-left: 8px;
        }
        .chat-conversation-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #080d16;
        }
        .conversation-header {
          padding: 14px 20px;
          background: #0f172a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .selected-user-card {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0284c7;
          color: #fff;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-display-name {
          font-size: 16px;
          font-weight: 800;
          margin: 0 0 2px;
          color: #f8fafc;
        }
        .user-meta-sub {
          font-size: 12px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bullet-sep {
          color: #475569;
        }
        .user-status-online {
          color: #10b981;
          font-weight: 600;
        }
        .conversation-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        .message-bubbles {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .agency-msg-row {
          display: flex;
        }
        .agency-msg-row.outgoing {
          justify-content: flex-end;
        }
        .agency-msg-row.incoming {
          justify-content: flex-start;
        }
        .agency-msg-bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.45;
        }
        .agency-msg-row.outgoing .agency-msg-bubble {
          background: linear-gradient(135deg, #059669, #047857);
          color: #ffffff;
          border-bottom-right-radius: 3px;
        }
        .agency-msg-row.incoming .agency-msg-bubble {
          background: #1e293b;
          color: #f1f5f9;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom-left-radius: 3px;
        }
        .msg-sender-title {
          font-size: 10px;
          font-weight: 700;
          opacity: 0.8;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .msg-meta-timestamp {
          font-size: 10px;
          opacity: 0.7;
          margin-top: 4px;
          text-align: right;
        }
        .conversation-input-bar {
          padding: 14px 18px;
          background: #0f172a;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          gap: 12px;
        }
        .conversation-input-bar input {
          flex: 1;
          padding: 10px 16px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
        }
        .conversation-input-bar input:focus {
          border-color: #0284c7;
        }
        .btn-send-reply {
          padding: 0 20px;
          background: #0284c7;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-send-reply:hover:not(:disabled) {
          background: #0369a1;
        }
        .btn-send-reply:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .no-thread-selected {
          margin: auto;
          text-align: center;
          color: #64748b;
        }
        .empty-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
}
