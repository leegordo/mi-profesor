import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'

type PersonalNote = {
  id: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

function excerpt(body: string): string {
  const flat = body.replace(/[#*`>_~-]/g, '').replace(/\s+/g, ' ').trim()
  return flat.length > 120 ? `${flat.slice(0, 120)}…` : flat
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Notebook() {
  const [notes, setNotes] = useState<PersonalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editor state. selectedId === null means "new note".
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dirty, setDirty] = useState(false)
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit')

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('personal_notes')
        .select('*')
        .order('updated_at', { ascending: false })
      setNotes((data as PersonalNote[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const isEmpty = !title.trim() && !body.trim()

  const newNote = () => {
    setSelectedId(null)
    setTitle('')
    setBody('')
    setDirty(false)
    setEditorTab('edit')
  }

  const openNote = (note: PersonalNote) => {
    setSelectedId(note.id)
    setTitle(note.title)
    setBody(note.body)
    setDirty(false)
    setEditorTab('edit')
  }

  const handleSave = async () => {
    if (isEmpty) return
    setSaving(true)
    try {
      if (selectedId) {
        await supabase
          .from('personal_notes')
          .update({ title, body, updated_at: new Date().toISOString() })
          .eq('id', selectedId)
      } else {
        const { data } = await supabase
          .from('personal_notes')
          .insert({ title, body })
          .select()
          .single()
        if (data) setSelectedId((data as PersonalNote).id)
      }
      setDirty(false)
      await loadNotes()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return
    await supabase.from('personal_notes').delete().eq('id', selectedId)
    newNote()
    await loadNotes()
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escribe tus propias notas en Markdown.
          </p>
        </div>
        <Button variant="outline" onClick={newNote}>
          Nueva nota
        </Button>
      </header>

      {/* ── Editor ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setDirty(true)
            }}
            placeholder="Título"
            className="text-base font-medium"
          />
          {dirty && (
            <Badge variant="secondary" className="shrink-0">
              sin guardar
            </Badge>
          )}
        </div>

        <div className="flex gap-1 text-sm">
          <button
            type="button"
            onClick={() => setEditorTab('edit')}
            className={`px-3 py-1 rounded-md transition-colors ${
              editorTab === 'edit'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('preview')}
            className={`px-3 py-1 rounded-md transition-colors ${
              editorTab === 'preview'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Vista previa
          </button>
        </div>

        {editorTab === 'edit' ? (
          <Textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              setDirty(true)
            }}
            placeholder="Escribe aquí… admite Markdown (# títulos, **negrita**, listas)."
            rows={12}
            className="resize-y font-mono text-sm leading-relaxed"
          />
        ) : (
          <div className="min-h-[18rem] rounded-md border bg-card px-4 py-3">
            {body.trim() ? (
              <div className="prose prose-sm max-w-none text-foreground">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nada que previsualizar todavía.</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isEmpty || saving || !dirty}>
            {saving ? 'Guardando…' : selectedId ? 'Guardar cambios' : 'Guardar'}
          </Button>
          {selectedId && (
            <Button variant="ghost" onClick={handleDelete} className="text-destructive">
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Saved notes list ───────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Tus notas {notes.length > 0 && `(${notes.length})`}
        </h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no tienes notas. Escribe una arriba y guárdala.
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <Card
                key={note.id}
                onClick={() => openNote(note)}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  note.id === selectedId ? 'border-primary' : ''
                }`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium truncate">
                      {note.title.trim() || 'Sin título'}
                    </h3>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(note.updated_at)}
                    </span>
                  </div>
                  {excerpt(note.body) && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {excerpt(note.body)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
