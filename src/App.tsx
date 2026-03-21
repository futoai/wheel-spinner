import { useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import {
  Download,
  FilePlus2,
  Loader2,
  RotateCw,
  Scissors,
  Trash2,
  Upload,
} from 'lucide-react'
import { PDFDocument, degrees } from 'pdf-lib'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

GlobalWorkerOptions.workerSrc = workerUrl

type SourceDoc = {
  id: string
  name: string
  bytes: Uint8Array
  pdf: PDFDocument
}

type PageItem = {
  id: string
  sourceDocId: string
  sourcePageIndex: number
  baseRotation: number
  rotationDelta: number
  previewDataUrl: string
  selected: boolean
}

type SplitRange = {
  from: number
  to: number
}

function normalizeRotation(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function parseSplitRanges(raw: string, max: number): SplitRange[] {
  if (!raw.trim()) {
    throw new Error('Enter one or more ranges, like 1-3,4-6')
  }

  const ranges = raw
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const parts = chunk.split('-').map((v) => v.trim())
      if (parts.length === 1) {
        const page = Number.parseInt(parts[0], 10)
        if (!Number.isInteger(page)) {
          throw new Error(`Invalid page "${chunk}"`)
        }
        return { from: page, to: page }
      }
      if (parts.length === 2) {
        const from = Number.parseInt(parts[0], 10)
        const to = Number.parseInt(parts[1], 10)
        if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
          throw new Error(`Invalid range "${chunk}"`)
        }
        return { from, to }
      }
      throw new Error(`Invalid range "${chunk}"`)
    })

  for (const range of ranges) {
    if (range.from < 1 || range.to > max) {
      throw new Error(`Range ${range.from}-${range.to} is outside 1-${max}`)
    }
  }

  return ranges
}

async function renderPagePreview(
  pdf: Awaited<ReturnType<typeof getDocument>['promise']>,
  pageNumber: number,
): Promise<string> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 0.28 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to create canvas context')
  }

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  await page.render({ canvasContext: context, viewport, canvas }).promise
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  page.cleanup()

  return dataUrl
}

async function buildPdf(pages: PageItem[], docs: SourceDoc[]): Promise<Uint8Array> {
  const docsById = new Map(docs.map((doc) => [doc.id, doc]))
  const output = await PDFDocument.create()

  for (const pageItem of pages) {
    const source = docsById.get(pageItem.sourceDocId)
    if (!source) {
      throw new Error('One or more source PDFs are missing')
    }

    const [copied] = await output.copyPages(source.pdf, [pageItem.sourcePageIndex])
    copied.setRotation(degrees(normalizeRotation(pageItem.baseRotation + pageItem.rotationDelta)))
    output.addPage(copied)
  }

  return output.save()
}

