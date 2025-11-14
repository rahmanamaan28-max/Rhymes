import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Lobby from './components/Lobby'
import GameRoom from './components/GameRoom'
import ModeSelection from './components/ModeSelection'
import { GameStateProvider } from './context/GameStateContext'
import './styles/global.css'

const socket = io('http://localhost:3001')

function App() {
  const [currentView, setCurrentView] = useState('lobby')
  const [gameState, setGameState] = useState(null)
  const [playerInfo, setPlayerInfo] = useState(null)

  useEffect(() => {
    socket.on('gameStateUpdated', (state) => {
      setGameState(state)
    })

    socket.on('gameFinished', ({ winner }) => {
      // Trigger confetti animation
      if (typeof window !== 'undefined' && window.confetti) {
        window.confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
    })

    return () => {
      socket.off('gameStateUpdated')
      socket.off('gameFinished')
    }
  }, [])

  return (
    <GameStateProvider value={{ socket, gameState, setGameState, playerInfo, setPlayerInfo }}>
      <div className="container">
        {currentView === 'lobby' && <Lobby onViewChange={setCurrentView} />}
        {currentView === 'modeSelection' && <ModeSelection onViewChange={setCurrentView} />}
        {currentView === 'game' && <GameRoom onViewChange={setCurrentView} />}
      </div>
    </GameStateProvider>
  )
}

export default App
