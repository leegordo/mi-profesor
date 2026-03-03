import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { AuthProvider, useAuth } from '@/lib/auth'
import Login from '@/pages/Login'

const Home = lazy(() => import('@/pages/Home'))
const Session = lazy(() => import('@/pages/Session'))
const Notes = lazy(() => import('@/pages/Notes'))
const Progress = lazy(() => import('@/pages/Progress'))

const PAGE_TITLES: Record<string, string> = {
  '/': 'Mi Profesor',
  '/session': 'Sesión — Mi Profesor',
  '/notes': 'Apuntes — Mi Profesor',
  '/progress': 'Progreso — Mi Profesor',
}

function TitleUpdater() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = PAGE_TITLES[pathname] ?? 'Mi Profesor'
  }, [pathname])
  return null
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
        <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.15s]" />
        <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  )
}

function Nav() {
  const { signOut } = useAuth()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <NavLink to="/" className="font-bold text-base tracking-tight">
          Mi Profesor
        </NavLink>
        <nav className="flex items-center gap-4 sm:gap-6">
          <NavLink to="/session" className={linkClass}>Sesión</NavLink>
          <NavLink to="/notes" className={linkClass}>Apuntes</NavLink>
          <NavLink to="/progress" className={linkClass}>Progreso</NavLink>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            Cerrar sesión
          </Button>
        </nav>
      </div>
      <Separator />
    </header>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/session" element={<Session />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TitleUpdater />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
