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
          Your personal Spanish tutor, powered by your own class notes.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Start a Session
              <Badge variant="secondary">15 min</Badge>
            </CardTitle>
            <CardDescription>
              Practice with a randomized mix of exercises drawn from your notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <Link to="/session">Begin Session</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
              <CardDescription>Upload your class notes to power your sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/notes">Manage Notes</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
              <CardDescription>Review your session history and weak spots.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/progress">View Progress</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
