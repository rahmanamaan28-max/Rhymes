import confetti from 'canvas-confetti'

export const triggerWinConfetti = () => {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 }
  })
  
  // Additional bursts for celebration
  setTimeout(() => {
    confetti({
      particleCount: 100,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    })
  }, 250)
  
  setTimeout(() => {
    confetti({
      particleCount: 100,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    })
  }, 400)
}
