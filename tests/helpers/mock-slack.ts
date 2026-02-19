import { mock } from "bun:test";

export const mockPostMessageResponse = {
  ok: true,
  ts: "1234567890.123456",
  channel: "C12345",
  message: { text: "Hello" },
};

export const mockScheduleMessageResponse = {
  ok: true,
  scheduled_message_id: "Q12345",
  channel: "C12345",
  post_at: 1700000000,
};

export const mockConversationsHistoryResponse = {
  ok: true,
  messages: [
    { ts: "1234567890.000001", user: "U12345", text: "Hello there" },
    { ts: "1234567890.000002", user: "U67890", text: "How are you?" },
  ],
  response_metadata: { next_cursor: "" },
};

export const mockConversationsRepliesResponse = {
  ok: true,
  messages: [
    {
      ts: "1234567890.000001",
      user: "U12345",
      text: "Parent message",
      thread_ts: "1234567890.000001",
    },
    { ts: "1234567890.000002", user: "U67890", text: "Reply 1", thread_ts: "1234567890.000001" },
  ],
  response_metadata: { next_cursor: "" },
};

export const mockConversationsListResponse = {
  ok: true,
  channels: [
    { id: "C12345", name: "general", is_channel: true, is_private: false },
    { id: "C67890", name: "engineering", is_channel: true, is_private: false },
  ],
  response_metadata: { next_cursor: "" },
};

export const mockSearchMessagesResponse = {
  ok: true,
  messages: {
    matches: [{ ts: "1234567890.000001", channel: { id: "C12345" }, text: "Found this message" }],
    pagination: { total_count: 1, page: 1 },
  },
};

export const mockUsersListResponse = {
  ok: true,
  members: [
    {
      id: "U12345",
      name: "alice",
      real_name: "Alice Smith",
      profile: { email: "alice@example.com" },
    },
    { id: "U67890", name: "bob", real_name: "Bob Jones", profile: { email: "bob@example.com" } },
  ],
  response_metadata: { next_cursor: "" },
};

export const mockUsersInfoResponse = {
  ok: true,
  user: {
    id: "U12345",
    name: "alice",
    real_name: "Alice Smith",
    profile: { email: "alice@example.com", title: "Engineer" },
  },
};

export const mockCanvasesCreateResponse = {
  ok: true,
  canvas_id: "F12345CANVAS",
};

export const mockCanvasesSectionsLookupResponse = {
  ok: true,
  sections: [{ id: "section1", content: "# Title\n\nSome content here." }],
};

export const mockAuthTestResponse = {
  ok: true,
  user_id: "U12345",
  team_id: "T12345",
  user: "alice",
  team: "My Team",
};

export function createMockWebClient() {
  const chat = {
    postMessage: mock(async () => mockPostMessageResponse),
    scheduleMessage: mock(async () => mockScheduleMessageResponse),
  };

  const conversations = {
    history: mock(async () => mockConversationsHistoryResponse),
    replies: mock(async () => mockConversationsRepliesResponse),
    list: mock(async () => mockConversationsListResponse),
  };

  const search = {
    messages: mock(async () => mockSearchMessagesResponse),
  };

  const users = {
    list: mock(async () => mockUsersListResponse),
    info: mock(async () => mockUsersInfoResponse),
  };

  const canvases = {
    create: mock(async () => mockCanvasesCreateResponse),
    sections: {
      lookup: mock(async () => mockCanvasesSectionsLookupResponse),
    },
  };

  const auth = {
    test: mock(async () => mockAuthTestResponse),
  };

  return {
    chat,
    conversations,
    search,
    users,
    canvases,
    auth,
  };
}

export type MockWebClient = ReturnType<typeof createMockWebClient>;
