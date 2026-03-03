import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Mi Profesor</h1>
        <p className="text-muted-foreground text-lg">
          Tu tutor personal de español, basado en tus propios apuntes de clase.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Iniciar una sesión
              <Badge variant="secondary">15 min</Badge>
            </CardTitle>
            <CardDescription>
              Practica con una mezcla de ejercicios basados en tus apuntes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <Link to="/session">Comenzar sesión</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apuntes</CardTitle>
              <CardDescription>Sube tus apuntes de clase para potenciar tus sesiones.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/notes">Gestionar apuntes</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progreso</CardTitle>
              <CardDescription>Revisa tu historial de sesiones y puntos débiles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/progress">Ver progreso</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
