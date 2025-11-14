import React, { createContext, useState } from 'react'

export const GameStateContext = createContext()

export const GameStateProvider = ({ children }) => {
  const [gameState, setGameState] = useState(null)
  const [playerInfo, setPlayerInfo] = useState(null)
  const [socket] = useState(() => io('http://localhost:3001'))

  return (
    <GameStateContext.Provider value={{
      socket,
      gameState,
      setGameState,
      playerInfo,
      setPlayerInfo
    }}>
      {children}
    </GameStateContext.Provider>
  )
}
