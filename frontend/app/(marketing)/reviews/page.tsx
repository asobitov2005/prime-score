"use client";

import { useState } from "react";
import { ArrowLeft, MessageSquarePlus, ShieldCheck, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { mockReviews } from "@/lib/mock-data";

export default function ReviewsPage() {
  const { isAuthenticated, name } = useAuthStore();
  const [feedback, setFeedback] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim().length > 10) {
      // In a real app, send this to the backend
      setIsSubmitted(true);
      setFeedback("");
      setTimeout(() => setIsSubmitted(false), 5000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group">
             <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
             Back to Home
          </Link>
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">Student Reviews</h1>
            <p className="text-muted-foreground font-medium mt-2 text-lg">
              Read what others are saying about their PrimeScore experience.
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-10 items-start">
          
          {/* Reviews List */}
          <div className="grid sm:grid-cols-2 gap-6">
            {mockReviews.map((review) => (
              <Card key={review.id} className="rounded-[2rem] bg-card/40 border-border/50 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
                <CardContent className="p-6 pt-6 flex flex-col justify-between h-full gap-6">
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">"{review.text}"</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black shadow-inner">
                        {review.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{review.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Band {review.band}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground/60">{review.date}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feedback Form Sidebar */}
          <div className="sticky top-32">
            <Card className="rounded-[2rem] border-border/50 shadow-xl shadow-primary/5 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-80" />
              <CardHeader className="p-6 bg-muted/5 border-b border-border/50">
                <div className="flex items-center gap-3 mb-1">
                  <div className="bg-primary/10 p-2 rounded-xl text-primary">
                    <MessageSquarePlus className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">Leave Feedback</CardTitle>
                </div>
                <CardDescription className="text-xs font-medium text-muted-foreground">
                  Help us improve by sharing your experience.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                {!isAuthenticated ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      You need to be logged in to leave a review.
                    </p>
                    <Button asChild className="w-full font-bold rounded-xl shadow-md transition-transform active:scale-95">
                      <Link href="/login">Login to continue</Link>
                    </Button>
                  </div>
                ) : isSubmitted ? (
                  <div className="text-center space-y-3 py-6 animate-in zoom-in-95">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-foreground">Thank you, {name}!</p>
                    <p className="text-xs text-muted-foreground">Your feedback has been submitted successfully.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground ml-1">Your Review</label>
                      <textarea 
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Write your honest feedback here..."
                        className="w-full min-h-[120px] rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all placeholder:text-muted-foreground/50"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={feedback.trim().length < 10} className="w-full font-bold rounded-xl h-11 transition-all active:scale-95 group">
                      Submit Review
                      <Send className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground font-medium">
                      Reviews are moderated before publishing.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
