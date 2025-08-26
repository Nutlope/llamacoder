"use client";

import type React from "react";

import { useState } from "react";
// @ts-ignore
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// @ts-ignore
import { Button } from "@/components/ui/button";
// @ts-ignore
import { Input } from "@/components/ui/input";
// @ts-ignore
import { Textarea } from "@/components/ui/textarea";
// @ts-ignore
import { Badge } from "@/components/ui/badge";
// @ts-ignore
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Mail, MessageSquare, Send } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: "travel" | "food" | "technology";
  date: string;
  readTime: string;
  image: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
  replies?: Comment[];
}

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Exploring the Hidden Gems of Tokyo",
    excerpt:
      "Discover the lesser-known neighborhoods and authentic experiences that make Tokyo truly special.",
    content: `Tokyo is a city of endless discoveries. Beyond the famous landmarks like Shibuya Crossing and Tokyo Tower, there are countless hidden gems waiting to be explored. In this post, I'll share some of my favorite off-the-beaten-path locations that showcase the authentic spirit of this incredible city.

One of my favorite discoveries was the quiet neighborhood of Yanaka, where traditional wooden houses line narrow streets, and time seems to have stood still. The area is home to numerous temples, traditional shops, and cozy cafes that offer a glimpse into old Tokyo.

Another hidden gem is the Todoroki Valley, a surprising oasis of nature in the heart of the city. This narrow gorge offers a peaceful walking trail along a small stream, complete with a traditional tea house where you can rest and enjoy matcha while listening to the sound of flowing water.`,
    category: "travel",
    date: "2024-01-15",
    readTime: "5 min read",
    image: "/tokyo-hidden-neighborhood-street-scene.png",
    comments: [
      {
        id: "1",
        author: "Sarah Chen",
        content:
          "Amazing post! I visited Yanaka last year and it was absolutely magical. Thanks for sharing these hidden spots.",
        date: "2024-01-16",
      },
    ],
  },
  {
    id: "2",
    title: "The Art of Homemade Pasta: A Journey Through Italy",
    excerpt:
      "Learn the secrets behind authentic Italian pasta making from my culinary adventures across Italy.",
    content: `There's something magical about making pasta from scratch. During my recent trip to Italy, I had the privilege of learning from nonnas (grandmothers) in small villages who have been perfecting their craft for decades.

The key to great pasta lies in the simplicity of ingredients: just flour, eggs, and a pinch of salt. But the technique - that's where the magic happens. The way you knead the dough, the timing of when to roll it out, and the patience to let it rest properly all contribute to the final result.

In Emilia-Romagna, I learned to make tagliatelle with a traditional mattarello (rolling pin). The pasta sheets were rolled so thin you could read through them, yet they maintained the perfect texture when cooked. Each region has its own specialties and techniques, passed down through generations.`,
    category: "food",
    date: "2024-01-10",
    readTime: "7 min read",
    image: "/homemade-pasta-making-italian-kitchen.png",
    comments: [
      {
        id: "2",
        author: "Marco Rossi",
        content:
          "As an Italian, I appreciate how you captured the essence of our pasta-making traditions. Brava!",
        date: "2024-01-11",
      },
    ],
  },
  {
    id: "3",
    title: "The Future of Web Development: What to Expect in 2024",
    excerpt:
      "Exploring the latest trends and technologies shaping the future of web development.",
    content: `The web development landscape is evolving at an unprecedented pace. As we move through 2024, several key trends are reshaping how we build and interact with web applications.

Server-side rendering is making a strong comeback with frameworks like Next.js and Remix leading the charge. The benefits of improved SEO, faster initial page loads, and better user experience are driving this shift back to the server.

AI integration is becoming more prevalent, with tools like GitHub Copilot and ChatGPT changing how developers write code. We're also seeing the emergence of AI-powered design tools that can generate entire user interfaces from simple descriptions.

WebAssembly continues to mature, enabling high-performance applications that were previously only possible with native development. This opens up new possibilities for complex applications running directly in the browser.`,
    category: "technology",
    date: "2024-01-05",
    readTime: "6 min read",
    image: "/modern-web-development-coding-setup.png",
    comments: [],
  },
];

const categories = [
  { id: "all", name: "All Posts", count: blogPosts.length },
  {
    id: "travel",
    name: "Travel",
    count: blogPosts.filter((post) => post.category === "travel").length,
  },
  {
    id: "food",
    name: "Food",
    count: blogPosts.filter((post) => post.category === "food").length,
  },
  {
    id: "technology",
    name: "Technology",
    count: blogPosts.filter((post) => post.category === "technology").length,
  },
];

