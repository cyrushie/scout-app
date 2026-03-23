import { PrismaClient } from "@prisma/client"
import { env } from "./env.js"

void env

export const prisma = new PrismaClient()
