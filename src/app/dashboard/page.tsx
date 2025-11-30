"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { authClient, useSession } from '@/lib/auth-client'
import { 
  Truck, 
  BarChart3, 
  Calendar as CalendarIcon,
  CheckCircle2,
  ArrowRight,
  Clock,
  MapPin,
  Users,
  Zap,
  Shield,
  TrendingUp,
  LogOut,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

export default function Dashboard() {
  const router = useRouter()
  const { data: session, isPending, refetch } = useSession()

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/')
    }
  }, [session, isPending, router])

  const handleSignOut = async () => {
    const { error } = await authClient.signOut()
    if (error?.code) {
      toast.error(error.code)
    } else {
      localStorage.removeItem("bearer_token")
      refetch()
      router.push('/')
      toast.success('Signed out successfully')
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const features = [
    {
      icon: Zap,
      title: "Self-Scheduling System",
      description: "Orders carry their own context. Subcontractors can claim jobs without human negotiation.",
      color: "text-yellow-500"
    },
    {
      icon: Clock,
      title: "Real-Time Tracking",
      description: "Live job state management with inventory status and capacity monitoring.",
      color: "text-blue-500"
    },
    {
      icon: Shield,
      title: "Conflict Detection",
      description: "Automatic detection of ghost jobs, double bookings, and scheduling conflicts.",
      color: "text-red-500"
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Comprehensive insights on completion rates, performance metrics, and bottlenecks.",
      color: "text-green-500"
    }
  ]

  const platforms = [
    {
      title: "Subcontractor Portal",
      description: "Pull-based job board with one-click claim system and batch operations",
      icon: Truck,
      href: "/portal",
      color: "from-blue-500 to-cyan-500",
      features: [
        "Browse available jobs with full context",
        "One-click job claiming",
        "Batch operations for multiple jobs",
        "Inventory status visibility"
      ]
    },
    {
      title: "HQ Dashboard",
      description: "Centralized operations control with capacity visualization and analytics",
      icon: BarChart3,
      href: "/hq",
      color: "from-purple-500 to-pink-500",
      features: [
        "Real-time order management",
        "Subcontractor capacity tracking",
        "Performance analytics",
        "Ghost job & conflict detection"
      ]
    },
    {
      title: "Scheduling Calendar",
      description: "Interactive drag-and-drop calendar with conflict detection",
      icon: CalendarIcon,
      href: "/calendar",
      color: "from-orange-500 to-red-500",
      features: [
        "Visual weekly schedule view",
        "Drag-and-drop job scheduling",
        "Automatic conflict detection",
        "Inventory-aware slot allocation"
      ]
    },
    {
      title: "Field Completion",
      description: "Mobile-optimized workflow for job completion with GPS verification",
      icon: CheckCircle2,
      href: "/complete/1",
      color: "from-green-500 to-emerald-500",
      features: [
        "Photo capture & documentation",
        "E-signature collection",
        "GPS timestamping",
        "Customer satisfaction rating"
      ]
    }
  ]

  const stats = [
    { label: "Jobs Managed", value: "30+", icon: MapPin },
    { label: "Subcontractors", value: "10", icon: Users },
    { label: "Completion Rate", value: "16.67%", icon: CheckCircle2 },
    { label: "Time Saved", value: "80%", icon: Clock }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header with User Info */}
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Field Service Portal</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {session.user.name || session.user.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <Badge className="mb-4" variant="outline">
            Last-Mile Coordination Platform
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Self-Scheduling Operations Platform
          </h2>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Eliminate administrative friction with a pull-based portal where orders carry context 
            and subcontractors claim jobs without human negotiation. Real-time tracking, 
            conflict detection, and GPS-verified completion.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/portal">
              <Button size="lg" className="gap-2">
                <Truck className="w-5 h-5" />
                Subcontractor Portal
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/hq">
              <Button size="lg" variant="outline" className="gap-2">
                <BarChart3 className="w-5 h-5" />
                HQ Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key Features */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-12">
            Why This Platform?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <feature.icon className={`w-12 h-12 mb-4 ${feature.color}`} />
                  <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Platform Sections */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-12">
            Explore the Platform
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {platforms.map((platform, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow">
                <div className={`h-2 bg-gradient-to-r ${platform.color}`} />
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${platform.color}`}>
                      <platform.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{platform.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-base">
                    {platform.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {platform.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={platform.href}>
                    <Button className="w-full gap-2">
                      Open {platform.title}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Technical Highlights */}
        <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Technical Implementation</CardTitle>
            <CardDescription className="text-center text-base">
              Built with modern technologies for scalability and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="mb-3">
                  <Badge className="text-base py-1 px-4">Next.js 15</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  App Router with server components and API routes
                </p>
              </div>
              <div className="text-center">
                <div className="mb-3">
                  <Badge className="text-base py-1 px-4">Turso Database</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Real-time data with Drizzle ORM for type safety
                </p>
              </div>
              <div className="text-center">
                <div className="mb-3">
                  <Badge className="text-base py-1 px-4">Shadcn/UI</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Beautiful, accessible components with Tailwind CSS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
