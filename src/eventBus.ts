type EventMap = Record<string, unknown>;

export type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus<Events extends EventMap = EventMap> {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();

  on<K extends keyof Events & string>(
    type: K,
    handler: EventHandler<Events[K]>
  ): void {
    const set = this.handlers.get(type) ?? new Set<EventHandler<any>>();
    set.add(handler as EventHandler<any>);
    this.handlers.set(type, set);
  }

  off<K extends keyof Events & string>(
    type: K,
    handler: EventHandler<Events[K]>
  ): void {
    const set = this.handlers.get(type);
    if (!set) return;
    set.delete(handler as EventHandler<any>);
    if (set.size === 0) this.handlers.delete(type);
  }

  emit<K extends keyof Events & string>(type: K, payload: Events[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const h of set) {
      (h as EventHandler<Events[K]>)(payload);
    }
  }
}

// App-wide singleton bus
type ChatEvents = {
  "chat:select": { contactId: string };
  "chat:send": { contactId: string; text: string };
  "chat:received": {
    contactId: string;
    message: {
      id: string;
      from: "friend" | "me";
      text: string;
      timestamp: number;
    };
  };
};

export const chatBus = new EventBus<ChatEvents>();
