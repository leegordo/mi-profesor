import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'

const Home = lazy(() => import('@/pages/Home'))
const Session = lazy(() => import('@/pages/Session'))
const Notes = lazy(() => import('@/pages/Notes'))
const Progress = lazy(() => import('@/pages/Progress'))

const PAGE_TITLES: Record<string, string> = {
  '/': 'Mi Profesor',
  '/session': 'Session — Mi Profesor',
  '/notes': 'Notes — Mi Profesor',
  '/progress': 'Progress — Mi Profesor',
}

function TitleUpdater() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = PAGE_TITLES[pathname] ?? 'Mi Profesor'
  }, [pathname])
  return null
}

function Nav() {
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
          <NavLink to="/session" className={linkClass}>Session</NavLink>
          <NavLink to="/notes" className={linkClass}>Notes</NavLink>
          <NavLink to="/progress" className={linkClass}>Progress</NavLink>
        </nav>
      </div>
      <Separator />
    </header>
  )
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

export default function App() {
  return (
    <BrowserRouter>
      <TitleUpdater />
      <div className="min-h-screen bg-background">
        <Nav />
        <main>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/session" element={<Session />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/progress" element={<Progress />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}
