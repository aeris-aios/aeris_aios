import { useState } from "react";
import { useListKnowledgeItems, useCreateKnowledgeItem, useDeleteKnowledgeItem } from "@workspace/api-client-react";
import { Library, Plus, Trash2, Link as LinkIcon, FileText, Globe } from "lucide-react";
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
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useListKnowledgeItems();
  const { mutate: createItem, isPending } = useCreateKnowledgeItem();
  const { mutate: deleteItem } = useDeleteKnowledgeItem();

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
          <p className="text-muted-foreground mt-2 text-sm">Centralized memory banks for Atreyu's AI generation context.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="mr-2 h-4 w-4"/> Add Source</Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10 bg-black/90">
            <DialogHeader>
              <DialogTitle>Inject Knowledge</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Title</FormLabel>
                    <FormControl><Input {...field} className="bg-white/5 border-white/10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-black border-white/10 text-white">
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
                    <FormControl><Textarea {...field} className="bg-white/5 border-white/10 min-h-[150px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="includeInContext" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : !items?.length ? (
        <Card className="glass-panel border-white/5 bg-white/5 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Library className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Knowledge Base Empty</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Feed Atreyu with brand guidelines, product specs, and past successful content.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <Card key={item.id} className="glass-panel border-white/5 bg-black/40 hover:bg-white/5 transition-colors group flex flex-col">
              <CardHeader className="pb-3 flex-row justify-between items-start space-y-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
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
                  onClick={() => deleteItem({ id: item.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] })})}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">{item.content}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                  <Badge variant="outline" className={item.includeInContext ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-gray-500 border-white/10"}>
                    {item.includeInContext ? "Auto-Inject: ON" : "Auto-Inject: OFF"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'MMM d, yy')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
