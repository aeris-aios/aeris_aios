import { useState } from "react";
import { useListCampaigns, useCreateCampaign, useDeleteCampaign } from "@workspace/api-client-react";
import { Megaphone, Plus, Calendar, Target, Users, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";

const schema = z.object({
  title: z.string().min(2, "Required"),
  description: z.string().optional(),
  objective: z.string().optional(),
  audience: z.string().optional(),
});

export default function Campaigns() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useListCampaigns();
  const { mutate: createCampaign, isPending } = useCreateCampaign();
  const { mutate: deleteCampaign } = useDeleteCampaign();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", objective: "", audience: "" }
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    createCampaign({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
        setOpen(false);
        form.reset();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      planning: "bg-amber-500/20 text-amber-500 border-amber-500/30",
      active: "bg-primary/20 text-primary border-primary/30",
      completed: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
    };
    return <Badge variant="outline" className={`capitalize ${colors[status] || 'bg-white/10 text-white border-white/20'}`}>{status}</Badge>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            Campaigns
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Orchestrate and monitor high-impact marketing campaigns.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="mr-2 h-4 w-4"/> New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10 bg-black/90">
            <DialogHeader>
              <DialogTitle>Initialize Campaign</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl><Input {...field} className="bg-white/5 border-white/10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief Description</FormLabel>
                    <FormControl><Textarea {...field} className="bg-white/5 border-white/10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="objective" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Objective</FormLabel>
                      <FormControl><Input {...field} className="bg-white/5 border-white/10" placeholder="e.g. Lead Gen" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="audience" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl><Input {...field} className="bg-white/5 border-white/10" placeholder="e.g. CMOs" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={isPending} className="w-full bg-primary hover:bg-primary/90 mt-4">
                  {isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : !campaigns?.length ? (
        <Card className="glass-panel border-white/5 bg-white/5 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No campaigns found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Create your first campaign to start orchestrating cross-channel assets.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map(campaign => (
            <Card key={campaign.id} className="glass-panel border-white/5 bg-black/40 hover:bg-white/5 transition-colors group">
              <CardContent className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{campaign.title}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <p className="text-sm text-gray-400 max-w-2xl">{campaign.description || "No description provided."}</p>
                  
                  <div className="flex flex-wrap gap-4 pt-2">
                    {campaign.objective && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Target className="h-4 w-4 text-primary/70" />
                        <span className="font-medium text-gray-300">{campaign.objective}</span>
                      </div>
                    )}
                    {campaign.audience && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-4 w-4 text-primary/70" />
                        <span className="font-medium text-gray-300">{campaign.audience}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary/70" />
                      <span>{format(new Date(campaign.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">Manage Assets</Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteCampaign({ id: campaign.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] })})}
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
