import { Router, type IRouter } from "express";
import healthRouter from "./health";
import anthropicRouter from "./anthropic/index";
import researchRouter from "./research";
import contentRouter from "./content";
import campaignsRouter from "./campaigns";
import knowledgeRouter from "./knowledge";
import automationsRouter from "./automations";
import projectsRouter from "./projects";
import agentsRouter from "./agents/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/anthropic", anthropicRouter);
router.use(researchRouter);
router.use(contentRouter);
router.use(campaignsRouter);
router.use(knowledgeRouter);
router.use(automationsRouter);
router.use(projectsRouter);
router.use("/agents", agentsRouter);

export default router;
