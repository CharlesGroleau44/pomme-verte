// app/api/ecoles/route.ts
// Minimal volontairement : ce module ne couvre pas la gestion
// complète des écoles (logo, activation) — voir §1 du briefing.
// Cette route existe uniquement pour peupler le sélecteur d'écoles
// à la création d'un menu.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const ecoles = await prisma.ecole.findMany({ orderBy: { nom: 'asc' } });
  return NextResponse.json(ecoles);
}
