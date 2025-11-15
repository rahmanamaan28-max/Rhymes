import React, { useState, useContext } from 'react'
import { GameStateContext } from '../context/GameStateContext'

const ModeSelection = ({ onViewChange }) => {
  const [mode, setMode] = useState('points')
  const [rounds, setRounds] = useState(10)
  const { socket, setPlayerInfo, playerInfo } = useContext(GameStateContext)

  const handleStartGame = () => {
    if (playerInfo?.isHost) {
      socket.emit('startGame', { mode, rounds: mode === 'rounds' ? rounds : null })
    }
    onViewChange('game')
  }

  return (
    <div className="panel fade-in" style={{ maxWidth: '500px', margin: '100px auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '32px' }}>
        Game Settings
      </h1>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Game Mode
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid var(--bg-light)',
            background: 'var(--bg-dark)',
            color: 'var(--text-light)',
            fontSize: '16px'
          }}
        >
          <option value="points">Points Mode (First to 20 points)</option>
          <option value="rounds">Rounds Mode (Fixed number of rounds)</option>
        </select>
      </div>

      {mode === 'rounds' && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Number of Rounds
          </label>
          <input
            type="number"
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value))}
            min="1"
            max="50"
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
      )}

      <button 
        onClick={handleStartGame}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        Start Game
      </button>
    </div>
  )
}

export default ModeSelection
