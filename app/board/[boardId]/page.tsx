"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import { LogOut } from "lucide-react"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
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
import {
  Loader2,
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Edit,
  Calendar,
  FileText,
  Save,
  X,
  User,
  Eye,
  EyeOff,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import dynamic from "next/dynamic"
import { useUser } from "@/context/UserContext"

// Dynamically import the rich text editor to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false })
import "react-quill/dist/quill.snow.css"

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

interface UserProfile {
  _id: string
  username: string
  email: string
}

interface Board {
  _id: string
  title: string
  description?: string
  backgroundColor?: string
  notes?: string
  columns: Column[]
  members?: UserProfile[]
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

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileData, setProfileData] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { user, logout } = useUser()

  useEffect(() => {
    fetchBoard()
  }, [boardId])

  useEffect(() => {
    if (user) {
      setProfileData({ ...profileData, username: user.username })
    }
  }, [user])

  const fetchBoard = async () => {
    try {
      const response = await apiService.get(`/boards/${boardId}`)
      setBoard(response.data)
      setNotes(response.data.notes || "")
      // Auto-open notes panel if there's existing data
      if (response.data.notes && response.data.notes.trim()) {
        setIsNotesOpen(true)
      }
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

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || !board) return

      const { source, destination, draggableId } = result

      // If dropped in the same position, do nothing
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return
      }

      const sourceColumnIndex = board.columns.findIndex((col) => col._id === source.droppableId)
      const destColumnIndex = board.columns.findIndex((col) => col._id === destination.droppableId)

      if (sourceColumnIndex === -1 || destColumnIndex === -1) return

      const sourceColumn = board.columns[sourceColumnIndex]
      const destColumn = board.columns[destColumnIndex]
      const draggedCard = sourceColumn.cards[source.index]

      // Create new columns array with optimistic update
      const newColumns = [...board.columns]

      if (source.droppableId === destination.droppableId) {
        // Moving within the same column
        const newCards = [...sourceColumn.cards]
        newCards.splice(source.index, 1)
        newCards.splice(destination.index, 0, draggedCard)
        newColumns[sourceColumnIndex] = { ...sourceColumn, cards: newCards }
      } else {
        // Moving between different columns
        const sourceCards = [...sourceColumn.cards]
        const destCards = [...destColumn.cards]

        sourceCards.splice(source.index, 1)
        destCards.splice(destination.index, 0, draggedCard)

        newColumns[sourceColumnIndex] = { ...sourceColumn, cards: sourceCards }
        newColumns[destColumnIndex] = { ...destColumn, cards: destCards }
      }

      // Update UI immediately for smooth experience
      setBoard({ ...board, columns: newColumns })

      try {
        // Update server
        await apiService.put(`/cards/${draggableId}`, {
          columnId: destination.droppableId,
          position: destination.index,
        })
      } catch (err: any) {
        // Revert on error
        fetchBoard()
        toast({
          title: "Error",
          description: "Failed to move card",
          variant: "destructive",
        })
      }
    },
    [board, toast],
  )

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)

    try {
      // Update username if changed
      if (profileData.username !== user?.username) {
        await apiService.put("/users/profile", {
          username: profileData.username,
        })

        // Update user context
        const updatedUser = { ...user!, username: profileData.username }
        localStorage.setItem("user", JSON.stringify(updatedUser))

        toast({
          title: "Success",
          description: "Username updated successfully",
        })
      }

      // Update password if provided
      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          toast({
            title: "Error",
            description: "New passwords do not match",
            variant: "destructive",
          })
          return
        }

        await apiService.put("/users/change-password", {
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
        })

        toast({
          title: "Success",
          description: "Password updated successfully",
        })
      }

      setIsProfileModalOpen(false)
      setProfileData({
        username: user?.username || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const resetProfileForm = () => {
    setProfileData({
      username: user?.username || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
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
              <div className="flex items-center gap-4">
                {/* Board Members */}
                {board.members && board.members.length > 0 && (
                  <TooltipProvider>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 font-medium">Members:</span>
                      <div className="flex -space-x-2">
                        {board.members.slice(0, 5).map((member) => (
                          <Tooltip key={member._id}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8 border-2 border-white hover:z-10 cursor-pointer transition-transform hover:scale-110">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-semibold">
                                  {member.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <p className="font-medium">{member.username}</p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {board.members.length > 5 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8 border-2 border-white bg-gray-100 cursor-pointer">
                                <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                                  +{board.members.length - 5}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div>
                                <p className="font-medium">More members:</p>
                                {board.members.slice(5).map((member) => (
                                  <p key={member._id} className="text-xs">
                                    {member.username}
                                  </p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </TooltipProvider>
                )}

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

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {user?.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user?.username}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Board Content */}
        <main className="flex h-[calc(100vh-4rem)]">
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

          {/* Notes Panel - Right Side */}
          <div
            className={`bg-white border-l transition-all duration-300 ease-in-out ${
              isNotesOpen ? "w-96" : "w-0"
            } overflow-hidden shadow-lg`}
          >
            {isNotesOpen && (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Board Notes
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsNotesOpen(false)}
                      className="hover:bg-white/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Keep track of important information, meeting notes, and sprint goals
                  </p>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  {isEditingNotes ? (
                    <div className="flex-1 flex flex-col p-4">
                      <div className="flex-1 border rounded-lg overflow-hidden">
                        <ReactQuill
                          value={notes}
                          onChange={setNotes}
                          placeholder="Write your board notes here..."
                          className="h-full"
                          modules={{
                            toolbar: [
                              [{ header: [1, 2, 3, false] }],
                              ["bold", "italic", "underline", "strike"],
                              [{ list: "ordered" }, { list: "bullet" }],
                              [{ color: [] }, { background: [] }],
                              ["link"],
                              ["clean"],
                            ],
                          }}
                          formats={[
                            "header",
                            "bold",
                            "italic",
                            "underline",
                            "strike",
                            "list",
                            "bullet",
                            "color",
                            "background",
                            "link",
                          ]}
                        />
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={notesLoading}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                        >
                          {notesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Save Notes
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
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1 p-4 overflow-y-auto">
                        {notes ? (
                          <div className="prose prose-sm max-w-none">
                            <div
                              className="text-sm text-gray-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: notes }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center py-8">
                            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full p-6 mb-4">
                              <FileText className="h-12 w-12 text-blue-600" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h4>
                            <p className="text-gray-500 text-sm mb-6 max-w-xs">
                              Start documenting your ideas, meeting notes, or project goals
                            </p>
                            <Button
                              onClick={() => setIsEditingNotes(true)}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="h-4 w-4" />
                              Write Notes Here
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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

        {/* Profile Modal */}
        <Dialog
          open={isProfileModalOpen}
          onOpenChange={(open) => {
            setIsProfileModalOpen(open)
            if (!open) resetProfileForm()
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Profile Settings</DialogTitle>
              <DialogDescription>Update your username and password here.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateProfile}>
              <div className="grid gap-4 py-4">
                {/* Current User Info */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                      {user?.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.username}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {/* Username */}
                <div className="grid gap-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    placeholder="Enter new username"
                    required
                    minLength={3}
                  />
                  <p className="text-xs text-gray-500">Minimum 3 characters</p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Change Password (Optional)</h4>

                  {/* Current Password */}
                  <div className="grid gap-2 mb-3">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={profileData.currentPassword}
                        onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="grid gap-2 mb-3">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Minimum 6 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsProfileModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Profile
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <style jsx global>{`
        .ql-editor {
          min-height: 300px !important;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .ql-toolbar {
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
          border-bottom: 1px solid #e5e7eb !important;
        }
        
        .ql-container {
          border-left: none !important;
          border-right: none !important;
          border-bottom: none !important;
        }
        
        .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }

        /* Smooth drag and drop animations */
        .react-beautiful-dnd-draggable {
          transition: transform 0.2s ease !important;
        }
        
        .react-beautiful-dnd-drag-handle {
          cursor: grab !important;
        }
        
        .react-beautiful-dnd-drag-handle:active {
          cursor: grabbing !important;
        }
        
        /* Smooth drop zone highlighting */
        .react-beautiful-dnd-droppable {
          transition: background-color 0.2s ease !important;
        }
      `}</style>
    </ProtectedRoute>
  )
}
