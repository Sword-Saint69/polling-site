"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar, Clock, Users, Vote, BookOpen, Shield, User, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { getPolls, getPosts, submitVote, hasUserVoted, type Poll, type Post } from "@/lib/firestore"
import { trackPollVote, trackStudentLogin } from "@/lib/analytics"

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [selectedOption, setSelectedOption] = useState("")
  const [votingPollId, setVotingPollId] = useState("")
  const [submittingVote, setSubmittingVote] = useState(false)
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (isLoggedIn && studentId) {
      checkUserVotes()
    }
  }, [isLoggedIn, studentId, polls])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pollsResult, postsResult] = await Promise.all([getPolls(), getPosts()])

      if (pollsResult.error) {
        toast({
          title: "Error loading polls",
          description: pollsResult.error,
          variant: "destructive",
        })
      } else {
        setPolls(pollsResult.polls)
      }

      if (postsResult.error) {
        toast({
          title: "Error loading posts",
          description: postsResult.error,
          variant: "destructive",
        })
      } else {
        setPosts(postsResult.posts)
      }
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkUserVotes = async () => {
    const votedPolls = new Set<string>()

    for (const poll of polls) {
      const { hasVoted } = await hasUserVoted(poll.id, studentId)
      if (hasVoted) {
        votedPolls.add(poll.id)
      }
    }

    setUserVotes(votedPolls)
  }

  const handleLogin = (id: string) => {
    if (id.trim()) {
      setStudentId(id)
      setIsLoggedIn(true)
      trackStudentLogin(id)
      toast({
        title: "Logged in successfully",
        description: "You can now participate in polls",
      })
    }
  }

  const handleVote = async (pollId: string) => {
    if (!selectedOption) {
      toast({
        title: "Please select an option",
        variant: "destructive",
      })
      return
    }

    setSubmittingVote(true)
    try {
      const result = await submitVote(pollId, studentId, selectedOption)

      if (result.error) {
        toast({
          title: "Error submitting vote",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Vote submitted successfully",
          description: "Thank you for participating!",
        })
        setUserVotes((prev) => new Set([...prev, pollId]))
        const poll = polls.find((p) => p.id === pollId)
        if (poll) {
          trackPollVote(pollId, poll.title)
        }
        await loadData() // Refresh data to show updated vote counts
      }
    } catch (error) {
      toast({
        title: "Error submitting vote",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setSubmittingVote(false)
      setSelectedOption("")
      setVotingPollId("")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const activePollsCount = useMemo(() => polls.filter((p) => p.isActive).length, [polls])
  const totalVotes = useMemo(() => polls.reduce((acc, poll) => acc + poll.totalVotes, 0), [polls])

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="glass-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div>
                <h1 className="text-2xl font-heading font-bold text-gradient">CEMP VOICE</h1>
                <p className="text-sm text-muted-foreground">Student Polling Platform</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {!isLoggedIn ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2 glass-card bg-transparent">
                      <User className="h-4 w-4" />
                      <span>Student Login</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card">
                    <DialogHeader>
                      <DialogTitle className="font-heading">Student Authentication</DialogTitle>
                      <DialogDescription>Enter your student ID to participate in polls</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="studentId">Student ID</Label>
                        <Input
                          id="studentId"
                          placeholder="Enter your student ID"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={() => handleLogin(studentId)} className="w-full">
                        Login
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="flex items-center space-x-1 glass-card">
                    <Shield className="h-3 w-3" />
                    <span>ID: {studentId}</span>
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setIsLoggedIn(false)}>
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="polls" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md glass-card">
            <TabsTrigger value="polls" className="flex items-center space-x-2">
              <Vote className="h-4 w-4" />
              <span>Active Polls</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Announcements</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="polls" className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-heading font-bold">Active Polls</h2>
                <p className="text-muted-foreground mt-1">Participate in ongoing campus polls</p>
              </div>
              <Badge variant="outline" className="flex items-center space-x-1 glass-card">
                <Users className="h-3 w-3" />
                <span>{totalVotes} total votes</span>
              </Badge>
            </div>

            {polls.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Vote className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-heading font-semibold mb-2">No Active Polls</h3>
                  <p className="text-muted-foreground text-center">
                    There are currently no active polls. Check back later for new polls to participate in.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {polls
                  .filter((poll) => poll.isActive)
                  .map((poll) => {
                    const hasVoted = userVotes.has(poll.id)
                    return (
                      <Card
                        key={poll.id}
                        className="glass-card hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg font-heading">{poll.title}</CardTitle>
                              <CardDescription>{poll.description}</CardDescription>
                            </div>
                            <Badge variant={poll.isActive ? "default" : "secondary"} className="shrink-0">
                              {poll.isActive ? "Active" : "Closed"}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Ends {formatDate(poll.endDate)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>{poll.totalVotes} votes</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {hasVoted ? (
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center space-x-1">
                                <Shield className="h-3 w-3" />
                                <span>You have already voted</span>
                              </p>
                              {poll.options.map((option) => {
                                const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0
                                return (
                                  <div key={option.id} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">{option.text}</span>
                                      <span className="font-semibold">
                                        {option.votes} ({percentage.toFixed(1)}%)
                                      </span>
                                    </div>
                                    <Progress value={percentage} className="h-3" />
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {isLoggedIn ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                      onClick={() => setVotingPollId(poll.id)}
                                    >
                                      Vote Now
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="glass-card">
                                    <DialogHeader>
                                      <DialogTitle className="font-heading">{poll.title}</DialogTitle>
                                      <DialogDescription>{poll.description}</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                                        {poll.options.map((option) => (
                                          <div
                                            key={option.id}
                                            className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                                          >
                                            <RadioGroupItem value={option.id} id={option.id} />
                                            <Label htmlFor={option.id} className="flex-1 cursor-pointer font-medium">
                                              {option.text}
                                            </Label>
                                          </div>
                                        ))}
                                      </RadioGroup>
                                      <Button
                                        onClick={() => handleVote(poll.id)}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        disabled={!selectedOption || submittingVote}
                                      >
                                        {submittingVote ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Submitting...
                                          </>
                                        ) : (
                                          "Submit Vote"
                                        )}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <Button disabled className="w-full">
                                  Login to Vote
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-3xl font-heading font-bold">Latest Announcements</h2>
              <p className="text-muted-foreground mt-1">Stay updated with campus news and announcements</p>
            </div>

            {posts.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-heading font-semibold mb-2">No Announcements</h3>
                  <p className="text-muted-foreground text-center">
                    There are currently no announcements. Check back later for updates.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id} className="glass-card hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-heading">{post.title}</CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs font-semibold">
                                  {post.author.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{post.author}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(post.date)}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="glass-card">
                          {post.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed">{post.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