function SortablePageCard({
  page,
  index,
  onToggle,
}: {
  page: PageItem
  index: number
  onToggle: (id: string, checked: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-55' : ''}>
      <Card className="gap-2 overflow-hidden py-0">
        <div className="bg-muted relative">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing"
            aria-label={`Drag page ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <img
              src={page.previewDataUrl}
              alt={`Page ${index + 1} thumbnail`}
              className="aspect-[3/4] w-full object-cover"
              draggable={false}
            />
          </button>
          {page.rotationDelta !== 0 ? (
            <Badge className="absolute top-2 right-2">{normalizeRotation(page.rotationDelta)}°</Badge>
          ) : null}
        </div>
        <CardContent className="space-y-2 px-3 pb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Page {index + 1}</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`page-${page.id}`}
                checked={page.selected}
                onCheckedChange={(checked) => onToggle(page.id, checked === true)}
                aria-label={`Select page ${index + 1}`}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">Drag to reorder</p>
        </CardContent>
      </Card>
    </div>
  )
}

function App() {
  const [docs, setDocs] = useState<SourceDoc[]>([])
  const [pages, setPages] = useState<PageItem[]>([])
  const [busyLabel, setBusyLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [splitInput, setSplitInput] = useState('1-3,4-6')
  const [isDropActive, setIsDropActive] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const selectedCount = useMemo(() => pages.filter((page) => page.selected).length, [pages])

  const handleFiles = async (fileList: FileList | null): Promise<void> => {
    if (!fileList?.length) {
      return
    }

    setError(null)
    setBusyLabel('Importing and rendering pages...')

    try {
      const incoming = Array.from(fileList).filter((file) => file.type === 'application/pdf')
      if (!incoming.length) {
        throw new Error('Only PDF files are supported')
      }

      const newDocs: SourceDoc[] = []
      const newPages: PageItem[] = []

      for (const file of incoming) {
        const fileBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(fileBuffer)
        const pdf = await PDFDocument.load(bytes)
        const previewTask = getDocument({ data: bytes })
        const previewDoc = await previewTask.promise

        const sourceDoc: SourceDoc = {
          id: crypto.randomUUID(),
          name: file.name,
          bytes,
          pdf,
        }

        newDocs.push(sourceDoc)

        for (let sourcePageIndex = 0; sourcePageIndex < pdf.getPageCount(); sourcePageIndex += 1) {
          const page = pdf.getPage(sourcePageIndex)
          const previewDataUrl = await renderPagePreview(previewDoc, sourcePageIndex + 1)

          newPages.push({
            id: crypto.randomUUID(),
            sourceDocId: sourceDoc.id,
            sourcePageIndex,
            baseRotation: page.getRotation().angle,
            rotationDelta: 0,
            previewDataUrl,
            selected: false,
          })
        }
        await previewTask.destroy()
      }

      setDocs((current) => [...current, ...newDocs])
      setPages((current) => [...current, ...newPages])
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load PDF files'
      setError(message)
    } finally {
      setBusyLabel(null)
    }
  }

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    setPages((current) => {
      const oldIndex = current.findIndex((page) => page.id === active.id)
      const newIndex = current.findIndex((page) => page.id === over.id)
      if (oldIndex === -1 || newIndex === -1) {
        return current
      }
      return arrayMove(current, oldIndex, newIndex)
    })
  }

  const togglePageSelection = (id: string, checked: boolean): void => {
    setPages((current) =>
      current.map((page) => {
        if (page.id !== id) {
          return page
        }
        return { ...page, selected: checked }
      }),
    )
  }

  const setAllSelections = (checked: boolean): void => {
    setPages((current) => current.map((page) => ({ ...page, selected: checked })))
  }

  const rotateSelected = (): void => {
    setPages((current) =>
      current.map((page) => {
        if (!page.selected) {
          return page
        }
        return { ...page, rotationDelta: normalizeRotation(page.rotationDelta + 90) }
      }),
    )
  }

  const deleteSelected = (): void => {
    setPages((current) => current.filter((page) => !page.selected))
  }

  const clearWorkspace = (): void => {
    setDocs([])
    setPages([])
    setError(null)
  }

  const exportMergedPdf = async (): Promise<void> => {
    if (!pages.length) {
      return
    }

    setError(null)
    setBusyLabel('Creating merged PDF...')

    try {
      const mergedBytes = await buildPdf(pages, docs)
      saveAs(new Blob([toArrayBuffer(mergedBytes)], { type: 'application/pdf' }), 'merged.pdf')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to create merged PDF'
      setError(message)
    } finally {
      setBusyLabel(null)
    }
  }

  const extractSelected = async (): Promise<void> => {
    const selectedPages = pages.filter((page) => page.selected)
    if (!selectedPages.length) {
      return
    }

    setError(null)
    setBusyLabel('Extracting selected pages...')

    try {
      const extractedBytes = await buildPdf(selectedPages, docs)
      saveAs(new Blob([toArrayBuffer(extractedBytes)], { type: 'application/pdf' }), 'extracted-pages.pdf')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to extract pages'
      setError(message)
    } finally {
      setBusyLabel(null)
    }
  }

  const splitByRanges = async (): Promise<void> => {
    if (!pages.length) {
      return
    }

    setError(null)
    setBusyLabel('Splitting pages and creating zip...')

    try {
      const ranges = parseSplitRanges(splitInput, pages.length)
      const zip = new JSZip()

      for (const range of ranges) {
        const subset = pages.slice(range.from - 1, range.to)
        const bytes = await buildPdf(subset, docs)
        const label = range.from === range.to ? `${range.from}` : `${range.from}-${range.to}`
        zip.file(`split-${label}.pdf`, bytes)
      }

      const archive = await zip.generateAsync({ type: 'blob' })
      saveAs(archive, 'split-pdfs.zip')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to split pages'
      setError(message)
    } finally {
      setBusyLabel(null)
    }
  }

  return (
    <main
      className="from-muted/60 to-background min-h-screen bg-linear-to-b p-4 md:p-8"
      onDragOver={(event) => {
        event.preventDefault()
        setIsDropActive(true)
      }}
      onDragLeave={() => setIsDropActive(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDropActive(false)
        void handleFiles(event.dataTransfer.files)
      }}
    >
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[330px_1fr]">
        <Card className="border-border/70 bg-card/80 gap-4 py-5 backdrop-blur-sm">
          <CardHeader className="space-y-4 px-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl">PDF Utils</CardTitle>
                <CardDescription>Client-side PDF toolkit powered by your browser.</CardDescription>
              </div>
              <Badge variant="secondary">No Uploads</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-5">
            <Label
              htmlFor="upload"
              className={`bg-muted/40 hover:bg-muted/70 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition ${isDropActive ? 'border-primary bg-primary/5' : ''}`}
            >
              <Upload className="size-5" />
              <span className="font-medium">Drop PDFs or click to add</span>
              <span className="text-muted-foreground text-xs">
                Merge multiple files, then reorder, rotate, delete, extract, and split pages.
              </span>
            </Label>
            <Input
              id="upload"
              type="file"
              className="hidden"
              accept="application/pdf"
              multiple
              onChange={(event) => {
                void handleFiles(event.target.files)
                event.currentTarget.value = ''
              }}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setAllSelections(true)} variant="outline" disabled={!pages.length}>
                Select all
              </Button>
              <Button onClick={() => setAllSelections(false)} variant="outline" disabled={!pages.length}>
                Clear select
              </Button>
              <Button
                onClick={() => {
                  void exportMergedPdf()
                }}
                disabled={!pages.length || busyLabel !== null}
              >
                <Download className="size-4" />
                Download merged
              </Button>
              <Button
                onClick={() => {
                  void extractSelected()
                }}
                variant="secondary"
                disabled={!selectedCount || busyLabel !== null}
              >
                <FilePlus2 className="size-4" />
                Extract selected
              </Button>
              <Button onClick={rotateSelected} variant="outline" disabled={!selectedCount}>
                <RotateCw className="size-4" />
                Rotate 90°
              </Button>
              <Button onClick={deleteSelected} variant="destructive" disabled={!selectedCount}>
                <Trash2 className="size-4" />
                Delete selected
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="split-ranges">Split ranges</Label>
              <Input
                id="split-ranges"
                value={splitInput}
                onChange={(event) => setSplitInput(event.target.value)}
                placeholder="1-3,4-6"
              />
              <p className="text-muted-foreground text-xs">Creates a zip with one PDF per range.</p>
              <Button
                onClick={() => {
                  void splitByRanges()
                }}
                variant="outline"
                className="w-full"
                disabled={!pages.length || busyLabel !== null}
              >
                <Scissors className="size-4" />
                Split to zip
              </Button>
            </div>

            <Separator />

            <div className="text-muted-foreground text-xs">
              <p>Total pages: {pages.length}</p>
              <p>Selected: {selectedCount}</p>
              <p>Loaded files: {docs.length}</p>
            </div>

            {busyLabel ? (
              <div className="bg-muted/40 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                <span>{busyLabel}</span>
              </div>
            ) : null}

            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <Button onClick={clearWorkspace} variant="ghost" className="w-full" disabled={!pages.length}>
              Clear workspace
            </Button>
          </CardContent>
        </Card>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-lg">Page Workspace</CardTitle>
            <CardDescription>
              Drag and drop cards to reorder pages. All operations run in your browser only.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            {pages.length ? (
              <ScrollArea className="h-[70vh] pr-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={pages.map((page) => page.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {pages.map((page, index) => (
                        <SortablePageCard
                          key={page.id}
                          page={page}
                          index={index}
                          onToggle={togglePageSelection}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </ScrollArea>
            ) : (
              <div className="text-muted-foreground flex h-[65vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
                <Upload className="size-6" />
                <p className="font-medium">No pages loaded yet</p>
                <p className="max-w-sm text-sm">Add one or more PDF files to start editing pages locally.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default App
