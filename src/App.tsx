import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import "./App.css";
import { chatBus } from "./eventBus";

type Contact = {
  id: string;
  name: string;
};

type Message = {
  id: string;
  from: "me" | "friend";
  text: string;
  timestamp: number;
};

type ConversationMap = Record<string, Message[]>; // key: contactId

function App() {
  const initialContacts: Contact[] = useMemo(
    () => [
      { id: "aarav", name: "Aarav" },
      { id: "priya", name: "Priya" },
      { id: "rahul", name: "Rahul" },
    ],
    []
  );

  const [contacts] = useState<Contact[]>(initialContacts);
  const [selectedContactId, setSelectedContactId] = useState<string>(
    contacts[0]?.id ?? ""
  );
  const [conversations, setConversations] = useState<ConversationMap>({
    aarav: [
      {
        id: "m1",
        from: "friend",
        text: "Hey there!",
        timestamp: Date.now() - 100000,
      },
      {
        id: "m2",
        from: "me",
        text: "Hi Aarav, how are you?",
        timestamp: Date.now() - 90000,
      },
    ],
    priya: [
      {
        id: "m3",
        from: "friend",
        text: "Lunch today?",
        timestamp: Date.now() - 50000,
      },
    ],
    rahul: [],
  });
  const [draftByContact, setDraftByContact] = useState<Record<string, string>>(
    {}
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((c: Contact) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  const selectedMessages: Message[] = useMemo(() => {
    if (!selectedContactId) return [];
    return conversations[selectedContactId] ?? [];
  }, [conversations, selectedContactId]);

  function handleSelectContact(contactId: string) {
    chatBus.emit("chat:select", { contactId });
  }

  function handleSendMessage() {
    const text = (draftByContact[selectedContactId] ?? "").trim();
    if (!text || !selectedContactId) return;
    chatBus.emit("chat:send", { contactId: selectedContactId, text });
    setDraftByContact((prev) => ({ ...prev, [selectedContactId]: "" }));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  // Subscribe to chat events
  useEffect(() => {
    const onSelect = ({ contactId }: { contactId: string }) => {
      setSelectedContactId(contactId);
    };

    const onSend = ({
      contactId,
      text,
    }: {
      contactId: string;
      text: string;
    }) => {
      const newMessage: Message = {
        id: `${contactId}-${Date.now()}`,
        from: "me",
        text,
        timestamp: Date.now(),
      };
      setConversations((prev: ConversationMap) => ({
        ...prev,
        [contactId]: [...(prev[contactId] ?? []), newMessage],
      }));
      // Simulate async incoming reply via event
      setTimeout(() => {
        chatBus.emit("chat:received", {
          contactId,
          message: {
            id: `${contactId}-reply-${Date.now()}`,
            from: "friend",
            text: "Got it!", // Static text for now
            timestamp: Date.now(),
          },
        });
      }, 600);
    };

    const onReceived = ({
      contactId,
      message,
    }: {
      contactId: string;
      message: Message;
    }) => {
      setConversations((prev: ConversationMap) => ({
        ...prev,
        [contactId]: [...(prev[contactId] ?? []), message],
      }));
    };

    chatBus.on("chat:select", onSelect);
    chatBus.on("chat:send", onSend);
    chatBus.on("chat:received", onReceived);
    return () => {
      chatBus.off("chat:select", onSelect);
      chatBus.off("chat:send", onSend);
      chatBus.off("chat:received", onReceived);
    };
  }, []);

  // Focus the input initially and when switching chats
  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedContactId]);

  return (
    <div className="messenger">
      <aside className="sidebar">
        <div className="sidebar-header">Chats</div>
        <ul className="friend-list">
          {contacts.map((contact: Contact) => (
            <li
              key={contact.id}
              className={
                contact.id === selectedContactId
                  ? "friend-item selected"
                  : "friend-item"
              }
              onClick={() => handleSelectContact(contact.id)}
            >
              <div className="avatar" aria-hidden>
                {contact.name[0]}
              </div>
              <div className="friend-meta">
                <div className="friend-name">{contact.name}</div>
                <div className="friend-last">
                  {conversations[contact.id]?.at(-1)?.text ?? "No messages yet"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <section className="chat">
        <div className="chat-header">
          {selectedContact ? selectedContact.name : "Select a chat"}
        </div>
        <div className="messages" role="log" aria-live="polite">
          {selectedMessages.length === 0 ? (
            <div className="empty">No messages yet. Say hello!</div>
          ) : (
            selectedMessages.map((m: Message) => (
              <div
                key={m.id}
                className={m.from === "me" ? "bubble me" : "bubble friend"}
              >
                <div className="bubble-text">{m.text}</div>
                <div className="bubble-time">
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="composer">
          <input
            type="text"
            value={draftByContact[selectedContactId] ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDraftByContact((prev) => ({
                ...prev,
                [selectedContactId]: e.target.value,
              }))
            }
            onKeyDown={handleKeyDown}
            ref={inputRef}
            placeholder={
              selectedContact
                ? `Message ${selectedContact.name}`
                : "Select a chat"
            }
            disabled={!selectedContact}
          />
          <button
            onClick={handleSendMessage}
            disabled={
              !(draftByContact[selectedContactId] ?? "").trim() ||
              !selectedContact
            }
          >
            Send
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
