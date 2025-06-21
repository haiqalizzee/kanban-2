"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, LogOut, Calendar, Check, ChevronsUpDown, UserPlus, X, Edit } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface User {
  _id: string
  username: string
  email: string
}

interface BoardMember {
  _id: string
  username: string
  email: string
}

interface Board {
  _id: string
  title: string
  description?: string
  backgroundColor?: string
  isPublic: boolean
  members?: BoardMember[]
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [error, setError] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newBoard, setNewBoard] = useState({
    title: "",
    description: "",
    backgroundColor: "#007bff",
    isPublic: false,
  })
  const { user, logout } = useAuth()
  const { toast } = useToast()

  const [searchUsers, setSearchUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [editBoard, setEditBoard] = useState({
    title: "",
    description: "",
    backgroundColor: "#007bff",
    isPublic: false,
    members: [] as User[],
  })

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      const response = await apiService.get("/boards")
      setBoards(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch boards")
    } finally {
      setLoading(false)
    }
  }

  const searchUsersAPI = async (query: string) => {
    if (!query.trim()) {
      setSearchUsers([])
      return
    }

    try {
      const response = await apiService.get(`/users/search?query=${query}&limit=5`)
      setSearchUsers(response.data)
    } catch (err: any) {
      console.error("Failed to search users:", err)
      setSearchUsers([])
    }
  }

  const handleAddMember = (user: User) => {
    if (!selectedMembers.find((member) => member._id === user._id)) {
      setSelectedMembers([...selectedMembers, user])
    }
    setIsSearchOpen(false)
    setSearchQuery("")
    setSearchUsers([])
  }

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter((member) => member._id !== userId))
  }

  const openEditModal = (board: Board) => {
    setEditingBoard(board)
    setEditBoard({
      title: board.title,
      description: board.description || "",
      backgroundColor: board.backgroundColor || "#007bff",
      isPublic: board.isPublic,
      members: board.members || [],
    })
    setSelectedMembers(board.members || [])
    setIsEditModalOpen(true)
  }

  const handleEditBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBoard) return

    setCreateLoading(true)

    try {
      const boardData = {
        ...editBoard,
        members: selectedMembers.map((member) => member._id),
      }
      const response = await apiService.put(`/boards/${editingBoard._id}`, boardData)

      // Update the board in the list
      setBoards(
        boards.map((board) =>
          board._id === editingBoard._id ? { ...response.data, members: selectedMembers } : board,
        ),
      )

      setIsEditModalOpen(false)
      setEditingBoard(null)
      setSelectedMembers([])
      toast({
        title: "Success",
        description: "Board updated successfully",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update board",
        variant: "destructive",
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)

    try {
      const boardData = {
        ...newBoard,
        members: selectedMembers.map((member) => member._id),
      }
      const response = await apiService.post("/boards", boardData)
      setBoards([...boards, { ...response.data, members: selectedMembers }])
      setIsCreateModalOpen(false)
      setNewBoard({ title: "", description: "", backgroundColor: "#007bff", isPublic: false })
      setSelectedMembers([])
      toast({
        title: "Success",
        description: "Board created successfully",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create board",
        variant: "destructive",
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.username}</p>
              </div>
              <Button variant="outline" onClick={logout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Your Boards</h2>
              <p className="text-gray-600">Manage and organize your projects</p>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Board
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Board</DialogTitle>
                  <DialogDescription>Create a new kanban board to organize your tasks and projects.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBoard}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={newBoard.title}
                        onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
                        placeholder="Enter board title"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newBoard.description}
                        onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                        placeholder="Enter board description (optional)"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="backgroundColor">Background Color</Label>
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={newBoard.backgroundColor}
                        onChange={(e) => setNewBoard({ ...newBoard, backgroundColor: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Members</Label>
                      <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isSearchOpen}
                            className="justify-between"
                          >
                            Search users to add...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder="Search users..."
                              value={searchQuery}
                              onValueChange={(value) => {
                                setSearchQuery(value)
                                searchUsersAPI(value)
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                {searchUsers.map((user) => (
                                  <CommandItem
                                    key={user._id}
                                    onSelect={() => handleAddMember(user)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selectedMembers.find((member) => member._id === user._id)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    />
                                    <div>
                                      <div className="font-medium">{user.username}</div>
                                      <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Selected Members */}
                      {selectedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedMembers.map((member) => (
                            <div
                              key={member._id}
                              className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                            >
                              <span>{member.username}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member._id)}
                                className="h-4 w-4 p-0 hover:bg-blue-200"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPublic"
                        checked={newBoard.isPublic}
                        onCheckedChange={(checked) => setNewBoard({ ...newBoard, isPublic: checked as boolean })}
                      />
                      <Label htmlFor="isPublic">Make this board public</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createLoading}>
                      {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Board
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {/* Edit Board Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Board</DialogTitle>
                  <DialogDescription>Update your board details and manage members.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditBoard}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editTitle">Title *</Label>
                      <Input
                        id="editTitle"
                        value={editBoard.title}
                        onChange={(e) => setEditBoard({ ...editBoard, title: e.target.value })}
                        placeholder="Enter board title"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editDescription">Description</Label>
                      <Textarea
                        id="editDescription"
                        value={editBoard.description}
                        onChange={(e) => setEditBoard({ ...editBoard, description: e.target.value })}
                        placeholder="Enter board description (optional)"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editBackgroundColor">Background Color</Label>
                      <Input
                        id="editBackgroundColor"
                        type="color"
                        value={editBoard.backgroundColor}
                        onChange={(e) => setEditBoard({ ...editBoard, backgroundColor: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="editIsPublic"
                        checked={editBoard.isPublic}
                        onCheckedChange={(checked) => setEditBoard({ ...editBoard, isPublic: checked as boolean })}
                      />
                      <Label htmlFor="editIsPublic">Make this board public</Label>
                    </div>

                    {/* Members Section */}
                    <div className="grid gap-2">
                      <Label>Members</Label>
                      <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isSearchOpen}
                            className="justify-between"
                          >
                            Search users to add...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder="Search users..."
                              value={searchQuery}
                              onValueChange={(value) => {
                                setSearchQuery(value)
                                searchUsersAPI(value)
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                {searchUsers.map((user) => (
                                  <CommandItem
                                    key={user._id}
                                    onSelect={() => handleAddMember(user)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selectedMembers.find((member) => member._id === user._id)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    />
                                    <div>
                                      <div className="font-medium">{user.username}</div>
                                      <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Selected Members */}
                      {selectedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedMembers.map((member) => (
                            <div
                              key={member._id}
                              className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                            >
                              <span>{member.username}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member._id)}
                                className="h-4 w-4 p-0 hover:bg-blue-200"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createLoading}>
                      {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Board
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Boards Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {boards.map((board) => (
                <div key={board._id} className="group">
                  <Link href={`/board/${board._id}`}>
                    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
                      <CardHeader className="pb-3" style={{ backgroundColor: board.backgroundColor + "20" }}>
                        <div className="flex items-center justify-between">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: board.backgroundColor }} />
                          <div className="flex items-center gap-2">
                            {board.isPublic && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Public</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                openEditModal(board)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                          {board.title}
                        </CardTitle>
                        {board.description && (
                          <CardDescription className="line-clamp-2">{board.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            Created {formatDate(board.createdAt)}
                          </div>
                          {board.members && board.members.length > 0 && (
                            <div className="flex items-center text-sm text-gray-500">
                              <UserPlus className="h-4 w-4 mr-1" />
                              {board.members.length} member{board.members.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}

              {boards.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Plus className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
                    <p className="text-gray-600">Create your first board to get started</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
