import Link from "next/link";
import { Sparkles, Shirt, Wand2, FolderOpen, Plus, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground mb-4 animate-fade-up">
            AI-Powered Wardrobe
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight mb-6 animate-fade-up delay-100">
            Style your wardrobe
            <br />
            <span className="text-muted-foreground">effortlessly</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-8 animate-fade-up delay-200">
            Catalog your clothes, create stunning outfit combinations with AI, and discover your personal style.
          </p>
          <div className="flex flex-wrap gap-4 animate-fade-up delay-300">
            <Link
              href="/outfits/generate"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              <Wand2 className="w-4 h-4" />
              Create Outfit
            </Link>
            <Link
              href="/items/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Link>
          </div>
        </div>

        {/* Decorative element */}
        <div className="hidden lg:block absolute top-8 right-0 w-72 h-72">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-secondary/80 rounded-3xl rotate-6" />
            <div className="absolute inset-0 bg-card border border-border rounded-3xl -rotate-3 flex items-center justify-center">
              <Sparkles className="w-16 h-16 text-muted-foreground/40" />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: "/outfits/generate",
              icon: Wand2,
              title: "AI Outfit",
              description: "Create with AI",
            },
            {
              href: "/items",
              icon: Shirt,
              title: "My Wardrobe",
              description: "View all items",
            },
            {
              href: "/items/new",
              icon: Plus,
              title: "Add Item",
              description: "Upload clothes",
            },
            {
              href: "/categories",
              icon: FolderOpen,
              title: "Categories",
              description: "Organize items",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <div className="h-full p-6 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-secondary/50 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-secondary transition-transform group-hover:scale-105">
                  <item.icon className="w-6 h-6 text-foreground/70" />
                </div>
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-xl font-semibold mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <h3 className="font-medium mb-1">AI Outfit Generator</h3>
                <p className="text-sm text-muted-foreground">Mix & match with AI</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select your tops and bottoms, choose a style, and let AI create beautifully styled outfit combinations.
            </p>
            <Link
              href="/outfits/generate"
              className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2 transition-all"
            >
              Try it now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Shirt className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Virtual Try-On</h3>
                <p className="text-sm text-muted-foreground">See yourself in any outfit</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your photo and see how you would look wearing different outfits from your wardrobe.
            </p>
            <Link
              href="/outfits/try-on"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
            >
              Coming soon
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
