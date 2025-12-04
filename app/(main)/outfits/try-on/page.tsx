import Link from "next/link";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";

export default function TryOnPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/outfits"
          className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Virtual Try-On</h1>
          <p className="text-muted-foreground text-sm">
            See yourself wearing any outfit
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-xl border border-border bg-card py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-secondary flex items-center justify-center">
          <Construction className="w-8 h-8 text-foreground/70" />
        </div>
        <h2 className="text-xl font-semibold mb-3">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6 px-4">
          Upload your photo and see yourself wearing any outfit from your wardrobe. Powered by AI.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span>Powered by Google Gemini AI</span>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { emoji: "📸", title: "Upload Your Photo", desc: "A full-body photo works best" },
          { emoji: "👗", title: "Select Outfit", desc: "Choose items from your wardrobe" },
          { emoji: "✨", title: "AI Magic", desc: "See yourself in the outfit" },
        ].map((item) => (
          <div key={item.title} className="p-6 rounded-xl border border-border bg-card text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary flex items-center justify-center">
              <span className="text-2xl">{item.emoji}</span>
            </div>
            <h3 className="font-medium mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/outfits/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          Try Outfit Generator Instead
        </Link>
      </div>
    </div>
  );
}
