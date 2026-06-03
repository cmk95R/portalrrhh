import { Router } from "express";
import {
  getAttendanceReport,
  exportAttendanceReport,
  getRequestReport,
  exportRequestReport,
  getAttendanceReportSummary,
  getRequestReportSummary,
} from "../controllers/reports.controller.js";

const router = Router();

// Asistencias
router.get("/attendance", getAttendanceReport);
router.get("/attendance/summary", getAttendanceReportSummary);
router.get("/attendance/export", exportAttendanceReport); // ?format=csv|xlsx|pdf

// Solicitudes
router.get("/requests", getRequestReport);
router.get("/requests/summary", getRequestReportSummary);
router.get("/requests/export", exportRequestReport); // ?format=csv|xlsx|pdf

export default router;
