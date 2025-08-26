"use client";
// @ts-ignore
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  // @ts-ignore
} from "@/components/ui/card";
// @ts-ignore
import { Input } from "@/components/ui/input";
import {
  Menu,
  X,
  ArrowRight,
  Play,
  Zap,
  Users,
  BarChart3,
  Shield,
  Star,
  Check,
  Facebook,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    {
      icon: Zap,
      title: "Intelligent Automation",
      description:
        "Automate repetitive tasks and workflows with AI-powered intelligence that learns from your team's patterns.",
    },
    {
      icon: Users,
      title: "Seamless Collaboration",
      description:
        "Connect your team with real-time collaboration tools, shared workspaces, and instant communication.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Get deep insights into your workflow performance with comprehensive analytics and reporting.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Keep your data secure with enterprise-grade encryption, compliance, and access controls.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Product Manager",
      company: "TechCorp",
      content:
        "StreamLine has revolutionized how our team collaborates. We've seen a 40% increase in productivity since implementing it.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Operations Director",
      company: "InnovateLab",
      content:
        "The automation features are incredible. What used to take hours now happens automatically. It's a game-changer.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Team Lead",
      company: "FlowWorks",
      content:
        "The analytics dashboard gives us insights we never had before. We can now make data-driven decisions with confidence.",
      rating: 5,
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 5 team members",
        "Basic automation workflows",
        "Standard integrations",
        "Email support",
        "5GB storage",
      ],
      popular: false,
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      description: "Ideal for growing teams and businesses",
      features: [
        "Up to 25 team members",
        "Advanced automation workflows",
        "Premium integrations",
        "Priority support",
        "100GB storage",
        "Advanced analytics",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "For large organizations with complex needs",
      features: [
        "Unlimited team members",
        "Custom automation workflows",
        "All integrations",
        "24/7 dedicated support",
        "Unlimited storage",
        "Advanced analytics & reporting",
        "Custom security controls",
      ],
      popular: false,
    },
  ];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary">StreamLine</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a
                  href="#features"
                  className="text-foreground transition-colors hover:text-primary"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="text-foreground transition-colors hover:text-primary"
                >
                  Pricing
                </a>
                <a
                  href="#testimonials"
                  className="text-foreground transition-colors hover:text-primary"
                >
                  Resources
                </a>
                <a
                  href="#contact"
                  className="text-foreground transition-colors hover:text-primary"
                >
                  Contact
                </a>
              </div>
            </nav>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-foreground hover:text-primary"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden">
              <div className="space-y-1 border-t border-border px-2 pb-3 pt-2 sm:px-3">
                <a
                  href="#features"
                  className="block px-3 py-2 text-foreground hover:text-primary"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="block px-3 py-2 text-foreground hover:text-primary"
                >
                  Pricing
                </a>
                <a
                  href="#testimonials"
                  className="block px-3 py-2 text-foreground hover:text-primary"
                >
                  Resources
                </a>
                <a
                  href="#contact"
                  className="block px-3 py-2 text-foreground hover:text-primary"
                >
                  Contact
                </a>
                <div className="px-3 py-2">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-card to-background opacity-50"></div>

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-black leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Streamline Your Workflow,{" "}
              <span className="text-primary">Amplify Your Success</span>
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-xl leading-relaxed text-muted-foreground">
              Transform your team's productivity with intelligent automation,
              seamless collaboration, and powerful insights that drive results.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-primary px-8 py-3 text-primary-foreground hover:bg-primary/90"
              >
                Try for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary bg-transparent px-8 py-3 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            <div className="mt-12">
              <p className="mb-4 text-sm text-muted-foreground">
                Trusted by 10,000+ teams worldwide
              </p>
              <div className="flex items-center justify-center space-x-8 opacity-60">
                <div className="text-lg font-semibold">TechCorp</div>
                <div className="text-lg font-semibold">InnovateLab</div>
                <div className="text-lg font-semibold">FlowWorks</div>
                <div className="text-lg font-semibold">DataSync</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
              Powerful Features for Modern Teams
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Everything you need to streamline your workflow and boost
              productivity
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-border transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
              What Our Customers Say
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Join thousands of satisfied teams who have transformed their
              workflows
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border">
                <CardContent className="p-6">
                  <div className="mb-4 flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <blockquote className="mb-4 leading-relaxed text-foreground">
                    "{testimonial.content}"
                  </blockquote>
                  <div className="border-t border-border pt-4">
                    <div className="font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Choose the plan that fits your team's needs. All plans include a
              14-day free trial.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative border-border ${plan.popular ? "scale-105 shadow-lg ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                    <span className="rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="pb-8 text-center">
                  <CardTitle className="text-2xl font-bold">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-black text-primary">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="mr-3 h-5 w-5 flex-shrink-0 text-primary" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    }`}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-3xl font-black text-foreground sm:text-4xl">
              Ready to Transform Your Workflow?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
              Join thousands of teams who have already streamlined their
              processes. Start your free trial today and see the difference.
            </p>

            <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 sm:flex-row">
              <Input
                type="email"
                placeholder="Enter your work email"
                className="flex-1 border-border bg-background"
              />
              <Button className="bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="mb-4 text-2xl font-bold text-primary">
                StreamLine
              </h3>
              <p className="mb-4 max-w-md text-muted-foreground">
                Empowering teams worldwide to streamline their workflows and
                achieve more with intelligent automation and seamless
                collaboration.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="mb-4 font-semibold text-foreground">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Integrations
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    API
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="mb-4 font-semibold text-foreground">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between border-t border-border pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2025 StreamLine. All rights reserved.
            </p>
            <div className="mt-4 flex space-x-6 sm:mt-0">
              <a
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
