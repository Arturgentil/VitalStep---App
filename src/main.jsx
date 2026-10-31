import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { migrateBrandStorage } from '@/lib/migrateBrandStorage'
import '@/index.css'

migrateBrandStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
