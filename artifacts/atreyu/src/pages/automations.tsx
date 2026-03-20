import { useState } from "react";
import { useListAutomations, useCreateAutomation, useDeleteAutomation, useRunAutomation, useToggleAutomation } from "@workspace/api-client-react";
import { Zap, Plus, Trash2, Play, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  title: z.string().min(2, "Required"),
  description: z.string().optional(),
  trigger: z.string().min(2, "Required"),
  action: z.string().min(2, "Required")
});

export default function Automations() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: automations, isLoading } = useListAutomations();
  const { mutate: createAuth, isPending } = useCreateAutomation();
  const { mutate: deleteAuth } = useDeleteAutomation();
  const { mutate: toggleAuth } = useToggleAutomation();
  const { mutate: runAuth } = useRunAutomation();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", trigger: "", action: "" }
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    createAuth({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
        setOpen(false);
        form.reset();
      }
    });
  };

  const handleRun = (id: number) => {
    runAuth({ id }, {
      onSuccess: () => {
        toast({ title: "Automation Triggered", description: "The sequence has been initiated successfully." });
        queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      }
    });
  };

  const handleToggle = (id: number) => {
    toggleAuth({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/automations"] })
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            Automations
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Self-executing marketing sequences and scheduled tasks.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="mr-2 h-4 w-4"/> New Sequence</Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10 bg-black/90">
            <DialogHeader>
              <DialogTitle>Configure Sequence</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence Name</FormLabel>
                    <FormControl><Input {...field} className="bg-white/5 border-white/10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} className="bg-white/5 border-white/10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="trigger" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger / Condition</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Daily at 9am" className="bg-white/5 border-white/10" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="action" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action / Execution</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Generate LinkedIn Post" className="bg-white/5 border-white/10" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={isPending} className="w-full bg-primary hover:bg-primary/90 mt-4 shadow-[0_0_15px_rgba(0,150,255,0.3)]">
                  {isPending ? "Saving..." : "Deploy Sequence"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : !automations?.length ? (
        <Card className="glass-panel border-white/5 bg-white/5 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No sequences configured</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Create an automation to schedule tasks and orchestrate marketing flows.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {automations.map(auto => (
            <Card key={auto.id} className={`glass-panel transition-all duration-300 ${auto.enabled ? 'border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(0,150,255,0.05)]' : 'border-white/5 bg-black/40'}`}>
              <CardContent className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex items-center justify-between md:justify-start gap-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {auto.title}
                      {auto.enabled && <span className="relative flex h-2 w-2 ml-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
                    </h3>
                    <div className="flex md:hidden">
                       <Switch checked={auto.enabled} onCheckedChange={() => handleToggle(auto.id)} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-sm font-mono bg-black/40 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Clock className="h-4 w-4" />
                      {auto.trigger}
                    </div>
                    <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Zap className="h-4 w-4" />
                      {auto.action}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last run: {auto.lastRunAt ? format(new Date(auto.lastRunAt), 'PPpp') : 'Never'}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-end border-t border-white/5 pt-4 md:pt-0 md:border-0">
                  <div className="hidden md:flex items-center gap-2 mr-4">
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                    <Switch checked={auto.enabled} onCheckedChange={() => handleToggle(auto.id)} />
                  </div>
                  <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10" onClick={() => handleRun(auto.id)}>
                    <Play className="h-4 w-4 mr-2" /> Force Run
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteAuth({ id: auto.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/automations"] })})}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
