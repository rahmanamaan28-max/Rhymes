import React, { useState, useContext } from 'react'
import { GameStateContext } from '../context/GameStateContext'

const Lobby = ({ onViewChange }) => {
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const { socket, setPlayerInfo } = useContext(GameStateContext)

  const handleCreateRoom = () => {
    if (username.trim()) {
      socket.emit('createRoom', username.trim())
      socket.once('roomCreated', ({ roomCode, isHost }) => {
        setPlayerInfo({ username: username.trim(), roomCode, isHost })
        onViewChange('modeSelection')
      })
    }
  }

  const handleJoinRoom = () => {
    if (username.trim() && roomCode.trim()) {
      socket.emit('joinRoom', { 
        roomCode: roomCode.trim().toUpperCase(), 
        username: username.trim() 
      })
      socket.once('joinedRoom', ({ roomCode, isHost }) => {
        setPlayerInfo({ username: username.trim(), roomCode, isHost })
        onViewChange('game')
      })
    }
  }

  return (
    <div className="panel fade-in" style={{ maxWidth: '500px', margin: '100px auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '32px', fontSize: '2.5rem' }}>
        🐥 Rhymes Game
      </h1>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid var(--bg-light)',
            background: 'var(--bg-dark)',
            color: 'var(--text-light)',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
        <button 
          onClick={handleCreateRoom}
          className="btn btn-primary"
          disabled={!username.trim()}
        >
          🎮 Host New Room
        </button>
        
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>OR</div>
        
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Room Code"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid var(--bg-light)',
              background: 'var(--bg-dark)',
              color: 'var(--text-light)',
              fontSize: '16px',
              marginBottom: '12px'
            }}
          />
          <button 
            onClick={handleJoinRoom}
            className="btn btn-secondary"
            style={{ width: '100%' }}
            disabled={!username.trim() || !roomCode.trim()}
          >
          ➕ Join Existing Room
          </button>
        </div>
      </div>
    </div>
  )
}

export default Lobby
