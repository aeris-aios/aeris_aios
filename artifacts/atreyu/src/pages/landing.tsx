import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Command, ArrowRight, Sparkles, BrainCircuit, Activity, Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 dark">
      {/* Hero Background */}
      <div className="fixed inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Abstract dark background" 
          className="w-full h-full object-cover opacity-60 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(0,150,255,0.3)]">
            <Command className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-widest uppercase">ATREYU</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-white hover:bg-white/10">Sign In</Button>
          </Link>
          <Link href="/dashboard">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,150,255,0.4)] transition-all">
              Launch App
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 text-center flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-gray-300">Autonomous Tactical Resource & Execution</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-gray-500"
        >
          Your Universe's <br/>Marketing Operating System
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12"
        >
          Unify research, content generation, and autonomous campaigns in one cinematic interface. Powered by Anthropic's most advanced reasoning models.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_rgba(0,150,255,0.5)] rounded-full">
              Enter Workspace <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-8 rounded-3xl"
          >
            <BrainCircuit className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Deep Think AI</h3>
            <p className="text-gray-400 text-sm">Switch between Sonnet for speed and Opus for complex strategic reasoning seamlessly.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-8 rounded-3xl"
          >
            <Globe className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Autonomous Research</h3>
            <p className="text-gray-400 text-sm">Deploy agents to scrape competitors, reviews, and social signals while you sleep.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-8 rounded-3xl"
          >
            <Activity className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Campaign Ops</h3>
            <p className="text-gray-400 text-sm">Manage entire marketing workflows from brief to final assets in one centralized hub.</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
