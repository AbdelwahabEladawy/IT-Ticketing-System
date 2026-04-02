// In-memory registry: userId -> active sockets
const socketsByUserId = new Map();

export const registerTicketMessageSocket = (userId, socket) => {
  let set = socketsByUserId.get(userId);
  if (!set) {
    set = new Set();
    socketsByUserId.set(userId, set);
  }
  set.add(socket);

  socket.on('close', () => {
    const currentSet = socketsByUserId.get(userId);
    if (!currentSet) return;
    currentSet.delete(socket);
    if (currentSet.size === 0) socketsByUserId.delete(userId);
  });
};

export const broadcastToUser = (toUserId, payload) => {
  const set = socketsByUserId.get(toUserId);
  if (!set || set.size === 0) return;

  const message = JSON.stringify(payload);
  for (const socket of set) {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  }
};

export const broadcastToAll = (payload) => {
  const message = JSON.stringify(payload);
  for (const set of socketsByUserId.values()) {
    for (const socket of set) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }
};

