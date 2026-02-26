import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import Home from '@/pages/Home'
import Session from '@/pages/Session'
import Notes from '@/pages/Notes'
import Progress from '@/pages/Progress'

function Nav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`

  return (
    <header className="border-b">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <NavLink to="/" className="font-bold text-base">
          Mi Profesor
        </NavLink>
        <nav className="flex items-center gap-6">
          <NavLink to="/session" className={linkClass}>Session</NavLink>
          <NavLink to="/notes" className={linkClass}>Notes</NavLink>
          <NavLink to="/progress" className={linkClass}>Progress</NavLink>
        </nav>
      </div>
      <Separator />
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/session" element={<Session />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/progress" element={<Progress />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
