import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { captureInstallPrompt } from './lib/device'
import { unlockAudio } from './lib/sound'
import './index.css'

captureInstallPrompt() // catch Android's "can install" signal early
unlockAudio() // browsers allow sound only after the first tap

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
