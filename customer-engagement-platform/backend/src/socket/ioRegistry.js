// REST controllers (e.g. the `ticket` module) need to broadcast socket
// events triggered by an HTTP request, not just from within a socket event
// handler. `initializeSocket` is only ever called once (server.js), so a
// tiny module-level registry is enough — no DI framework needed for a
// single Socket.io server instance.
let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

module.exports = { setIO, getIO };
