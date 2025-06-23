import type { NextApiRequest, NextApiResponse } from 'next'
import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { Socket as NetSocket } from 'net'

interface SocketServer extends HTTPServer {
  io?: SocketIOServer | undefined
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log('Socket.IO is already running')
  } else {
    console.log('Socket.IO is initializing')
    
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL || false 
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST']
      }
    })

    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`)

      socket.on('join-room', (room: string) => {
        if (['top-stories', 'new-stories', 'best-stories'].includes(room)) {
          socket.join(room)
          console.log(`Socket ${socket.id} joined room: ${room}`)
          socket.emit('room-joined', room)
        }
      })

      socket.on('leave-room', (room: string) => {
        socket.leave(room)
        console.log(`Socket ${socket.id} left room: ${room}`)
      })

      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`)
      })
    })

    res.socket.server.io = io
  }
  
  res.end()
}

export default SocketHandler