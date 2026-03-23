import { useState, useMemo } from "react";
import { useListKnowledgeItems, useCreateKnowledgeItem, useDeleteKnowledgeItem } from "@workspace/api-client-react";
import { Library, Plus, Trash2, Link as LinkIcon, FileText, Globe, Search, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";

const schema = z.object({
  title: z.string().min(2, "Required"),
  type: z.enum(["note", "url", "file", "scraped"]),
  content: z.string().min(2, "Required"),
  url: z.string().optional(),
  includeInContext: z.boolean().default(true)
});

export default function KnowledgeBase() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: items, isLoading } = useListKnowledgeItems();
  const { mutate: createItem, isPending } = useCreateKnowledgeItem();
  const { mutate: deleteItem } = useDeleteKnowledgeItem();

  /* Search + filter */
  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.content.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "all" || item.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [items, search, filterType]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", type: "note", content: "", url: "", includeInContext: true }
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    createItem({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
        setOpen(false);
        form.reset();
        toast({ title: "Knowledge added", description: `"${values.title}" saved${values.includeInContext ? " and will auto-inject into prompts" : ""}.` });
      },
      onError: () => {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    });
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'url': return <LinkIcon className="h-5 w-5 text-blue-400" />;
      case 'file': return <FileText className="h-5 w-5 text-emerald-400" />;
      case 'scraped': return <Globe className="h-5 w-5 text-amber-400" />;
      default: return <Library className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Library className="h-8 w-8 text-primary" />
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Centralized memory banks for AERIS's AI generation context.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="mr-2 h-4 w-4"/> Add Source</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border border-border bg-popover">
            <DialogHeader>
              <DialogTitle>Inject Knowledge</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Title</FormLabel>
                    <FormControl><Input {...field} className="bg-muted/50 border-border" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-black border-border text-white">
                        <SelectItem value="note">Text Note</SelectItem>
                        <SelectItem value="url">URL Reference</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content / Knowledge</FormLabel>
                    <FormControl><Textarea {...field} className="bg-muted/50 border-border min-h-[150px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="includeInContext" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-Inject to Prompts</FormLabel>
                      <p className="text-sm text-muted-foreground">Always include this context when generating content.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
                <Button type="submit" disabled={isPending} className="w-full bg-primary hover:bg-primary/90 mt-4">
                  {isPending ? "Injecting..." : "Save Knowledge"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Filter bar */}
      {items && items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search knowledge base..."
              className="pl-10 bg-muted/50 border-border" />
          </div>
          <div className="flex gap-1.5">
            {["all", "note", "url", "file", "scraped"].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                  filterType === t ? "bg-primary text-primary-foreground" : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground"
                }`}>{t}</button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : !items?.length ? (
        <Card className="rounded-2xl border border-border bg-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Library className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Knowledge Base Empty</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Feed AERIS with brand guidelines, product specs, SOPs, and business context.
              Everything you add here makes content smarter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            const isExpanded = expandedId === item.id;
            return (
              <Card key={item.id} className="glass-panel border-border bg-muted/60 hover:bg-muted/50 transition-colors group flex flex-col">
                <CardHeader className="pb-3 flex-row justify-between items-start space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 border border-border flex items-center justify-center">
                      {getIconForType(item.type)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="text-xs mt-1 uppercase tracking-wider">{item.type}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteItem({ id: item.id }, {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
                        toast({ title: "Knowledge removed" });
                      }
                    })}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className={`text-sm text-gray-400 mb-3 flex-1 ${isExpanded ? "" : "line-clamp-3"}`}>
                    {item.content}
                  </p>
                  {item.content.length > 150 && (
                    <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline mb-3">
                      {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show more</>}
                    </button>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    <Badge variant="outline" className={item.includeInContext ? "bg-primary/20 text-primary border-primary/30" : "bg-muted/50 text-gray-500 border-border"}>
                      {item.includeInContext ? <><Zap className="h-3 w-3 mr-1" />Auto-Inject</> : "Manual"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'MMM d, yy')}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
