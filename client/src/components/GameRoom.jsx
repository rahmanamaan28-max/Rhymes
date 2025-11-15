import React, { useState, useEffect, useContext } from 'react'
import { GameStateContext } from '../context/GameStateContext'

const GameRoom = ({ onViewChange }) => {
  const { socket, gameState, playerInfo } = useContext(GameStateContext)
  const [players, setPlayers] = useState([])
  const [currentWord, setCurrentWord] = useState('')
  const [chuckPlayer, setChuckPlayer] = useState(null)
  const [answer, setAnswer] = useState('')
  const [roundResults, setRoundResults] = useState(null)
  const [timeLeft, setTimeLeft] = useState(20)

  useEffect(() => {
    const handlePlayersUpdated = (playersList) => setPlayers(playersList)
    const handleNewRound = (data) => {
      setChuckPlayer(data.chuckId)
      setCurrentWord('')
      setRoundResults(null)
      setTimeLeft(20)
    }
    const handleWordRevealed = ({ word }) => setCurrentWord(word)
    const handleRoundResults = (results) => {
      setRoundResults(results)
      if (results.winner) {
        import('canvas-confetti').then((confetti) => {
          confetti.default({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
        })
      }
    }

    socket.on('playersUpdated', handlePlayersUpdated)
    socket.on('newRound', handleNewRound)
    socket.on('wordRevealed', handleWordRevealed)
    socket.on('roundResults', handleRoundResults)

    return () => {
      socket.off('playersUpdated', handlePlayersUpdated)
      socket.off('newRound', handleNewRound)
      socket.off('wordRevealed', handleWordRevealed)
      socket.off('roundResults', handleRoundResults)
    }
  }, [socket])

  useEffect(() => {
    if (timeLeft > 0 && (gameState === 'chuckTurn' || gameState === 'answering')) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, gameState])

  const handleSubmitWord = () => {
    if (currentWord.trim()) {
      socket.emit('submitWord', currentWord.trim())
    }
  }

  const handleSubmitAnswer = () => {
    if (answer.trim()) {
      socket.emit('submitAnswer', answer.trim())
      setAnswer('')
    }
  }

  const getLifeDisplay = (lives) => {
    const quack = 'QUACK'
    return quack.split('').map((letter, index) => (
      <span key={index} className={index < (5 - lives) ? 'life-lost' : ''}>
        {index < (5 - lives) ? letter : '_'}
      </span>
    ))
  }

  const isCurrentPlayerChuck = playerInfo && chuckPlayer === socket.id

  return (
    <div className="panel">
      {/* Room Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2>Room: {playerInfo?.roomCode}</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>Timer: {timeLeft}s</div>
          {playerInfo?.isHost && (
            <button className="btn btn-secondary">Game Settings</button>
          )}
        </div>
      </div>

      {/* Players List */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {players.map(player => (
          <div 
            key={player.id}
            className={`fade-in ${player.status === 'eliminated' ? 'opacity-50' : ''}`}
            style={{
              padding: '16px',
              background: 'var(--bg-light)',
              borderRadius: '8px',
              border: player.id === chuckPlayer ? '3px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{player.username}</strong>
                {player.id === chuckPlayer && <span className="chuck-highlight">🐥 Chuck</span>}
              </div>
              <div>Score: {player.score}</div>
            </div>
            <div className="life-indicator" style={{ marginTop: '8px' }}>
              {getLifeDisplay(player.lives)}
            </div>
          </div>
        ))}
      </div>

      {/* Game Area */}
      <div style={{ marginBottom: '24px' }}>
        {gameState === 'chuckTurn' && isCurrentPlayerChuck && (
          <div className="fade-in">
            <h3 style={{ textAlign: 'center', marginBottom: '16px' }}>
              🎯 Your turn as Chuck! Enter a word:
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={currentWord}
                onChange={(e) => setCurrentWord(e.target.value)}
                placeholder="Enter your word..."
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid var(--accent-gold)',
                  background: 'var(--bg-dark)',
                  color: 'var(--text-light)',
                  fontSize: '16px'
                }}
              />
              <button onClick={handleSubmitWord} className="btn btn-primary">
                Submit Word
              </button>
            </div>
          </div>
        )}

        {gameState === 'answering' && currentWord && (
          <div className="fade-in">
            <h3 style={{ textAlign: 'center', marginBottom: '16px' }}>
              Rhyme with: <span style={{ color: 'var(--accent-gold)' }}>{currentWord}</span>
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your rhyming word..."
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid var(--bg-light)',
                  background: 'var(--bg-dark)',
                  color: 'var(--text-light)',
                  fontSize: '16px'
                }}
              />
              <button onClick={handleSubmitAnswer} className="btn btn-primary">
                Submit Answer
              </button>
            </div>
          </div>
        )}

        {roundResults && (
          <div className="fade-in" style={{ 
            background: 'var(--bg-light)', 
            padding: '20px', 
            borderRadius: '8px',
            marginTop: '16px'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '16px' }}>Round Results</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {Object.entries(roundResults.answers || {}).map(([playerId, word]) => {
                const player = players.find(p => p.id === playerId)
                return (
                  <div key={playerId} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px'
                  }}>
                    <span>{player?.username}:</span>
                    <strong>{word}</strong>
                  </div>
                )
              })}
            </div>
            {roundResults.winner && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <h3>🎉 Winner: {roundResults.winner.username} 🎉</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GameRoom
