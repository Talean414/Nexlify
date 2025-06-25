const socket = require('socket.io-client')('http://localhost:5006');

socket.on('connect', () => {
  console.log('🧠 Connected to socket');
  socket.emit('joinOrderRoom', 'order-321');
});

socket.on('locationUpdate', (data) => {
  console.log('📍 Live location update:', data);
});
