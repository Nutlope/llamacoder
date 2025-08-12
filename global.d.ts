declare global {
  var appDatabase: {
    chats: Map<string, any>;
    messages: Map<string, any>;
  } | undefined;
}

export {};