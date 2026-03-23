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
import brandRouter from "./brand";
import storageRouter from "./storage";
import codestudioRouter from "./codestudio";
import contentStudioRouter from "./content-studio";
import settingsRouter from "./settings";

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
router.use(brandRouter);
router.use(storageRouter);
router.use("/codestudio", codestudioRouter);
router.use(contentStudioRouter);
router.use(settingsRouter);

export default router;
