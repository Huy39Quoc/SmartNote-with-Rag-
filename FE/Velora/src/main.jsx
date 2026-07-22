import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a18',
            color: '#e8e6de',
            border: '.5px solid #2a2a28',
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#6ec48a', secondary: '#1a1a18' } },
          error:   { iconTheme: { primary: '#e05757', secondary: '#1a1a18' } },
        }}
      />
    </BrowserRouter>
)
