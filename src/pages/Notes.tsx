import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'

const MAX_FILE_SIZE = 500 * 1024 // 500 KB

type Note = {
  id: string
  raw_text: string
  structured_md: string
  uploaded_at: string
  is_active: boolean
}

export default function Notes() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [rawText, setRawText] = useState('')
  const [structuredMd, setStructuredMd] = useState('')
  const [isStructuring, setIsStructuring] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [previewTab, setPreviewTab] = useState<'raw' | 'structured'>('structured')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true)
    try {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .order('uploaded_at', { ascending: false })
      setNotes((data as Note[]) ?? [])
    } finally {
      setLoadingNotes(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const readFile = (f: File) => {
    if (!f.name.endsWith('.txt') && !f.name.endsWith('.md')) {
      setError('Only .txt and .md files are supported.')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 500 KB.')
      return
    }
    setError('')
    setFile(f)
    setStructuredMd('')
    const reader = new FileReader()
    reader.onload = (e) => setRawText((e.target?.result as string) ?? '')
    reader.readAsText(f)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith('.txt') || dropped.name.endsWith('.md'))) readFile(dropped)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) readFile(selected)
  }

  const handleStructure = async () => {
    setIsStructuring(true)
    setStructuredMd('')
    setError('')
    try {
      const res = await fetch('/.netlify/functions/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Server error ${res.status}`)
      }
      const text = await res.text()
      setStructuredMd(text)
      setPreviewTab('structured')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to structure notes. Please try again.')
    } finally {
      setIsStructuring(false)
    }
  }

  const handleSave = async () => {
    if (!structuredMd) return
    setIsSaving(true)
    try {
      await supabase.from('notes').insert({
        raw_text: rawText,
        structured_md: structuredMd,
        is_active: notes.length === 0, // auto-activate if it's the first note
      })
      setFile(null)
      setRawText('')
      setStructuredMd('')
      await loadNotes()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetActive = async (id: string) => {
    // Deactivate all, then activate the chosen one
    await supabase.from('notes').update({ is_active: false }).neq('id', id)
    await supabase.from('notes').update({ is_active: true }).eq('id', id)
    await loadNotes()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    await supabase.from('notes').delete().eq('id', id)
    await loadNotes()
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-10">

      {/* Upload section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-muted-foreground mt-1">
            Upload your class notes and Claude will structure them for your sessions.
          </p>
        </div>

        {/* Drop zone */}
        {!file ? (
          <>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <p className="text-muted-foreground text-sm">
                Drop a <span className="font-medium text-foreground">.txt</span> or{' '}
                <span className="font-medium text-foreground">.md</span> file here, or{' '}
                <span className="text-primary underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Max 500 KB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">{file.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFile(null); setRawText(''); setStructuredMd(''); setError('') }}
                >
                  Remove
                </Button>
              </div>
              <CardDescription>
                {rawText.split('\n').length} lines · {rawText.length.toLocaleString()} characters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!structuredMd ? (
                <>
                  <Button onClick={handleStructure} disabled={isStructuring} className="w-full">
                    {isStructuring ? 'Structuring your notes…' : 'Structure with AI'}
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </>
              ) : (
                <>
                  {/* Tab toggle */}
                  <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
                    {(['structured', 'raw'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setPreviewTab(tab)}
                        className={`px-3 py-1 text-sm rounded transition-colors capitalize ${
                          previewTab === tab
                            ? 'bg-background shadow-sm font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab === 'structured' ? 'Structured' : 'Raw'}
                      </button>
                    ))}
                  </div>

                  {/* Preview */}
                  <ScrollArea className="h-80 rounded-md border p-4">
                    {previewTab === 'structured' ? (
                      <div className="prose prose-sm max-w-none text-foreground">
                        <ReactMarkdown>{structuredMd}</ReactMarkdown>
                      </div>
                    ) : (
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                        {rawText}
                      </pre>
                    )}
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                      {isSaving ? 'Saving…' : 'Save to Library'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleStructure}
                      disabled={isStructuring}
                    >
                      Re-structure
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Library */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Library</h2>

        {loadingNotes ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No notes saved yet. Upload your first file above.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">
                        {new Date(note.uploaded_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </CardTitle>
                      {note.is_active && <Badge variant="secondary">Active</Badge>}
                    </div>
                    <div className="flex gap-2">
                      {!note.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(note.id)}
                        >
                          Set Active
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(note.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {note.structured_md.split('\n').find((l) => l.trim()) ?? ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
