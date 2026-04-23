let io = null;

const setSocketInstance = (socketInstance) => {
  io = socketInstance;
};

const getSocketInstance = () => {
  return io;
};

module.exports = {
  setSocketInstance,
  getSocketInstance
};
