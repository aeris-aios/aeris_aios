import { useState } from "react";
import { useListResearchJobs, useCreateResearchJob, useDeleteResearchJob, useGetResearchJobResults } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Microscope, Globe, Trash2, ChevronRight, FileText } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const createSchema = z.object({
  title: z.string().min(2, "Required"),
  sourceType: z.enum(["website", "competitor", "reviews", "search", "social", "custom"]),
  targets: z.string().min(5, "Required"),
  scrapeTemplate: z.string().optional()
});

export default function ResearchLab() {
  const [open, setOpen] = useState(false);
  const [viewResultsId, setViewResultsId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { data: jobs, isLoading } = useListResearchJobs();
  const { mutate: createJob, isPending: isCreating } = useCreateResearchJob();
  const { mutate: deleteJob } = useDeleteResearchJob();

  const { data: results, isLoading: loadingResults } = useGetResearchJobResults(viewResultsId || 0, {
    query: { enabled: !!viewResultsId }
  });

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", sourceType: "website", targets: "", scrapeTemplate: "" }
  });

  const onSubmit = (values: z.infer<typeof createSchema>) => {
    createJob({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/research/jobs"] });
        setOpen(false);
        form.reset();
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'running': return 'bg-primary/20 text-primary border-primary/30';
      case 'failed': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-white/10 text-gray-300 border-white/20';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Microscope className="h-8 w-8 text-primary" />
            Research Lab
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Deploy autonomous agents to gather market intelligence.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Launch Job</Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10 bg-black/90">
            <DialogHeader>
              <DialogTitle>Deploy Research Agent</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl><Input {...field} className="bg-white/5 border-white/10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sourceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-black border-white/10 text-white">
                        <SelectItem value="website">Website Scraping</SelectItem>
                        <SelectItem value="competitor">Competitor Intel</SelectItem>
                        <SelectItem value="reviews">Customer Reviews</SelectItem>
                        <SelectItem value="search">Search Trends</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="targets" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Targets (URLs, Keywords)</FormLabel>
                    <FormControl><Textarea {...field} className="bg-white/5 border-white/10 min-h-[100px]" placeholder="https://..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={isCreating} className="w-full bg-primary hover:bg-primary/90 mt-4">
                  {isCreating ? "Initializing..." : "Deploy Agent"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : !jobs?.length ? (
        <Card className="glass-panel border-white/5 bg-white/5 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No active research jobs</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Deploy your first agent to scrape and analyze data across the web.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {jobs.map(job => (
            <Card key={job.id} className="glass-panel border-white/5 bg-white/5 flex flex-col group hover:border-primary/30 transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className={`capitalize ${getStatusColor(job.status)}`}>{job.status}</Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      deleteJob({ id: job.id }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/research/jobs"] })
                      })
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg mt-2">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <span className="uppercase tracking-wider">{job.sourceType}</span>
                  <span>•</span>
                  <span>{format(new Date(job.createdAt), 'MMM d, yyyy')}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="bg-black/40 p-3 rounded-lg text-xs text-muted-foreground line-clamp-2 font-mono mb-4 border border-white/5">
                  {job.targets}
                </div>
                
                <Dialog open={viewResultsId === job.id} onOpenChange={(open) => setViewResultsId(open ? job.id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:text-white" disabled={job.status !== 'completed'}>
                      View Intelligence <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto glass-panel border-white/10 bg-black/95">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Intelligence Report: {job.title}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-6">
                      {loadingResults ? (
                        <div className="text-center py-8 text-muted-foreground animate-pulse">Compiling findings...</div>
                      ) : results?.length ? (
                        results.map((r, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                            {r.title && <h4 className="font-bold text-lg mb-2">{r.title}</h4>}
                            {r.url && <a href={r.url} target="_blank" className="text-primary text-sm hover:underline mb-4 block">{r.url}</a>}
                            <div className="prose prose-invert max-w-none text-sm text-gray-300">
                              {r.content}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">No tangible intelligence recovered.</div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
