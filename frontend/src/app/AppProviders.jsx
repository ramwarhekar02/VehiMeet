import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { ThemeProvider } from '../contexts/ThemeContext'

export const AppProviders = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>{children}</SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
)
