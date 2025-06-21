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
import {
  Loader2,
  Plus,
  LogOut,
  Calendar,
  Check,
  ChevronsUpDown,
  UserPlus,
  X,
  Edit,
  User,
  Eye,
  EyeOff,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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

  const [searchUsers, setSearchUsers] = useState<BoardMember[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<BoardMember[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [editBoard, setEditBoard] = useState({
    title: "",
    description: "",
    backgroundColor: "#007bff",
    isPublic: false,
    members: [] as BoardMember[],
  })
  const [searchLoading, setSearchLoading] = useState(false)

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileData, setProfileData] = useState({
    username: user?.username || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, [])

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsersAPI(searchQuery)
      } else {
        setSearchUsers([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

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

    setSearchLoading(true)
    try {
      const response = await apiService.get(`/users/search?query=${encodeURIComponent(query)}&limit=5`)
      console.log("Search response:", response.data) // Debug log
      setSearchUsers(response.data || [])
    } catch (err: any) {
      console.error("Failed to search users:", err)
      setSearchUsers([])
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      })
    } finally {
      setSearchLoading(false)
    }
  }

  const handleAddMember = (user: BoardMember) => {
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
        title: editBoard.title,
        description: editBoard.description,
        backgroundColor: editBoard.backgroundColor,
        isPublic: editBoard.isPublic,
        members: selectedMembers.map((member) => member._id), // Send only IDs
      }

      console.log("Updating board with data:", boardData) // Debug log

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
      console.error("Failed to update board:", err)
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
        title: newBoard.title,
        description: newBoard.description,
        backgroundColor: newBoard.backgroundColor,
        isPublic: newBoard.isPublic,
        members: selectedMembers.map((member) => member._id), // Send only IDs as expected
      }

      console.log("Creating board with data:", boardData) // Debug log

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
      console.error("Failed to create board:", err)
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
        username: profileData.username,
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
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Search users..."
                              value={searchQuery}
                              onValueChange={setSearchQuery}
                            />
                            <CommandList>
                              {searchLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="ml-2 text-sm text-gray-500">Searching...</span>
                                </div>
                              ) : searchUsers.length === 0 && searchQuery.trim() ? (
                                <CommandEmpty>No users found.</CommandEmpty>
                              ) : searchUsers.length === 0 ? (
                                <div className="py-6 text-center text-sm text-gray-500">
                                  Type to search for users...
                                </div>
                              ) : (
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
                                      <div className="flex flex-col">
                                        <div className="font-medium">{user.username}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
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
          </div>

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
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search users..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            {searchLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm text-gray-500">Searching...</span>
                              </div>
                            ) : searchUsers.length === 0 && searchQuery.trim() ? (
                              <CommandEmpty>No users found.</CommandEmpty>
                            ) : searchUsers.length === 0 ? (
                              <div className="py-6 text-center text-sm text-gray-500">Type to search for users...</div>
                            ) : (
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
                                    <div className="flex flex-col">
                                      <div className="font-medium">{user.username}</div>
                                      <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
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
    </ProtectedRoute>
  )
}