export default function PersonalBlog() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const filteredPosts =
    selectedCategory === "all"
      ? blogPosts
      : blogPosts.filter((post) => post.category === selectedCategory);

  const handleCommentSubmit = (postId: string) => {
    if (!newComment.trim() || !commentAuthor.trim()) return;

    // In a real app, this would make an API call
    console.log("[v0] Adding comment:", {
      postId,
      author: commentAuthor,
      content: newComment,
    });
    setNewComment("");
    setCommentAuthor("");
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;

    // In a real app, this would make an API call
    console.log("[v0] Contact form submitted:", contactForm);
    setContactForm({ name: "", email: "", message: "" });
    alert("Thank you for your message! I'll get back to you soon.");
  };

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-primary">
                My Personal Blog
              </h1>
              <Button variant="outline" onClick={() => setSelectedPost(null)}>
                Back to Blog
              </Button>
            </div>
          </div>
        </header>

        {/* Blog Post Content */}
        <main className="mx-auto max-w-4xl px-4 py-8">
          <article className="space-y-6">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {selectedPost.category}
              </Badge>
              <h1 className="text-4xl font-bold text-foreground">
                {selectedPost.title}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(selectedPost.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>
            </div>

            <img
              src={selectedPost.image || "/placeholder.svg"}
              alt={selectedPost.title}
              className="h-64 w-full rounded-lg object-cover"
            />

            <div className="prose prose-lg max-w-none">
              {selectedPost.content.split("\n\n").map((paragraph, index) => (
                <p key={index} className="mb-4 leading-relaxed text-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>

          {/* Comments Section */}
          <section className="mt-12 space-y-6">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <MessageSquare className="h-6 w-6" />
              Comments ({selectedPost.comments.length})
            </h2>

            {/* Add Comment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Leave a Comment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Your name"
                  value={commentAuthor}
                  onChange={(e: {
                    target: { value: React.SetStateAction<string> };
                  }) => setCommentAuthor(e.target.value)}
                />
                <Textarea
                  placeholder="Write your comment..."
                  value={newComment}
                  onChange={(e: {
                    target: { value: React.SetStateAction<string> };
                  }) => setNewComment(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={() => handleCommentSubmit(selectedPost.id)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Post Comment
                </Button>
              </CardContent>
            </Card>

            {/* Comments List */}
            <div className="space-y-4">
              {selectedPost.comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>{comment.author[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {comment.author}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(comment.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">
              My Personal Blog
            </h1>
            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="#about"
                className="text-foreground transition-colors hover:text-primary"
              >
                About
              </a>
              <a
                href="#blog"
                className="text-foreground transition-colors hover:text-primary"
              >
                Blog
              </a>
              <a
                href="#contact"
                className="text-foreground transition-colors hover:text-primary"
              >
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-8">
        {/* Hero Section */}
        <section className="space-y-8 py-12 text-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight text-foreground md:text-6xl">
              Welcome to My Blog
            </h1>
            <p className="mx-auto max-w-3xl text-xl leading-relaxed text-muted-foreground md:text-2xl">
              Discover stories about travel adventures, culinary experiences,
              and the latest in technology. Join me on a journey of exploration
              and discovery.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="bg-primary px-8 py-3 text-lg hover:bg-primary/90"
              >
                Explore Posts
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent px-8 py-3 text-lg"
              >
                About Me
              </Button>
            </div>
          </div>
        </section>

        {/* About Me Section */}
        <section id="about" className="space-y-6 text-center">
          <div className="space-y-4">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-foreground">
                Hi, I'm Jane Doe
              </h2>
              <p className="text-xl text-muted-foreground">
                Travel enthusiast, food lover, and tech explorer
              </p>
            </div>
          </div>
          <Card className="mx-auto max-w-2xl">
            <CardContent className="pt-6">
              <p className="leading-relaxed text-foreground">
                Welcome to my corner of the internet! I'm passionate about
                exploring new places, discovering amazing food, and staying on
                top of the latest technology trends. Through this blog, I share
                my adventures, recipes, and insights from the ever-evolving
                world of tech. Join me on this journey of discovery and
                learning!
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Blog Section */}
        <section id="blog" className="space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold text-foreground">Latest Posts</h2>
            <p className="text-muted-foreground">
              Thoughts, stories, and ideas
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={
                  selectedCategory === category.id ? "default" : "outline"
                }
                onClick={() => setSelectedCategory(category.id)}
                className={
                  selectedCategory === category.id
                    ? "bg-primary hover:bg-primary/90"
                    : ""
                }
              >
                {category.name} ({category.count})
              </Button>
            ))}
          </div>

          {/* Blog Posts Grid */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="group cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <Card className="h-full overflow-hidden border-0 bg-card shadow-md transition-all duration-300 hover:shadow-xl">
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
                    <img
                      src={post.image || "/placeholder.svg"}
                      alt={post.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Content Container */}
                  <div className="space-y-4 p-6">
                    {/* Category and Read Time */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                      >
                        {post.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="line-clamp-2 text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="line-clamp-3 leading-relaxed text-muted-foreground">
                      {post.excerpt}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border/50 pt-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span>{post.comments.length} comments</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </article>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold text-foreground">Get In Touch</h2>
            <p className="text-muted-foreground">
              Have a question or want to collaborate? I'd love to hear from you!
            </p>
          </div>

          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Me
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Your Name"
                    value={contactForm.name}
                    onChange={(e: { target: { value: any } }) =>
                      setContactForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Your Email"
                    value={contactForm.email}
                    onChange={(e: { target: { value: any } }) =>
                      setContactForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <Textarea
                  placeholder="Your Message"
                  value={contactForm.message}
                  onChange={(e: { target: { value: any } }) =>
                    setContactForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={6}
                  required
                />
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold text-foreground">Jane Doe</h3>
            <p className="text-muted-foreground">
              Sharing stories from around the world, one post at a time.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="ghost" size="sm">
                Twitter
              </Button>
              <Button variant="ghost" size="sm">
                Instagram
              </Button>
              <Button variant="ghost" size="sm">
                LinkedIn
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Jane Doe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
