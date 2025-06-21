"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { apiService } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, ArrowLeft, MoreHorizontal, Trash2, Edit, Calendar, FileText, Save, X } from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface BoardCard {
  _id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: string
  assignedTo?: string[]
  labels?: string[]
  position: number
  createdAt: string
  updatedAt: string
}

interface Column {
  _id: string
  title: string
  color?: string
  limit?: number
  position: number
  cards: BoardCard[]
}

interface Board {
  _id: string
  title: string
  description?: string
  backgroundColor?: string
  notes?: string
  columns: Column[]
}

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
}

export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const boardId = params.boardId as string
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false)
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false)
  const [isEditCardModalOpen, setIsEditCardModalOpen] = useState(false)
  const [selectedColumnId, setSelectedColumnId] = useState("")
  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null)
  const [newColumn, setNewColumn] = useState({ title: "", color: "#007bff", limit: "" })
  const [newCard, setNewCard] = useState({
    title: "",
    description: "",
    priority: "medium" as BoardCard["priority"],
    dueDate: "",
  })
  const { toast } = useToast()

  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)

  useEffect(() => {
    fetchBoard()
  }, [boardId])

  const fetchBoard = async () => {
    try {
      const response = await apiService.get(`/boards/${boardId}`)
      setBoard(response.data)
      setNotes(response.data.notes || "")
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch board")
    } finally {
      setLoading(false)
    }
  }

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const columnData = {
        title: newColumn.title,
        color: newColumn.color,
        ...(newColumn.limit && { limit: Number.parseInt(newColumn.limit) }),
      }
      const response = await apiService.post(`/columns/board/${boardId}`, columnData)

      if (board) {
        setBoard({
          ...board,
          columns: [...board.columns, { ...response.data, cards: [] }],
        })
      }

      setIsAddColumnModalOpen(false)
      setNewColumn({ title: "", color: "#007bff", limit: "" })
      toast({ title: "Success", description: "Column added successfully" })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to add column",
        variant: "destructive",
      })
    }
  }

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const cardData = {
        ...newCard,
        ...(newCard.dueDate && { dueDate: newCard.dueDate }),
      }
      const response = await apiService.post(`/cards/column/${selectedColumnId}`, cardData)

      if (board) {
        const updatedColumns = board.columns.map((col) =>
          col._id === selectedColumnId ? { ...col, cards: [...col.cards, response.data] } : col,
        )
        setBoard({ ...board, columns: updatedColumns })
      }

      setIsAddCardModalOpen(false)
      setNewCard({ title: "", description: "", priority: "medium", dueDate: "" })
      toast({ title: "Success", description: "Card added successfully" })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to add card",
        variant: "destructive",
      })
    }
  }

  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCard) return

    try {
      const cardData = {
        ...newCard,
        ...(newCard.dueDate && { dueDate: newCard.dueDate }),
      }
      await apiService.put(`/cards/${selectedCard._id}`, cardData)

      if (board) {
        const updatedColumns = board.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) => (card._id === selectedCard._id ? { ...card, ...cardData } : card)),
        }))
        setBoard({ ...board, columns: updatedColumns })
      }

      setIsEditCardModalOpen(false)
      setSelectedCard(null)
      setNewCard({ title: "", description: "", priority: "medium", dueDate: "" })
      toast({ title: "Success", description: "Card updated successfully" })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update card",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      await apiService.delete(`/cards/${cardId}`)

      if (board) {
        const updatedColumns = board.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((card) => card._id !== cardId),
        }))
        setBoard({ ...board, columns: updatedColumns })
      }

      toast({ title: "Success", description: "Card deleted successfully" })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete card",
        variant: "destructive",
      })
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await apiService.delete(`/columns/${columnId}`)

      if (board) {
        const updatedColumns = board.columns.filter((col) => col._id !== columnId)
        setBoard({ ...board, columns: updatedColumns })
      }

      toast({ title: "Success", description: "Column deleted successfully" })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete column",
        variant: "destructive",
      })
    }
  }

  const handleSaveNotes = async () => {
    setNotesLoading(true)
    try {
      await apiService.put(`/boards/${boardId}`, { notes })
      if (board) {
        setBoard({ ...board, notes })
      }
      setIsEditingNotes(false)
      toast({ title: "Success", description: "Notes saved successfully" })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to save notes",
        variant: "destructive",
      })
    } finally {
      setNotesLoading(false)
    }
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !board) return

    const { source, destination, draggableId } = result

    // If dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const sourceColumn = board.columns.find((col) => col._id === source.droppableId)
    const destColumn = board.columns.find((col) => col._id === destination.droppableId)

    if (!sourceColumn || !destColumn) return

    const draggedCard = sourceColumn.cards[source.index]

    try {
      // Update card position on server
      await apiService.put(`/cards/${draggableId}`, {
        columnId: destination.droppableId,
        position: destination.index,
      })

      // Update local state
      const newColumns = board.columns.map((column) => {
        if (column._id === source.droppableId) {
          // Remove card from source column
          const newCards = [...column.cards]
          newCards.splice(source.index, 1)
          return { ...column, cards: newCards }
        }

        if (column._id === destination.droppableId) {
          // Add card to destination column
          const newCards = [...column.cards]
          newCards.splice(destination.index, 0, draggedCard)
          return { ...column, cards: newCards }
        }

        return column
      })

      setBoard({ ...board, columns: newColumns })
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to move card",
        variant: "destructive",
      })
    }
  }

  const openEditCardModal = (card: BoardCard) => {
    setSelectedCard(card)
    setNewCard({
      title: card.title,
      description: card.description || "",
      priority: card.priority,
      dueDate: card.dueDate ? card.dueDate.split("T")[0] : "",
    })
    setIsEditCardModalOpen(true)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !board) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-4">
          <Alert variant="destructive">
            <AlertDescription>{error || "Board not found"}</AlertDescription>
          </Alert>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{board.title}</h1>
                  {board.description && <p className="text-sm text-gray-600">{board.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsNotesOpen(!isNotesOpen)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Notes
                </Button>
                <Dialog open={isAddColumnModalOpen} onOpenChange={setIsAddColumnModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Column
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Column</DialogTitle>
                      <DialogDescription>Create a new column to organize your tasks.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddColumn}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="columnTitle">Title *</Label>
                          <Input
                            id="columnTitle"
                            value={newColumn.title}
                            onChange={(e) => setNewColumn({ ...newColumn, title: e.target.value })}
                            placeholder="Enter column title"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="columnColor">Color</Label>
                          <Input
                            id="columnColor"
                            type="color"
                            value={newColumn.color}
                            onChange={(e) => setNewColumn({ ...newColumn, color: e.target.value })}
                            className="h-10"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="columnLimit">Card Limit (optional)</Label>
                          <Input
                            id="columnLimit"
                            type="number"
                            value={newColumn.limit}
                            onChange={(e) => setNewColumn({ ...newColumn, limit: e.target.value })}
                            placeholder="Maximum number of cards"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Add Column</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </header>

        {/* Board Content */}
        <main className="flex h-[calc(100vh-4rem)]">
          {/* Notes Panel */}
          <div
            className={`bg-white border-r transition-all duration-300 ease-in-out ${
              isNotesOpen ? "w-80" : "w-0"
            } overflow-hidden`}
          >
            {isNotesOpen && (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Board Notes
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsNotesOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">Keep track of important information about this board</p>
                </div>

                <div className="flex-1 p-4">
                  {isEditingNotes ? (
                    <div className="h-full flex flex-col">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add your board notes here..."
                        className="flex-1 resize-none border-0 p-0 focus-visible:ring-0 text-sm"
                        style={{ minHeight: "300px" }}
                      />
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={notesLoading}
                          className="flex items-center gap-1"
                        >
                          {notesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditingNotes(false)
                            setNotes(board?.notes || "")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      <div className="flex-1">
                        {notes ? (
                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                              {notes}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm mb-4">No notes yet</p>
                            <Button
                              size="sm"
                              onClick={() => setIsEditingNotes(true)}
                              className="flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add Notes
                            </Button>
                          </div>
                        )}
                      </div>

                      {notes && (
                        <div className="pt-4 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingNotes(true)}
                            className="w-full flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit Notes
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Board Content */}
          <div className="flex-1 p-6 overflow-hidden">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-6 overflow-x-auto pb-6 h-full">
                {board.columns.map((column) => (
                  <div key={column._id} className="flex-shrink-0 w-80">
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
                            <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {column.cards.length}
                              {column.limit && `/${column.limit}`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedColumnId(column._id)
                                setIsAddCardModalOpen(true)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Column
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Column</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this column? This action cannot be undone and
                                        will delete all cards in this column.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteColumn(column._id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Droppable droppableId={column._id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                                snapshot.isDraggingOver ? "bg-blue-50" : ""
                              }`}
                            >
                              {column.cards.map((card, index) => (
                                <Draggable key={card._id} draggableId={card._id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                        snapshot.isDragging ? "rotate-3 shadow-lg" : ""
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium text-sm text-gray-900 flex-1">{card.title}</h4>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => openEditCardModal(card)}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit Card
                                            </DropdownMenuItem>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                  <Trash2 className="h-4 w-4 mr-2" />
                                                  Delete Card
                                                </DropdownMenuItem>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete Card</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Are you sure you want to delete this card? This action cannot be
                                                    undone.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() => handleDeleteCard(card._id)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                  >
                                                    Delete
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      {card.description && (
                                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{card.description}</p>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <Badge className={`text-xs ${priorityColors[card.priority]}`}>
                                          {card.priority}
                                        </Badge>
                                        {card.dueDate && (
                                          <div className="flex items-center text-xs text-gray-500">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {new Date(card.dueDate).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </DragDropContext>
          </div>
        </main>

        {/* Add Card Modal */}
        <Dialog open={isAddCardModalOpen} onOpenChange={setIsAddCardModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Card</DialogTitle>
              <DialogDescription>Create a new task card for this column.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCard}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="cardTitle">Title *</Label>
                  <Input
                    id="cardTitle"
                    value={newCard.title}
                    onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                    placeholder="Enter card title"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cardDescription">Description</Label>
                  <Textarea
                    id="cardDescription"
                    value={newCard.description}
                    onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                    placeholder="Enter card description (optional)"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cardPriority">Priority</Label>
                  <Select
                    value={newCard.priority}
                    onValueChange={(value: BoardCard["priority"]) => setNewCard({ ...newCard, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cardDueDate">Due Date</Label>
                  <Input
                    id="cardDueDate"
                    type="date"
                    value={newCard.dueDate}
                    onChange={(e) => setNewCard({ ...newCard, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Card</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Card Modal */}
        <Dialog open={isEditCardModalOpen} onOpenChange={setIsEditCardModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Card</DialogTitle>
              <DialogDescription>Update the card details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditCard}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="editCardTitle">Title *</Label>
                  <Input
                    id="editCardTitle"
                    value={newCard.title}
                    onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                    placeholder="Enter card title"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editCardDescription">Description</Label>
                  <Textarea
                    id="editCardDescription"
                    value={newCard.description}
                    onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                    placeholder="Enter card description (optional)"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editCardPriority">Priority</Label>
                  <Select
                    value={newCard.priority}
                    onValueChange={(value: BoardCard["priority"]) => setNewCard({ ...newCard, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editCardDueDate">Due Date</Label>
                  <Input
                    id="editCardDueDate"
                    type="date"
                    value={newCard.dueDate}
                    onChange={(e) => setNewCard({ ...newCard, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Card</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
