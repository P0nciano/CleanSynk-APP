import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number; role: string };
  admin?: { id: number; role: string };
}

export function autentica(req: AuthRequest, res: Response, next: NextFunction) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return res.status(500).json({ erro: "JWT_SECRET não configurado" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: "Token não fornecido" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ erro: "Token inválido" });

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      id: number;
      role: string;
    };
    req.user = decoded;
    if (decoded.role === "ADMIN") {
      req.admin = decoded;
    }
    next();
  } catch (error) {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

export function autenticaAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.admin) return res.status(403).json({ erro: "Acesso negado. Apenas administradores." });
  next();
}
