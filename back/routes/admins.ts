import { Router } from "express";
import { AdminController } from "../controllers/AdminController";

const router = Router();
const adminController = new AdminController();

router.post("/", adminController.create);
router.get("/", adminController.findAll);

export default router;
