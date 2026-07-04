import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, ArrowLeft, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { Avatar, LiveDot, Card } from '../../components/common/UI';
import useAuthStore from '../../store/authStore';
import { chatAPI } from '../../services/api';
import { joinDeliveryRoom, leaveDeliveryRoom, on, off, emitTyping, emitStopTyping } from '../../services/socket';

const QUICK = ['On my way!', "I'm at the gate", "What's the OTP?", "I'm outside your room", 'Running 5 mins late', 'Parcel collected ✅'];

export default function Chat() {
  const { id } = useParams();
  const user   = useAuthStore(s => s.user);
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherName, setOtherName]   = useState('');
  const bottomRef  = useRef(null);
  const typingRef  = useRef(null);
  const uid = user?._id;

  useEffect(() => {
    joinDeliveryRoom(id);
    chatAPI.getMessages(id)
      .then(r => { setMessages(r.messages || []); setTimeout(() => bottomRef.current?.scrollIntoView(), 100); })
      .catch(() => {});

    const onMsg = d => {
      if (d.deliveryId?.toString() === id) {
        setMessages(m => {
          // Already have this exact _id (real message) — skip
          if (m.some(msg => msg._id === d.message._id)) return m;
          // Replace optimistic placeholder from the same sender with the real message
          const optimisticIdx = m.findIndex(
            msg => msg._id?.startsWith?.('optimistic_') &&
                   msg.sender?._id?.toString() === d.message.sender?._id?.toString()
          );
          if (optimisticIdx !== -1) {
            const next = [...m];
            next[optimisticIdx] = d.message;
            return next;
          }
          return [...m, d.message];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };
    const onTyp  = d => { if (d.userId?.toString() !== uid?.toString()) { setOtherTyping(true); setOtherName(d.name || ''); } };
    const onStop = d => { if (d.userId?.toString() !== uid?.toString()) setOtherTyping(false); };

    on('new_message',      onMsg);
    on('user_typing',      onTyp);
    on('user_stop_typing', onStop);
    return () => {
      leaveDeliveryRoom(id);
      off('new_message',      onMsg);
      off('user_typing',      onTyp);
      off('user_stop_typing', onStop);
    };
  }, [id, uid]);

  const handleChange = v => {
    setText(v);
    emitTyping(id);
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => emitStopTyping(id), 1500);
  };

  const send = async (content = text) => {
    if (!content.trim() || sending) return;
    setSending(true);
    const trimmed = content.trim();

    // Optimistically add so sender sees it immediately on the right
    const optimisticId = `optimistic_${Date.now()}`;
    const optimistic = {
      _id:       optimisticId,
      delivery:  id,
      sender:    { _id: uid?.toString(), fullName: user?.fullName, activeRole: user?.activeRole },
      type:      'text',
      content:   trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages(m => [...m, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      await chatAPI.sendMessage(id, trimmed);
      // The socket echo (onMsg) will replace the optimistic entry with the real message.
      // We just clear the input here.
      setText('');
    } catch {
      // Remove optimistic entry only on actual failure
      setMessages(m => m.filter(msg => msg._id !== optimisticId));
    } finally {
      setSending(false);
    }
  };

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-0 flex-shrink-0">
        <Link to={`/track/${id}`} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted" />
        </Link>
        <div className="flex-1">
          <h2 className="font-black text-campus-dark">Delivery Chat</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <LiveDot color={otherTyping ? 'bg-brand' : 'bg-success'} />
            <p className="text-xs text-muted">{otherTyping ? `${otherName || 'Other party'} is typing...` : 'Secure · End-to-end'}</p>
          </div>
        </div>
        <Link to={`/track/${id}`}>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-brand bg-orange-50 px-3 py-2 rounded-xl hover:bg-orange-100 transition-colors">
            <MapPin className="w-3.5 h-3.5" /> Track
          </button>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="text-4xl mb-3">💬</div>
            <p className="font-bold text-campus-dark">No messages yet</p>
            <p className="text-sm text-muted mt-1">Use this chat to coordinate pickup</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
          const isMe  = !!uid && !!senderId && senderId === uid.toString();
          const isSys = msg.type === 'system';
          const prev  = messages[i - 1];
          const showAvatar = !isMe && msg.sender?._id?.toString() !== prev?.sender?._id?.toString();

          if (isSys) return (
            <div key={msg._id || i} className="flex justify-center">
              <span className="text-xs text-muted bg-gray-100 rounded-full px-3 py-1 font-medium">{msg.content}</span>
            </div>
          );

          return (
            <div key={msg._id || i} className={clsx('flex gap-2 items-end', isMe && 'flex-row-reverse')}>
              {!isMe && (showAvatar
                ? <Avatar name={msg.sender?.fullName || '?'} size="xs" className="mb-0.5 flex-shrink-0" />
                : <div className="w-7 flex-shrink-0" />)}
              <div className={clsx('max-w-[72%] rounded-2xl px-4 py-2.5 relative',
                isMe ? 'bg-brand text-white rounded-br-sm' : 'bg-white border border-gray-100 text-campus-dark rounded-bl-sm shadow-sm')}>
                {!isMe && showAvatar && (
                  <p className="text-xs font-bold text-brand mb-0.5">{msg.sender?.fullName}</p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className={clsx('text-xs mt-1', isMe ? 'text-white/60' : 'text-muted')}>
                  {formatDistanceToNow(new Date(msg.createdAt || Date.now()), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex gap-2 items-end">
            <div className="w-7" />
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide flex-shrink-0">
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)}
            className="whitespace-nowrap text-xs font-semibold text-campus-dark bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:border-brand hover:text-brand transition-colors flex-shrink-0">
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end pt-2 pb-2 flex-shrink-0">
        <textarea value={text} onChange={e => handleChange(e.target.value)} onKeyDown={onKey}
          placeholder="Type a message... (Enter to send)"
          rows={1} maxLength={500}
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent max-h-24 font-medium"
          style={{ lineHeight: '1.5' }} />
        <button onClick={() => send()} disabled={!text.trim() || sending}
          className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
            text.trim() && !sending ? 'bg-brand hover:bg-brand-dark text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
